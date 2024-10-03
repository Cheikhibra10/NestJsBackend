// notification.service.ts
import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { log } from 'console';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(clientId: number, message: string): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        clientId,
        message,
      },
    });
  }

  async getNotifications(clientId: number): Promise<Notification[]> {
    try {
      return await this.prisma.notification.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error in notificationService.getNotifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }
  

  async markAsRead(id: number): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }
}
