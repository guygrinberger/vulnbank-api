import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { users, User } from './data';

export const JWT_SECRET = process.env.VB_JWT_SECRET!;

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key', message: 'Provide X-API-Key header' });
    return;
  }
  const user = users.find((u) => u.apiKey === apiKey);
  if (!user) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }
  req.user = user;
  next();
}

export function jwtAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header', message: 'Provide Bearer token' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    const user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', details: (err as Error).message });
    return;
  }
}

export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header', message: 'Provide Basic auth credentials' });
    return;
  }
  const decoded = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  req.user = user;
  next();
}
