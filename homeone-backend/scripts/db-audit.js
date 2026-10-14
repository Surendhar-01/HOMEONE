const { Client } = require('pg');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  const cols = await client.query(
    `select column_name, data_type from information_schema.columns
     where table_schema='auth' and table_name='audit_log_entries' order by ordinal_position`,
  );
  console.log('columns:', JSON.stringify(cols.rows));
  const log = await client.query(
    `select * from auth.audit_log_entries order by created_at desc limit 5`,
  );
  console.log('rows:', JSON.stringify(log.rows, null, 2).slice(0, 2000));
  await client.end();
}
main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
setTimeout(() => process.exit(2), 45000).unref();