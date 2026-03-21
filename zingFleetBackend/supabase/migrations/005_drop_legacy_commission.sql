DROP VIEW IF EXISTS public.v_driver_weekly_summary;

CREATE OR REPLACE VIEW public.v_driver_weekly_summary AS
SELECT
  d.id AS driver_id,
  d.name AS driver_name,
  public.get_driver_settlement_mode(d.id, ce.week_start) AS settlement_mode,
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

DROP TRIGGER IF EXISTS trg_driver_commission_history_insert ON public.drivers;

DROP FUNCTION IF EXISTS public.handle_new_driver_commission_history() CASCADE;

DROP TABLE IF EXISTS public.driver_commission_history CASCADE;

DROP FUNCTION IF EXISTS public.get_driver_commission_percent(UUID, DATE) CASCADE;

ALTER TABLE public.drivers DROP COLUMN IF EXISTS commission_percent;

GRANT SELECT ON public.v_driver_weekly_summary TO anon, authenticated, service_role;
