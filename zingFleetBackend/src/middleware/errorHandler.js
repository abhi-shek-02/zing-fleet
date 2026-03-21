function errorHandler(err, _req, res, _next) {
  if (process.env.NODE_ENV === "production") {
    console.error("[ZingFleet]", err.message);
  } else {
    console.error("[ZingFleet Error]", err.message, err.stack);
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
}

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, AppError };
