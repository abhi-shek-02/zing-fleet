-- ============================================================
-- ZingCab Fleet — Full Database Schema
-- PostgreSQL (Supabase) · Production-ready
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CARS — Every vehicle in the fleet
-- ============================================================
CREATE TABLE public.cars (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number      TEXT NOT NULL UNIQUE,          -- Registration plate (KA01AB1234)
  model       TEXT NOT NULL,                 -- e.g. Swift Dzire
  fuel_type   TEXT NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'cng', 'electric')),
  expected_mileage NUMERIC(6,2) NOT NULL DEFAULT 14,  -- KM per litre
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cars_status ON public.cars(status);

-- ============================================================
-- DRIVERS — Each driver is assigned to one car
-- ============================================================
CREATE TABLE public.drivers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  car_id            UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 30,  -- Driver's cut from earnings
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drivers_car ON public.drivers(car_id);
CREATE INDEX idx_drivers_status ON public.drivers(status);

-- ============================================================
-- CAR_COSTS — Maintenance, insurance, tax, PUC, CF etc.
-- ============================================================
CREATE TABLE public.car_costs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id    UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  amount    NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  cost_type TEXT NOT NULL CHECK (cost_type IN ('maintenance', 'cf', 'puc', 'tax', 'insurance', 'other')),
  notes     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_car_costs_car ON public.car_costs(car_id);
CREATE INDEX idx_car_costs_date ON public.car_costs(date);

-- ============================================================
-- CAR_DOCUMENTS — RC, Insurance, PUC, Permit, Fitness certs
-- ============================================================
CREATE TABLE public.car_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id      UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL CHECK (doc_type IN ('rc', 'insurance', 'puc', 'permit', 'fitness', 'other')),
  doc_name    TEXT NOT NULL,
  expiry_date DATE,
  notes       TEXT,
  file_url    TEXT,           -- Storage URL (replaces base64 from localStorage)
  file_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_car_docs_car ON public.car_documents(car_id);
CREATE INDEX idx_car_docs_expiry ON public.car_documents(expiry_date);

-- ============================================================
-- CASH_ENTRIES — Cash collected by driver from passengers
-- ============================================================
CREATE TABLE public.cash_entries (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id  UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  car_id     UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,        -- Monday of the operating week
  date       DATE NOT NULL,
  amount     NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  source     TEXT NOT NULL CHECK (source IN ('savari', 'direct', 'other')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_driver_week ON public.cash_entries(driver_id, week_start);
CREATE INDEX idx_cash_date ON public.cash_entries(date);

-- ============================================================
-- VENDOR_ENTRIES — Booking fares from vendor platforms (Ola, Uber, etc.)
-- ============================================================
CREATE TABLE public.vendor_entries (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id  UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  car_id     UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  date       DATE NOT NULL,
  amount     NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  booking_id TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_driver_week ON public.vendor_entries(driver_id, week_start);

-- ============================================================
-- FUEL_ENTRIES — Fuel fill-ups with odometer tracking
-- ============================================================
CREATE TABLE public.fuel_entries (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id  UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  car_id     UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  date       DATE NOT NULL,
  cost       NUMERIC(10,2) NOT NULL CHECK (cost >= 0),
  liters     NUMERIC(8,2) NOT NULL CHECK (liters > 0),
  odometer   INTEGER NOT NULL CHECK (odometer >= 0),
  station    TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_driver_week ON public.fuel_entries(driver_id, week_start);
CREATE INDEX idx_fuel_car_date ON public.fuel_entries(car_id, date);

-- ============================================================
-- OTHER_COST_ENTRIES — Tolls, parking, misc costs
-- ============================================================
CREATE TABLE public.other_cost_entries (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id  UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  car_id     UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  date       DATE NOT NULL,
  amount     NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  cost_type  TEXT NOT NULL CHECK (cost_type IN ('toll', 'parking', 'maintenance', 'other')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_other_costs_driver_week ON public.other_cost_entries(driver_id, week_start);

-- ============================================================
-- OTHER_EARNING_ENTRIES — Tips, incentives, bonuses
-- ============================================================
CREATE TABLE public.other_earning_entries (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id  UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  car_id     UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  date       DATE NOT NULL,
  amount     NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  source     TEXT NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_other_earnings_driver_week ON public.other_earning_entries(driver_id, week_start);

-- ============================================================
-- SETTLEMENTS — Payments made to/from drivers
-- ============================================================
CREATE TABLE public.settlements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id    UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  date         DATE NOT NULL,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  type         TEXT NOT NULL CHECK (type IN ('full', 'partial')),
  payment_mode TEXT CHECK (payment_mode IN ('upi', 'bank', 'cash')),
  notes        TEXT,
  proof_url    TEXT,            -- Storage URL for payment screenshot
  proof_file_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlements_driver_week ON public.settlements(driver_id, week_start);

-- ============================================================
-- APP_SETTINGS — Global app configuration
-- ============================================================
CREATE TABLE public.app_settings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fuel_threshold NUMERIC(6,2) NOT NULL DEFAULT 10,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.app_settings (fuel_threshold) VALUES (10);

-- ============================================================
-- ROW LEVEL SECURITY — Enable on all tables
-- All policies use service_role for server-side access.
-- Frontend never talks to DB directly.
-- ============================================================

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_earning_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Service-role bypasses RLS automatically.
-- For authenticated users (future): add policies per user/org.
-- For now, allow all operations for authenticated users:

CREATE POLICY "Allow all for authenticated" ON public.cars FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.car_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.car_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.cash_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.vendor_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.fuel_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.other_cost_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.other_earning_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- UPDATED_AT TRIGGER — Auto-update timestamp on row change
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- VIEWS — Useful aggregations for analytics
-- ============================================================

-- Weekly driver summary view
CREATE OR REPLACE VIEW public.v_driver_weekly_summary AS
SELECT
  d.id AS driver_id,
  d.name AS driver_name,
  d.commission_percent,
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
GROUP BY d.id, d.name, d.commission_percent, ce.week_start;
