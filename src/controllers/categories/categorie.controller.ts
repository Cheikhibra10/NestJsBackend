import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { Roles } from 'src/middlewares/guards/roles.decorator';
import { RolesGuard } from 'src/middlewares/guards/roles.guard';
import { CategorieService } from 'src/services/categories/categorie.service';

@Controller('api/categories')
export class CategorieController {
  constructor(private readonly categorieService: CategorieService) {}

  // API to seed the categories
  @Post('seed')

  async seedCategories() {
    return this.categorieService.seedCategories();
  }

  // API to get all categories
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async findAll() {
    return this.categorieService.findAll();
  }
}
