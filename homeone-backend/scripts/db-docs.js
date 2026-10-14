const { Client } = require('pg');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  const docs = await client.query(
    `select d.document_type, d.storage_path, d.original_filename, d.mime_type, d.size_bytes
     from provider_documents d
     join service_providers p on p.id = d.provider_id
     join profiles pr on pr.id = p.user_id
     where pr.email = 'homeone.provider002@gmail.com'`,
  );
  console.log('documents:', JSON.stringify(docs.rows, null, 2));
  const objs = await client.query(
    `select bucket_id, name from storage.objects where bucket_id = 'provider-documents'`,
  );
  console.log('storage objects:', JSON.stringify(objs.rows, null, 2));
  await client.end();
}
main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
setTimeout(() => process.exit(2), 45000).unref();