# Quick Reference Guide

## Project Overview

**Court Booking Platform** – Production-ready system for booking sports facility courts with atomic multi-resource bookings, dynamic stacked pricing, concurrency control, and waitlist management.

**Tech Stack**: FastAPI (Python), PostgreSQL, Redis, React (TypeScript), Docker Compose

---

## Key Files

| File | Purpose |
| --- | --- |
| `backend/main.py` | FastAPI app (8 endpoints: bookings, availability, pricing, admin rules) |
| `backend/pricing.py` | Pricing engine (rule matching, stacking, line-item breakdown) |
| `backend/models.py` | SQLAlchemy ORM (9 tables: users, courts, bookings, etc.) |
| `seed.py` | Seed script (4 courts, equipment, 3 coaches, 3 pricing rules) |
| `tests/test_*.py` | Unit/concurrency/integration tests (16 test cases) |
| `OPENAPI.yml` | Full OpenAPI 3.0 specification |
| `POSTMAN_EXAMPLES.md` | Example API requests/responses |
| `DB_PRICING_WRITEUP.md` | 300+ word technical design document |
| `DEPLOYMENT_GUIDE.md` | Production deployment instructions |

---

## Quick Start (5 minutes)

```powershell
# 1. Start infrastructure
cd infra; docker-compose up -d; cd ..

# 2. Install Python deps
python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r backend/requirements.txt

# 3. Seed database
python backend/seed.py

# 4. Run backend
uvicorn backend.main:app --reload --port 8000

# 5. API docs
http://localhost:8000/docs

# 6. Run tests (in new terminal)
pytest backend/tests/ -v
```

---

## API Endpoints (Summary)

```
POST   /api/bookings                      – Book court+equipment+coach
GET    /api/bookings/{id}                 – Get booking details
POST   /api/bookings/{id}/cancel          – Cancel booking
GET    /api/availability?start=...&end=...– Check availability
GET    /api/slots/{date}                  – Get date slots
GET    /api/simulate-pricing              – Preview price
GET    /api/admin/pricing-rules           – List rules
POST   /api/admin/pricing-rules           – Create rule
PUT    /api/admin/pricing-rules/{id}      – Update rule
POST   /api/admin/seed                    – Seed data (dev only)
```

---

## Database Schema (9 Tables)

**Core:**
- `users` – User profiles
- `courts` – 4 courts (2 indoor, 2 outdoor)
- `bookings` – Reservations (status, price, snapshot)
- `booking_allocations` – Resource mappings (court, equipment, coach)

**Inventory:**
- `equipment_items` – Rackets, shoes
- `coaches` – 3 coaches with hourly rates
- `coach_availability` – Coach time windows (optional)

**Configuration & Operations:**
- `pricing_rules` – JSON rules with priority, match, modifier, stacking
- `waitlist_entries` – FIFO queue per slot_hash
- `audit_events` – Booking lifecycle (confirmed, cancelled, waitlisted)

---

## Pricing Engine

**Input:** Court, time window, equipment list, coach  
**Output:** Total price with line-item breakdown

**Steps:**
1. Fetch enabled pricing rules sorted by priority
2. Match rules by time-of-day, weekday, court type
3. Apply modifiers (additive, multiplicative, or max stacking)
4. Add equipment flat fees + coach hourly fees
5. Return line items and pricing snapshot

**Example (Fri 7 PM indoor court, 1 hour):**
- Base 600 (court hourly)
- +25% indoor = 150 → 750
- +20% peak = 120 → 870
- +100 racket = 100 → 970
- **Total: 970**

---

## Booking Flow

```
User selects:
├─ Date & time slot
├─ Court (required)
├─ Equipment (optional)
└─ Coach (optional)

Backend (atomic transaction):
├─ Validate court available
├─ Compute price
├─ Acquire advisory lock (pg_advisory_xact_lock)
├─ Check overlapping bookings
├─ If available:
│  ├─ Create booking + allocations
│  ├─ Return status=confirmed + booking_id + price
│  └─ Log audit event
└─ If taken:
   ├─ Add user to waitlist
   ├─ Return status=waitlisted + waitlist_id
   └─ (On cancellation: promote next FIFO user)
```

---

## Concurrency Control

**Mechanism:** PostgreSQL advisory locks (per slot_hash)

**Hash Calculation:**
```python
slot_hash = f"{start_ts}_{end_ts}_{court_id}"
lock_id = int(hashlib.md5(slot_hash.encode()).hexdigest()[:8], 16)
db.execute(f"SELECT pg_advisory_xact_lock({lock_id})")
```

**Guarantee:** Only one booking confirms per slot; others go to waitlist.

---

## Testing

**Unit Tests** (pricing engine):
```bash
pytest backend/tests/test_pricing.py -v
# Tests: base price, peak modifier, indoor premium, stacking, equipment, coach, snapshots
```

