import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

import { Server } from 'socket.io';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  io?: Server;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token = req.header('Authorization')?.split(' ')[1];

  // Also support token from query params (useful for file downloads via <a> tags)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ message: 'No token provided, authorization denied' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({ message: `Access denied, requires ${role} role` });
      return;
    }
    next();
  };
};
