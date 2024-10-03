import { Controller, Post, Body, HttpException, HttpStatus, UseGuards, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EncryptService } from 'src/encrypt/encrypt.service';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { Roles } from 'src/middlewares/guards/roles.decorator';
import { RolesGuard } from 'src/middlewares/guards/roles.guard';
import { PrismaService } from 'src/prisma/prisma.service';


@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly encryptService: EncryptService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async login(@Body() body: { login: string; password: string }) {
    const { login, password } = body;

    // Fetch user details from the database
    const user = await this.prisma.user.findUnique({
      where: { login },
      include: {
        client: true,  // Include client information
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Check if password is valid
    const isPasswordValid = await this.encryptService.comparePassword(user.password, password);
    if (!isPasswordValid) {
      throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
    }

    // Generate JWT token
    const token = this.encryptService.generateToken({
      id: user.id,
      login: user.login,
      role: user.role,
      prenom: user.client?.prenom,
      nom: user.client?.nom,
      clientId: user.clientId,
    });

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

  @Post('register')
// @UseGuards(AuthGuard, RolesGuard)
// @Roles('ADMIN')
async register(@Body() body: { login: string; password: string; role?: Role; clientId?: number }) {
  const hashedPassword = await this.encryptService.encryptPassword(body.password);

  // Validate Client ID
  if (body.clientId) {
    const client = await this.prisma.client.findUnique({
      where: { id: body.clientId },
    });
    if (!client) {
      throw new BadRequestException('Invalid client ID');
    }
  }

  try {
    const newUser = await this.prisma.user.create({
      data: {
        login: body.login,
        password: hashedPassword,
        role: body.role ?? Role.CLIENT,  // Default role to CLIENT
        clientId: body.clientId ?? null,
      },
      select: {
        id: true,
        login: true,
        role: true,
        createAt: true,
        updatedAt: true,
      },  // Exclude password from response
    });

    return newUser;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new BadRequestException('User with this login already exists');
    }
    throw new InternalServerErrorException('Something went wrong');
  }

}

}
