import { Body, Controller, Get, HttpException, HttpStatus, Inject, Injectable, Module, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import bcrypt from 'bcryptjs';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { and, count, eq, gte, inArray } from 'drizzle-orm';
import { RoleName } from '@rms/shared';
import { Actor, CurrentUser, permissionsFor, Public } from '../common/auth';
import { DB } from '../common/db.module';
import { Db } from '../db/client';
import { auditLogs, users } from '../db/schema';

/** brute-force guard: this many wrong passwords / PINs within the window locks the account for the window */
const MAX_FAILS = 5;
const LOCK_MINUTES = 10;

export class LoginDto {
  @ApiProperty({ example: 'cashier' }) @IsString() username: string;
  @ApiProperty({ example: 'cashier123' }) @IsString() @MinLength(3) password: string;
  @ApiProperty({ required: false, description: 'Stable id of the POS device, used for offline sync' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class OverrideDto {
  @ApiProperty({ example: '1111', description: 'Manager / owner PIN' }) @IsString() pin: string;
  @ApiProperty({ required: false, description: 'Optional: restrict which manager (username)' }) @IsOptional() @IsString() username?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly jwt: JwtService,
  ) {}

  /** Recent failures recorded in the audit log (works across serverless instances, unlike an in-memory counter). */
  private async recentFails(userId: string, action: string) {
    const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
    const [r] = await this.db
      .select({ n: count() })
      .from(auditLogs)
      .where(and(eq(auditLogs.userId, userId), eq(auditLogs.action, action), gte(auditLogs.createdAt, since)));
    return Number(r?.n ?? 0);
  }

  private async recordFail(user: { id: string; outletId: string; name: string }, action: string) {
    await this.db.insert(auditLogs).values({ outletId: user.outletId, userId: user.id, userName: user.name, action, entity: 'user', entityId: user.id });
  }

  private locked() {
    return new HttpException(`Too many wrong attempts. Try again in ${LOCK_MINUTES} minutes.`, HttpStatus.TOO_MANY_REQUESTS);
  }

  async login(dto: LoginDto) {
    const username = (dto.username ?? '').trim().toLowerCase();
    const user = await this.db.query.users.findFirst({ where: and(eq(users.username, username), eq(users.active, true)) });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if ((await this.recentFails(user.id, 'LOGIN_FAILED')) >= MAX_FAILS) throw this.locked();
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.recordFail(user, 'LOGIN_FAILED');
      throw new UnauthorizedException('Invalid credentials');
    }
    const permissions = permissionsFor(user.role as RoleName, user.permissionOverrides);
    const payload = { sub: user.id, outletId: user.outletId, name: user.name, username: user.username, role: user.role, permissions };
    return {
      token: await this.jwt.signAsync(payload),
      user: { id: user.id, name: user.name, username: user.username, role: user.role, outletId: user.outletId, permissions },
    };
  }

  /** Verify a manager PIN and mint a 5-minute override token for a sensitive action. */
  async override(actor: Actor, dto: OverrideDto) {
    if ((await this.recentFails(actor.id, 'PIN_FAILED')) >= MAX_FAILS) throw this.locked();
    const candidates = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.outletId, actor.outletId),
          eq(users.active, true),
          inArray(users.role, ['OWNER', 'MANAGER']),
          ...(dto.username ? [eq(users.username, dto.username)] : []),
        ),
      );
    for (const m of candidates) {
      if (m.pinHash && (await bcrypt.compare(dto.pin, m.pinHash))) {
        const token = await this.jwt.signAsync(
          { kind: 'override', sub: m.id, name: m.name, outletId: m.outletId },
          { expiresIn: '5m' },
        );
        return { overrideToken: token, by: { id: m.id, name: m.name }, expiresInSeconds: 300 };
      }
    }
    await this.recordFail({ id: actor.id, outletId: actor.outletId, name: actor.name }, 'PIN_FAILED');
    throw new UnauthorizedException('Invalid manager PIN');
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with username/password → JWT' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: Actor) {
    return user;
  }

  @Post('override')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify manager PIN → short-lived override token (send as X-Override-Token)' })
  override(@CurrentUser() user: Actor, @Body() dto: OverrideDto) {
    return this.auth.override(user, dto);
  }
}

@Module({ controllers: [AuthController], providers: [AuthService], exports: [AuthService] })
export class AuthModule {}
