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
    'seed counts',
    `select (select count(*) from service_domains) as domains,
            (select count(*) from services) as services,
            (select count(*) from profiles) as profiles,
            (select count(*) from user_roles) as user_roles`,
  );

  await show(
    'row level security',
    `select relname as table_name, relrowsecurity as rls_enabled
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
     order by relname`,
  );

  await show(
    'policies per table',
    `select tablename, count(*)::int as policies
     from pg_policies where schemaname = 'public'
     group by 1 order by 1`,
  );

  await show(
    'storage buckets',
    `select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id`,
  );

  await show(
    'storage policies',
    `select policyname, tablename from pg_policies where schemaname = 'storage' order by policyname`,
  );

  await show(
    'public functions',
    `select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' order by proname`,
  );

  await show(
    'sample catalog',
    `select d.domain_name, count(s.id)::int as skills
     from service_domains d left join services s on s.domain_id = d.id
     group by d.domain_name order by d.domain_name limit 5`,
  );

  await client.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});