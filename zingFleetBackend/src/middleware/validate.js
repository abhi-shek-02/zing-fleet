const { AppError } = require("./errorHandler");

/**
 * Express middleware factory — validates req.body against a Zod schema
 */
function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
      return next(new AppError(`Validation failed — ${messages}`, 422));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
