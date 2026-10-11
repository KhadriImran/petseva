#!/usr/bin/env node
/**
 * Build used by Vercel (vercel.json → buildCommand). Steps:
 *   1. build the shared package and the NestJS API (→ apps/api/dist, loaded by /api/index.js)
 *   2. if a database is connected: apply migrations, then create the restaurant on the very first deploy
 *   3. build the POS web app (→ apps/pos/dist, served as static files)
 * Env: DATABASE_URL (+ DATABASE_URL_UNPOOLED from the Neon integration), RESTAURANT (default tukaram),
 *      SEED_OWNER_PASSWORD (first deploy only), JWT_SECRET (runtime).
 */
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const apiDir = path.join(root, 'apps', 'api');
const run = (cmd, opts = {}) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts, env: { ...process.env, ...opts.env } });
};

run('npm run build -w @rms/shared');
run('npm run build -w @rms/api');

const { getRestaurant } = require(path.join(apiDir, 'dist', 'restaurants'));
const restaurant = getRestaurant();
console.log(`\n● Restaurant: ${restaurant.name} (RESTAURANT=${process.env.RESTAURANT ?? 'tukaram'})`);

const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (dbUrl) {
  // migrations want a direct (unpooled) connection; DB_EMBEDDED=false so we never try to boot a local Postgres
  const env = { DATABASE_URL: dbUrl, DB_EMBEDDED: 'false' };
  run('npx tsx src/db/migrate.ts', { cwd: apiDir, env });
  run('npx tsx src/db/seed.ts', { cwd: apiDir, env });
} else {
  console.warn('\n⚠ DATABASE_URL is not set — skipping migrations/seed. Connect a Neon database in Vercel → Storage, then redeploy.');
}

run('npm run build -w @rms/pos', { env: { APP_NAME: restaurant.name } });
console.log('\n✔ build complete');
