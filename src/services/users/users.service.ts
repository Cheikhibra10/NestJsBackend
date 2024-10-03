import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptService } from 'src/encrypt/encrypt.service';
import { Role } from '@prisma/client'; // Import User and Role
  
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptService: EncryptService, // Inject EncryptService
  ) {}

  async createUser(login: string, password: string, role: Role, clientId?: number) {
    // Check if the client exists first
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException("Client n'existe pas");
    }

    // Hash the password before storing
    const hashedPassword = await this.encryptService.encryptPassword(password);

    const newUser = await this.prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        role: role || Role.CLIENT,
        client: {
          connect: { id: clientId },
        },
      },
    });

    return newUser;
  }

  async getClientById(clientId: number){
    return  this.prisma.client.findUnique({
      where: { id: clientId },
    });
  }

  async updateUser(id: number, login?: string, password?: string, role?: Role, clientId?: number) {
    // Find the existing user
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("l'Utilisateur n'existe pas");
    }

    // Check if the client exists if clientId is provided
    if (clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: clientId } });
      if (!client) {
        throw new NotFoundException("Client n'existe pas");
      }
    }

    // Hash the password only if it's being updated
    const updatedPassword = password ? await this.encryptService.encryptPassword(password) : user.password;

    // Update the user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        login: login || user.login,
        password: updatedPassword,
        role: role || user.role,
        client: clientId ? { connect: { id: clientId } } : undefined,
      },
    });

    return updatedUser;
  }

  async getAllUsers() {
    return await this.prisma.user.findMany({
      include: {
        client: {
          select: {
            prenom: true,
            nom: true,
            telephone: true,
            dettes: { // Include the dettes relation
              select: {
                montant: true,
                montantDue: true,
                montantVerser: true,
                date: true,
              },
            },
          },
        },
      },
    });
  }
  

   async getUsersByRole(role: Role) { // Change type from string to Role
    const users = await this.prisma.user.findMany({ where: { role } });
    if (users.length === 0) {
      throw new NotFoundException("Pas de users pour ce role");
    }
    return users;
  }
}
