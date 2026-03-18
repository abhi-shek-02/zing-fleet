const router = require("express").Router();
const { z } = require("zod");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errorHandler");

const vendorSchema = z.object({
  driver_id: z.string().uuid(),
  car_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().min(0),
  booking_id: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

router.get("/", async (req, res, next) => {
  try {
    let query = supabase.from("vendor_entries").select("*").order("date", { ascending: false });
    if (req.query.driver_id) query = query.eq("driver_id", req.query.driver_id);
    if (req.query.week_start) query = query.eq("week_start", req.query.week_start);
    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", validate(vendorSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("vendor_entries").insert(req.body).select().single();
    if (error) throw new AppError(error.message, 500);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.put("/:id", validate(vendorSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("vendor_entries").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("vendor_entries").delete().eq("id", req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

module.exports = router;
