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
const savaariRoutes = require("./routes/savaari");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: comma-separated FRONTEND_URL + sensible defaults (Vite ports + production Vercel)
const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "https://zing-fleet.vercel.app",
];
const extraFromEnv = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigins = [...new Set([...defaultCorsOrigins, ...extraFromEnv])];

// ─── Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(morgan("short"));
app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  })
);

// ─── Routes ──────────────────────────────────────────────
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/savaari", savaariRoutes);
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
app.listen(PORT);

module.exports = app;
