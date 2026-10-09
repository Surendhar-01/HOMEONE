import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { Public } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Health')
@Controller('health')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and Supabase connectivity probe' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'homeone-backend' },
        version: { type: 'string', example: '1.0.0' },
        timestamp: { type: 'string', format: 'date-time' },
        supabase: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'up' },
            auth: { type: 'string', example: 'configured' },
          },
        },
      },
    },
  })
  async check() {
    let supabase: { database: string; auth: string } = {
      database: 'unknown',
      auth: 'unknown',
    };
    let status = 'ok';

    try {
      supabase = await this.database.ping();
    } catch {
      status = 'degraded';
      supabase = { database: 'down', auth: 'unknown' };
    }

    return {
      status,
      service: 'homeone-backend',
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
      supabase,
    };
  }
}
