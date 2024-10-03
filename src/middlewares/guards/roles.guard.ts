// src/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Access user from request
  
    if (!user || !roles) {
      return false;
    }
  
    const hasRole = () => user.role && roles.includes(user.role);
    if (!hasRole()) {
      throw new UnauthorizedException('Forbidden');
    }
  
    // Check if clientId is present
    const clientId = user.clientId;
    if (!clientId) {
      throw new UnauthorizedException('Client ID not found'); // Update the message
    }
  
    return true;
  }
  
}
