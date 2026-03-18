const router = require("express").Router();
const { z } = require("zod");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errorHandler");

const carSchema = z.object({
  number: z.string().min(1).max(20),
  model: z.string().min(1).max(100),
  fuel_type: z.enum(["petrol", "diesel", "cng", "electric"]),
  expected_mileage: z.number().min(1).max(100).default(14),
  status: z.enum(["active", "inactive"]).default("active"),
});

router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from("cars").select("*").order("number");
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("cars").select("*").eq("id", req.params.id).single();
    if (error) throw new AppError(error.message, 404);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", validate(carSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("cars").insert(req.body).select().single();
    if (error) throw new AppError(error.message, 500);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.put("/:id", validate(carSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("cars").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("cars").delete().eq("id", req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

module.exports = router;
