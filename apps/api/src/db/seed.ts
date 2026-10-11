import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DEFAULT_OUTLET_SETTINGS } from '@rms/shared';
import { getRestaurant, RestaurantConfig } from '../restaurants';
import { createDb, createPool, Db } from './client';
import * as s from './schema';

const R = (rupees: number) => Math.round(rupees * 100);

/**
 * Creates the restaurant described by RESTAURANT (default: tukaram) — outlet, floor, menu, printers, staff.
 * Idempotent: does nothing when the outlet already exists, so it is safe to run on every deploy.
 */
export async function seed(db: Db, r: RestaurantConfig = getRestaurant()) {
  const existing = await db.query.outlets.findFirst({ where: eq(s.outlets.code, r.code) });
  if (existing) {
    console.log(`[seed] outlet ${r.code} already exists — skipping (run db:reset to recreate)`);
    return;
  }

  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  if (!r.demoUsers && !ownerPassword) {
    throw new Error('[seed] set the SEED_OWNER_PASSWORD environment variable (the first login password for user "owner")');
  }
  if (ownerPassword && ownerPassword.length < 8) throw new Error('[seed] SEED_OWNER_PASSWORD must be at least 8 characters');

  console.log(`[seed] creating ${r.name}`);
  const [brand] = await db.insert(s.brands).values({ name: r.brand }).returning();
  const [outlet] = await db
    .insert(s.outlets)
    .values({
      brandId: brand.id,
      name: r.name,
      code: r.code,
      addressLines: r.addressLines,
      phone: r.phone || null,
      gstin: r.gstin || null,
      fssai: r.fssai || null,
      settings: { ...DEFAULT_OUTLET_SETTINGS, gstin: r.gstin ?? '', fssai: r.fssai ?? '', ...r.settings },
      businessHours: r.businessHours,
    })
    .returning();
  const o = outlet.id;

  // staff
  const staff = r.demoUsers ?? [{ name: 'Owner', username: 'owner', password: ownerPassword!, pin: process.env.SEED_OWNER_PIN ?? null, role: 'OWNER' as const }];
  for (const u of staff) {
    await db.insert(s.users).values({
      outletId: o,
      name: u.name,
      username: u.username,
      passwordHash: await bcrypt.hash(u.password, 10),
      pinHash: u.pin ? await bcrypt.hash(u.pin, 10) : null,
      role: u.role,
    });
  }

  // floor
  for (const [ai, a] of r.areas.entries()) {
    const [area] = await db.insert(s.areas).values({ outletId: o, name: a.name, sortOrder: ai }).returning();
    await db.insert(s.tables).values(
      a.tables.map((t, i) => ({ outletId: o, areaId: area.id, name: t, capacity: a.capacity, posX: i % 4, posY: Math.floor(i / 4), sortOrder: i })),
    );
  }

  // taxes
  const slabRows = await db
    .insert(s.taxSlabs)
    .values(r.taxSlabs.map((t) => ({ outletId: o, ...t })))
    .returning();
  const slab = (bps: number) => {
    const row = slabRows.find((x) => x.rateBps === bps);
    if (!row) throw new Error(`[seed] no tax slab with rate ${bps} bps`);
    return row.id;
  };

  // add-ons
  const groupIds: Record<string, string> = {};
  for (const g of r.addonGroups ?? []) {
    const [grp] = await db.insert(s.addonGroups).values({ outletId: o, name: g.name, minSelect: g.minSelect ?? 0, maxSelect: g.maxSelect }).returning();
    groupIds[g.key] = grp.id;
    await db.insert(s.addons).values(g.addons.map((a, i) => ({ groupId: grp.id, name: a.name, price: R(a.price), foodType: a.food ?? 'VEG', sortOrder: i })));
  }

  // menu
  for (const [ci, c] of r.categories.entries()) {
    const [cat] = await db
      .insert(s.menuCategories)
      .values({ outletId: o, name: c.name, station: c.station ?? 'KITCHEN', sortOrder: ci, availability: c.availability ?? [] })
      .returning();
    for (const [ii, it] of c.items.entries()) {
      const [row] = await db
        .insert(s.menuItems)
        .values({
          outletId: o,
          categoryId: cat.id,
          name: it.name,
          shortCode: it.code,
          description: it.desc,
          foodType: it.food ?? c.food ?? 'VEG',
          price: R(it.price),
          taxSlabId: slab(it.tax ?? c.tax ?? r.defaultTax),
          packagingCharge: R(it.pack ?? 0),
          station: it.station ?? null,
          sortOrder: ii,
        })
        .returning();
      if (it.variations) {
        await db.insert(s.variations).values(it.variations.map(([name, price], i) => ({ itemId: row.id, name, price: R(price), isDefault: i === 0, sortOrder: i })));
      }
      if (it.addons) {
        await db.insert(s.itemAddonGroups).values(it.addons.map((g) => ({ itemId: row.id, groupId: groupIds[g] })));
      }
    }
  }

  // printers (only used when PRINT_DRY_RUN=false and the server can reach them; the POS prints via the browser otherwise)
  await db.insert(s.printers).values(
    r.printers.map((p) => ({ outletId: o, name: p.name, station: p.station, kind: p.host ? 'NETWORK' : 'BROWSER', host: p.host ?? null, port: p.port ?? 9100, width: p.width ?? 42 })),
  );

  if (r.demoCustomers?.length) {
    await db.insert(s.customers).values(r.demoCustomers.map((c) => ({ outletId: o, ...c })));
  }

  console.log('[seed] done. Logins:');
  for (const u of staff) console.log(`   ${u.role.padEnd(8)} ${u.username}${r.demoUsers ? ` / ${u.password}${u.pin ? `  (PIN ${u.pin})` : ''}` : ' / (password from SEED_OWNER_PASSWORD)'}`);
}

if (require.main === module) {
  const pool = createPool();
  seed(createDb(pool))
    .then(() => pool.end())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
