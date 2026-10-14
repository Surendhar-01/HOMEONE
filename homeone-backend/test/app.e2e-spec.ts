import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { buildValidationPipe } from './test-utils';

/**
 * Boot-level smoke test. It does not call Supabase, so it verifies that the
 * dependency graph resolves and that routes plus the global guards are wired.
 */
describe('App bootstrap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SUPABASE_URL = 'https://placeholder-project.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'placeholder-publishable-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role-key';
    process.env.CORS_ORIGINS = 'http://localhost:8081';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('reports health', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBeDefined();
    expect(response.body.data.supabase.database).toBeDefined();
  }, 60000);

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('validates the registration payload before touching Supabase', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/register-profile').send({}).expect(400);
  });

  it('rejects weak passwords on registration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register-profile')
      .send({
        fullName: 'Test User',
        mobileNumber: '+919876543210',
        email: 'smoke-test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        agreedToTerms: true,
      })
      .expect(400);

    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it('serves the health route without a token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    expect(response.status).toBe(200);
  }, 60000);

  it('passes auth tokens through the response envelope untouched', async () => {
    // Regression test: the response interceptor must never redact the secret
    // material the client needs to authenticate. A redacted token silently
    // breaks every authenticated call after login.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthService)
      .useValue({
        login: async () => ({
          accessToken: 'real-access-token',
          refreshToken: 'real-refresh-token',
          expiresIn: 3600,
          tokenType: 'bearer',
          userId: 'u-1',
          role: 'CUSTOMER',
          emailVerified: true,
          mobileVerified: false,
        }),
      })
      .compile();

    const authed = moduleRef.createNestApplication();
    authed.setGlobalPrefix('api/v1');
    authed.useGlobalPipes(buildValidationPipe());
    await authed.init();

    try {
      const response = await request(authed.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: 'customer@example.com', password: 'StrongPass1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe('real-access-token');
      expect(response.body.data.refreshToken).toBe('real-refresh-token');
    } finally {
      await authed.close();
    }
  });
});
