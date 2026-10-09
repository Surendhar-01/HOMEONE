import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomerService } from './customer.service';
import type { CreateHomeDto, HomeResponseDto, UpdateHomeDto } from './dto/home.dto';

@ApiTags('Customer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('homes')
  @ApiOperation({
    summary: 'Add a home address using live location',
    description:
      'Stores the address text plus the GPS coordinates captured by the app. Coordinates may be omitted entirely when the device denies location permission, but must be supplied as a pair.',
  })
  @ApiCreatedResponse({ type: HomeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or incomplete coordinate pair.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  createHome(@CurrentUser('id') customerId: string, @Body() dto: CreateHomeDto) {
    return this.customerService.createHome(customerId, dto);
  }

  @Get('homes')
  @ApiOperation({ summary: 'List the saved home addresses' })
  @ApiOkResponse({ type: [HomeResponseDto] })
  listHomes(@CurrentUser('id') customerId: string) {
    return this.customerService.listHomes(customerId);
  }

  @Patch('homes/:id')
  @ApiOperation({ summary: 'Update a saved home address' })
  @ApiOkResponse({ type: HomeResponseDto })
  @ApiNotFoundResponse({ description: 'Home address not found.' })
  @ApiForbiddenResponse({ description: 'Address belongs to another customer.' })
  updateHome(
    @CurrentUser('id') customerId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) homeId: string,
    @Body() dto: UpdateHomeDto,
  ) {
    return this.customerService.updateHome(customerId, homeId, dto);
  }

  @Delete('homes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a saved home address' })
  @ApiOkResponse({ description: 'Address deleted.' })
  deleteHome(
    @CurrentUser('id') customerId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) homeId: string,
  ) {
    return this.customerService.deleteHome(customerId, homeId);
  }
}