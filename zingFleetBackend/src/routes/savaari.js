const router = require("express").Router();
const { AppError } = require("../middleware/errorHandler");

const UPSTREAM =
  "https://vendor.savaari.com/vendor/api/booking/v1/booking.php";

/** Vendor session token (same as `vendorToken` query param on vendor.savaari.com). */
const SAVAARI_VENDOR_TOKEN =
  "SkM5QmlFaVFsNEdvVjRHbFB4N2pXdXcrQjFSc296YmNPMnAzTUVkbWtYYUhjeDJmNVdrU3JlR2VWNHYxVnVWcHAyL0pSTGVBQjVJU0ZMeEgwQVVZTmFyWStuSitQcUh0cVpzaTFqOGhZc0E1a0ZFMUFTK0ZMeW0zYUd1dGlleXc=";

/**
 * Proxies Savaari vendor "new business" feed.
 * GET /api/savaari/new-business?booking_id=0
 */
router.get("/new-business", async (req, res, next) => {
  try {
    const bookingId = req.query.booking_id != null ? String(req.query.booking_id) : "0";
    const url = new URL(UPSTREAM);
    url.searchParams.set("action", "getNewBusiness");
    url.searchParams.set("vendorToken", SAVAARI_VENDOR_TOKEN);
    url.searchParams.set("booking_id", bookingId);

    const upstreamRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        Referer: "https://vendor.savaari.com/vendor/layout.html",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
      },
    });

    const text = await upstreamRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new AppError("Savaari returned non-JSON response", 502);
    }

    if (!upstreamRes.ok) {
      throw new AppError(
        `Savaari HTTP ${upstreamRes.status}`,
        upstreamRes.status >= 400 && upstreamRes.status < 600
          ? upstreamRes.status
          : 502
      );
    }

    const rs = json.resultset || json.resultSet || {};
    const broadcastDetails =
      rs.broadcast_details || rs.broadcastDetails || [];

    res.json({
      success: true,
      data: {
        items: Array.isArray(broadcastDetails) ? broadcastDetails : [],
        status: json.status,
        resultset: rs,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
