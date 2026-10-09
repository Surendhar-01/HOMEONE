/**
 * Applies the SQL files in `supabase/migrations` and then `supabase/seed.sql`
 * to the project named by DATABASE_URL.
 *
 *   npm run db:migrate
 *
 * The Supabase CLI is the usual path (`supabase db push`); this script exists so
 * the schema can also be applied from a machine that only has Node installed.
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

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('Connected.');

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`Applying ${file}...`);
    await client.query(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    console.log(`  ok ${file}`);
  }

  console.log('Applying seed.sql...');
  await client.query(readFileSync(SEED_FILE, 'utf8'));
  console.log('  ok seed.sql');

  await client.end();
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});