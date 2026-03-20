-- ============================================================
-- Data integrity notes: current week vs previous weeks
-- Apply AFTER 001_init.sql AND 002_driver_commission_history.sql
-- ============================================================
-- WHAT IS ALREADY SAFE (schema from 001):
--   Cash, vendor, fuel, other costs/earnings, settlements each
--   store week_start on every row. Totals for "week A" only sum rows
--   where week_start = A — editing this week's rows does not change
--   another week's rows in the database.
--
-- WHAT WAS NOT SAFE (fixed in 002):
--   drivers.commission_percent alone — changing it retconned ALL weeks.
--   002 adds driver_commission_history + get_driver_commission_percent().
--
-- REMAINING RISKS (app discipline / optional SQL below):
--   1) UPDATE a row and change week_start (moves money between weeks).
--   2) Direct SQL UPDATE drivers.commission_percent without a matching
--      driver_commission_history row — past weeks still use history lookup;
--      the profile column can disagree with "effective" rate until fixed.
--   3) week_start not a real Monday — filters/grouping can misalign.
-- ============================================================

COMMENT ON COLUMN public.drivers.commission_percent IS
  'Current/default % shown in UI. Historical weeks use driver_commission_history via get_driver_commission_percent(); do not rely on this column alone for past weeks.';

COMMENT ON COLUMN public.cash_entries.week_start IS
  'Monday (yyyy-mm-dd) of the operating week; isolates this row from other weeks.';

COMMENT ON COLUMN public.vendor_entries.week_start IS
  'Monday of the operating week; isolates this row from other weeks.';

COMMENT ON COLUMN public.fuel_entries.week_start IS
  'Monday of the operating week; isolates this row from other weeks.';

COMMENT ON COLUMN public.other_cost_entries.week_start IS
  'Monday of the operating week; isolates this row from other weeks.';

COMMENT ON COLUMN public.other_earning_entries.week_start IS
  'Monday of the operating week; isolates this row from other weeks.';

COMMENT ON COLUMN public.settlements.week_start IS
  'Monday of the operating week; isolates this row from other weeks.';

COMMENT ON TABLE public.driver_commission_history IS
  'Source of truth for commission % by time: max(effective_week_start) <= viewed_week. Baseline 1970-01-05. Changing drivers.commission_percent without a new row here leaves history unchanged for past weeks.';

-- ─── Verification: find rows where week_start is not Monday (ISO) ───
-- Run in SQL editor; fix data before enabling optional CHECKs below.
-- SELECT 'cash_entries' AS t, id, week_start FROM public.cash_entries WHERE EXTRACT(ISODOW FROM week_start::date) <> 1
-- UNION ALL
-- SELECT 'vendor_entries', id, week_start FROM public.vendor_entries WHERE EXTRACT(ISODOW FROM week_start::date) <> 1
-- UNION ALL
-- SELECT 'fuel_entries', id, week_start FROM public.fuel_entries WHERE EXTRACT(ISODOW FROM week_start::date) <> 1
-- UNION ALL
-- SELECT 'other_cost_entries', id, week_start FROM public.other_cost_entries WHERE EXTRACT(ISODOW FROM week_start::date) <> 1
-- UNION ALL
-- SELECT 'other_earning_entries', id, week_start FROM public.other_earning_entries WHERE EXTRACT(ISODOW FROM week_start::date) <> 1
-- UNION ALL
-- SELECT 'settlements', id, week_start FROM public.settlements WHERE EXTRACT(ISODOW FROM week_start::date) <> 1;

-- ─── OPTIONAL (uncomment only after verification query returns 0 rows) ───
-- Enforces that week_start is always ISO Monday, so weeks never "bleed"
-- together because of bad dates.
--
-- ALTER TABLE public.cash_entries
--   ADD CONSTRAINT cash_entries_week_start_is_monday
--   CHECK (EXTRACT(ISODOW FROM week_start::date) = 1);
-- ALTER TABLE public.vendor_entries
--   ADD CONSTRAINT vendor_entries_week_start_is_monday
--   CHECK (EXTRACT(ISODOW FROM week_start::date) = 1);
-- ALTER TABLE public.fuel_entries
--   ADD CONSTRAINT fuel_entries_week_start_is_monday
--   CHECK (EXTRACT(ISODOW FROM week_start::date) = 1);
-- ALTER TABLE public.other_cost_entries
--   ADD CONSTRAINT other_cost_entries_week_start_is_monday
--   CHECK (EXTRACT(ISODOW FROM week_start::date) = 1);
-- ALTER TABLE public.other_earning_entries
--   ADD CONSTRAINT other_earning_entries_week_start_is_monday
--   CHECK (EXTRACT(ISODOW FROM week_start::date) = 1);
-- ALTER TABLE public.settlements
--   ADD CONSTRAINT settlements_week_start_is_monday
--   CHECK (EXTRACT(ISODOW FROM week_start::date) = 1);
-- ALTER TABLE public.driver_commission_history
--   ADD CONSTRAINT driver_commission_history_effective_week_is_monday
--   CHECK (EXTRACT(ISODOW FROM effective_week_start::date) = 1);
