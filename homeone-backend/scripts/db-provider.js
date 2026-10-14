const { Client } = require('pg');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  const p = await client.query(
    `select p.id, p.years_of_experience, p.languages_spoken, p.verification_status,
            d.domain_name, pr.full_name
     from service_providers p
     join service_domains d on d.id = p.domain_id
     join profiles pr on pr.id = p.user_id
     where pr.email = 'homeone.provider002@gmail.com'`,
  );
  console.log('provider:', JSON.stringify(p.rows, null, 2));
  const s = await client.query(
    `select s.service_name from provider_skills ps
     join services s on s.id = ps.service_id
     join service_providers p on p.id = ps.provider_id
     join profiles pr on pr.id = p.user_id
     where pr.email = 'homeone.provider002@gmail.com' order by 1`,
  );
  console.log('skills:', JSON.stringify(s.rows));
  const h = await client.query(
    `select count(*) as days from provider_working_hours wh
     join service_providers p on p.id = wh.provider_id
     join profiles pr on pr.id = p.user_id
     where pr.email = 'homeone.provider002@gmail.com'`,
  );
  console.log('working days:', JSON.stringify(h.rows));
  await client.end();
}
main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
setTimeout(() => process.exit(2), 45000).unref();