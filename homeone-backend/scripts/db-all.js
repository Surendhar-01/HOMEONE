const { Client } = require('pg');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });
  await client.connect();
  console.log('as user:', (await client.query('select current_user')).rows);
  const profiles = await client.query('select id, full_name, email from profiles order by email');
  console.log('profiles:', JSON.stringify(profiles.rows));
  const homes = await client.query(
    'select h.id, h.address, h.label, h.is_default, p.email as owner from customer_homes h join profiles p on p.id = h.customer_id order by h.created_at',
  );
  console.log('homes:', JSON.stringify(homes.rows, null, 2));
  await client.end();
  console.log('done');
}
main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
setTimeout(() => {
  console.error('WATCHDOG');
  process.exit(2);
}, 30000).unref();
