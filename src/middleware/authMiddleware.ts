import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET || 'secret_session_key';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export const authenticateSession = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.auth_session;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as { userId: number; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    next();
  }
};
