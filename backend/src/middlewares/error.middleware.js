/**
 * Global Express Error Handling Middleware.
 * Catches all unhandled controller exceptions and formats them into standard JSON responses.
 */
export const errorHandler = (err, req, res, next) => {
  // Log stack trace for backend debugging
  console.error(`[Error Handler] Path: ${req.path} | Error:`, err);

  // 1. Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errorDetails = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));

    return res.status(400).json({
      success: false,
      data: null,
      message: 'Database validation failed.',
      errors: errorDetails
    });
  }

  // 2. Handle MongoDB Duplicate Key (Code 11000) Error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'A record with this unique parameter already exists.',
      errors: err.keyValue
    });
  }

  // 3. Handle Mongoose Cast Error (Invalid ObjectIds)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      data: null,
      message: `Invalid value for attribute: ${err.path}.`,
    });
  }

  // 4. Handle generic or defined operational errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
export default errorHandler;
