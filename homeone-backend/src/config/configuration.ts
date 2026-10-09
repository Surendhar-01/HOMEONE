import { registerAs } from '@nestjs/config';

/**
 * ConfigService lookups go through the plain namespace name, not
 * `registerAs(...).KEY` - the latter is the internal DI token
 * (`CONFIGURATION(<name>)`) and does not resolve with `config.get()`.
 */
export const APP_CONFIG_NAMESPACE = 'app';
export const SUPABASE_CONFIG_NAMESPACE = 'supabase';
export const AUTH_CONFIG_NAMESPACE = 'auth';

export const appConfig = registerAs(APP_CONFIG_NAMESPACE, () => ({
  port: parseInt(process.env.PORT ?? '8081', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  passwordResetRedirectTo: process.env.PASSWORD_RESET_REDIRECT_TO ?? 'homeone://reset-password',
  upload: {
    maxImageBytes: parseInt(process.env.UPLOAD_MAX_IMAGE_BYTES ?? '5242880', 10),
    maxDocumentBytes: parseInt(process.env.UPLOAD_MAX_DOCUMENT_BYTES ?? '10485760', 10),
  },
}));

export const supabaseConfig = registerAs(SUPABASE_CONFIG_NAMESPACE, () => ({
  url: process.env.SUPABASE_URL ?? '',
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  jwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
}));

export const authConfig = registerAs(AUTH_CONFIG_NAMESPACE, () => ({
  otpChannel: (process.env.AUTH_OTP_CHANNEL ?? 'email') as 'email' | 'sms',
  otpLength: parseInt(process.env.AUTH_OTP_LENGTH ?? '6', 10),
  otpResendCooldownSeconds: parseInt(process.env.AUTH_OTP_RESEND_COOLDOWN_SECONDS ?? '60', 10),
}));