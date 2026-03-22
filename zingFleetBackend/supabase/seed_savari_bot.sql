-- ============================================================
-- Optional: seed bot config + routes for vendor 175236 (matches src/data/savariBotDummy.ts)
-- Run in Supabase SQL editor after migration 006, or when you want demo data.
-- Safe to re-run: upserts config; routes use ON CONFLICT.
-- Replace vendor id if yours differs.
-- ============================================================

INSERT INTO public.savari_bot_config (
  vendor_id,
  vendor_location,
  polling_interval_ms,
  api_url,
  car_types_csv,
  trip_outstation_oneway,
  trip_outstation_round,
  trip_local_rental,
  trip_airport_transfer,
  round_min_cost_per_km,
  round_min_cost_per_day,
  round_mileage_km_per_l,
  round_fuel_cost_per_l,
  rental_min_8h_80km,
  rental_min_4h_40km
) VALUES (
  '175236',
  'Kolkata, West Bengal',
  120000,
  'https://vendor.savaari.com/vendor/api/booking/v1/booking.php',
  'Toyota Etios or Equivalent, Wagon R or Equivalent',
  true,
  true,
  false,
  false,
  15,
  2000,
  22,
  94,
  1950,
  1200
)
ON CONFLICT (vendor_id) DO UPDATE SET
  vendor_location = excluded.vendor_location,
  polling_interval_ms = excluded.polling_interval_ms,
  api_url = excluded.api_url,
  car_types_csv = excluded.car_types_csv,
  trip_outstation_oneway = excluded.trip_outstation_oneway,
  trip_outstation_round = excluded.trip_outstation_round,
  trip_local_rental = excluded.trip_local_rental,
  trip_airport_transfer = excluded.trip_airport_transfer,
  round_min_cost_per_km = excluded.round_min_cost_per_km,
  round_min_cost_per_day = excluded.round_min_cost_per_day,
  round_mileage_km_per_l = excluded.round_mileage_km_per_l,
  round_fuel_cost_per_l = excluded.round_fuel_cost_per_l,
  rental_min_8h_80km = excluded.rental_min_8h_80km,
  rental_min_4h_40km = excluded.rental_min_4h_40km,
  updated_at = now();

INSERT INTO public.savari_bot_routes (vendor_id, direction, city, min_cost_inr, enabled, sort_order) VALUES
  ('175236', 'kolkata_out', 'Kharagpur', 2000, true, 0),
  ('175236', 'kolkata_out', 'Durgapur', 3000, true, 1),
  ('175236', 'kolkata_out', 'Asansol', 3300, true, 2),
  ('175236', 'kolkata_out', 'Digha', 3000, true, 3),
  ('175236', 'kolkata_out', 'Ranchi', 7000, true, 4),
  ('175236', 'kolkata_out', 'Jamshedpur', 4500, true, 5),
  ('175236', 'into_kolkata', 'Kharagpur', 2100, true, 0),
  ('175236', 'into_kolkata', 'Durgapur', 3100, true, 1),
  ('175236', 'into_kolkata', 'Asansol', 3200, true, 2)
ON CONFLICT (vendor_id, direction, city) DO UPDATE SET
  min_cost_inr = excluded.min_cost_inr,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  updated_at = now();
