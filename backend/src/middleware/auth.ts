import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_expense_tracker_app';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn(`[Auth] Request blocked: No authorization token provided for path: ${req.originalUrl}`);
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      console.warn(`[Auth] Authentication failed for path: ${req.originalUrl}. Reason: ${err.message}`);
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    req.userId = decoded.userId;
    console.log(`[Auth] Authenticated User: ${decoded.userId} accessing path: ${req.originalUrl}`);
    next();
  });
};
