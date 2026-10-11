import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { and, eq } from 'drizzle-orm';
import { DEFAULT_OUTLET_SETTINGS, OutletSettings, RoleName, ROLES } from '@rms/shared';
import { Actor, CurrentUser, Public, RequirePerms } from '../common/auth';
import { AuditService } from '../common/audit.service';
import { DB } from '../common/db.module';
import { Db } from '../db/client';
import { outlets, printers, users } from '../db/schema';

@Injectable()
export class OutletsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async get(outletId: string) {
    const o = await this.db.query.outlets.findFirst({ where: eq(outlets.id, outletId) });
    if (!o) throw new NotFoundException('Outlet not found');
    return { ...o, settings: { ...DEFAULT_OUTLET_SETTINGS, ...(o.settings as Partial<OutletSettings>) } as OutletSettings };
  }

  async settings(outletId: string): Promise<OutletSettings> {
    return (await this.get(outletId)).settings;
  }

  async updateSettings(actor: Actor, patch: Partial<OutletSettings> & { name?: string; addressLines?: string[]; phone?: string; gstin?: string; fssai?: string }) {
    const { name, addressLines, phone, gstin, fssai, ...settingsPatch } = patch;
    const current = await this.get(actor.outletId);
    const settings = { ...current.settings, ...settingsPatch };
    await this.db
      .update(outlets)
      .set({ settings, ...(name && { name }), ...(addressLines && { addressLines }), ...(phone !== undefined && { phone }), ...(gstin !== undefined && { gstin }), ...(fssai !== undefined && { fssai }) })
      .where(eq(outlets.id, actor.outletId));
    await this.audit.log(this.db, actor, 'SETTINGS_UPDATE', 'outlet', actor.outletId, { patch });
    return this.get(actor.outletId);
  }

  listPrinters(outletId: string) {
    return this.db.select().from(printers).where(eq(printers.outletId, outletId));
  }

  async upsertPrinter(actor: Actor, body: any) {
    const data = { outletId: actor.outletId, name: body.name, station: body.station, kind: body.kind ?? 'NETWORK', host: body.host ?? null, port: body.port ?? 9100, width: body.width ?? 42, active: body.active ?? true };
    if (body.id) {
      const [row] = await this.db.update(printers).set(data).where(and(eq(printers.id, body.id), eq(printers.outletId, actor.outletId))).returning();
      return row;
    }
    const [row] = await this.db.insert(printers).values(data).returning();
    return row;
  }

  async deletePrinter(actor: Actor, id: string) {
    await this.db.delete(printers).where(and(eq(printers.id, id), eq(printers.outletId, actor.outletId)));
    return { ok: true };
  }

  async listUsers(outletId: string) {
    const rows = await this.db
      .select({ id: users.id, name: users.name, username: users.username, role: users.role, active: users.active, pinHash: users.pinHash })
      .from(users)
      .where(eq(users.outletId, outletId))
      .orderBy(users.createdAt);
    return rows.map(({ pinHash, ...u }) => ({ ...u, hasPin: !!pinHash }));
  }

  /** Name + address shown on the login screen before anyone signs in. */
  async publicInfo() {
    const o = await this.db.query.outlets.findFirst({ where: eq(outlets.active, true), orderBy: outlets.createdAt });
    return o ? { name: o.name, addressLines: o.addressLines } : { name: 'Restaurant POS', addressLines: [] };
  }

  async createUser(actor: Actor, body: { name?: string; username?: string; password?: string; pin?: string; role?: RoleName }) {
    const name = body.name?.trim();
    const username = body.username?.trim().toLowerCase();
    if (!name || !username) throw new BadRequestException('Name and username are required');
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new BadRequestException('Username: 3–30 letters/numbers, no spaces');
    checkPassword(body.password);
    checkPin(body.pin);
    if (!body.role || !ROLES.includes(body.role)) throw new BadRequestException('Pick a role');
    const taken = await this.db.query.users.findFirst({ where: eq(users.username, username) });
    if (taken) throw new ConflictException(`Username "${username}" is already taken`);
    const [row] = await this.db
      .insert(users)
      .values({ outletId: actor.outletId, name, username, role: body.role, passwordHash: await bcrypt.hash(body.password!, 10), pinHash: body.pin ? await bcrypt.hash(body.pin, 10) : null })
      .returning({ id: users.id });
    await this.audit.log(this.db, actor, 'USER_CREATE', 'user', row.id, { username, role: body.role });
    return { id: row.id };
  }

  async updateUser(actor: Actor, id: string, body: { name?: string; password?: string; pin?: string | null; role?: RoleName; active?: boolean }) {
    const u = await this.db.query.users.findFirst({ where: and(eq(users.id, id), eq(users.outletId, actor.outletId)) });
    if (!u) throw new NotFoundException('User not found');
    if (id === actor.id && (body.active === false || (body.role && body.role !== u.role))) throw new BadRequestException("You can't deactivate or change the role of your own account");
    const patch: Partial<typeof users.$inferInsert> = {};
    if (body.name?.trim()) patch.name = body.name.trim();
    if (body.role) {
      if (!ROLES.includes(body.role)) throw new BadRequestException('Unknown role');
      patch.role = body.role;
    }
    if (body.active !== undefined) patch.active = !!body.active;
    if (body.password) {
      checkPassword(body.password);
      patch.passwordHash = await bcrypt.hash(body.password, 10);
    }
    if (body.pin === null || body.pin === '') patch.pinHash = null;
    else if (body.pin) {
      checkPin(body.pin);
      patch.pinHash = await bcrypt.hash(body.pin, 10);
    }
    if (!Object.keys(patch).length) return { ok: true };
    await this.db.update(users).set(patch).where(eq(users.id, id));
    await this.audit.log(this.db, actor, 'USER_UPDATE', 'user', id, { username: u.username, changed: Object.keys(patch).map((k) => k.replace('Hash', '')) });
    return { ok: true };
  }
}

