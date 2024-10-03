// src/guards/auth.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.replace('Bearer ', '');
  
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
  
    try {
      const user = this.jwtService.verify(token, {
        secret: process.env.JSECRET_ACCESS_TOKEN,
      });
  
      if (!user || !user.clientId) {
        throw new UnauthorizedException('Invalid token payload'); // Updated check
      }
  
      request.user = user; // Attach user information
      return true;
    } catch (error) {
      console.error("Token verification error:", error); // Log the error
      throw new UnauthorizedException('Invalid Token');
    }
  }
  
}
