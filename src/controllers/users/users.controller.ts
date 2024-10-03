import { Controller, Post, Put, Get, Param, Query, Body, UseGuards } from '@nestjs/common';
import { UsersService } from '../../services/users/users.service';
import { StatusCodes } from 'http-status-codes';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { Roles } from 'src/middlewares/guards/roles.decorator';
import { RolesGuard } from 'src/middlewares/guards/roles.guard';
import { EmailService } from 'src/services/email/email.service';

@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService, // Inject EmailService

  ) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async createUser(@Body() body: { login: string; password: string; role: Role; clientId?: number }) {
    try {
      // Create the user
      const user = await this.usersService.createUser(body.login, body.password, body.role, body.clientId);
  
      // Fetch the associated client details
      const client = await this.usersService.getClientById(body.clientId); // Fetch client data

      // Ensure client data exists
      if (!client) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          message: 'Client not found',
        };
      }
  
      // Prepare the data to be included in the email
      const userData = {
        nom: client.nom,
        prenom: client.prenom,
        telephone: client.telephone,
        adresse: client.adresse,
        email: body.login,
        photo: client.photo || '', // Use an empty string if photo doesn't exist
      };
  
      // Send the email with user and client data
      await this.emailService.sendUserEmail(userData);
  
      // Return the created user with a success message
      return {
        statusCode: StatusCodes.CREATED, // Return 201 for a successful creation
        data: user,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      };
    }
  }
    
  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async updateUser(@Param('id') id: string, @Body() body: { login?: string; password?: string; role?: Role; clientId?: number }) {
    const user = await this.usersService.updateUser(Number(id), body.login, body.password, body.role, body.clientId);
    return {
      statusCode: StatusCodes.OK,
      data: user,
    };
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async getAllUsers() {
    const users = await this.usersService.getAllUsers();
    return {
      statusCode: StatusCodes.OK,
      data: users,
    };
  }

  @Get('by-role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async getUsersByRole(@Query('role') role: Role) {
    const users = await this.usersService.getUsersByRole(role);
    return {
      statusCode: StatusCodes.OK,
      data: users,
    };
  }
}
