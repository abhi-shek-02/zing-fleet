ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS settlement_mode TEXT NOT NULL DEFAULT 'commission_30'
  CHECK (settlement_mode IN ('commission_30', 'profit_share_50'));

UPDATE public.drivers SET settlement_mode = CASE
  WHEN commission_percent >= 45 THEN 'profit_share_50'
  ELSE 'commission_30'
END;

CREATE TABLE public.driver_settlement_mode_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  effective_week_start DATE NOT NULL,
  settlement_mode TEXT NOT NULL CHECK (settlement_mode IN ('commission_30', 'profit_share_50')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (driver_id, effective_week_start)
);

CREATE INDEX idx_driver_settlement_mode_history_lookup
  ON public.driver_settlement_mode_history (driver_id, effective_week_start DESC);

INSERT INTO public.driver_settlement_mode_history (driver_id, effective_week_start, settlement_mode)
SELECT driver_id, effective_week_start,
  CASE WHEN commission_percent >= 45 THEN 'profit_share_50' ELSE 'commission_30' END
FROM public.driver_commission_history
ON CONFLICT (driver_id, effective_week_start) DO UPDATE
SET settlement_mode = EXCLUDED.settlement_mode;

INSERT INTO public.driver_settlement_mode_history (driver_id, effective_week_start, settlement_mode)
SELECT d.id, DATE '1970-01-05', d.settlement_mode
FROM public.drivers d
WHERE NOT EXISTS (
  SELECT 1 FROM public.driver_settlement_mode_history h WHERE h.driver_id = d.id
);

CREATE OR REPLACE FUNCTION public.get_driver_settlement_mode(
  p_driver_id UUID,
  p_week_start DATE
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT h.settlement_mode
      FROM public.driver_settlement_mode_history h
      WHERE h.driver_id = p_driver_id
        AND h.effective_week_start <= COALESCE(p_week_start, DATE '1970-01-05')
      ORDER BY h.effective_week_start DESC
      LIMIT 1
    ),
    'commission_30'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_driver_settlement_mode_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.driver_settlement_mode_history (driver_id, effective_week_start, settlement_mode)
  VALUES (NEW.id, DATE '1970-01-05', NEW.settlement_mode)
  ON CONFLICT (driver_id, effective_week_start) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_driver_settlement_mode_insert ON public.drivers;
CREATE TRIGGER trg_driver_settlement_mode_insert
  AFTER INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_driver_settlement_mode_history();

ALTER TABLE public.driver_settlement_mode_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.driver_settlement_mode_history;
CREATE POLICY "Allow all" ON public.driver_settlement_mode_history FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_settlement_mode_history TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_driver_settlement_mode(UUID, DATE) TO anon, authenticated, service_role;
