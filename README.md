# ParkaSmart

Smart parking management system built for shopping malls and commercial properties across Africa. Replaces handwritten ledger books and phone notepad entries with a structured digital platform — real-time vehicle logging, automated payment tracking, and instant SMS reporting via Africa's Talking.

Built for the **Africa's Talking Real Estate Hackathon** (February 2026).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | Tailwind CSS v4, mobile-first responsive |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| SMS / USSD / Airtime | Africa's Talking Node.js SDK |
| Runtime | Node.js 20+ |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Africa's Talking credentials

# 3. Seed the database with sample tenants
npm run seed

# 4. Start dev server
npm run dev
```

Open http://localhost:3000

## Environment Variables

Create a `.env.local` file in the project root:

```
AT_API_KEY=your_africastalking_api_key
AT_USERNAME=sandbox
AT_SENDER_ID=
MANAGER_PHONE=+254XXXXXXXXX
```

- `AT_API_KEY` — API key from your Africa's Talking app settings
- `AT_USERNAME` — `sandbox` for testing, or your live app username (e.g. `superiatech`)
- `AT_SENDER_ID` — Leave empty for sandbox; set to your registered alphanumeric sender ID for live
- `MANAGER_PHONE` — Phone number that receives end-of-day report SMS

**Important:** `AT_USERNAME` determines the API endpoint. `sandbox` hits `api.sandbox.africastalking.com`; anything else hits the live API. Make sure the API key matches the environment.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Screen 1: Vehicle Entry Form
│   ├── log/page.tsx                # Screen 2: Today's Parking Log
│   ├── report/page.tsx             # Screen 3: End-of-Day Report
│   ├── admin/page.tsx              # Tenant Management (CRUD)
│   ├── layout.tsx                  # Root layout with nav
│   ├── globals.css                 # Tailwind config + CSS variables
│   └── api/
│       ├── tenants/
│       │   ├── route.ts            # GET (list all), POST (create), PUT (update)
│       │   └── search/route.ts     # GET ?plate= (autocomplete)
│       ├── entries/
│       │   ├── route.ts            # GET (today's entries), POST (create + SMS)
│       │   └── [id]/pay/route.ts   # PUT (mark as paid)
│       ├── reports/
│       │   ├── today/route.ts      # GET (aggregated daily summary)
│       │   └── send/route.ts       # POST (SMS report to manager)
│       └── ussd/route.ts           # POST (USSD callback handler)
├── components/
│   ├── vehicle-entry-form.tsx      # Plate autocomplete, validation, entry submission
│   ├── parking-log-table.tsx       # Table (desktop) / card list (mobile) with filters
│   ├── report-dashboard.tsx        # Revenue cards, breakdown, CSV export
│   ├── tenant-admin.tsx            # Tenant CRUD with table/card views
│   └── nav.tsx                     # Top nav (desktop) + bottom tab bar (mobile)
├── db/
│   ├── schema.ts                   # Drizzle schema: tenants + parking_entries
│   ├── index.ts                    # DB connection (auto-creates tables)
│   └── seed.ts                     # Seeds 5 sample OTC Mall tenants
└── lib/
    ├── africastalking.ts           # AT SDK wrapper: sendReceipt, sendDailyReport, sendAirtime
    └── utils.ts                    # Ref code gen, date helpers, plate validation, cn()
```

## Database Schema

### tenants

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| plate_number | TEXT UNIQUE | Lookup key for autocomplete |
| name | TEXT | Tenant name |
| phone | TEXT | For SMS receipts |
| shop_number | TEXT | e.g. 015, 051 |
| floor_code | TEXT | e.g. F2B, GA, GC |
| building | TEXT | OTC Mall, Mathai S |
| monthly_rate | INTEGER | Default 300 Ksh |
| is_active | BOOLEAN | Soft delete |

### parking_entries

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| plate_number | TEXT | Vehicle plate |
| driver_name | TEXT | From tenant or manual entry |
| phone | TEXT | For SMS receipt |
| shop_number | TEXT | Tenant shop |
| building | TEXT | OTC Mall, Mathai S |
| tenant_type | TEXT | `tenant` / `non-tenant` / `motorcycle` |
| payment_method | TEXT | `cash` / `mpesa` |
| amount_paid | INTEGER | In Ksh |
| is_paid | BOOLEAN | Default false |
| entry_time | TEXT | ISO 8601 timestamp |
| reference_code | TEXT | Unique ref (e.g. PS-MM3BUC8O-KNK0) |

## API Reference

### Tenants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tenants` | List all tenants |
| POST | `/api/tenants` | Create tenant `{plateNumber, name, phone, shopNumber, floorCode, building}` |
| PUT | `/api/tenants` | Update tenant `{id, ...fields}` |
| GET | `/api/tenants/search?plate=KDA` | Autocomplete search (min 2 chars) |

### Entries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | Today's entries. Filters: `?building=&tenantType=&paymentMethod=&search=` |
| POST | `/api/entries` | Create entry `{plateNumber, driverName, phone, shopNumber, building, tenantType, paymentMethod, amountPaid, isPaid}`. Fires SMS receipt if phone provided. |
| PUT | `/api/entries/[id]/pay` | Mark entry as paid `{paymentMethod?, amountPaid?}` |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/today` | Aggregated daily summary (counts, revenue, building breakdown) |
| POST | `/api/reports/send` | Send daily report SMS to MANAGER_PHONE |

### USSD

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ussd` | Africa's Talking USSD callback. Accepts `sessionId`, `phoneNumber`, `text` as form data. |

USSD menu flow:
1. Log Vehicle Entry (enter plate, confirm payment)
2. Check Today's Total (vehicle count + revenue)
3. Mark Vehicle as Paid (enter plate)

## Key Features

- **Plate Autocomplete** — Type a plate number, registered tenants auto-fill name, phone, shop, building
- **Kenyan Plate Validation** — Auto-formats input to `KXX 000X` pattern with real-time feedback
- **SMS Receipts** — Structured receipt sent to driver on entry via Africa's Talking
- **Daily Reports** — Aggregated dashboard with send-to-manager SMS and CSV export
- **USSD Fallback** — Log vehicles and check totals with zero internet via USSD
- **Mobile-First UI** — Bottom tab nav, card layouts on mobile, table views on desktop
- **Airtime Rewards** — API-ready for monthly on-time payment airtime rewards

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start Next.js dev server on :3000 |
| Build | `npm run build` | Production build |
| Start | `npm start` | Start production server |
| Seed DB | `npm run seed` | Seed 5 sample OTC Mall tenants |
| Lint | `npm run lint` | Run ESLint |

## Deployment

The app uses SQLite which stores data in `parkasmart.db` at the project root. For production:

1. **Vercel/Render** — Works for demo; SQLite file is ephemeral on serverless (resets on redeploy)
2. **VPS/Docker** — Persistent SQLite; mount the db file as a volume
3. **PostgreSQL migration** — Swap `better-sqlite3` for `pg` in `src/db/index.ts` and update Drizzle config. Schema is migration-ready.
