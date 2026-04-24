import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: (e as any).path,
        message: e.msg,
      })),
    });
  }
  next();
};

const sanitizeString = (value: string) => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') return sanitizeString(obj);
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      return obj;
    };
    req.body = sanitize(req.body);
  }
  next();
};

export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  handleValidationErrors,
];

export const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').isLength({ min: 1, max: 100 }).trim().withMessage('First name is required'),
  body('lastName').isLength({ min: 1, max: 100 }).trim().withMessage('Last name is required'),
  handleValidationErrors,
];

export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (password.length > 128) errors.push('Password must be less than 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Password must contain at least one special character');
  return { valid: errors.length === 0, errors };
};

export const validateChangePassword = [
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  handleValidationErrors,
];

export const validateContact = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('firstName').optional().isLength({ max: 100 }).trim(),
  body('lastName').optional().isLength({ max: 100 }).trim(),
  body('company').optional().isLength({ max: 255 }).trim(),
  body('jobTitle').optional().isLength({ max: 255 }).trim(),
  handleValidationErrors,
];

export const validateCampaign = [
  body('name').isLength({ min: 1, max: 255 }).trim().withMessage('Campaign name is required'),
  body('description').optional().isLength({ max: 2000 }).trim(),
  handleValidationErrors,
];

export const validateTemplate = [
  body('name').isLength({ min: 1, max: 255 }).trim().withMessage('Template name is required'),
  body('subject').isLength({ min: 1, max: 500 }).trim().withMessage('Subject is required'),
  body('body').isLength({ min: 1 }).withMessage('Body is required'),
  handleValidationErrors,
];

export const validateBulkIds = [
  body('ids').isArray({ min: 1 }).withMessage('At least one ID is required'),
  body('ids.*').isUUID().withMessage('Each ID must be a valid UUID'),
  handleValidationErrors,
];

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isString().trim(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  handleValidationErrors,
];

export const validateUUID = [
  param('id').isUUID().withMessage('Invalid ID format'),
  handleValidationErrors,
];
