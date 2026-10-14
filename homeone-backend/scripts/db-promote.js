const { Client } = require('pg');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  const email = process.argv[2];
  const r = await client.query('select public.promote_to_admin($1) as id', [email]);
  console.log('promoted:', JSON.stringify(r.rows));
  const roles = await client.query('select user_id, role from user_roles where user_id=$1', [
    r.rows[0].id,
  ]);
  console.log('roles:', JSON.stringify(roles.rows));
  await client.end();
}
main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
setTimeout(() => process.exit(2), 45000).unref();