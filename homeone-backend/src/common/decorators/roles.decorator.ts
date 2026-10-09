import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { UserRole } from '../../database/database.types';

export const ROLES_KEY = 'roles';

/** Restrict a route to specific roles. Combine with `JwtAuthGuard`. */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip JWT verification for a route (sign-in, sign-up, OTP, password reset). */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);