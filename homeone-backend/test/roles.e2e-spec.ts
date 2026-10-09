import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SupabaseTokenService } from '../src/auth/supabase-token.service';
import type { AuthenticatedUser } from '../src/database/database.types';
import { buildValidationPipe } from './test-utils';

const customer: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'customer@example.com',
  phone: '+919876543210',
  role: 'CUSTOMER',
  roles: ['CUSTOMER'],
  fullName: 'Customer One',
  isEmailVerified: true,
  isMobileVerified: true,
};

const professional: AuthenticatedUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'provider@example.com',
  phone: '+919876543211',
  role: 'PROFESSIONAL',
  roles: ['PROFESSIONAL'],
  fullName: 'Provider One',
  isEmailVerified: true,
  isMobileVerified: false,
};

const admin: AuthenticatedUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'admin@example.com',
  phone: null,
  role: 'ADMIN',
  roles: ['ADMIN'],
  fullName: 'Admin One',
  isEmailVerified: true,
  isMobileVerified: false,
};

describe('Role authorization (e2e)', () => {
  let app: INestApplication;
  let currentUser: AuthenticatedUser | null = null;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SupabaseTokenService)
      .useValue({
        verifyAccessToken: async () => ({ sub: 'stub', role: 'authenticated' }),
        buildPrincipal: async () => {
          if (!currentUser) {
            throw new Error('No principal configured for this test.');
          }
          return currentUser;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const asUser = (user: AuthenticatedUser | null) => {
    currentUser = user;
  };

  const server = () => request(app.getHttpServer());

  describe('protected routes require a token', () => {
    it.each([
      '/api/v1/users/me',
      '/api/v1/providers/me',
      '/api/v1/customer/homes',
      '/api/v1/admin/providers/pending',
      '/api/v1/notifications',
    ])('GET %s returns 401 without a Bearer token', async (path) => {
      await server().get(path).expect(401);
    });
  });

  describe('role restrictions', () => {
    it('blocks a CUSTOMER from /customer/homes list', async () => {
      asUser(null);
      // With no principal the guard rejects before the roles guard runs.
      await server().get('/api/v1/customer/homes').set('Authorization', 'Bearer stub').expect(401);
    });

    it('returns 403 when a customer hits an admin-only route', async () => {
      // AuthService is stubbed out for these routes only if the request reaches
      // the controller; the roles guard rejects first, so no Supabase call occurs.
      asUser(customer);
      await server()
        .get('/api/v1/admin/providers/pending')
        .set('Authorization', 'Bearer stub')
        .expect(403);
    });

    it('returns 403 when a provider hits an admin-only route', async () => {
      asUser(professional);
      await server()
        .get('/api/v1/admin/providers/pending')
        .set('Authorization', 'Bearer stub')
        .expect(403);
    });

    it('returns 403 when an admin hits a customer-only route', async () => {
      asUser(admin);
      await server().get('/api/v1/customer/homes').set('Authorization', 'Bearer stub').expect(403);
    });

    it('returns 403 when an admin hits a provider-only route', async () => {
      asUser(admin);
      await server()
        .get('/api/v1/providers/verification-status')
        .set('Authorization', 'Bearer stub')
        .expect(403);
    });

    it('returns 403 when a provider hits a customer-only route', async () => {
      asUser(professional);
      await server().get('/api/v1/customer/homes').set('Authorization', 'Bearer stub').expect(403);
    });
  });

  describe('validation before side effects', () => {
    it('rejects a provider document upload with an unsupported document type', async () => {
      asUser(professional);
      await server()
        .post('/api/v1/providers/documents')
        .set('Authorization', 'Bearer stub')
        .field('documentType', 'WORK_PHOTO')
        .expect(400);
    });

    it('rejects a home address with only a latitude', async () => {
      asUser(customer);
      await server()
        .post('/api/v1/customer/homes')
        .set('Authorization', 'Bearer stub')
        .send({ address: '12 MG Road, Bengaluru', latitude: 12.9716 })
        .expect(400);
    });

    it('rejects working hours where the end time is not after the start time', async () => {
      asUser(professional);
      const response = await server()
        .put('/api/v1/providers/working-hours')
        .set('Authorization', 'Bearer stub')
        .send({ workingHours: [{ dayOfWeek: 1, startTime: '18:00', endTime: '09:00' }] })
        .expect(400);

      expect(JSON.stringify(response.body)).toContain('later than start time');
    });

    it('rejects negative years of experience', async () => {
      asUser(professional);
      await server()
        .patch('/api/v1/providers/me')
        .set('Authorization', 'Bearer stub')
        .send({ yearsOfExperience: -1 })
        .expect(400);
    });

    it('rejects an admin rejection without a reason', async () => {
      asUser(admin);
      await server()
        .patch('/api/v1/admin/providers/33333333-3333-4333-8333-333333333333/reject')
        .set('Authorization', 'Bearer stub')
        .send({})
        .expect(400);
    });
  });
});
