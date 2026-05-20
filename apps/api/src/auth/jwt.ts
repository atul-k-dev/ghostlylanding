import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

const getSecret = (): string => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }
  return config.jwtSecret;
};

export const signJwt = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, getSecret(), options);
};

export const verifyJwt = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, getSecret());
  if (typeof decoded === 'string' || !decoded.sub || !('email' in decoded)) {
    throw new Error('invalid token payload');
  }
  return {
    sub: String(decoded.sub),
    email: String(decoded.email),
  };
};
