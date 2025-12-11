# Postman API Examples

## Base URL
```
http://localhost:8000/api
```

## 1. Seed Database (Development Only)

```bash
POST /admin/seed

Response:
{
  "status": "seeded"
}
```

## 2. Get Available Slots for Date

```bash
GET /slots/2025-12-20

Response:
{
  "date": "2025-12-20",
  "courts": [
    {"id": 1, "name": "court_1", "type": "indoor"},
    {"id": 2, "name": "court_2", "type": "indoor"},
    {"id": 3, "name": "court_3", "type": "outdoor"},
    {"id": 4, "name": "court_4", "type": "outdoor"}
  ],
  "slots": [
    {"start": "2025-12-20T08:00:00", "end": "2025-12-20T08:30:00"},
    {"start": "2025-12-20T08:30:00", "end": "2025-12-20T09:00:00"},
    ...
  ],
  "coaches": [
    {"id": 1, "name": "Coach A", "hourly_rate": 300},
    {"id": 2, "name": "Coach B", "hourly_rate": 250},
    {"id": 3, "name": "Coach C", "hourly_rate": 200}
  ]
}
```

## 3. Check Availability for Time Window

```bash
GET /availability?start_ts=2025-12-20T19:00:00&end_ts=2025-12-20T20:00:00&court_type=indoor

Response:
{
  "available_courts": [
    {"court_id": 1, "name": "court_1", "type": "indoor"},
    {"court_id": 4, "name": "court_4", "type": "outdoor"}
  ],
  "equipment": [
    {"sku": "racket", "name": "Racket", "available_qty": 10},
    {"sku": "shoes", "name": "Shoes", "available_qty": 8}
  ],
  "coaches": [
    {"id": 1, "name": "Coach A"},
    {"id": 2, "name": "Coach B"},
    {"id": 3, "name": "Coach C"}
  ]
}
```

## 4. Simulate Pricing (Live Preview)

```bash
GET /simulate-pricing?start_ts=2025-12-20T19:00:00&end_ts=2025-12-20T20:00:00&court_id=1

Response:
{
  "base": 600.0,
  "rule_breakdown": [
    {"name": "Peak 18-21", "modifier": "20%", "after": 720.0},
    {"name": "Indoor +25", "modifier": "25%", "after": 900.0}
  ],
  "line_items": [
    {"name": "Court court_1 base", "amount": 600.0},
    {"name": "Indoor +25 modifier", "amount": 300.0}
  ],
  "total": 900.0
}
```

## 5. Create Booking (Atomic)

```bash
POST /bookings
Content-Type: application/json

{
  "user_email": "alice@example.com",
  "start_ts": "2025-12-20T19:00:00",
  "end_ts": "2025-12-20T20:00:00",
  "court_id": 1,
  "equipment": [
    {"sku": "racket", "quantity": 2},
    {"sku": "shoes", "quantity": 1}
  ],
  "coach_id": 1,
  "idempotency_key": "optional-uuid-for-retry-safety"
}

Response (Success):
{
  "status": "confirmed",
  "booking_id": 42,
  "total": 1300.0,
  "pricing": {
    "base": 600.0,
    "rule_breakdown": [...],
    "line_items": [...],
    "total": 1300.0
  }
}

Response (Waitlisted):
{
  "status": "waitlisted",
  "waitlist_id": 5,
  "message": "Added to waitlist for this slot"
}
```

## 6. Get Booking Details

```bash
GET /bookings/42

Response:
{
  "id": 42,
  "user_id": 10,
  "start_ts": "2025-12-20T19:00:00",
  "end_ts": "2025-12-20T20:00:00",
  "status": "confirmed",
  "total_price": 1300.0,
  "pricing_snapshot": {...},
  "created_at": "2025-12-10T15:30:00"
}
```

## 7. Cancel Booking

```bash
POST /bookings/42/cancel

Response:
{
  "status": "cancelled",
  "next_waitlist_user_id": 11
}
```

## 8. List Pricing Rules

```bash
GET /admin/pricing-rules

Response:
[
  {
    "id": 1,
    "name": "Peak 18-21",
    "enabled": true,
    "priority": 10,
    "rule_json": {
      "match": {"start": "18:00", "end": "21:00", "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]},
      "modifier": {"type": "percentage", "value": 20},
      "stack_behavior": "additive"
    }
  },
  ...
]
```

## 9. Create Pricing Rule

```bash
POST /admin/pricing-rules
Content-Type: application/json

{
  "name": "Off-peak discount",
  "enabled": true,
  "priority": 1,
  "rule_json": {
    "match": {"start": "08:00", "end": "12:00"},
    "modifier": {"type": "percentage", "value": -10},
    "stack_behavior": "additive"
  },
  "applies_to": "court"
}

Response:
{
  "id": 42,
  "status": "created"
}
```

## 10. Update Pricing Rule

```bash
PUT /admin/pricing-rules/42
Content-Type: application/json

{
  "name": "Off-peak discount (updated)",
  "enabled": false,
  "priority": 2,
  "rule_json": {...}
}

Response:
{
  "id": 42,
  "status": "updated"
}
```

## Common Test Scenarios

### Scenario 1: Book Peak Hour Indoor Court with Coach

```bash
# 1. Simulate pricing for Fri 7 PM indoor court
GET /simulate-pricing?start_ts=2025-12-19T19:00:00&end_ts=2025-12-19T20:00:00&court_id=1

# Result: ~900 (base 600 + 25% indoor + 20% peak) + coach fee

# 2. Create booking
POST /bookings
{
  "user_email": "peak_user@example.com",
  "start_ts": "2025-12-19T19:00:00",
  "end_ts": "2025-12-19T20:00:00",
  "court_id": 1,
  "equipment": [],
  "coach_id": 1
}
```

### Scenario 2: Waitlist & Promotion

```bash
# 1. Book slot
POST /bookings -> {"status": "confirmed", "booking_id": 100}

# 2. Book same slot (should waitlist)
POST /bookings -> {"status": "waitlisted", "waitlist_id": 5}

# 3. Cancel first booking
POST /bookings/100/cancel -> {"status": "cancelled", "next_waitlist_user_id": 2}

# Waitlist user 2 is notified (async in production)
```

### Scenario 3: Concurrent Booking Test

```bash
# Thread 1: POST /bookings -> {"status": "confirmed"}
# Thread 2: POST /bookings (same time, same slot) -> {"status": "waitlisted"}
```
