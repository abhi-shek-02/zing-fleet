-- ============================================================
-- Savaari Booking Bot — minimal persistence (config + routes)
-- Safe save: savari_bot_apply_save() replaces routes in same txn as config upsert.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.savari_route_direction AS ENUM ('kolkata_out', 'into_kolkata');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.savari_bot_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id text NOT NULL,
  vendor_location text,
  polling_interval_ms integer NOT NULL DEFAULT 120000 CHECK (polling_interval_ms >= 5000 AND polling_interval_ms <= 86400000),
  api_url text,
  car_types_csv text,
  trip_outstation_oneway boolean NOT NULL DEFAULT true,
  trip_outstation_round boolean NOT NULL DEFAULT true,
  trip_local_rental boolean NOT NULL DEFAULT false,
  trip_airport_transfer boolean NOT NULL DEFAULT false,
  round_min_cost_per_km numeric(12,2),
  round_min_cost_per_day numeric(12,2),
  round_mileage_km_per_l numeric(12,2),
  round_fuel_cost_per_l numeric(12,2),
  rental_min_8h_80km numeric(12,2),
  rental_min_4h_40km numeric(12,2),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS savari_bot_config_vendor_uidx
  ON public.savari_bot_config (vendor_id);

CREATE TABLE IF NOT EXISTS public.savari_bot_routes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id text NOT NULL,
  direction public.savari_route_direction NOT NULL,
  city text NOT NULL,
  min_cost_inr numeric(12,2) NOT NULL CHECK (min_cost_inr >= 0),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, direction, city)
);

CREATE INDEX IF NOT EXISTS savari_bot_routes_vendor_dir_idx
  ON public.savari_bot_routes (vendor_id, direction);

-- One transaction: upsert config + replace all routes for that vendor.
CREATE OR REPLACE FUNCTION public.savari_bot_apply_save(p_config jsonb, p_routes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text := nullif(trim(p_config->>'vendor_id'), '');
BEGIN
  IF v IS NULL THEN
    RAISE EXCEPTION 'vendor_id required';
  END IF;

  INSERT INTO public.savari_bot_config (
    vendor_id, vendor_location, polling_interval_ms, api_url, car_types_csv,
    trip_outstation_oneway, trip_outstation_round, trip_local_rental, trip_airport_transfer,
    round_min_cost_per_km, round_min_cost_per_day, round_mileage_km_per_l, round_fuel_cost_per_l,
    rental_min_8h_80km, rental_min_4h_40km, updated_at
  ) VALUES (
    v,
    nullif(trim(p_config->>'vendor_location'), ''),
    coalesce((p_config->>'polling_interval_ms')::integer, 120000),
    nullif(trim(p_config->>'api_url'), ''),
    nullif(trim(p_config->>'car_types_csv'), ''),
    coalesce((p_config->>'trip_outstation_oneway')::boolean, true),
    coalesce((p_config->>'trip_outstation_round')::boolean, true),
    coalesce((p_config->>'trip_local_rental')::boolean, false),
    coalesce((p_config->>'trip_airport_transfer')::boolean, false),
    nullif(p_config->>'round_min_cost_per_km','')::numeric,
    nullif(p_config->>'round_min_cost_per_day','')::numeric,
    nullif(p_config->>'round_mileage_km_per_l','')::numeric,
    nullif(p_config->>'round_fuel_cost_per_l','')::numeric,
    nullif(p_config->>'rental_min_8h_80km','')::numeric,
    nullif(p_config->>'rental_min_4h_40km','')::numeric,
    now()
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

  DELETE FROM public.savari_bot_routes WHERE vendor_id = v;

  INSERT INTO public.savari_bot_routes (vendor_id, direction, city, min_cost_inr, enabled, sort_order)
  SELECT
    v,
    (r->>'direction')::public.savari_route_direction,
    trim(r->>'city'),
    (r->>'min_cost_inr')::numeric,
    coalesce((r->>'enabled')::boolean, true),
    coalesce((r->>'sort_order')::integer, 0)
  FROM jsonb_array_elements(coalesce(p_routes, '[]'::jsonb)) AS r
  WHERE trim(coalesce(r->>'city', '')) <> ''
    AND (r->>'min_cost_inr') IS NOT NULL
    AND (r->>'direction') IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.savari_bot_apply_save(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.savari_bot_apply_save(jsonb, jsonb) TO service_role;

ALTER TABLE public.savari_bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savari_bot_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.savari_bot_config;
DROP POLICY IF EXISTS "Allow all" ON public.savari_bot_routes;

CREATE POLICY "Allow all" ON public.savari_bot_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.savari_bot_routes FOR ALL USING (true) WITH CHECK (true);
