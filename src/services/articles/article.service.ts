import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Article, Prisma } from '@prisma/client';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  // Create new article
  async createArticle(libelle: string, prix: number, qteStock: number) {
    try {
      return await this.prisma.article.create({
        data: { libelle, prix, qteStock },
      });
    } catch (error) {
      throw new HttpException('Error creating article', HttpStatus.BAD_REQUEST);
    }
  }

  // Get all articles
  async getArticles() {
    return this.prisma.article.findMany({
      select: { id: true, libelle: true, qteStock: true, prix: true },
      orderBy: { id: 'desc' },
    });
  }

  // Get article by ID
  async getArticlesByIds(articleIds: number[]): Promise<Article[]> {
    return await this.prisma.article.findMany({
      where: {
        id: { in: articleIds },
      },
      select: {
        id: true,
        libelle: true,
        prix: true,
        qteStock: true,
        createAt: true,
        updatedAt: true,
      },
    });
  }
  
  
  async getArticleById(articleId: number): Promise<Article> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId }, // Fetch by 'id'
    });
  
    if (!article) {
      throw new BadRequestException(`Article with ID ${articleId} not found`);
    }
  
    // Return the complete article object
    return {
      id: article.id,
      libelle: article.libelle,
      prix: article.prix,
      qteStock: article.qteStock,
      createAt: article.createAt, // Ensure these fields are returned
      updatedAt: article.updatedAt, // Ensure these fields are returned
    };
  }
  
  

  // Update article stock quantity
  async updateArticleStock(id: number, qteStock: number) {
    if (qteStock < 0) {
      throw new HttpException('Invalid qteStock', HttpStatus.BAD_REQUEST);
    }

    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { qteStock: true },
    });

    if (!article) {
      throw new HttpException("Article doesn't exist", HttpStatus.NOT_FOUND);
    }

    const newQteStock = article.qteStock + qteStock;

    return await this.prisma.article.update({
      where: { id },
      data: { qteStock: newQteStock },
      select: { id: true, libelle: true, prix: true, qteStock: true, updatedAt: true },
    });
  }

  // Find article by libelle
  async findArticleByLibelle(libelle: string) {
    const article = await this.prisma.article.findFirst({
      where: { libelle },
      select: { id: true, libelle: true, qteStock: true, prix: true },
    });

    if (!article) {
      throw new HttpException("Article doesn't exist", HttpStatus.NOT_FOUND);
    }

    return article;
  }
}
