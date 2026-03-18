require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { errorHandler } = require("./middleware/errorHandler");

// Route imports
const healthRoutes = require("./routes/health");
const driverRoutes = require("./routes/drivers");
const carRoutes = require("./routes/cars");
const cashRoutes = require("./routes/cash");
const vendorRoutes = require("./routes/vendor");
const fuelRoutes = require("./routes/fuel");
const otherCostRoutes = require("./routes/otherCosts");
const otherEarningRoutes = require("./routes/otherEarnings");
const settlementRoutes = require("./routes/settlements");
const carCostRoutes = require("./routes/carCosts");
const carDocRoutes = require("./routes/carDocs");
const analyticsRoutes = require("./routes/analytics");
const settingsRoutes = require("./routes/settings");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(morgan("short"));
app.use(express.json({ limit: "10mb" }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// ─── Routes ──────────────────────────────────────────────
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/other-costs", otherCostRoutes);
app.use("/api/other-earnings", otherEarningRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/car-costs", carCostRoutes);
app.use("/api/car-docs", carDocRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);

// ─── 404 ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── Global Error Handler ────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[ZingFleet] Server running on port ${PORT}`);
  console.log(`[ZingFleet] Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
