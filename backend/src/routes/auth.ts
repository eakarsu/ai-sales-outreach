import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { validateLogin, validateRegister, validateChangePassword, validatePasswordStrength } from '../middleware/validate';

const router = Router();
function jwtSecret() {
  const value = process.env.JWT_SECRET || '';
  if (value.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return value;
}

function tokenClaims(user: { id: string; email: string; role: string }) {
  const tenantId = process.env.DEFAULT_TENANT_ID || '';
  if (tenantId.length < 8) throw new Error('DEFAULT_TENANT_ID is required');
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId,
    subjects: ['admin', 'manager'].includes(user.role) ? ['*'] : [user.id],
  };
}

// Login
router.post('/login', validateLogin, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      tokenClaims(user),
      jwtSecret(),
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    // Get user's team
    const teamResult = await pool.query(
      `SELECT t.*,
        (SELECT COUNT(*) FROM contacts c WHERE c.team_id = t.id) as contact_count
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY contact_count DESC
       LIMIT 1`,
      [user.id]
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified || false,
      },
      team: teamResult.rows[0] || null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register with password strength validation
router.post('/register', validateRegister, async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Password strength check
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ error: 'Weak password', details: strength.errors });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email, first_name, last_name, role, email_verified`,
      [email, passwordHash, firstName, lastName]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      tokenClaims(user),
      jwtSecret(),
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    // Create email verification token
    const verificationToken = uuidv4();
    await pool.query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [user.id, verificationToken]
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: false,
      },
      verificationRequired: true,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check blacklist
    const blacklisted = await pool.query(
      'SELECT id FROM token_blacklist WHERE token = $1',
      [token]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }) as any;

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, avatar_url, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    const teamResult = await pool.query(
      `SELECT t.*,
        (SELECT COUNT(*) FROM contacts c WHERE c.team_id = t.id) as contact_count
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY contact_count DESC
       LIMIT 1`,
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified || false,
      },
      team: teamResult.rows[0] || null
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout - blacklist the token
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }) as any;

    await pool.query(
      `INSERT INTO token_blacklist (token, user_id, expires_at)
       VALUES ($1, $2, to_timestamp($3))
       ON CONFLICT DO NOTHING`,
      [token, decoded.userId, decoded.exp]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Even if token is invalid, return success
    res.json({ message: 'Logged out successfully' });
  }
});

// Change password
router.post('/change-password', validateChangePassword, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }) as any;

    const { currentPassword, newPassword } = req.body;

    // Validate new password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: 'Weak password', details: strength.errors });
    }

    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, decoded.userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request
router.post('/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;

    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const resetToken = uuidv4();
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [userResult.rows[0].id, resetToken]
    );

    // In production, send email here
    res.json({
      message: 'If the email exists, a reset link has been sent.',
      resetToken, // Only for demo - remove in production
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset confirm
router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: 'Weak password', details: strength.errors });
    }

    const tokenResult = await pool.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const userId = tokenResult.rows[0].user_id;
    const newHash = await bcrypt.hash(newPassword, 12);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const tokenResult = await pool.query(
      `SELECT user_id FROM email_verifications
       WHERE token = $1 AND verified = false AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const userId = tokenResult.rows[0].user_id;
    await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);
    await pool.query('UPDATE email_verifications SET verified = true WHERE token = $1', [token]);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    if (process.env.EMAIL_PROVIDER_ENABLED !== 'true') {
      return res.status(503).json({ error: 'Email verification provider is not configured' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwtToken = authHeader.split(' ')[1];
    const decoded = jwt.verify(jwtToken, jwtSecret(), { algorithms: ['HS256'] }) as any;

    const verificationToken = uuidv4();
    await pool.query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [decoded.userId, verificationToken]
    );

    res.status(501).json({
      error: 'Verification provider handoff is not implemented; token retained for an approved worker',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check password strength
router.post('/check-password-strength', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const result = validatePasswordStrength(password);

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  const levels = ['very_weak', 'weak', 'fair', 'good', 'strong', 'very_strong'];
  const level = levels[Math.min(score, levels.length - 1)];

  res.json({
    valid: result.valid,
    errors: result.errors,
    score,
    level,
  });
});

export default router;
