-- ============================================================
-- Commission history: rate is resolved per operating week so
-- editing drivers.commission_percent does not rewrite past weeks.
-- ============================================================

CREATE TABLE public.driver_commission_history (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id            UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  effective_week_start DATE NOT NULL,  -- Monday; this rate applies to this week and later until a newer row exists
  commission_percent   NUMERIC(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (driver_id, effective_week_start)
);

CREATE INDEX idx_driver_commission_history_lookup
  ON public.driver_commission_history (driver_id, effective_week_start DESC);

COMMENT ON TABLE public.driver_commission_history IS
  'Effective commission % by week. Lookup: max(effective_week_start) <= week_monday. Baseline row uses 1970-01-05.';

-- Resolve commission % for a driver for a given week (Monday date).
CREATE OR REPLACE FUNCTION public.get_driver_commission_percent(
  p_driver_id UUID,
  p_week_start DATE
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT dch.commission_percent
      FROM public.driver_commission_history dch
      WHERE dch.driver_id = p_driver_id
        AND dch.effective_week_start <= COALESCE(p_week_start, DATE '1970-01-05')
      ORDER BY dch.effective_week_start DESC
      LIMIT 1
    ),
    30
  );
$$;

-- New drivers: seed baseline history so every driver has at least one row.
CREATE OR REPLACE FUNCTION public.handle_new_driver_commission_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.driver_commission_history (driver_id, effective_week_start, commission_percent)
  VALUES (NEW.id, DATE '1970-01-05', NEW.commission_percent);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_driver_commission_history_insert ON public.drivers;
CREATE TRIGGER trg_driver_commission_history_insert
  AFTER INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_driver_commission_history();

-- Backfill existing drivers (skip if already migrated)
INSERT INTO public.driver_commission_history (driver_id, effective_week_start, commission_percent)
SELECT d.id, DATE '1970-01-05', d.commission_percent
FROM public.drivers d
WHERE NOT EXISTS (
  SELECT 1 FROM public.driver_commission_history h WHERE h.driver_id = d.id
);

-- Weekly summary view: use week-specific commission, not drivers.commission_percent
DROP VIEW IF EXISTS public.v_driver_weekly_summary;

CREATE OR REPLACE VIEW public.v_driver_weekly_summary AS
SELECT
  d.id AS driver_id,
  d.name AS driver_name,
  public.get_driver_commission_percent(d.id, ce.week_start) AS commission_percent,
  ce.week_start,
  COALESCE(SUM(ce.amount), 0) AS total_cash,
  COALESCE((
    SELECT SUM(ve.amount) FROM public.vendor_entries ve
    WHERE ve.driver_id = d.id AND ve.week_start = ce.week_start
  ), 0) AS total_vendor,
  COALESCE((
    SELECT SUM(oe.amount) FROM public.other_earning_entries oe
    WHERE oe.driver_id = d.id AND oe.week_start = ce.week_start
  ), 0) AS total_other_earnings,
  COALESCE((
    SELECT SUM(fe.cost) FROM public.fuel_entries fe
    WHERE fe.driver_id = d.id AND fe.week_start = ce.week_start
  ), 0) AS total_fuel,
  COALESCE((
    SELECT SUM(oc.amount) FROM public.other_cost_entries oc
    WHERE oc.driver_id = d.id AND oc.week_start = ce.week_start
  ), 0) AS total_other_costs,
  COALESCE((
    SELECT SUM(s.amount) FROM public.settlements s
    WHERE s.driver_id = d.id AND s.week_start = ce.week_start
  ), 0) AS total_settled
FROM public.drivers d
LEFT JOIN public.cash_entries ce ON ce.driver_id = d.id
GROUP BY d.id, d.name, ce.week_start;

ALTER TABLE public.driver_commission_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.driver_commission_history;
CREATE POLICY "Allow all" ON public.driver_commission_history FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_commission_history TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_driver_commission_percent(UUID, DATE) TO anon, authenticated, service_role;
