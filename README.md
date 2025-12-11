Court Booking Platform
======================

Production-ready platform with atomic multi-resource bookings, stacked dynamic pricing, concurrency handling, waitlist, and full React frontend.

## Features at a Glance

✅ **4 Badminton Courts** (2 indoor, 2 outdoor) with configurable pricing  
✅ **Equipment Rental** (rackets, shoes) with quantity validation  
✅ **3 Coaches** with availability schedules  
✅ **Atomic Multi-Resource Booking** - Court + Equipment + Coach in single transaction  
✅ **Dynamic Pricing Engine** - Peak hours, weekends, indoor premium (JSON rules)  
✅ **Concurrent Booking Prevention** - PostgreSQL advisory locks  
✅ **Waitlist with FIFO Promotion** - Automatic on cancellation  
✅ **Full Admin Dashboard** - CRUD for courts, equipment, coaches, pricing rules  
✅ **React Frontend** - Calendar, slot grid, price breakdown, booking history

## Directory Structure

```
backend/
  backend/
    __init__.py
    db.py                    # SQLAlchemy engine setup
    models.py                # ORM: User, Court, Equipment, Coach, Booking, PricingRule, Waitlist, Audit
    pricing.py               # Pricing engine: rule matching, stacking, line-item breakdown
    main.py                  # FastAPI app with all REST endpoints
  tests/
    test_pricing.py          # Unit test: rule stacking and price calculation
    test_concurrency.py      # Integration test: concurrent bookings on same slot
    test_integration.py      # Full API integration tests
  seed.py                    # Seed script: courts, equipment, coaches, pricing rules
  requirements.txt
  README.md

frontend/
  src/
    api.ts                   # Axios API client with TypeScript types
    store.ts                 # Zustand state management
    App.tsx                  # Main app with routing
    components/              # Reusable UI components
      CalendarView.tsx       # Month calendar for date selection
      SlotGrid.tsx           # Time slot grid (30-min intervals)
      CourtSelector.tsx      # Court selection cards
      EquipmentSelector.tsx  # Equipment with quantity controls
      CoachSelector.tsx      # Coach selection
      PriceBreakdown.tsx     # Live price calculation display
    pages/
      BookingPage.tsx        # Main booking wizard
      MyBookingsPage.tsx     # Booking history with cancel
      AdminPage.tsx          # Admin CRUD dashboard
  package.json
  tsconfig.json

infra/
  docker-compose.yml         # Postgres + Redis for local development

README.md (this file)
```

## Setup & Local Run

### Prerequisites
- Docker (for Postgres + Redis) OR local Postgres + Redis
- Python 3.10+
- Node.js 18+ and npm (for frontend)

### Step 1: Start services (Docker Compose)

```powershell
cd "c:\Projects\court booking\infra"
docker-compose up -d
```

Postgres will be available at `localhost:5432`, Redis at `localhost:6379`.

### Step 2: Setup Python environment

```powershell
cd "c:\Projects\court booking"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

### Step 3: Seed database and run API

```powershell
python backend/seed.py
uvicorn backend.backend.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: `http://localhost:8000/docs`

### Step 4: Start Frontend

```powershell
cd "c:\Projects\court booking\frontend"
npm install
npm start
```

Frontend runs at `http://localhost:3000`

### Step 5: Run tests

```powershell
cd "c:\Projects\court booking"
pytest backend/tests/ -v
```

## Key Features

### 1. Atomic Multi-Resource Booking
- Single transaction reserves court + equipment + coach or fails entirely.
- DB advisory locks prevent double-booking.
- Idempotency key support for retry safety.
- **Equipment availability validation** - Prevents overbooking inventory.
- **Coach availability validation** - Checks against coach schedule.

### 2. Dynamic Pricing Engine
- Rules stored as JSON in `pricing_rules` table.
- Rules match by time-of-day, weekday, court type.
- Stacking behavior: additive, multiplicative, max.
- Pricing snapshot captured at booking time for audit.
- `/api/simulate-pricing` endpoint for live price preview.

**Sample Rules:**
- Peak hours (5-9 PM): +20% additive
- Weekends: +15% additive
- Indoor courts: +$5 flat fee

### 3. Concurrency Handling
- PostgreSQL advisory locks (`pg_advisory_xact_lock`).
- Transaction isolation to prevent phantom reads.
- Slot-based locking with MD5 hash of time + court.

### 4. Waitlist
- On slot unavailability, user joins FIFO queue.
- Automatic promotion on cancellation.
- Audit trail for all waitlist events.

### 5. Admin Dashboard
- CRUD operations for Courts, Equipment, Coaches.
- Coach availability schedule management.
- Pricing rules configuration.

## API Endpoints

