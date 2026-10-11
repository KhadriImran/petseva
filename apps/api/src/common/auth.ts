import {
  CanActivate,
  Inject,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { Permission, ROLE_PERMISSIONS, RoleName } from '@rms/shared';
import { Db } from '../db/client';
import { users } from '../db/schema';
import { DB } from './db.module';

export interface Actor {
  id: string;
  outletId: string;
  name: string;
  username: string;
  role: RoleName;
  permissions: Permission[];
  /** set when the request carried a valid manager-override token */
  override?: { byUserId: string; byName: string };
}

export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const PERMS_KEY = 'perms';
export const RequirePerms = (...perms: Permission[]) => SetMetadata(PERMS_KEY, perms);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => ctx.switchToHttp().getRequest().user);

export function permissionsFor(role: RoleName, overrides?: { grant?: string[]; revoke?: string[] }): Permission[] {
  const base = new Set<Permission>(ROLE_PERMISSIONS[role] ?? []);
  overrides?.grant?.forEach((p) => base.add(p as Permission));
  overrides?.revoke?.forEach((p) => base.delete(p as Permission));
  return [...base];
}

export function hasPerm(actor: Actor, perm: Permission): boolean {
  return actor.permissions.includes(perm);
}

/** userId → (active?, checkedAt). Lets a switched-off account stop working within a minute without a DB hit per request. */
const activeCache = new Map<string, { active: boolean; at: number }>();
const ACTIVE_TTL_MS = 60_000;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Db,
  ) {}

  private async isActive(userId: string) {
    const hit = activeCache.get(userId);
    if (hit && Date.now() - hit.at < ACTIVE_TTL_MS) return hit.active;
    const u = await this.db.query.users.findFirst({ where: eq(users.id, userId), columns: { active: true } });
    const active = !!u?.active;
    activeCache.set(userId, { active, at: Date.now() });
    return active;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (!(await this.isActive(payload.sub))) throw new UnauthorizedException('This account has been switched off');
    const actor: Actor = {
      id: payload.sub,
      outletId: payload.outletId,
      name: payload.name,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions ?? permissionsFor(payload.role),
    };
    // Optional manager override token (X-Override-Token) minted by POST /auth/override
    const ov: string | undefined = req.headers['x-override-token'];
    if (ov) {
      try {
        const o = await this.jwt.verifyAsync(ov);
        if (o.kind === 'override' && o.outletId === actor.outletId) actor.override = { byUserId: o.sub, byName: o.name };
      } catch {
        /* ignore bad override tokens – the action will be rejected later if it needed one */
      }
    }
    req.user = actor;
    const perms = this.reflector.getAllAndOverride<Permission[]>(PERMS_KEY, [ctx.getHandler(), ctx.getClass()]) ?? [];
    for (const p of perms) {
      if (!hasPerm(actor, p) && !actor.override) throw new ForbiddenException(`Missing permission: ${p}`);
    }
    return true;
  }
}
