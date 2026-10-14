import { ApiProperty } from '@nestjs/swagger';

export class DomainInCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Cleaning Services' })
  domainName!: string;
}

export class MainCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Repair & Maintenance' })
  categoryName!: string;

  @ApiProperty({ example: '🔧' })
  icon!: string;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty({ type: [DomainInCategoryDto] })
  domains!: DomainInCategoryDto[];
}
