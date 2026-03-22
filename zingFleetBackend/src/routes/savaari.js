const router = require("express").Router();
const { AppError } = require("../middleware/errorHandler");
const { fetchSavaariNewBusiness } = require("../lib/savaariVendor");

/**
 * Proxies Savaari vendor "new business" feed.
 * GET /api/savaari/new-business?booking_id=0
 */
router.get("/new-business", async (req, res, next) => {
  try {
    const bookingId =
      req.query.booking_id != null ? String(req.query.booking_id) : "0";
    const json = await fetchSavaariNewBusiness(bookingId);

    const rs = json.resultset || json.resultSet || {};
    const broadcastDetails = rs.broadcast_details || rs.broadcastDetails || [];

    res.json({
      success: true,
      data: {
        items: Array.isArray(broadcastDetails) ? broadcastDetails : [],
        status: json.status,
        resultset: rs,
      },
    });
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    if (err.message === "Savaari returned non-JSON response") {
      return next(new AppError(err.message, 502));
    }
    next(new AppError(err.message || "Savaari request failed", status));
  }
});

// POST bidding — REAL MONEY. Not mounted. Uncomment when you enable postInterest.
// const { SAVAARI_VENDOR_TOKEN } = require("../lib/savaariVendor");

module.exports = router;
