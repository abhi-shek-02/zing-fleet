# ZingCab Fleet — Driver Accounting & Fleet Management

> A mobile-first admin tool for small cab businesses to track driver earnings, fuel costs, settlements, and profit analytics.

## 🚕 What is ZingCab Fleet?

ZingCab Fleet helps cab fleet owners manage the money side of their business. If you have 3–20 cars with drivers, this app gives you a clear picture of:

- **How much each driver earned** (from bookings)
- **How much each driver owes you** (after their commission)
- **Your real profit** per car, per driver, per week
- **Fuel efficiency** — which cars are guzzling fuel
- **Who's been paid** and who hasn't

## 📱 How to Use

### Login
- Default PIN: `1234`

### Weekly Flow (How your week works)

1. **Monday–Sunday**: Drivers operate your cars, collect cash, do bookings
2. **During the week**: You (or drivers) log entries in the **Entries** tab:
   - **Cash Collected** — cash the driver hands to you
   - **Vendor Amount** — actual booking fare (from Savari, direct bookings, etc.)
   - **Fuel** — fuel fills with odometer reading
   - **Other Costs** — tolls, parking, maintenance
   - **Other Earnings** — tips, bonuses
3. **End of week**: Go to **Pay** tab to see who owes what and record payments
4. **Anytime**: Check **Insights** tab for profit trends, fuel efficiency, driver rankings

### Understanding Settlements (Pay Tab)

This is the most important concept:

```
Your Share = Total Earnings − Driver Commission − Fuel − Other Costs

Driver's Balance = Cash They Collected − Your Share − Previous Payments

If positive → Driver owes you money
If negative → You owe the driver
If zero    → All settled ✓
```

**Example:**
- Vendor bookings this week: ₹10,000
- Driver commission (30%): ₹3,000 (driver keeps this)
- Fuel cost: ₹2,000
- Other costs: ₹500
- **Your share**: ₹10,000 − ₹3,000 − ₹2,000 − ₹500 = **₹4,500**
- Driver collected ₹6,000 in cash
- **Driver owes you**: ₹6,000 − ₹4,500 = **₹1,500**

## 🗂️ App Sections

| Tab | What it does |
|-----|-------------|
| **Home** | Weekly dashboard — see all numbers at a glance |
| **Fleet** | Manage drivers, cars, car documents & maintenance costs |
| **Entries** | Log daily financial entries (cash, vendor, fuel, costs) |
| **Pay** | Settle balances with drivers, attach payment proofs |
| **Insights** | Analytics: profit per car, fuel efficiency, driver rankings |

## 🛠️ Tech Stack

- **React** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **Recharts** for analytics charts
- **localStorage** for data persistence (no backend needed)

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open on your phone or use mobile view in browser. PIN: `1234`.

### Production (Vercel + API)

The frontend **cannot** call `http://…` from an `https://` site — the browser blocks it (mixed content).

The app defaults to **`https://fleet.zingcab.in`** for API calls (see `src/lib/api.ts`). You can override with **`VITE_API_BASE_URL`** in `.env` or Vercel for staging/local backends.

On the **backend**, set `FRONTEND_URL` to your deployed app URL (e.g. `https://zing-fleet.vercel.app`) so CORS allows the browser.

## 📊 Key Features

- **Real-time calculations** — all totals update instantly
- **Fuel efficiency tracking** — KM/L from odometer readings
- **Car document management** — upload RC, insurance, PUC with expiry alerts
- **Payment proof upload** — attach UPI/bank screenshots to settlements
- **Driver profit leaderboard** — see who generates most profit
- **Actionable alerts** — warnings for low mileage, loss-making cars
- **Mobile-first design** — built for one-handed phone use

## Savaari Booking Bot (UI prototype)

- **Broadcasts:** `/savari` — vendor feed cards  
- **Bot dashboard (dummy data):** `/savari/bot` — automation settings, route minima, activity log (design reference)  
- **Plan + Supabase SQL:** see [`SAVARI_BOT_README.md`](./SAVARI_BOT_README.md)
