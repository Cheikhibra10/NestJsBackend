// notification.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationController } from 'src/controllers/notifications/notification.controller';
import { NotificationService } from 'src/services/notifications/notification.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use a secret key from your environment file or configuration service
      signOptions: { expiresIn: '1d' }, // Set expiration as needed
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, PrismaService],
})
export class NotificationModule {}
