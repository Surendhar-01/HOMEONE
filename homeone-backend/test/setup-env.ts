process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '8081';

// Placeholder credentials let the DI graph build without a real project. No test
// in this suite performs a network call against Supabase.
process.env.SUPABASE_URL ??= 'https://placeholder-project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY ??= 'placeholder-publishable-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'placeholder-service-role-key';
process.env.CORS_ORIGINS ??= 'http://localhost:8081';
