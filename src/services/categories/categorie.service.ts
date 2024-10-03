import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategorieService {
  constructor(private prisma: PrismaService) {}

  async seedCategories() {
    const categories = [
      { libelle: 'Gold' },
      { libelle: 'Silver' },
      { libelle: 'Bronze' }
    ];

    // Seed categories if they don't already exist
    for (const category of categories) {
      const existingCategory = await this.prisma.categorie.findUnique({
        where: { libelle: category.libelle },
      });

      if (!existingCategory) {
        await this.prisma.categorie.create({
          data: category,
        });
      }
    }

    return { message: 'Categories seeded successfully' };
  }

  async findAll() {
    return this.prisma.categorie.findMany();
  }
}
