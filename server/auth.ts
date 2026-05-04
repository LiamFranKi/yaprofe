import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_SECRET) as { sub: string };
}

/** Bearer opcional (p. ej. listados con datos extra para quien está logueado). */
export function tryGetUserIdFromAuthHeader(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try {
    const { sub } = verifyToken(h.slice(7));
    return sub;
  } catch {
    return null;
  }
}

export function newId(): string {
  return randomUUID();
}

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  try {
    const { sub } = verifyToken(h.slice(7));
    req.userId = sub;
    pool
      .execute<RowDataPacket[]>('SELECT COALESCE(is_active, 1) AS a FROM profiles WHERE id = ?', [sub])
      .then(([rows]) => {
        const row = rows[0];
        if (!row) {
          res.status(401).json({ error: 'Usuario no encontrado' });
          return;
        }
        if (Number(row.a) === 0) {
          res.status(403).json({ error: 'Cuenta desactivada' });
          return;
        }
        next();
      })
      .catch(() => res.status(500).json({ error: 'Error' }));
  } catch {
    res.status(401).json({ error: 'Token invalido' });
  }
}
