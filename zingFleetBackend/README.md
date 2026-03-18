# ZingCab Fleet Backend — README

## Quick Start

```bash
cd zingFleetBackend
npm install
npm run dev
```

Server starts on `http://localhost:3001`.

## Environment

Copy `.env.example` → `.env` and fill in your Supabase credentials.

## Database

Run the migration against your Supabase DB:

```bash
npm run migrate
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/login` | PIN authentication |
| GET/POST/PUT/DELETE | `/api/drivers` | Driver CRUD |
| GET/POST/PUT/DELETE | `/api/cars` | Car CRUD |
| GET/POST/PUT/DELETE | `/api/cash` | Cash entries |
| GET/POST/PUT/DELETE | `/api/vendor` | Vendor entries |
| GET/POST/PUT/DELETE | `/api/fuel` | Fuel entries |
| GET/POST/PUT/DELETE | `/api/other-costs` | Other cost entries |
| GET/POST/PUT/DELETE | `/api/other-earnings` | Other earning entries |
| GET/POST/PUT/DELETE | `/api/settlements` | Settlement payments |
| GET/POST/DELETE | `/api/car-costs` | Car costs |
| GET/POST/DELETE | `/api/car-docs` | Car documents |
| GET | `/api/analytics/*` | Fleet analytics |
| GET/PUT | `/api/settings` | App settings |

All responses: `{ success: true, data: ... }` or `{ success: false, error: "..." }`
