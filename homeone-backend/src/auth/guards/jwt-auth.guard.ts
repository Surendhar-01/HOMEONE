import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseTokenService } from '../supabase-token.service';
import type { AuthenticatedUser } from '../../database/database.types';
import { IS_PUBLIC_KEY } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: SupabaseTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer access token.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Bearer access token.');
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      const principal = await this.tokenService.buildPrincipal(payload);
      request.user = principal;
      return true;
    } catch (error) {
      this.logger.warn(`Token rejected: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}

export type { AuthenticatedUser };
