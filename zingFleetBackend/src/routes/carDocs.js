const router = require("express").Router();
const { z } = require("zod");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errorHandler");

const schema = z.object({
  car_id: z.string().uuid(),
  doc_type: z.enum(["rc", "insurance", "puc", "permit", "fitness", "other"]),
  doc_name: z.string().min(1).max(200),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
  file_url: z.string().url().optional(),
  file_name: z.string().max(255).optional(),
});

router.get("/", async (req, res, next) => {
  try {
    let query = supabase.from("car_documents").select("*, cars(number, model)").order("expiry_date");
    if (req.query.car_id) query = query.eq("car_id", req.query.car_id);
    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", validate(schema), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("car_documents").insert(req.body).select().single();
    if (error) throw new AppError(error.message, 500);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("car_documents").delete().eq("id", req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

module.exports = router;
