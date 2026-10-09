/**
 * Applies the SQL files in `supabase/migrations` and then `supabase/seed.sql`
 * to the project named by DATABASE_URL.
 *
 *   npm run db:migrate
 *
 * The Supabase CLI is the usual path (`supabase db push`); this script exists so
 * the schema can also be applied from a machine that only has Node installed.
 * It uses the postgres superuser connection string, so keep DATABASE_URL in
 * .env and out of version control.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: join(__dirname, '..', '.env') });

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');
const SEED_FILE = join(__dirname, '..', 'supabase', 'seed.sql');

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to .env before running migrations.');
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected.');

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`Applying ${file}...`);
    await client.query(sql);
    console.log(`  ok ${file}`);
  }

  const seedSql = readFileSync(SEED_FILE, 'utf8');
  console.log('Applying seed.sql...');
  await client.query(seedSql);
  console.log('  ok seed.sql');

  const { rows } = await client.query<{ table_name: string; row_count: number }>(`select relname::text as table_name, n_live_tup::int as row_count
     from pg_stat_user_tables
     where schemaname = 'public'
     order by relname`);

  console.log('\npublic tables:');
  for (const row of rows) {
    console.log(`  ${row.table_name.padEnd(34)} ${row.row_count} rows`);
  }

  await client.end();
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});