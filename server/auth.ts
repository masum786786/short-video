import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'short_video_jwt_secret_key_2026';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@shortvideo.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mr@786';

export interface AdminPayload {
  email: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

export function generateAdminToken(email?: string): string {
  return jwt.sign({ email: email || ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAdminCredentials(password: string): boolean {
  const cleanPass = (password || '').trim();
  // Strictly require mr@786 password
  return cleanPass === 'mr@786' || cleanPass === ADMIN_PASSWORD.trim();
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(403).json({ error: '403 – Access Denied: Admin authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload;
    if (decoded && decoded.role === 'admin') {
      (req as any).admin = decoded;
      next();
    } else {
      res.status(403).json({ error: '403 – Access Denied: Insufficient privileges' });
    }
  } catch (err) {
    res.status(403).json({ error: '403 – Access Denied: Invalid or expired token' });
  }
}
