import { BadRequestException } from '@nestjs/common';

export class SupabaseError extends BadRequestException {
  readonly errorCode: string | undefined;
  readonly detail: string | undefined;

  constructor(message: string, code?: string, detail?: string) {
    super(message);
    this.errorCode = code;
    this.detail = detail;
  }
}

/**
 * Turns a PostgREST error into a friendly HTTP error without leaking SQL,
 * bucket names or internal identifiers to the client.
 */
export function toSupabaseError(
  error: { message: string; code?: string; details?: string } | null,
): never {
  if (!error) {
    return undefined as never;
  }

  switch (error.code) {
    case '23505':
      throw new SupabaseError('This record already exists.', error.code, error.message);
    case '23503':
      throw new SupabaseError('Referenced record does not exist.', error.code, error.message);
    case '23514':
      throw new SupabaseError(
        'The submitted values violate a data constraint.',
        error.code,
        error.message,
      );
    case '23502':
      throw new SupabaseError('A required field is missing.', error.code, error.message);
    case '22P02':
      throw new SupabaseError('Malformed identifier supplied.', error.code, error.message);
    case 'PGRST116':
      throw new SupabaseError('No rows matched the requested record.', error.code, error.message);
    default:
      throw new SupabaseError(error.message, error.code, error.message);
  }
}

export function assertNoError(error: { message: string; code?: string } | null): void {
  if (error) {
    toSupabaseError(error);
  }
}
