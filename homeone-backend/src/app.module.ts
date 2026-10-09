import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { appConfig, authConfig, supabaseConfig } from './config/configuration';
import { EnvironmentValidator } from './config/env.validation';
import { SupabaseModule } from './database/supabase.module';
import { DatabaseHealthModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { CustomerModule } from './customer/customer.module';
import { ProvidersModule } from './providers/providers.module';
import { ServiceDomainsModule } from './service-domains/service-domains.module';
import { ServicesModule } from './services/services.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, supabaseConfig, authConfig],
      // `validate` (not `validationSchema`): @nestjs/config v3 expects a Joi
      // schema under `validationSchema`, and silently drops the file values if
      // given anything else. Our validator throws with a readable message.
      validate: (config: Record<string, unknown>) =>
        new EnvironmentValidator().validate(config),
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    SupabaseModule,
    StorageModule,
    DatabaseHealthModule,
    AuthModule,
    HealthModule,
    UsersModule,
    CustomerModule,
    ProvidersModule,
    ServiceDomainsModule,
    ServicesModule,
    AdminModule,
    NotificationsModule,
  ],
  providers: [
    // Authentication is on by default. Routes opt out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}