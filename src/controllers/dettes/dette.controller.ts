import { Controller, Post, Get, Param, Body, Put, UseGuards, NotFoundException, Delete, Res, HttpStatus, Patch, ParseIntPipe, Req, HttpException, UnauthorizedException } from '@nestjs/common';
import { DemandeStatus, Dette } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { Request } from 'express';
import RestResponse from 'src/core/rest-response';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { Roles } from 'src/middlewares/guards/roles.decorator';
import { RolesGuard } from 'src/middlewares/guards/roles.guard';
import { DetteService } from 'src/services/dettes/dette.service';
import { error } from 'console';

@Controller('api/dettes')
export class DetteController {
  constructor(private readonly detteService: DetteService) {}

@Post('demande')
@UseGuards(AuthGuard, RolesGuard)
@Roles('BOUTIQUIER', 'ADMIN', 'CLIENT')
async storeTemporaryDemande(@Body() body: any) {
  try {
    const response = await this.detteService.storeDemande(body);
    return RestResponse.response(response, StatusCodes.CREATED.valueOf());
  } catch (error) {
    console.error('Error in storeTemporaryDemande:', error);
    return this.handleError(error); // Ensure this method sends a meaningful error response
  }
}

@Get(':id/demande/articles')
@UseGuards(AuthGuard, RolesGuard)
@Roles('BOUTIQUIER', 'ADMIN')
async getArticlesByDemande(@Param('id', ParseIntPipe) id: number) {
  try {
    // Call the service method to fetch the articles for the demande
    const articles = await this.detteService.getArticlesByDemandeId(id);
    return articles;
  } catch (error) {
    // Handle errors such as NotFoundException and propagate the response
    throw new NotFoundException(error.message);
  }
}

@Patch(':id/status')
@UseGuards(AuthGuard, RolesGuard)
@Roles('BOUTIQUIER', 'ADMIN')
async updateDetteStatus(
  @Param('id', ParseIntPipe) id: number,
  @Body('status') status: DemandeStatus  // Accepting status directly from the request body
) {
  try{
    const updatedDette = await this.detteService.updateDetteStatus(id, status);
    return updatedDette;
  }catch (error) {
    // Handle errors such as NotFoundException and propagate the response
    throw new NotFoundException(error.message);
  }
}

  @Post('')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async store(@Body() body: any) {
    try {
      const newDette = await this.detteService.store(body);
      return RestResponse.response(newDette, StatusCodes.CREATED.valueOf());
    } catch (error) {
      return this.handleError(error);
    }
  }

  @Post(':id/relance')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN', 'CLIENT')
  async relanceDebt(@Param('id') id: number) {
    try {
      const newDette = await this.detteService.relanceDebtRequest(id);
      return RestResponse.response(newDette, StatusCodes.CREATED.valueOf());
    } catch (error) {
      return this.handleError(error);
    }
  }
  

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async edit(@Param('id') id: string) {
    try {
      const dette = await this.detteService.getDemandeById(Number(id));
      return RestResponse.response(dette, StatusCodes.OK.valueOf());
    } catch (error) {
      return this.handleError(error);
    }
  }

  @Put(':id/paiements')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async storePayment(@Param('id') id: string, @Body() body: any) {
    try {
      const paiement = await this.detteService.registerPayment(Number(id), body.montant);
      return RestResponse.response(paiement, StatusCodes.OK.valueOf());
    } catch (error) {
      return this.handleError(error);
    }
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN', 'CLIENT')
  async getAllDemandes(){
    try {
      const demande =  await this.detteService.getAllDemandes();
      return RestResponse.response(demande, StatusCodes.OK.valueOf());
    } catch (error) {
      return this.handleError(error);
    }
  }

  @Get('/demandes/client')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN', 'CLIENT') 
  async getClientDemandes(@Req() req: Request): Promise<Dette[]> {
    const user = req.user; // Access user from request  
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    // Access clientId directly from the user object
    const clientId = user.clientId;  
    if (!clientId) {
      throw new UnauthorizedException('Client ID not found');
    }
    // Fetch demandes for the authenticated client
    const demandes = await this.detteService.getDemandesByClientId(clientId);
    return demandes; // Return the fetched demandes
  }
  

  @Get(':id/paiements')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async getPaiementsByDette(@Param('id') id: string) {
    try {
      const paiements = await this.detteService.getPaymentsByDetteId(Number(id));
      return RestResponse.response(paiements, StatusCodes.OK.valueOf());
    } catch (error) {
      return this.handleError(error);
    }
  }

  @Get(':id/articles')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async getArticlesByDette(@Param('id') id: string) {
    try {
      const articles = await this.detteService.getArticlesByDetteId(Number(id));
      return RestResponse.response(articles, StatusCodes.OK.valueOf());
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: any) {
    if (error.status) {
      return { status: error.status, message: error.response?.message || error.message };
    }
    return { status: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' };
  }

  @Patch(':clientId/cancel')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async cancelDemande(@Param('clientId') clientId: number, @Res() res: Response) {
    try {
      const response = await this.detteService.cancelDemande(clientId); // Call the cancelDemande method from your service
      return RestResponse.response({ message: 'Demande annulée avec succès', response }, StatusCodes.OK.valueOf());
    } catch (error) {
      return this.handleError(error);
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async deleteClient(@Param('id', ParseIntPipe) id: number) {
    return this.detteService.deleteDemande(id);
  }


}
