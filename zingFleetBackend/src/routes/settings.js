const router = require("express").Router();
const { z } = require("zod");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errorHandler");

const schema = z.object({
  fuel_threshold: z.number().min(1).max(50),
});

router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from("app_settings").select("*").single();
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.put("/", validate(schema), async (req, res, next) => {
  try {
    const { data: existing } = await supabase.from("app_settings").select("id").single();
    if (!existing) throw new AppError("Settings not found", 404);
    const { data, error } = await supabase.from("app_settings").update(req.body).eq("id", existing.id).select().single();
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
