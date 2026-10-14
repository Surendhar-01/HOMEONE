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

/**
 * Wraps successful responses in `{ success, data, timestamp }` so the React
 * Native app can rely on one shape for every endpoint.
 *
 * NOTE: response bodies are passed through untouched. An earlier version
 * redacted `accessToken`/`refreshToken` here, which silently broke login for
 * every client - the secret material the app needs to authenticate never
 * arrived. Redaction belongs in log pipelines, never on the wire.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    void request;

    return next.handle().pipe(
      map((data) => {
        const payload: ApiEnvelope<unknown> = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
        return payload;
      }),
    );
  }
}
