import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: '9f1d0c2e-...', description: 'Parent service domain id.' })
  domainId!: string;

  @ApiProperty({ example: 'Deep Cleaning' })
  serviceName!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}