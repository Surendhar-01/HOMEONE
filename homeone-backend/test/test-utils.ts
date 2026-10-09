import { ValidationPipe } from '@nestjs/common';

/** Mirrors the pipe registered in `main.ts` so e2e tests exercise real validation. */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    validationError: { target: false, value: false },
  });
}
