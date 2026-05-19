# ParkaSmart

Parking operations for African commercial properties — replaces handwritten ledger books with a Next.js + Drizzle web app, USSD callback for offline use, and Africa's Talking SMS receipts.

**Built at:** Africa's Talking Real Estate Hackathon — February 2026
**Built for:** OTC Wholesale Mall, Nairobi (and similar multi-tenant commercial properties)

---

## The problem

Walk into the parking attendant booth at a Nairobi mall and the system is usually a notebook and a phone. Plate numbers in handwriting. Payment status in someone's head. End-of-day totals reconciled by phone call to the manager. Tenants pay parking levies that never get tracked separately from walk-in drivers. Cash leaks. Receipts don't exist.

ParkaSmart digitises the booth. A mobile-first web app for the attendant, a USSD fallback for when the booth Wi-Fi drops, SMS receipts to the driver, and a daily SMS report to the manager. Built specifically for properties with a fixed roster of tenant vehicles plus walk-in drivers — the OTC Wholesale Mall pattern.

---

## How it works

```mermaid
flowchart LR
  Attendant[Mall attendant<br/>mobile web UI] -->|log entry| API[Next.js API<br/>/api/entries]
  Driver[Driver<br/>basic phone] -->|*shortcode#| ATU[Africa's Talking<br/>USSD gateway]
  ATU -->|callback| USSD[/api/ussd]
  USSD --> API

  API --> DB[(SQLite<br/>tenants + parking_entries)]

  API -->|on entry| ATS[Africa's Talking<br/>SMS]
  ATS --> DriverPhone[Driver phone:<br/>receipt SMS]

  EOD[End-of-day trigger] --> Send[/api/reports/send]
  Send --> ATS2[Africa's Talking SMS]
  ATS2 --> Manager[Manager phone:<br/>daily report]
```

Three things make this work in the booth:

1. **Plate autocomplete from tenant roster.** Attendant types `KDA`, and the form auto-fills name, phone, shop, and building for any registered tenant. Walk-in drivers get manual entry.
2. **USSD fallback.** When the booth has no internet, the attendant (or driver) dials the shortcode and the same `/api/entries` endpoint accepts the entry from Africa's Talking's USSD callback.
3. **Reference codes on every receipt.** Each entry generates a unique `PS-XXXX-XXXX` code so a tenant can dispute a charge with a single SMS.

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router, TypeScript) | API routes + UI in one app simplifies the booth-attendant workflow |
| UI | Tailwind CSS v4, mobile-first | Booth attendants work on mid-tier Android phones |
| Database | SQLite via Drizzle ORM + better-sqlite3 | Zero ops for a hackathon; Drizzle's migration story makes Postgres an env-var change |
| Telco | Africa's Talking Node SDK (SMS / USSD / Airtime) | Single SDK covers all three channels the booth actually uses |
| Runtime | Node.js 20+ | Required by Next.js 16 |

---

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in Africa's Talking credentials
npm run seed                        # 5 sample OTC Mall tenants
npm run dev                         # http://localhost:3000
```

### Environment variables

```env
AT_API_KEY=...
AT_USERNAME=sandbox          # or your live AT app username
AT_SENDER_ID=                # blank for sandbox; alphanumeric for live
MANAGER_PHONE=+254XXXXXXXXX  # receives the daily report
```

`AT_USERNAME=sandbox` routes traffic to `api.sandbox.africastalking.com`; anything else hits live. The API key must match the environment.

---

## Project layout

```
src/
├── app/
│   ├── page.tsx                  # Vehicle entry form
│   ├── log/page.tsx              # Today's parking log
│   ├── report/page.tsx           # End-of-day dashboard
│   ├── admin/page.tsx            # Tenant CRUD
│   └── api/
│       ├── tenants/              # tenant list, create, update, autocomplete
│       ├── entries/              # entry list, create (+ SMS), mark paid
│       ├── reports/              # daily summary, send SMS to manager
│       └── ussd/route.ts         # Africa's Talking USSD callback
├── components/
│   ├── vehicle-entry-form.tsx    # Plate autocomplete + validation
│   ├── parking-log-table.tsx     # Desktop table / mobile cards
│   ├── report-dashboard.tsx      # Revenue + breakdown + CSV export
│   └── tenant-admin.tsx
├── db/
│   ├── schema.ts                 # Drizzle: tenants + parking_entries
│   ├── index.ts                  # Connection + auto-init
│   └── seed.ts                   # OTC Mall sample tenants
└── lib/
    ├── africastalking.ts         # sendReceipt, sendDailyReport, sendAirtime
    └── utils.ts                  # Ref codes, plate validation, date helpers
```

---

## API surface

### Tenants
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tenants` | List all tenants |
| POST | `/api/tenants` | Create tenant |
| PUT | `/api/tenants` | Update tenant by id |
| GET | `/api/tenants/search?plate=KDA` | Autocomplete (min 2 chars) |

### Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | Today's entries; filters: `building`, `tenantType`, `paymentMethod`, `search` |
| POST | `/api/entries` | Create entry; fires SMS receipt if phone provided |
| PUT | `/api/entries/[id]/pay` | Mark as paid |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/today` | Aggregated daily summary |
| POST | `/api/reports/send` | Send daily report SMS to `MANAGER_PHONE` |

### USSD
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ussd` | Africa's Talking USSD callback (form-encoded: `sessionId`, `phoneNumber`, `text`) |

USSD menu: (1) Log vehicle entry, (2) Check today's total, (3) Mark vehicle as paid.

---

## Data model

**tenants** — `id`, `plate_number` (unique), `name`, `phone`, `shop_number`, `floor_code`, `building`, `monthly_rate`, `is_active`

**parking_entries** — `id`, `plate_number`, `driver_name`, `phone`, `shop_number`, `building`, `tenant_type` (`tenant` / `non-tenant` / `motorcycle`), `payment_method` (`cash` / `mpesa`), `amount_paid`, `is_paid`, `entry_time`, `reference_code`

---

## Scripts

```bash
npm run dev      # dev server on :3000
npm run build    # production build (runs seed)
npm start        # start production server
npm run seed     # seed sample tenants
npm run lint     # ESLint
```

---

## Deployment

Production options:

- **Vercel/Render** — works for the demo, but SQLite is ephemeral on serverless platforms and resets on each deploy. Fine for hackathon judging; not for real operations.
- **VPS + Docker** — mount the SQLite file as a volume; recommended for a single property.
- **Postgres migration** — swap `better-sqlite3` for `pg` in `src/db/index.ts` and update the Drizzle config. The schema is migration-ready.

---

Built by **Kenn Macharia** — [SuperiaTech](https://superiatech.vercel.app/)