function checkPassword(p?: string) {
  if (!p || p.length < 6) throw new BadRequestException('Password must be at least 6 characters');
}
function checkPin(pin?: string | null) {
  if (pin && !/^\d{4,6}$/.test(pin)) throw new BadRequestException('PIN must be 4–6 digits');
}

@ApiTags('outlets')
@ApiBearerAuth()
@Controller('outlets')
export class OutletsController {
  constructor(private readonly svc: OutletsService) {}

  @Get('me') me(@CurrentUser() u: Actor) {
    return this.svc.get(u.outletId);
  }
  @Patch('me/settings') @RequirePerms('settings.write') update(@CurrentUser() u: Actor, @Body() body: any) {
    return this.svc.updateSettings(u, body);
  }
  @Get('me/printers') printers(@CurrentUser() u: Actor) {
    return this.svc.listPrinters(u.outletId);
  }
  @Post('me/printers') @RequirePerms('settings.write') upsertPrinter(@CurrentUser() u: Actor, @Body() body: any) {
    return this.svc.upsertPrinter(u, body);
  }
  @Delete('me/printers/:id') @RequirePerms('settings.write') deletePrinter(@CurrentUser() u: Actor, @Param('id') id: string) {
    return this.svc.deletePrinter(u, id);
  }
  @Get('me/users') @RequirePerms('users.manage') users(@CurrentUser() u: Actor) {
    return this.svc.listUsers(u.outletId);
  }
  @Post('me/users') @RequirePerms('users.manage') createUser(@CurrentUser() u: Actor, @Body() body: any) {
    return this.svc.createUser(u, body);
  }
  @Patch('me/users/:id') @RequirePerms('users.manage') updateUser(@CurrentUser() u: Actor, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateUser(u, id, body);
  }
  @Public() @Get('public') publicInfo() {
    return this.svc.publicInfo();
  }
}

@Module({ controllers: [OutletsController], providers: [OutletsService], exports: [OutletsService] })
export class OutletsModule {}
