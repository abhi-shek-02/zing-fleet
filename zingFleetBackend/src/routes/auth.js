const router = require("express").Router();
const { AppError } = require("../middleware/errorHandler");

// Simple PIN-based auth (matches frontend)
router.post("/login", (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) throw new AppError("PIN is required", 400);
    if (pin !== (process.env.ADMIN_PIN || "1234")) {
      throw new AppError("Invalid PIN", 401);
    }
    res.json({ success: true, data: { authenticated: true } });
  } catch (err) { next(err); }
});

module.exports = router;
