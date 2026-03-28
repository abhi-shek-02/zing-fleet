const router = require("express").Router();
const { analyticsSupabase } = require("../lib/savariAnalytics");

router.get("/dashboard", async (_req, res, next) => {
  try {
    const { data: bookings, error } = await analyticsSupabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = bookings || [];
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

    const inMonth = (r, m) => (r.start_date || r.created_at || "").slice(0, 7) === m;
    const thisM = rows.filter((r) => inMonth(r, thisMonth));
    const lastM = rows.filter((r) => inMonth(r, lastMonth));

    const sum = (arr, k) => arr.reduce((s, r) => s + Number(r[k] || 0), 0);
    const avg = (arr, k) => (arr.length ? sum(arr, k) / arr.length : 0);
    const pctChange = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : 0);

    const summary = {
      totalTrips: rows.length,
      totalEarned: sum(rows, "vendor_cost"),
      avgPayout: Math.round(avg(rows, "vendor_cost")),
      avgSavariCutPct: Number(avg(rows, "savari_cut_pct").toFixed(1)),
      tripsTrend: pctChange(thisM.length, lastM.length),
      earnedTrend: pctChange(sum(thisM, "vendor_cost"), sum(lastM, "vendor_cost")),
      payoutTrend: pctChange(avg(thisM, "vendor_cost"), avg(lastM, "vendor_cost")),
    };

    // car_type × trip_type matrix
    const matrix = {};
    for (const r of rows) {
      const car = r.car_type || "Unknown";
      const trip = r.trip_type_name || "Other";
      if (!matrix[car]) matrix[car] = {};
      matrix[car][trip] = (matrix[car][trip] || 0) + 1;
    }

    // monthly by trip type + yoy
    const monthly = {};
    for (const r of rows) {
      const d = r.start_date || r.created_at || "";
      const ym = d.slice(0, 7);
      if (!ym) continue;
      const trip = r.trip_type_name || "Other";
      if (!monthly[ym]) monthly[ym] = { trips: 0, earned: 0, byType: {} };
      monthly[ym].trips += 1;
      monthly[ym].earned += Number(r.vendor_cost || 0);
      monthly[ym].byType[trip] = (monthly[ym].byType[trip] || 0) + 1;
    }

    const recent = rows.slice(0, 50);

    res.json({ success: true, data: { summary, matrix, monthly, recent } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
