// notification.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { StatusCodes } from 'http-status-codes';
import RestResponse from 'src/core/rest-response';
import { AuthGuard } from 'src/middlewares/guards/auth.guard';
import { Roles } from 'src/middlewares/guards/roles.decorator';
import { RolesGuard } from 'src/middlewares/guards/roles.guard';
import { NotificationService } from 'src/services/notifications/notification.service';

@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN')
  async create(@Body() body: { clientId: number; message: string }) {
    try {
      const { clientId, message } = body;
      const response = await this.notificationService.createNotification(clientId, message);
      return RestResponse.response(response, StatusCodes.CREATED.valueOf());
    } catch (error) {
      return this.handleError(error); // Ensure this method sends a meaningful error response
    }    
  }

  
  @Get(':clientId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BOUTIQUIER', 'ADMIN', 'CLIENT')
  async getNotifications(@Param('clientId') clientId: string) {
    try {
      // Convert clientId to a number
      const parsedClientId = parseInt(clientId, 10);
      if (isNaN(parsedClientId)) {
        throw new Error('Invalid clientId');
      }
      
      const newDette = await this.notificationService.getNotifications(parsedClientId);      
      return RestResponse.response(newDette, StatusCodes.OK.valueOf());
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

}
