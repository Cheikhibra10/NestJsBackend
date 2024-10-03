import { Injectable, HttpStatus, HttpException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EncryptService } from 'src/encrypt/encrypt.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client'; // Import Role enum

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly encryptService: EncryptService,
  ) {}

  async login(login: string, password: string) {
    // Fetch user and associated client details
    const user = await this.prisma.user.findUnique({
      where: { login },
      select: {
        id: true,
        login: true,
        password: true,
        role: true,
        clientId: true,
        client: {
          select: {
            nom: true,
            prenom: true,
            telephone: true,
          },
        },
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Validate password
    const isPasswordValid = await this.encryptService.comparePassword(user.password, password);
    if (!isPasswordValid) {
      throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
    }

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      login: user.login,
      role: user.role,
      prenom: user.client?.prenom,
      nom: user.client?.nom,
      clientId: user.clientId,
    };
    const token = this.jwtService.sign(tokenPayload);

    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        client: user.client,
      },
    };
  }

  async register(login: string, password: string, role: string, clientId?: number) {
    // Validate role
    if (!Object.values(Role).includes(role as Role)) {
      throw new BadRequestException('Invalid role provided');
    }

    // Encrypt the password
    const hashedPassword = await this.encryptService.encryptPassword(password);

    // Create the user
    const newUser = await this.prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        role: role as Role, // Ensure 'role' is of type Role
        clientId,
      },
    });

    // If clientId exists and is a CLIENT, change its role to BOUTIQUIER
    if (clientId) {
      const clientUser = await this.prisma.user.findUnique({
        where: { id: clientId },
      });

      if (clientUser && clientUser.role === Role.CLIENT) {
        await this.prisma.user.update({
          where: { id: clientId },
          data: { role: Role.BOUTIQUIER },
        });
      }
    }

    return newUser;
  }
}
