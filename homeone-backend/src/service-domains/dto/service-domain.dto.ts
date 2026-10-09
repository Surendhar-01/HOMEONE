import { ApiProperty } from '@nestjs/swagger';

export class ServiceDomainResponseDto {
  @ApiProperty({ example: '9f1d0c2e-...' })
  id!: string;

  @ApiProperty({ example: 'Cleaning Services' })
  domainName!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}