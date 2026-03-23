/**
 * Shared Savaari vendor session + upstream fetch (used by /api/savaari routes and the bot scheduler).
 */

const DEFAULT_BOOKING_API =
  "https://vendor.savaari.com/vendor/api/booking/v1/booking.php";

/** Same as vendorToken on vendor.savaari.com */
const SAVAARI_VENDOR_TOKEN =
  "SkM5QmlFaVFsNEdvVjRHbFB4N2pXdXcrQjFSc296YmNPMnAzTUVkbWtYYUhjeDJmNVdrU3JlR2VWNHYxVnVWcHAyL0pSTGVBQjVJU0ZMeEgwQVVZTmFyWStuSitQcUh0cVpzaTFqOGhZc0E1a0ZFMUFTK0ZMeW0zYUd1dGlleXc=";

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
  Referer: "https://vendor.savaari.com/vendor/layout.html",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
};

// Vendor endpoint appears to rely on a "vendor session" across calls.
// Keep cookies from getNewBusiness and reuse them for postInterest.
let vendorCookieHeader = "";

function rememberVendorCookies(upstreamRes) {
  try {
    // undici/Node fetch supports getSetCookie() in recent versions.
    const setCookies = upstreamRes.headers.getSetCookie
      ? upstreamRes.headers.getSetCookie()
      : (upstreamRes.headers.get && upstreamRes.headers.get("set-cookie")
          ? [upstreamRes.headers.get("set-cookie")]
          : []);

    if (!setCookies || !Array.isArray(setCookies) || setCookies.length === 0) return;

    // Convert "name=value; ..." entries into a Cookie header: "name=value; name2=value2"
    const cookiePairs = setCookies
      .map((c) => String(c).split(";")[0])
      .map((p) => p.trim())
      .filter(Boolean);

    if (cookiePairs.length) vendorCookieHeader = cookiePairs.join("; ");
  } catch {
    // Best-effort only. If cookies can't be captured, requests still proceed.
  }
}

function cookieHeaders() {
  return vendorCookieHeader ? { Cookie: vendorCookieHeader } : {};
}

/**
 * @param {string} [bookingId]
 * @returns {Promise<object>} raw upstream JSON
 */
async function fetchSavaariNewBusiness(bookingId = "0") {
  const base =
    (process.env.SAVAARI_BOOKING_API_URL || "").trim() || DEFAULT_BOOKING_API;
  const url = new URL(base);
  url.searchParams.set("action", "getNewBusiness");
  url.searchParams.set("vendorToken", SAVAARI_VENDOR_TOKEN);
  url.searchParams.set("booking_id", String(bookingId));

  const upstreamRes = await fetch(url.toString(), {
    method: "GET",
    headers: HEADERS,
  });

  rememberVendorCookies(upstreamRes);

  const text = await upstreamRes.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Savaari returned non-JSON response");
  }

  if (!upstreamRes.ok) {
    const err = new Error(`Savaari HTTP ${upstreamRes.status}`);
    err.status = upstreamRes.status;
    throw err;
  }

  return json;
}

/**
 * POST interest / bid on a broadcast (REAL MONEY — same vendor session as getNewBusiness).
 * Param names follow vendor `booking.php`; if upstream rejects, capture DevTools request and align fields.
 *
 * @param {{ bookingId: string|number, vendorCost?: string|number, broadcastId?: string|number }} p
 */
async function postSavaariPostInterest(p) {
  const base =
    (process.env.SAVAARI_BOOKING_API_URL || "").trim() || DEFAULT_BOOKING_API;
  const url = new URL(base);

  const params = new URLSearchParams();
  params.set("action", "postInterest");
  params.set("vendorToken", SAVAARI_VENDOR_TOKEN);
  params.set("booking_id", String(p.bookingId ?? "").trim());
  if (p.vendorCost != null && String(p.vendorCost).trim() !== "") {
    params.set("vendor_cost", String(p.vendorCost).trim());
  }
  if (p.broadcastId != null && String(p.broadcastId).trim() !== "") {
    params.set("broadcast_id", String(p.broadcastId).trim());
  }

  const upstreamRes = await fetch(url.toString(), {
    method: "POST",
    headers: {
      ...HEADERS,
      ...cookieHeaders(),
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params.toString(),
  });

  const text = await upstreamRes.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Savaari returned non-JSON response");
  }

  if (!upstreamRes.ok) {
    const err = new Error(`Savaari HTTP ${upstreamRes.status}`);
    err.status = upstreamRes.status;
    err.upstream = json;
    throw err;
  }

  return json;
}

module.exports = {
  SAVAARI_VENDOR_TOKEN,
  DEFAULT_BOOKING_API,
  fetchSavaariNewBusiness,
  postSavaariPostInterest,
};
