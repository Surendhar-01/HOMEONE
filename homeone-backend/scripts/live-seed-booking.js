const BASE = 'http://localhost:8081/api/v1';

async function call(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(payload)}`);
  return payload.data;
}

async function main() {
  const login = await call('POST', '/auth/login', null, {
    identifier: 'homeonetest.direct001@gmail.com',
    password: 'TestPass1',
    expectedRole: 'CUSTOMER',
  });
  const domains = await call('GET', '/service-domains', login.accessToken);
  const cleaning = domains.find((d) => d.domainName === 'Cleaning Services');
  const services = await call('GET', `/services?domainId=${cleaning.id}`, login.accessToken);
  const deepClean = services.find((s) => s.serviceName === 'Deep Cleaning');
  const pros = await call(
    'GET',
    `/professionals?serviceId=${deepClean.id}`,
    login.accessToken,
  );
  const pro = pros.find((p) => p.verificationStatus !== 'BLOCKED') ?? pros[0];
  const booking = await call('POST', '/bookings', login.accessToken, {
    serviceId: deepClean.id,
    providerId: pro.providerId,
    address: 'Flat 402, 12 MG Road, Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    problemDescription: 'Emulator test booking: kitchen deep clean needed this weekend.',
    urgency: 'NORMAL',
    idempotencyKey: crypto.randomUUID(),
  });
  console.log('BOOKING_ID=' + booking.id);
  console.log('STATUS=' + booking.status);
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
