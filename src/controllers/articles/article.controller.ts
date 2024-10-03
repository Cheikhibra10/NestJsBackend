// src/modules/articles/article.controller.ts

import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import RestResponse from 'src/core/rest-response';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { Roles } from 'src/middlewares/guards/roles.decorator';
import { RolesGuard } from 'src/middlewares/guards/roles.guard';
import { ArticleService } from 'src/services/articles/article.service';


@Controller('api/articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN', 'CLIENT')
  async store(@Body() body: { libelle: string; prix: number; qteStock: number }) {
    const newArticle = await this.articleService.createArticle(body.libelle, body.prix, body.qteStock);
    return RestResponse.response(newArticle, 201, 'Article created');
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN', 'CLIENT')
  async show() {
    const articles = await this.articleService.getArticles();
    return RestResponse.response(articles, 200);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async edit(@Param('id') id: string) {
    const article = await this.articleService.getArticleById(Number(id));
    return RestResponse.response(article, 200);
  }

  @Patch(':id/stock')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async update(@Param('id') id: string, @Body() body: { qteStock: number }) {
    const updatedArticle = await this.articleService.updateArticleStock(Number(id), body.qteStock);
    return RestResponse.response(updatedArticle, 200, 'Stock updated');
  }

  @Get('find/:libelle')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async findByLibelle(@Param('libelle') libelle: string) {
    const article = await this.articleService.findArticleByLibelle(libelle);
    return RestResponse.response(article, 200);
  }
}
