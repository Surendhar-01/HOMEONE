import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { memoryImageUpload, requireUploadedFile } from '../storage/upload.config';
import { UsersService } from './users.service';
import { ProfileResponseDto, UpdateProfileDto } from './dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated profile' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  me(@CurrentUser('id') userId: string): Promise<ProfileResponseDto> {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update full name or mobile number' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or mobile number already in use.' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/profile-photo')
  @UseInterceptors(FileInterceptor('file', memoryImageUpload(MAX_IMAGE_BYTES)))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Upload or replace the profile photo',
    description:
      'Optional. Accepts JPG, JPEG and PNG up to 5 MB. The previous photo is deleted when replaced.',
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Unsupported file type or file over the size limit.' })
  uploadPhoto(@CurrentUser('id') userId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.usersService.uploadProfilePhoto(userId, requireUploadedFile(file));
  }

  @Delete('me/profile-photo')
  @ApiOperation({ summary: 'Remove the profile photo' })
  @ApiOkResponse({ type: ProfileResponseDto })
  removePhoto(@CurrentUser('id') userId: string): Promise<ProfileResponseDto> {
    return this.usersService.removeProfilePhoto(userId);
  }
}
