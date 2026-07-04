/**
 * Wraps an async route handler / middleware to catch any rejected promises
 * and pass them to the Express error handling middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
