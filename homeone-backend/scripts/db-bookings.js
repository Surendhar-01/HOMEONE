const { Client } = require('pg');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });
  await c.connect();
  const b = await c.query('select id, status, status_updated_at from bookings order by created_at desc limit 5');
  console.log('bookings:', JSON.stringify(b.rows, null, 2));
  const h = await c.query('select booking_id, old_status, new_status, created_at from booking_status_history order by created_at desc limit 10');
  console.log('history:', JSON.stringify(h.rows, null, 2));
  await c.end();
  console.log('done');
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
setTimeout(() => { console.error('WATCHDOG'); process.exit(2); }, 30000).unref();
