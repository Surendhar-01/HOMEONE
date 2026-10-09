import { join } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: join(__dirname, '..', '.env') });

async function main(): Promise<void> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const show = async (label: string, sql: string) => {
    const { rows } = await client.query(sql);
    console.log(`\n== ${label}`);
    console.log(JSON.stringify(rows, null, 2));
  };

  await show(
    'row counts',
    `select
       (select count(*) from service_domains) as domains,
       (select count(*) from services) as services,
       (select count(*) from profiles) as profiles,
       (select count(*) from user_roles) as user_roles,
       (select count(*) from service_providers) as providers,
       (select count(*) from customer_homes) as homes,
       (select count(*) from provider_documents) as documents,
       (select count(*) from notifications) as notifications,
       (select count(*) from provider_verification_history) as history`,
  );

  await show(
    'tables without row level security',
    `select c.relname as table_name
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
     order by 1`,
  );

  await show(
    'storage buckets',
    `select id, public, file_size_limit from storage.buckets order by id`,
  );

  await client.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});