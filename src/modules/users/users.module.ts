import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from '../../controllers/users/users.controller';
import { UsersService } from '../../services/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptService } from 'src/encrypt/encrypt.service';
import { JwtService } from '@nestjs/jwt'; // Import JwtService if needed
import { EmailService } from 'src/services/email/email.service';
import { PdfService } from 'src/services/email/pdf.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use a secret key from your environment file or configuration service
      signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, EncryptService, EmailService, PdfService],
})
export class UsersModule {}
