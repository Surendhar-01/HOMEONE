import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

export const GLOBAL_PREFIX = 'api/v1';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });

  const config = app.get(ConfigService);

  app.setGlobalPrefix(GLOBAL_PREFIX);
  // Client uploads are multipart; the 100kb JSON body limit does not apply, but
  // the upload size caps in StorageService still do.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  app.enableCors({
    origin: config.get<string[]>('app.corsOrigins') ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HOMEONE API')
    .setDescription(
      [
        'HOMEONE - All-in-One Home Services.',
        '',
        'Authentication, registration, profile, document upload, OTP verification and',
        'service provider approval.',
        '',
        '### Authentication',
        'Obtain a session from `POST /api/v1/auth/login` (or `/verify-otp`) and send the',
        'access token on every protected request:',
        '',
        '```',
        'Authorization: Bearer <accessToken>',
        '```',
        '',
        '### Roles',
        'Every account has exactly one role: CUSTOMER, PROFESSIONAL or ADMIN.',
        'Admin accounts are never created through the public API.',
        '',
        '### File uploads',
        'Send `multipart/form-data` with a `file` (or `files`) field. Government IDs and',
        'certificates are stored in a private bucket and only ever returned as short-lived',
        'signed URLs.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access token returned by login or OTP verification.',
      },
      'bearer',
    )
    .addTag('Health', 'Liveness and connectivity')
    .addTag('Authentication', 'Registration, login, OTP and password recovery')
    .addTag('Users', 'Profile and profile photo')
    .addTag('Customer', 'Saved home addresses')
    .addTag('Service Provider', 'Provider registration, documents and status')
    .addTag('Service Domains', 'Domain catalog')
    .addTag('Services', 'Skills per domain')
    .addTag('Admin', 'Provider verification and audit log')
    .addTag('Notifications', 'In-app notifications')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    customSiteTitle: 'HOMEONE API Docs',
  });

  app.enableShutdownHooks();

  const port = config.get<number>('app.port') ?? 8081;
  await app.listen(port, '0.0.0.0');

  logger.log(`HOMEONE backend listening on http://localhost:${port}/${GLOBAL_PREFIX}`);
  logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
}

void bootstrap();
