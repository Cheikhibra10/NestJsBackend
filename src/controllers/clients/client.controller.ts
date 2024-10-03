import {
    Controller,
    Post,
    Get,
    Put,
    Param,
    Body,
    Res,
    HttpStatus,
    UseInterceptors,
    UploadedFile,
    ParseIntPipe,
    UseGuards,
    Query,
    Delete,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
import { Client } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
  import { Multer } from 'multer'; // Import Multer directly
import RestResponse from 'src/core/rest-response';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { Roles } from 'src/middlewares/guards/roles.decorator';
import { RolesGuard } from 'src/middlewares/guards/roles.guard';
import { ClientService } from 'src/services/clients/client.service';
  
  @Controller('api/clients')
  export class ClientController {
    constructor(private readonly clientService: ClientService) {}
  
  @Post('create')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async createClient(@Body() createClientDto: Client) {
    return this.clientService.createClientCategory(createClientDto);
  }


    @Post('')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('BOUTIQUIER', 'ADMIN')
    @UseInterceptors(FileInterceptor('photo'))
    async store(
      @Body() body: any,                // Form data (nom, prenom, telephone, etc.)
      @UploadedFile() photo: Express.Multer.File, // The uploaded file from the request
      @Res() res,
    ) {
      try {
        // Pass form data and photo to the client creation service
        const newClient = await this.clientService.createClient(body, photo);
        return res.status(HttpStatus.CREATED).json(newClient);
      } catch (error) {
        console.error('Error during client creation:', error.message);
        return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
      }
    }

    
@Get()
@UseGuards(AuthGuard, RolesGuard)
@Roles('BOUTIQUIER', 'ADMIN')
async show(@Res() res, @Query('userId') userId?: string, @Query('hasUser') hasUser?: string) {
  try {
    // Convert userId to a number if it's provided
    const userIdNumber = userId ? parseInt(userId, 10) : undefined;

    // Call the getClients method with the optional parameters
    const clients = await this.clientService.getClients(userIdNumber, hasUser);

    return res.status(HttpStatus.OK).json(clients);
  } catch (error) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
}

@Get('dette')
@UseGuards(AuthGuard, RolesGuard)
@Roles('BOUTIQUIER', 'ADMIN')
async getDettesByClients(@Res() res) {
  try {
    const client = await this.clientService.getDettesByClients();
    return res.status(HttpStatus.OK).json(client);
  } catch (error) {
    return res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
  }
}

@Get(':id')
@UseGuards(AuthGuard, RolesGuard)
@Roles('BOUTIQUIER', 'ADMIN','CLIENT')
async edit(@Param('id') id: string) {
  try {
    const dette = await this.clientService.getClientById(Number(id));
    return RestResponse.response(dette, StatusCodes.OK.valueOf());
  } catch (error) {
    return this.handleError(error);
  }
}

@Put(':id')
@UseInterceptors(FileInterceptor('photo')) // Use this to handle file uploads
async updateClient(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: any, // Expecting the request body for client and user data
  @UploadedFile() photo?: Express.Multer.File, // Optional photo upload
) {
  return this.clientService.updateClient(id, body, photo);
}
  
@Get('telephone/:telephone')
@UseGuards(AuthGuard, RolesGuard)
@Roles('BOUTIQUIER', 'ADMIN')
async findByTelephone(@Param('telephone') telephone: string, @Res() res) {
  try {
    const client = await this.clientService.getClientByTelephone(telephone);
    return res.status(HttpStatus.OK).json(client);
  } catch (error) {
    return res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
  }
}
  
@Get('/:telephone/dette')
@UseGuards(AuthGuard, RolesGuard)
@Roles('BOUTIQUIER', 'ADMIN')
async getDettesByClientTelephone(@Param('telephone') telephone: string, @Res() res) {
  try {
    const client = await this.clientService.getDettesByClientTelephone(telephone);
    return res.status(HttpStatus.OK).json(client);
  } catch (error) {
    return res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
  }
}

  @Get(':id/dettes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN', 'CLIENT')
  async getDettesByClientId(@Param('id', ParseIntPipe) id: number, @Res() res) {
    try {
      const dettes = await this.clientService.getDettesByClientId(id);
      return res.status(HttpStatus.OK).json(dettes);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }
  
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async deleteClient(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.deleteClient(id);
  }

  private handleError(error: any) {
    if (error.status) {
      return { status: error.status, message: error.response?.message || error.message };
    }
    return { status: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' };
  }

}
  