### Booking
- `POST /api/bookings` – Book court + equipment + coach (atomic)
- `GET /api/bookings` – List bookings (filterable by user/status)
- `GET /api/bookings/{id}` – Get booking details
- `POST /api/bookings/{id}/cancel` – Cancel and promote waitlist

### Availability
- `GET /api/slots/{date}` – Get all slots for a date
- `GET /api/availability` – Check available resources for time range
- `GET /api/simulate-pricing` – Preview price calculation

### Admin - Courts
- `GET /api/admin/courts` – List all courts
- `POST /api/admin/courts` – Create court
- `PUT /api/admin/courts/{id}` – Update court
- `DELETE /api/admin/courts/{id}` – Delete court

### Admin - Equipment
- `GET /api/admin/equipment` – List all equipment
- `POST /api/admin/equipment` – Create equipment
- `PUT /api/admin/equipment/{sku}` – Update equipment
- `DELETE /api/admin/equipment/{sku}` – Delete equipment

### Admin - Coaches
- `GET /api/admin/coaches` – List all coaches
- `POST /api/admin/coaches` – Create coach
- `PUT /api/admin/coaches/{id}` – Update coach
- `DELETE /api/admin/coaches/{id}` – Delete coach
- `GET /api/admin/coaches/{id}/availability` – Get availability schedule
- `POST /api/admin/coaches/{id}/availability` – Add availability
- `DELETE /api/admin/coaches/{id}/availability/{avail_id}` – Remove availability

### Admin - Pricing Rules
- `GET /api/admin/pricing-rules` – List rules
- `POST /api/admin/pricing-rules` – Create rule
- `PUT /api/admin/pricing-rules/{id}` – Update rule
- `DELETE /api/admin/pricing-rules/{id}` – Delete rule
- `GET /api/availability?start=...&end=...` – Slot availability matrix
- `POST /api/waitlist` – Join waitlist for slot
- `POST /api/admin/pricing-rules` – CRUD pricing rules
- `POST /api/admin/seed` – Seed dev data

Full OpenAPI spec available at `http://localhost:8000/docs`.

## Database Schema

**users** – User profiles
**courts** – Court inventory with base hourly rate
**equipment_items** – Rackets, shoes, etc.
**coaches** – Coach profiles with hourly rate
**bookings** – Reservations (atomic allocation of resources)
**booking_allocations** – Line-item mapping of resources to booking
**pricing_rules** – JSON-based configurable rules with priority
**waitlist_entries** – FIFO queue per slot_hash
**audit_events** – Booking lifecycle events

## Database & Pricing Engine Design

See `DB_PRICING_WRITEUP.md` for detailed 300–500 word explanation.

## Assumptions & Notes

- **Timezone**: All timestamps stored in UTC; frontend localizes.
- **Pricing rules**: Applied in priority order; stacking behavior controls composition.
- **Availability**: Courts/coaches represent fixed inventory; equipment tracked by quantity.
- **Notifications**: Placeholder for email/WebSocket integration.
- **Idempotency**: Request body hash + user ID used for deduplication.

## Deployment (Production Notes)

- Run Postgres and Redis in managed services (AWS RDS, ElastiCache).
- Use environment variables (`DATABASE_URL`, `REDIS_URL`) for config.
- Implement connection pooling (SQLAlchemy pool settings).
- Add monitoring: lock contention, booking latency, rule evaluation time.
- Schedule regular DB backups; Redis persistence (AOF or RDB).
- Use reverse proxy (Nginx) for load balancing.
- Add authentication (JWT tokens) before production.
- Implement rate limiting and abuse detection.

## Testing

### Unit Tests (pricing)
- Rule matching logic
- Stacking behavior (additive, multiplicative, max)
- Price line-item breakdown

### Integration Tests (concurrency)
- Two simultaneous requests for same slot → only one succeeds
- Waitlist promotion on cancellation

### Load Test
- Synthetic traffic to validate lock behavior under contention.

## Frontend Guidance

1. **Pages**: CalendarView, SlotDetail, BookingForm, BookingSummary, AdminDashboard
2. **Components**: SlotGrid, ResourceSelector, PriceBreakdown, AvailabilityBadge, AdminRuleEditor
3. **State**: React Query for server state; local form state for selections
4. **Price preview**: Server-driven via `/api/simulate-pricing` to ensure single source of truth
5. **Optimistic UI**: Update UI immediately but require final server confirmation

## Next Steps

- [ ] Implement authentication (JWT or OAuth)
- [ ] Add email/WebSocket notifications
- [ ] Build frontend (React + TypeScript)
- [ ] Performance testing and lock tuning
- [ ] Admin rule editor UI
- [ ] Analytics and reporting dashboard
