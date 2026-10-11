import 'dotenv/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/rms',
    // serverless: many short-lived instances → keep each one's pool tiny (use Neon's pooled URL)
    max: process.env.VERCEL ? 3 : 10,
    idleTimeoutMillis: process.env.VERCEL ? 5000 : 10000,
  });
}

export function createDb(pool = createPool()): Db {
  return drizzle(pool, { schema });
}
