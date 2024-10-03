import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // Import JwtModule
import { ArticleController } from 'src/controllers/articles/article.controller';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleService } from 'src/services/articles/article.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use a secret key from your environment file or configuration service
      signOptions: { expiresIn: '1d' }, // Set expiration as needed
    }),
  ],
  controllers: [ArticleController],
  providers: [ArticleService, PrismaService, AuthGuard],
})
export class ArticleModule {}
