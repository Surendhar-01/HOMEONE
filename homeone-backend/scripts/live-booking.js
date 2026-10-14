/**
 * Live end-to-end walkthrough of the booking lifecycle against the running
 * backend. Uses the existing test accounts:
 *   customer homeonetest.direct001@gmail.com / TestPass1
 *   provider homeone.provider002@gmail.com / TestPass1
 *   admin    homeone.admin001@gmail.com / AdminPass1
 *
 * Run: node scripts/live-booking.js
 */
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
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

async function login(identifier, password, expectedRole) {
  return call('POST', '/auth/login', null, { identifier, password, expectedRole });
}

async function main() {
  const customer = await login('homeonetest.direct001@gmail.com', 'TestPass1', 'CUSTOMER');
  const ct = customer.accessToken;
  console.log('1. customer login ok, role =', customer.role);

  const domains = await call('GET', '/service-domains', ct);
  const cleaning = domains.find((d) => d.domainName === 'Cleaning Services');
  const services = await call('GET', `/services?domainId=${cleaning.id}`, ct);
  const deepClean = services.find((s) => s.serviceName === 'Deep Cleaning');
  console.log('2. service resolved:', deepClean.serviceName, deepClean.id);

  const pros = await call(
    'GET',
    `/professionals?serviceId=${deepClean.id}&latitude=13.0827&longitude=80.2707`,
    ct,
  );
  console.log(
    '3. discovered:',
    pros.map((p) => `${p.providerName} (${p.skills.join(', ')}) rating=${p.averageRating} dist=${p.distanceKm}km`).join(' | '),
  );
  const pro = pros[0];
  if (!pro) throw new Error('No approved professional found for Deep Cleaning');

  const scheduledAt = new Date(Date.now() + 2 * 86400000).toISOString();
  const idempotencyKey = crypto.randomUUID();
  const bookingBody = {
    serviceId: deepClean.id,
    providerId: pro.providerId,
    address: 'Flat 402, 12 MG Road, Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    scheduledAt,
    problemDescription: 'The kitchen needs a full deep clean before a family function next week.',
    urgency: 'HIGH',
    idempotencyKey,
  };
  const booking = await call('POST', '/bookings', ct, bookingBody);
  console.log('4. booking created:', booking.id, 'status =', booking.status);

  const retry = await call('POST', '/bookings', ct, bookingBody);
  console.log('5. idempotent retry returns same booking:', retry.id === booking.id);

  const provider = await login('homeone.provider002@gmail.com', 'TestPass1', 'PROFESSIONAL');
  const pt = provider.accessToken;
  console.log('6. provider login ok, role =', provider.role);

  const accepted = await call('PATCH', `/bookings/${booking.id}/status`, pt, { status: 'ACCEPTED' });
  console.log('7. provider accepted, status =', accepted.status);

  for (const status of ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']) {
    const updated = await call('PATCH', `/bookings/${booking.id}/status`, pt, { status });
    console.log(`8. provider -> ${updated.status}`);
  }

  const review = await call('POST', '/reviews', ct, {
    bookingId: booking.id,
    rating: 5,
    comment: 'Thorough work, on time. Highly recommended.',
  });
  console.log('9. review submitted:', review.id, 'rating =', review.rating);

  const rating = await call('GET', `/reviews/provider-rating?providerId=${pro.providerId}`, ct);
  console.log('10. provider rating now:', JSON.stringify(rating));

  const profile = await call('GET', `/professionals/${pro.providerId}`, ct);
  console.log(
    '11. public profile:',
    profile.providerName,
    '| skills:',
    profile.skills.join(', '),
    '| reviews visible:',
    profile.reviews.length,
  );

  const admin = await login('homeone.admin001@gmail.com', 'AdminPass1', 'ADMIN');
  const stats = await call('GET', '/admin/stats', admin.accessToken);
  console.log('12. admin stats:', JSON.stringify(stats.bookings), 'reviews:', stats.reviews);

  const notifications = await call('GET', '/notifications', ct);
  console.log(
    '13. customer notifications:',
    notifications.items.map((n) => n.title).join(' | '),
  );
  console.log('\nWALKTHROUGH COMPLETE');
}

main().catch((e) => {
  console.error('WALKTHROUGH FAILED:', e.message);
  process.exit(1);
});
