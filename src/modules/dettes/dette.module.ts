import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DetteController } from 'src/controllers/dettes/dette.controller';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleService } from 'src/services/articles/article.service';
import { DetteService } from 'src/services/dettes/dette.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use a secret key from your environment file or configuration service
      signOptions: { expiresIn: '1d' }, // Set expiration as needed
    }),
  ],
  controllers: [DetteController],
  providers: [DetteService, PrismaService, AuthGuard, ArticleService],
})
export class DetteModule {}
