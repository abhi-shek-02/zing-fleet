const router = require("express").Router();
const { z } = require("zod");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errorHandler");
const { getMondayDateString } = require("../lib/week");

const settlementModeEnum = z.enum(["commission_30", "profit_share_50"]);

const driverSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  car_id: z.string().uuid().nullable().optional(),
  settlement_mode: settlementModeEnum.default("commission_30"),
  status: z.enum(["active", "inactive"]).default("active"),
});

const driverUpdateSchema = driverSchema.partial().extend({
  settlement_effective_week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from("drivers").select("*, cars(number, model)").order("name");
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/settlement-mode-history", async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("driver_settlement_mode_history")
      .select("driver_id, effective_week_start, settlement_mode")
      .order("effective_week_start", { ascending: true });
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("drivers").select("*, cars(*)").eq("id", req.params.id).single();
    if (error) throw new AppError(error.message, 404);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", validate(driverSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("drivers").insert(req.body).select().single();
    if (error) throw new AppError(error.message, 500);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.put("/:id", validate(driverUpdateSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { settlement_effective_week_start, ...rest } = req.body;

    const { data: existing, error: fetchErr } = await supabase
      .from("drivers")
      .select("settlement_mode")
      .eq("id", id)
      .single();
    if (fetchErr) throw new AppError(fetchErr.message, 404);

    if (rest.settlement_mode !== undefined && rest.settlement_mode !== existing.settlement_mode) {
      const weekMon = settlement_effective_week_start || getMondayDateString();
      const { error: histErr } = await supabase.from("driver_settlement_mode_history").upsert(
        {
          driver_id: id,
          effective_week_start: weekMon,
          settlement_mode: rest.settlement_mode,
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

router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("drivers").delete().eq("id", req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

module.exports = router;
