const router = require("express").Router();
const { z } = require("zod");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errorHandler");

const driverSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  car_id: z.string().uuid().nullable().optional(),
  commission_percent: z.number().min(0).max(100).default(30),
  status: z.enum(["active", "inactive"]).default("active"),
});

// GET /api/drivers
router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from("drivers").select("*, cars(number, model)").order("name");
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
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
router.put("/:id", validate(driverSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("drivers").update(req.body).eq("id", req.params.id).select().single();
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
