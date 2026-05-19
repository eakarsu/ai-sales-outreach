import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many AI requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many export requests, please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-feature AI rate limiters (hourly windows)
export const emailGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'Email generation limit reached. You can generate 50 emails per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const leadScoringLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { error: 'Lead scoring limit reached. You can score 100 leads per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forecastingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Forecasting limit reached. You can generate 10 forecasts per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
