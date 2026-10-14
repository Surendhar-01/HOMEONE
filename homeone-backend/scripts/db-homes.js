const { Client } = require('pg');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  const homes = await client.query(
    'select address, latitude, longitude, label, is_default from customer_homes',
  );
  console.log('customer_homes:', JSON.stringify(homes.rows, null, 2));
  await client.end();
}
main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
setTimeout(() => process.exit(2), 45000).unref();