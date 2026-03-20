const router = require("express").Router();
const { supabase } = require("../lib/supabase");
const { AppError } = require("../middleware/errorHandler");

// GET /api/analytics/fleet-summary
router.get("/fleet-summary", async (_req, res, next) => {
  try {
    const [carsRes, driversRes] = await Promise.all([
      supabase.from("cars").select("id, status"),
      supabase.from("drivers").select("id, status"),
    ]);
    if (carsRes.error) throw new AppError(carsRes.error.message, 500);
    if (driversRes.error) throw new AppError(driversRes.error.message, 500);

    res.json({
      success: true,
      data: {
        total_cars: carsRes.data.length,
        active_cars: carsRes.data.filter(c => c.status === "active").length,
        total_drivers: driversRes.data.length,
        active_drivers: driversRes.data.filter(d => d.status === "active").length,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/weekly?week_start=2026-03-16
router.get("/weekly", async (req, res, next) => {
  try {
    const { week_start } = req.query;
    if (!week_start) throw new AppError("week_start query param required", 400);

    const [cash, vendor, fuel, costs, earnings, settlements] = await Promise.all([
      supabase.from("cash_entries").select("amount").eq("week_start", week_start),
      supabase.from("vendor_entries").select("amount").eq("week_start", week_start),
      supabase.from("fuel_entries").select("cost").eq("week_start", week_start),
      supabase.from("other_cost_entries").select("amount").eq("week_start", week_start),
      supabase.from("other_earning_entries").select("amount").eq("week_start", week_start),
      supabase.from("settlements").select("amount").eq("week_start", week_start),
    ]);

    const sum = (arr, key) => (arr.data || []).reduce((s, r) => s + Number(r[key] || 0), 0);

    res.json({
      success: true,
      data: {
        total_cash: sum(cash, "amount"),
        total_vendor: sum(vendor, "amount"),
        total_fuel: sum(fuel, "cost"),
        total_other_costs: sum(costs, "amount"),
        total_other_earnings: sum(earnings, "amount"),
        total_settlements: sum(settlements, "amount"),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/driver/:id?week_start=2026-03-16
router.get("/driver/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { week_start } = req.query;
    if (!week_start) throw new AppError("week_start query param required", 400);

    const filters = { driver_id: id, week_start };
    const eq = (q) => q.eq("driver_id", id).eq("week_start", week_start);

    const [cash, vendor, fuel, costs, earnings, settlements, commRes] = await Promise.all([
      eq(supabase.from("cash_entries").select("amount")),
      eq(supabase.from("vendor_entries").select("amount")),
      eq(supabase.from("fuel_entries").select("cost")),
      eq(supabase.from("other_cost_entries").select("amount")),
      eq(supabase.from("other_earning_entries").select("amount")),
      eq(supabase.from("settlements").select("amount")),
      supabase.rpc("get_driver_commission_percent", { p_driver_id: id, p_week_start: week_start }),
    ]);

    const sum = (arr, key) => (arr.data || []).reduce((s, r) => s + Number(r[key] || 0), 0);
    const totalCash = sum(cash, "amount");
    const totalVendor = sum(vendor, "amount");
    const totalOtherEarn = sum(earnings, "amount");
    const totalFuel = sum(fuel, "cost");
    const totalOtherCosts = sum(costs, "amount");
    const totalSettled = sum(settlements, "amount");
    if (commRes.error) throw new AppError(commRes.error.message, 500);
    const commPct = commRes.data != null ? Number(commRes.data) : 30;
    const totalEarnings = totalVendor + totalOtherEarn;
    const commission = totalEarnings * (commPct / 100);
    const netEarnings = totalEarnings - commission - totalFuel - totalOtherCosts;
    const balance = totalCash - netEarnings - totalSettled;

    res.json({
      success: true,
      data: {
        total_cash: totalCash,
        total_vendor: totalVendor,
        total_other_earnings: totalOtherEarn,
        total_fuel: totalFuel,
        total_other_costs: totalOtherCosts,
        commission,
        total_settled: totalSettled,
        net_earnings: netEarnings,
        balance,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/mileage?car_id=xxx
router.get("/mileage", async (req, res, next) => {
  try {
    let query = supabase.from("fuel_entries").select("car_id, liters, odometer, date").order("date");
    if (req.query.car_id) query = query.eq("car_id", req.query.car_id);
    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
