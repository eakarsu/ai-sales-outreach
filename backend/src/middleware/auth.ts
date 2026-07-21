import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
    subjects: string[];
  };
}

type Claims = { userId: string; email: string; role: string; tenantId: string; subjects: string[] };

function jwtSecret() {
  const value = process.env.JWT_SECRET || '';
  if (value.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return value;
}

function validClaims(value: Partial<Claims>): value is Claims {
  return typeof value.userId === 'string' && typeof value.email === 'string'
    && typeof value.role === 'string' && typeof value.tenantId === 'string'
    && Array.isArray(value.subjects) && value.subjects.every((subject) => typeof subject === 'string');
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Check token blacklist
    const blacklisted = await pool.query(
      'SELECT id FROM token_blacklist WHERE token = $1',
      [token]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }) as Partial<Claims>;
    if (!validClaims(decoded)) return res.status(403).json({ error: 'Signed tenant, role, and subject claims required' });
    const current = await pool.query('SELECT role FROM users WHERE id=$1', [decoded.userId]);
    if (!current.rowCount || current.rows[0].role !== decoded.role) {
      return res.status(403).json({ error: 'Signed role is stale' });
    }
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
      subjects: decoded.subjects,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Alias for legacy route files
export const authenticateToken = authenticate;

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions. Required role: ' + roles.join(' or '),
      });
    }
    next();
  };
};

export const authorizeOwnerOrAdmin = (userIdField: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role === 'admin') {
      return next();
    }
    const targetUserId = req.params[userIdField] || req.body[userIdField];
    if (req.user.userId !== targetUserId) {
      return res.status(403).json({ error: 'Not authorized to access this resource' });
    }
    next();
  };
};
