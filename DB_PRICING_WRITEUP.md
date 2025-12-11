# Database & Pricing Engine Design Write-Up

## Database Design

The schema uses **normalized relational design** with **JSONB columns** for flexible configuration:

### Core Tables

**users** – Customer profiles (email, phone, name).

**courts** – Venue inventory with type (indoor/outdoor) and base hourly rate. Enabled flag allows soft-delete.

**equipment_items** – Rackets, shoes, etc. Tracks total_quantity (not per-booking; availability computed dynamically).

**coaches** – Trainer profiles with hourly_rate. Active flag enables/disables.

**bookings** – Main booking record: user, time window, status (confirmed/cancelled/pending), total_price, and **pricing_snapshot** (immutable JSON of rule state at booking time). This ensures audit trail and rate stability.

**booking_allocations** – Maps each booking to reserved resources: resource_type (court|equipment|coach), resource_id, quantity. Normalizes 1-to-many without duplication.

**pricing_rules** – Configurable rules as JSON: name, priority, rule_json (time/day/court-type match), modifier (percentage/absolute), stack_behavior (additive/multiplicative/max). Admin-facing CRUD.

**waitlist_entries** – FIFO per slot_hash (derived from start_ts+end_ts+resource_id). Tracks position and hold window expiry.

**audit_events** – Booking lifecycle: booking_id, event_type (created|confirmed|cancelled|waitlisted), payload (JSON context).

**coach_availability** – Optional; stores coach time windows (start_ts, end_ts, recurring_rule for weekly patterns).

### Design Rationale

- **Normalization**: Separates concerns (court inventory, bookings, rules) → easy to query and maintain.
- **JSONB for rules**: Rules evolve; JSON avoids schema migrations. Indexed queries still supported via operators.
- **booking_allocations**: Decouples resource types; allows adding new resource categories (e.g., parking, locker) without schema change.
- **pricing_snapshot**: Captures rule state at booking time → immutable audit trail, protects against retroactive rule changes.
- **Slot hash**: Identifies a resource+time slot for waitlist; precomputed or cached in Redis for fast lookups.

## Pricing Engine Design (Novel Approach)

### Problem
Traditional fixed pricing ignores complexity: peak hours, weekends, venue type, equipment, coach fees must compose dynamically. Admin should configure rules without code changes.

### Solution: Composable Rule Engine

**Step 1: Rule Matching**
- Admin defines rules with **match conditions**: time-of-day (18–21), weekday (Mon–Fri, Sat–Sun), court type (indoor/outdoor).
- Query DB: `SELECT * FROM pricing_rules WHERE enabled = true ORDER BY priority DESC`.
- Filter applicable rules (match court type, slot time, etc.).

**Step 2: Stacking Behavior**
- Each rule has a **modifier** (percentage or absolute value) and **stack_behavior**.
- **Additive**: Apply percentage to base, add all deltas. Example: base 600 + 20% = 120, + 15% = 90, total 810.
- **Multiplicative**: Chain percentages. Example: base 600 × 1.20 × 1.15 = 828.
- **Max**: Use highest result. Example: max(base, base × 1.20).
- Compute total iteratively; store intermediate results for line-item breakdown.

**Step 3: Additional Fees**
- Equipment: flat fee per item × quantity (e.g., racket +100 per unit).
- Coach: hourly_rate × duration (e.g., coach 300/hr for 1-hour slot = 300).
- Sum all line items → final price.

**Step 4: Snapshot for Audit**
- Store pricing_snapshot (rules applied, line items, modifiers) in booking record.
- On display, admin sees exact rule state at booking time → auditability.

### Advantages

1. **Configuration-driven**: Admin edits rules; no code deploy.
2. **Composable**: Rules combine additively or multiplicatively; easy to reason about.
3. **Auditability**: Snapshot ensures prices never retroactively change.
4. **Performance**: Rules cached in Redis or queried once per booking request.
5. **Testing**: Simulate pricing with `/api/simulate-pricing` endpoint before committing.

### Example Scenario

**Input**: Friday 7 PM (19:00) indoor court booking, 1 hour, racket, coach.

**Rules Applied**:
1. Peak (6–9 PM): +20% → base 600 + 120 = 720
2. Weekend (N/A; Friday) → skip
3. Indoor: +25% → 720 + 180 = 900

**Additional**:
- Racket: +100 → 1000
- Coach (hourly_rate 300): +300 → 1300

**Result**: $1300 (line items: court 600 base + 120 peak + 180 indoor, racket 100, coach 300)

## Production Considerations

- **Caching**: Cache rules in Redis for read-heavy bookings; invalidate on rule update.
- **Concurrency**: Use DB transactions + advisory locks for atomic booking + equipment deduction.
- **Availability queries**: Pre-aggregate slot availability (every 30 min) in Redis; fallback to DB interval queries.
- **Timezone**: Store all times in UTC; frontend localizes on display.

---

This design balances flexibility (JSON rules), correctness (transactions, snapshots), and performance (caching, locks).
