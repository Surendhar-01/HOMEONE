import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { MainCategoryResponseDto } from './dto/category.dto';

@ApiTags('Categories')
@Controller('main-categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'The seven customer categories with their live service domains',
    description:
      'Categories with no domains yet are returned with an empty list so the app can show honest coming-soon states.',
  })
  @ApiOkResponse({ type: [MainCategoryResponseDto] })
  findAll() {
    return this.categoriesService.findAll();
  }
}
