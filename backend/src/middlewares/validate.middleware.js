/**
 * Express middleware wrapper to validate request payloads using Zod schemas.
 * Strips out unvalidated/unrecognized keys from req.body on success.
 * @param {import('zod').ZodSchema} schema - Zod validation schema.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed.',
      errors: result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }

  // Assign cleaned/sanitized data to req.body
  req.body = result.data;
  next();
};
