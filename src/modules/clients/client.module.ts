import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientController } from 'src/controllers/clients/client.controller';
import { EncryptService } from 'src/encrypt/encrypt.service';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientService } from 'src/services/clients/client.service';


@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use a secret key from your environment file or configuration service
      signOptions: { expiresIn: '1d' }, // Set expiration as needed
    }),
  ],
  controllers: [ClientController],
  providers: [ClientService, PrismaService, EncryptService, AuthGuard],
})
export class ClientModule {}
