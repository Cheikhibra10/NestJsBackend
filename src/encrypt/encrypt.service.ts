import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Define an interface for the JWT payload
interface Payload {
  id: number;
  login: string;
  role: string;
  prenom: string;
  nom: string;
  clientId: number | null;
}

// Load environment variables for JWT secret and expiry time
const { JSECRET_ACCESS_TOKEN, JSECRET_TIME_TO_EXPIRE } = process.env;

@Injectable()
export class EncryptService {

  /**
   * Hashes a password using bcrypt with 12 salt rounds.
   * 
   * @param password - Plaintext password to be hashed
   * @returns - Hashed password
   */
  async encryptPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compares a plaintext password with a hashed password.
   * 
   * @param password - Plaintext password to compare
   * @param hashPassword - Hashed password stored in the database
   * @returns - Whether the passwords match
   */
  async comparePassword(hashPassword: string, password: string): Promise<boolean> {
    return bcrypt.compare(password, hashPassword);
  }

  /**
   * Generates a JWT token for a given payload.
   * 
   * @param payload - Data to be encoded into the token
   * @param expiresIn - Optional expiration time (default from env)
   * @returns - JWT token
   */
  generateToken(payload: Payload, expiresIn: string = JSECRET_TIME_TO_EXPIRE!): string {
    return jwt.sign(payload, JSECRET_ACCESS_TOKEN!, { expiresIn });
  }
}
