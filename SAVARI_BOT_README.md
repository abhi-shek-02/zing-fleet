# Savaari Booking Bot — frontend & data plan

This document describes the **Booking Bot** control UI (`/savari/bot`), how it relates to your **backend automation**, and a **Supabase** schema + queries to persist settings and logs. **Backend (minimal):** `zingFleetBackend/supabase/migrations/006_savari_bot_minimal.sql` + optional `seed_savari_bot.sql`; API `GET/PUT /api/savari-bot/config` (see below). The dashboard UI can still use dummy data until wired.

---

## Status — completed vs remaining

| Done | Not done yet |
|------|----------------|
| Bot UI at `/savari/bot` — loads/saves via **`GET/PUT /api/savari-bot/config`** (see `src/lib/savariBotMapping.ts`) | Optional: tune **KPI** (bids/scanned) when you add stats tables |
| **`savari_bot_config`** + **`savari_bot_routes`** + seed | Done on your side when migration applied |
| Express **`GET/PUT /api/savari-bot/config`** + **`lib/savaariVendor.js`** (shared token + `getNewBusiness` + **`postSavaariPostInterest`**) | — |
| **`POST /api/savaari/bid`** — proxies vendor **`postInterest`** (REAL MONEY; call only when intended) | **Scheduler** still logs **`WOULD_BID`** only — optional auto-**`postInterest`** + flag later |
| **Deploy logs:** `[savari-bot] GET/PUT` in **`routes/savariBot.js`**; `[savari-bot-scheduler]` in worker — remove or quiet later if you want |

**Frontend deploy:** set **`VITE_API_BASE_URL`** to your API origin (HTTPS). Optional **`VITE_SAVARI_VENDOR_ID`** (defaults `175236`). Deploying alone is not enough — the browser must reach a backend that has **`SUPABASE_*`** and migration **006** applied.

**Backend scheduler:** `npm run scheduler:savari` (standalone), or **`SAVARI_BOT_SCHEDULER=1`** with **`npm start`** to run API + scheduler in one process. Env: **`SAVARI_BOT_VENDOR_ID`**, **`SAVARI_BOT_INTERVAL_MS`** (optional; else uses `polling_interval_ms` from DB).

**Rollout:** (1) DB + seed ✓ (2) Deploy API + frontend with env (3) Run scheduler, confirm logs, **no auto-bid** (4) **`POST /api/savaari/bid`** is live for manual/integrated bidding — scheduler auto-bid remains a separate change.

---

## Minimal slice (safest smallest surface)

**Database (only two tables):**

| Table | Purpose |
|--------|---------|
| `savari_bot_config` | One row per `vendor_id` — polling, API URL, trip toggles, round/rental numbers. |
| `savari_bot_routes` | Rows per `(vendor_id, direction, city)` — `min_cost_inr`, **`enabled`**, `sort_order`. |

**Not required for v1:** activity log, daily stats, realtime — add when you need audit/KPIs.

**Backend:** two routes only — **`GET /api/savari-bot/config?vendor_id=…`** (load), **`PUT /api/savari-bot/config`** (save). Saves use Postgres function **`savari_bot_apply_save`** so config + route list update in **one transaction** (no half-saved state).

**Files:** `zingFleetBackend/supabase/migrations/006_savari_bot_minimal.sql`, `zingFleetBackend/supabase/seed_savari_bot.sql`, `zingFleetBackend/src/routes/savariBot.js`.

---

**Data source:** Trip toggles, round/rental numbers, polling, car types, routes, and `vendor_location` are loaded from **`savari_bot_config` / `savari_bot_routes`** via **`GET /api/savari-bot/config`**. `src/data/savariBotDummy.ts` is only **TypeScript types** (and seed SQL reference); KPI counts are not persisted yet (shown as 0).

---

## What’s built (frontend)

| Area | Purpose |
|------|---------|
| **Header** | Bot title, vendor + location (dummy), next-run countdown + progress, running badge |
| **KPIs** | Bids today, scanned, filtered out, routes active |
| **Trip toggles** | Outstation one-way / round / local rental / airport (Switch) |
| **Outstation routes** | Direction: Kolkata → other / other → Kolkata; grid of city + min ₹; add/remove |
| **Round trip** | Min ₹/km, min ₹/day, mileage, fuel ₹/L + formula hint |
| **Rental** | 8h/80km and 4h/40km minimum costs |
| **Config** | Polling interval (ms), vendor ID, API URL, car types string |
| **Activity log** | Monospace console (local state; prepend on “Save”) |

**Route:** `/savari/bot`  
**Entry:** “Bot” button on `/savari` (broadcasts).

---

## Integration plan (later)

1. **Single source of truth**  
   Store bot config + route tables in Supabase; backend worker reads the same rows (or cache invalidation on save).

