const router = require("express").Router();
const { z } = require("zod");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errorHandler");
const { getMondayDateString } = require("../lib/week");

const driverSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  car_id: z.string().uuid().nullable().optional(),
  commission_percent: z.number().min(0).max(100).default(30),
  status: z.enum(["active", "inactive"]).default("active"),
});

const driverUpdateSchema = driverSchema.partial().extend({
  commission_effective_week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// GET /api/drivers
router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from("drivers").select("*, cars(number, model)").order("name");
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/drivers/commission-history — list all rows (small); used for week-accurate commission on the client
router.get("/commission-history", async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("driver_commission_history")
      .select("driver_id, effective_week_start, commission_percent")
      .order("effective_week_start", { ascending: true });
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

// GET /api/drivers/:id
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("drivers").select("*, cars(*)").eq("id", req.params.id).single();
    if (error) throw new AppError(error.message, 404);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/drivers
router.post("/", validate(driverSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("drivers").insert(req.body).select().single();
    if (error) throw new AppError(error.message, 500);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

// PUT /api/drivers/:id
router.put("/:id", validate(driverUpdateSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commission_effective_week_start, ...rest } = req.body;

    const { data: existing, error: fetchErr } = await supabase.from("drivers").select("commission_percent").eq("id", id).single();
    if (fetchErr) throw new AppError(fetchErr.message, 404);

    if (
      rest.commission_percent !== undefined &&
      Number(rest.commission_percent) !== Number(existing.commission_percent)
    ) {
      const weekMon = commission_effective_week_start || getMondayDateString();
      const { error: histErr } = await supabase.from("driver_commission_history").upsert(
        {
          driver_id: id,
          effective_week_start: weekMon,
          commission_percent: rest.commission_percent,
        },
        { onConflict: "driver_id,effective_week_start" }
      );
      if (histErr) throw new AppError(histErr.message, 500);
    }

    const { data, error } = await supabase.from("drivers").update(rest).eq("id", id).select().single();
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// DELETE /api/drivers/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("drivers").delete().eq("id", req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

module.exports = router;
