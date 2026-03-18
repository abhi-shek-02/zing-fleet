const router = require("express").Router();
const { z } = require("zod");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errorHandler");

const schema = z.object({
  car_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().min(0),
  cost_type: z.enum(["maintenance", "cf", "puc", "tax", "insurance", "other"]),
  notes: z.string().max(500).optional(),
});

router.get("/", async (req, res, next) => {
  try {
    let query = supabase.from("car_costs").select("*, cars(number, model)").order("date", { ascending: false });
    if (req.query.car_id) query = query.eq("car_id", req.query.car_id);
    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", validate(schema), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("car_costs").insert(req.body).select().single();
    if (error) throw new AppError(error.message, 500);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("car_costs").delete().eq("id", req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

module.exports = router;
