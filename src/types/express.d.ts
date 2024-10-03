import * as express from 'express';

// Extend the Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number; // Adjust type based on your actual user ID type
        login: string;
        role: string;
        clientId: number;
      };
    }
  }
}