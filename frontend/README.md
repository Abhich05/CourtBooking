# Frontend - Court Booking Platform (React + TypeScript)

## Quick Start

```bash
npm install
npm start
```

## Project Structure

```
src/
  components/
    CalendarView.tsx        # Date picker + slot grid
    SlotDetail.tsx          # Detailed slot availability
    BookingForm.tsx         # Resource selector (court, equipment, coach)
    PriceBreakdown.tsx      # Live price preview
    BookingSummary.tsx      # Confirmation screen
    AdminDashboard.tsx      # Admin controls (courts, rules, pricing)
  pages/
    BookingPage.tsx
    AdminPage.tsx
    HistoryPage.tsx
  hooks/
    useAvailability.ts      # React Query for /api/availability
    useSimulatePricing.ts   # React Query for /api/simulate-pricing
  types/
    index.ts
  App.tsx
  index.tsx

```

## Key Components

### CalendarView
- Date picker (select future date)
- Display time slots (30-min intervals, 8 AM–9 PM)
- Show court availability status (available/booked/waitlist)

### PriceBreakdown
- Calls `/api/simulate-pricing` as user selects resources
- Shows:
  - Court base price
  - Applied rule modifiers (peak, weekend, indoor, etc.)
  - Equipment fees (if selected)
  - Coach fees (if selected)
  - Total price

### BookingForm
- Select court from available list
- Optional equipment (racket, shoes) with quantities
- Optional coach selection
- Confirm & book button

### BookingSummary
- Shows booking confirmation
- Displays booking ID, time, court, price, resources
- Option to share or print confirmation

### AdminDashboard
- CRUD courts (enable/disable)
- CRUD equipment inventory
- CRUD coaches
- CRUD pricing rules (JSON editor + UI form)
- View booking history + revenue

## State Management

- **React Query** for server state (availability, pricing, bookings)
- **Local state** for form inputs
- **URL params** for sharing/navigating to slot details

## API Integration

### Service file example (api.ts)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

const API_BASE = 'http://localhost:8000/api';

export const useAvailability = (start_ts, end_ts) =>
  useQuery(['availability', start_ts, end_ts], () =>
    fetch(`${API_BASE}/availability?start_ts=${start_ts}&end_ts=${end_ts}`).then(r => r.json())
  );

export const useSimulatePricing = (start_ts, end_ts, court_id) =>
  useQuery(['pricing', start_ts, end_ts, court_id], () =>
    fetch(`${API_BASE}/simulate-pricing?start_ts=${start_ts}&end_ts=${end_ts}&court_id=${court_id}`).then(r => r.json())
  );

export const createBooking = (req) =>
  fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  }).then(r => r.json());
```

## UX Flows

### Booking Flow
1. User selects date (CalendarView)
2. Selects time slot
3. Selects court, equipment, coach (BookingForm)
4. Price updates live (PriceBreakdown)
5. Confirms booking
6. If slot available → confirmed booking, show BookingSummary
7. If slot taken → offered waitlist, user joins or cancels

### Admin Flow
1. Navigate to AdminDashboard
2. View/edit courts, equipment, coaches
3. Manage pricing rules (JSON or form editor)
4. View booking history and revenue

## Optional Enhancements

- WebSocket for real-time availability updates
- Email confirmation with booking details
- Print/PDF booking confirmation
- Booking modifications (reschedule, change resources)
- Cancellation refund policy display
- Favorite courts / bookings
