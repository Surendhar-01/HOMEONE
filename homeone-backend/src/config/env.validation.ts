import { plainToInstance } from 'class-transformer';
import { IsIn, IsOptional, IsString, MinLength, validateSync } from 'class-validator';
import { Injectable } from '@nestjs/common';

export class EnvironmentVariables {
  @IsString()
  @MinLength(1)
  SUPABASE_URL: string;

  @IsString()
  @MinLength(1)
  SUPABASE_PUBLISHABLE_KEY: string;

  @IsString()
  @MinLength(1)
  SUPABASE_SERVICE_ROLE_KEY: string;

  @IsOptional()
  @IsString()
  SUPABASE_JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsIn(['email', 'sms'])
  AUTH_OTP_CHANNEL?: 'email' | 'sms';

  @IsOptional()
  @IsString()
  AUTH_OTP_RESEND_COOLDOWN_SECONDS?: string;

  @IsOptional()
  @IsString()
  AUTH_OTP_LENGTH?: string;

  @IsOptional()
  @IsString()
  UPLOAD_MAX_IMAGE_BYTES?: string;

  @IsOptional()
  @IsString()
  UPLOAD_MAX_DOCUMENT_BYTES?: string;
}

@Injectable()
export class EnvironmentValidator {
  validate(config: Record<string, unknown>): Record<string, unknown> {
    const validatedConfig = plainToInstance(EnvironmentVariables, config, {
      enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, { skipMissingProperties: true });

    if (errors.length > 0) {
      const details = errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('; ');
      throw new Error(`Invalid environment configuration: ${details}`);
    }

    return validatedConfig as unknown as Record<string, unknown>;
  }
}