**Concurrency Tests:**
```bash
pytest backend/tests/test_concurrency.py -v
# Tests: concurrent booking conflict, waitlist promotion, cancellation
```

**Integration Tests:**
```bash
pytest backend/tests/test_integration.py -v
# Tests: full booking flow, availability, pricing, admin CRUD
```

**All Tests:**
```bash
pytest backend/tests/ -v --cov=backend --cov-report=html
```

---

## Deployment Checklist

- [ ] Set environment variables (DATABASE_URL, REDIS_URL, JWT_SECRET)
- [ ] Configure Postgres backup (daily, 30-day retention)
- [ ] Configure Redis persistence (RDB or AOF)
- [ ] Set up monitoring (DataDog, New Relic, Prometheus)
- [ ] Enable logging (JSON format, structured logging)
- [ ] Add authentication (JWT on all endpoints)
- [ ] Configure CORS for frontend domain
- [ ] Set up CI/CD (GitHub Actions already in .github/workflows/ci.yml)
- [ ] Load testing (locust or Apache JMeter)
- [ ] Security audit (OWASP Top 10)
- [ ] Write runbooks for incidents

---

## Monitoring KPIs

| Metric | Target | Alert |
| --- | --- | --- |
| Booking success rate | >99% | <98% |
| API response time (p99) | <500ms | >1s |
| Database lock wait time | <100ms | >200ms |
| Waitlist size (avg) | <10 | >50 |
| Error rate | <0.1% | >0.5% |
| Uptime | >99.9% | Down |

---

## Common Troubleshooting

**Q: "Database connection failed"**
- Check DATABASE_URL env var
- Verify Postgres is running: `docker ps | grep postgres`
- Test connection: `psql postgresql://postgres:postgres@localhost:5432/courtbooking`

**Q: "Advisory lock timeout"**
- Increase lock timeout: `SET lock_timeout = '10s';`
- Check for long-running transactions: `SELECT * FROM pg_stat_activity;`

**Q: "Waitlist not promoting after cancellation"**
- Waitlist promotion is synchronous in current implementation
- Verify cancellation endpoint was called: Check audit_events table
- Check waitlist_entries for remaining queued users

**Q: "Pricing not matching expected amount"**
- Check rule priority order: `SELECT * FROM pricing_rules ORDER BY priority DESC;`
- Verify rule matches (check match conditions and stacking behavior)
- Use `/api/simulate-pricing` endpoint to test before booking

**Q: "Tests failing in CI"**
- Ensure Postgres and Redis services are running in GitHub Actions
- Check `.github/workflows/ci.yml` service configuration
- Run locally: `pytest backend/tests/ -v`

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/courtbooking
DB_POOL_SIZE=20

# Redis
REDIS_URL=redis://host:6379/0

# FastAPI
DEBUG=false
LOG_LEVEL=info
CORS_ORIGINS=https://app.example.com

# Auth (production)
JWT_SECRET=<generate_with_secrets.token_urlsafe(32)>
JWT_ALGORITHM=HS256
```

---

## Frontend Component Tree (Recommended)

```
App
├─ Router
├─ AuthProvider
└─ Pages
   ├─ BookingPage
   │  ├─ CalendarView
   │  ├─ SlotDetail
   │  ├─ BookingForm
   │  │  ├─ CourtSelector
   │  │  ├─ EquipmentSelector
   │  │  └─ CoachSelector
   │  ├─ PriceBreakdown
   │  └─ BookingSummary
   ├─ AdminPage
   │  ├─ CourtManager
   │  ├─ EquipmentManager
   │  ├─ CoachManager
   │  └─ PricingRuleEditor
   └─ HistoryPage
      └─ BookingList
```

---

## Release Notes

**v1.0.0 – December 10, 2025**
- ✅ Atomic multi-resource booking
- ✅ Dynamic stacked pricing engine
- ✅ Concurrency control with advisory locks
- ✅ FIFO waitlist with promotion
- ✅ Admin pricing rule CRUD
- ✅ 16 test cases (unit, concurrency, integration)
- ✅ OpenAPI spec and Postman examples
- ✅ Docker Compose for local dev
- ✅ GitHub Actions CI pipeline
- ✅ Production deployment guide

---

## Support & Documentation

- **README.md** – Setup and feature overview
- **DB_PRICING_WRITEUP.md** – Technical design
- **POSTMAN_EXAMPLES.md** – API request examples
- **OPENAPI.yml** – Interactive API docs
- **DEPLOYMENT_GUIDE.md** – Production deployment
- **IMPLEMENTATION_SUMMARY.md** – Complete feature checklist
- **API Docs** – http://localhost:8000/docs (when running)

---

**Last Updated:** December 10, 2025  
**Status:** Production-ready  
**Maintainer:** Dev Team
