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
  const docs = await client.query(
    'select document_type, original_filename, mime_type, size_bytes from provider_documents limit 10',
  );
  console.log('documents:', JSON.stringify(docs.rows));
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
