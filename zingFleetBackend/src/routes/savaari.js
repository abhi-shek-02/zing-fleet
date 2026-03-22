const router = require("express").Router();
const { AppError } = require("../middleware/errorHandler");
const {
  fetchSavaariNewBusiness,
  postSavaariPostInterest,
} = require("../lib/savaariVendor");

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

/**
 * POST /api/savaari/bid — proxies to vendor `booking.php?action=postInterest` (REAL MONEY).
 * Body (JSON): { booking_id, vendor_cost?, broadcast_id? } — camelCase aliases accepted.
 */
router.post("/bid", async (req, res, next) => {
  try {
    const booking_id = req.body?.booking_id ?? req.body?.bookingId;
    if (booking_id == null || String(booking_id).trim() === "") {
      return next(new AppError("booking_id is required", 400));
    }
    const vendor_cost = req.body?.vendor_cost ?? req.body?.vendorCost;
    const broadcast_id = req.body?.broadcast_id ?? req.body?.broadcastId;

    const json = await postSavaariPostInterest({
      bookingId: booking_id,
      vendorCost: vendor_cost,
      broadcastId: broadcast_id,
    });

    res.json({ success: true, data: json });
  } catch (err) {
    const status =
      err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    if (err.message === "Savaari returned non-JSON response") {
      return next(new AppError(err.message, 502));
    }
    if (err.upstream) {
      return res.status(status).json({
        success: false,
        error: err.message || "Savaari bid failed",
        data: err.upstream,
      });
    }
    next(new AppError(err.message || "Savaari bid failed", status));
  }
});

module.exports = router;
