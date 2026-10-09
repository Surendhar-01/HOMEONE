import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

const REDACTED_KEYS =
  /^(password|confirmPassword|token|accessToken|refreshToken|otp|code|authorization)$/i;

function redact(body: unknown): unknown {
  if (body === null || typeof body !== 'object') {
    return body;
  }
  if (Array.isArray(body)) {
    return body.map(redact);
  }
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    output[key] = REDACTED_KEYS.test(key) ? '[REDACTED]' : redact(value);
  }
  return output;
}

/**
 * Wraps successful responses in `{ success, data, timestamp }` so the React
 * Native app can rely on one shape for every endpoint.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const isHealthCheck = /^\/api\/v1\/health/.test(request.url);

    return next.handle().pipe(
      map((data) => {
        const payload: ApiEnvelope<unknown> = {
          success: true,
          data: isHealthCheck ? data : redact(data),
          timestamp: new Date().toISOString(),
        };
        return payload;
      }),
    );
  }
}
