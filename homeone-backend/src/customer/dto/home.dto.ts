import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHomeDto {
  @ApiProperty({ example: '12 MG Road, Bengaluru, Karnataka 560001', minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'Address is required and must be at least 5 characters.' })
  @MaxLength(500)
  address!: string;

  @ApiPropertyOptional({
    example: 12.9716,
    description: 'Live GPS latitude from the device. Omitted when GPS is unavailable.',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a number.' })
  @Min(-90, { message: 'Latitude must be between -90 and 90.' })
  @Max(90, { message: 'Latitude must be between -90 and 90.' })
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946, description: 'Live GPS longitude from the device.' })
  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a number.' })
  @Min(-180, { message: 'Longitude must be between -180 and 180.' })
  @Max(180, { message: 'Longitude must be between -180 and 180.' })
  longitude?: number;

  @ApiPropertyOptional({ example: 'Home', description: 'Short label shown in the app list.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @ApiPropertyOptional({ example: false, description: 'Mark as the default saved address.' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateHomeDto {
  @ApiPropertyOptional({ example: 'Flat 402, 12 MG Road, Bengaluru' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class HomeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty({ nullable: true, example: 12.9716 })
  latitude!: number | null;

  @ApiProperty({ nullable: true, example: 77.5946 })
  longitude!: number | null;

  @ApiProperty({ nullable: true, example: 'Home' })
  label!: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
