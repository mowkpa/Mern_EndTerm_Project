import { HttpError } from '../utils/httpError.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  // MongoDB duplicate key error fallback
  if (err.code === 11000) {
    return res.status(409).json({
      message: 'A resource with these unique properties already exists.',
      code: 'DUPLICATE_KEY',
    });
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid identifier format: ${err.value}`,
      code: 'INVALID_ID',
    });
  }

  console.error('[Unhandled Error]', err);

  const status = err.status || 500;
  const message = env.isProd ? 'Internal server error' : err.message || 'Internal server error';

  res.status(status).json({ message });
};
