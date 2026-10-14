const fs = require('node:fs');
const http = require('node:http');

const url =
  'http://localhost:8082/index.bundle?platform=android&dev=true&hot=false&transform.engine=hermes';
console.log('fetching bundle...');

http
  .get(url, (res) => {
    console.log('status:', res.statusCode);
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      fs.writeFileSync('C:\\Users\\suren\\AppData\\Local\\Temp\\app-bundle.js', body);
      console.log('saved bytes:', body.length);
    });
  })
  .on('error', (e) => {
    console.error('FAIL:', e.message);
    process.exit(1);
  });
setTimeout(() => {
  console.error('WATCHDOG');
  process.exit(2);
}, 120000).unref();
