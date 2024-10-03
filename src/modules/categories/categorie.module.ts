import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CategorieController } from 'src/controllers/categories/categorie.controller';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategorieService } from 'src/services/categories/categorie.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use a secret key from your environment file or configuration service
      signOptions: { expiresIn: '1d' }, // Set expiration as needed
    }),
  ],
  providers: [CategorieService, PrismaService, AuthGuard],
  controllers: [CategorieController],
})
export class CategorieModule {}
