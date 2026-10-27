import { ZodError } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const fieldPath = firstIssue.path.join('.');
      const message = fieldPath ? `${fieldPath}: ${firstIssue.message}` : firstIssue.message;
      return res.status(400).json({
        message,
        code: 'VALIDATION_ERROR',
        errors: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    next(error);
  }
};
