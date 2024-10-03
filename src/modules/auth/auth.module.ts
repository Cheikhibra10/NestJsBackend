import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from 'src/controllers/auth/auth.controller';
import { EncryptService } from 'src/encrypt/encrypt.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/services/auth/auth.service';


@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JSECRET_ACCESS_TOKEN, // Your JWT secret
      signOptions: { expiresIn: '1d' }, // Token expiration time
    }),
  ],
  providers: [AuthService, PrismaService, EncryptService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
