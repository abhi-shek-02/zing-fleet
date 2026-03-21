const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseServiceKey || "placeholder",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

module.exports = { supabase };
