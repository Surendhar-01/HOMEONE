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

  const users = await client.query(
    `select id, email, email_confirmed_at, created_at from auth.users order by created_at desc limit 5`,
  );
  console.log('auth.users:', JSON.stringify(users.rows, null, 2));

  const profiles = await client.query(`select id, full_name, email from profiles`);
  console.log('profiles:', JSON.stringify(profiles.rows, null, 2));

  const roles = await client.query(`select user_id, role from user_roles`);
  console.log('user_roles:', JSON.stringify(roles.rows, null, 2));

  const log = await client.query(
    `select id, event_type, error from auth.audit_log_entries order by created_at desc limit 10`,
  );
  console.log('audit:', JSON.stringify(log.rows, null, 2));

  await client.end();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});