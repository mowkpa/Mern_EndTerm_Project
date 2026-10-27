import { httpError } from '../utils/httpError.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(httpError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(httpError(403, 'Forbidden: Insufficient role permissions'));
    }

    next();
  };
};