2. **API surface (suggested)**  
   - `GET /api/savari-bot/config` — full snapshot for UI  
   - `PUT /api/savari-bot/config` — validate + persist + optional worker reload  
   - `GET /api/savari-bot/logs?limit=100` — activity tail  
   - `POST /api/savari-bot/logs` — worker append-only (service role)

3. **Realtime (optional)**  
   Supabase Realtime on `savari_bot_activity_log` for live log streaming in the UI.

4. **Auth**  
   Reuse fleet PIN/session or Supabase Auth; restrict writes to admin role.

---

## Supabase schema (SQL)

Run in the Supabase SQL editor. Adjust names to your naming conventions.

### 1. Bot profile / global config (one row per vendor or per workspace)

```sql
create table if not exists public.savari_bot_config (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null,
  vendor_location text,
  polling_interval_ms integer not null default 120000,
  api_url text,
  car_types_csv text,
  -- trip toggles
  trip_outstation_oneway boolean not null default true,
  trip_outstation_round boolean not null default true,
  trip_local_rental boolean not null default false,
  trip_airport_transfer boolean not null default false,
  -- round-trip economics
  round_min_cost_per_km numeric(12,2),
  round_min_cost_per_day numeric(12,2),
  round_mileage_km_per_l numeric(12,2),
  round_fuel_cost_per_l numeric(12,2),
  -- rental minima
  rental_min_8h_80km numeric(12,2),
  rental_min_4h_40km numeric(12,2),
  updated_at timestamptz not null default now()
);

create unique index if not exists savari_bot_config_vendor_uidx
  on public.savari_bot_config (vendor_id);
```

### 2. Outstation route minima (per direction + city)

```sql
create type public.savari_route_direction as enum ('kolkata_out', 'into_kolkata');

create table if not exists public.savari_bot_routes (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null,
  direction public.savari_route_direction not null,
  city text not null,
  min_cost_inr numeric(12,2) not null,
  -- When false, the route stays in the list but the bot ignores it (UI off).
  enabled boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, direction, city)
);

create index if not exists savari_bot_routes_vendor_dir_idx
  on public.savari_bot_routes (vendor_id, direction);
```

### 3. Activity log (append-only)

```sql
create table if not exists public.savari_bot_activity_log (
  id bigserial primary key,
  vendor_id text,
  level text default 'info', -- info | warn | error
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists savari_bot_log_created_idx
  on public.savari_bot_activity_log (created_at desc);

create index if not exists savari_bot_log_vendor_idx
  on public.savari_bot_activity_log (vendor_id, created_at desc);
```

### 4. Optional: daily counters (for KPIs)

```sql
create table if not exists public.savari_bot_daily_stats (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null,
  day date not null,
  bids_today integer not null default 0,
  scanned integer not null default 0,
  filtered_out integer not null default 0,
  unique (vendor_id, day)
);
```

---

## Example queries

**Load config + routes for UI**

```sql
select * from public.savari_bot_config where vendor_id = '175236';

select * from public.savari_bot_routes
where vendor_id = '175236' and direction = 'into_kolkata'
order by sort_order, city;
```

**Upsert config**

```sql
insert into public.savari_bot_config (
  vendor_id, polling_interval_ms, api_url, car_types_csv,
  trip_outstation_oneway, trip_outstation_round
) values (
  '175236', 120000,
  'https://vendor.savaari.com/vendor/api/booking/v1/booking.php',
  'Toyota Etios or Equivalent, Wagon R or Equivalent',
  true, true
)
on conflict (vendor_id) do update set
  polling_interval_ms = excluded.polling_interval_ms,
  api_url = excluded.api_url,
  car_types_csv = excluded.car_types_csv,
  updated_at = now();
```

*Note: `on conflict (vendor_id)` requires a unique constraint on `vendor_id` only — use the unique index above or a single-row-per-vendor pattern.*

**Append log line (worker)**

```sql
insert into public.savari_bot_activity_log (vendor_id, message)
values ('175236', 'Poll complete — no new bookings');
```

**Recent logs**

```sql
select message, created_at
from public.savari_bot_activity_log
where vendor_id = '175236'
order by created_at desc
limit 100;
```

---

## Row Level Security (sketch)

- Enable RLS on all tables.  
- **Policy:** authenticated users with `vendor_id` matching JWT claim (or a `fleet_users` mapping table) can `select/insert/update` their rows.  
- **Worker:** use **service role** key server-side only to insert logs and update stats — never expose in the browser.

---

## Files in this repo

| File | Role |
|------|------|
| `src/pages/SavariBotDashboard.tsx` | Bot UI |
| `src/data/savariBotDummy.ts` | Types only (optional seed reference) |
| `src/App.tsx` | Route `/savari/bot` |

Next step when you’re ready: replace dummy state with `useQuery`/`useMutation` against your Express API that wraps Supabase, or use Supabase client directly with RLS.
