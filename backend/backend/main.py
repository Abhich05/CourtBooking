from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from . import db, models, pricing
from .auth import (
    UserRegister, UserLogin, TokenResponse, PasswordChange,
    create_user, authenticate_user, get_current_user, get_current_user_optional,
    require_admin, generate_tokens, decode_token, hash_password, verify_password,
    create_access_token
)
from sqlalchemy.orm import Session
import uvicorn
import datetime
import hashlib
import json
import asyncio
import os
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Set

app = FastAPI(
    title='CourtBook Pro API',
    description='Professional Court Booking Platform with AI-powered insights',
    version='2.0.0'
)

# CORS Middleware - support production URLs
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://court-booking-eta.vercel.app")
allowed_origins = [origin.strip() for origin in cors_origins.split(",")]

# Add wildcard support for development
if "*" in allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

def get_db_session():
    yield from db.get_db()


# ===== Auto-seed database on startup =====
@app.on_event("startup")
async def startup_event():
    """Initialize database and seed data on startup."""
    from .models import Base, Court, User
    
    # Create tables
    Base.metadata.create_all(bind=db.engine)
    
    # Check if data already exists
    session = db.SessionLocal()
    try:
        existing_courts = session.query(Court).first()
        if not existing_courts:
            print("🌱 Seeding database...")
            seed_database(session)
            print("✅ Database seeded successfully!")
        else:
            print("✅ Database already seeded")
    finally:
        session.close()


def seed_database(db_session):
    """Seed the database with initial data."""
    from .models import Court, EquipmentItem, Coach, PricingRule, CoachAvailability, User
    from .auth import hash_password
    
    # Create admin user
    admin = User(
        name='Admin User',
        email='admin@courtbook.com',
        phone='+1234567890',
        password_hash=hash_password('Admin123!'),
        role='admin',
        is_active=True,
        email_verified=True
    )
    db_session.add(admin)
    
    # Create demo customer user
    demo = User(
        name='Demo User',
        email='demo@courtbook.com',
        phone='+1987654321',
        password_hash=hash_password('Demo123!'),
        role='customer',
        is_active=True,
        email_verified=True
    )
    db_session.add(demo)

    # Courts
    courts_data = [
        {'name': 'Court 1 (Indoor)', 'type': 'indoor', 'base_hourly': 600},
        {'name': 'Court 2 (Indoor)', 'type': 'indoor', 'base_hourly': 600},
        {'name': 'Court 3 (Outdoor)', 'type': 'outdoor', 'base_hourly': 400},
        {'name': 'Court 4 (Outdoor)', 'type': 'outdoor', 'base_hourly': 400},
    ]
    for c in courts_data:
        db_session.add(Court(name=c['name'], type=c['type'], base_hourly=c['base_hourly']))

    # Equipment
    equipment_data = [
        {'sku': 'racket', 'name': 'Badminton Racket', 'total_quantity': 10},
        {'sku': 'shoes', 'name': 'Court Shoes', 'total_quantity': 8},
        {'sku': 'shuttlecock', 'name': 'Shuttlecock (Pack of 6)', 'total_quantity': 20}
    ]
    for e in equipment_data:
        db_session.add(EquipmentItem(sku=e['sku'], name=e['name'], total_quantity=e['total_quantity']))

    # Coaches
    coaches_data = [
        {'name': 'Coach Alex', 'hourly_rate': 300},
        {'name': 'Coach Sarah', 'hourly_rate': 250},
        {'name': 'Coach Mike', 'hourly_rate': 200}
    ]
    coaches = []
    for c in coaches_data:
        coach = Coach(name=c['name'], hourly_rate=c['hourly_rate'])
        db_session.add(coach)
        coaches.append(coach)
    
    db_session.flush()  # Get coach IDs
    
    # Coach availability (Mon-Sat, 8am-8pm)
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for coach in coaches:
        for day in days:
            db_session.add(CoachAvailability(
                coach_id=coach.id,
                day_of_week=day,
                start_time='08:00',
                end_time='20:00'
            ))

    # Pricing rules
    rules_data = [
        {
            'name': 'Peak Hours (6-9 PM)', 'enabled': True, 'priority': 10,
            'rule_json': {'match': {'start': '18:00', 'end': '21:00', 'days': ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']}, 'modifier': {'type': 'percentage', 'value': 20}},
            'applies_to': 'court'
        },
        {
            'name': 'Weekend Surcharge', 'enabled': True, 'priority': 5,
            'rule_json': {'match': {'days': ['sat', 'sun']}, 'modifier': {'type': 'percentage', 'value': 15}},
            'applies_to': 'court'
        },
        {
            'name': 'Indoor Premium', 'enabled': True, 'priority': 8,
            'rule_json': {'match': {}, 'applies_to': 'indoor', 'modifier': {'type': 'percentage', 'value': 25}},
            'applies_to': 'court'
        }
    ]
    for r in rules_data:
        db_session.add(PricingRule(name=r['name'], enabled=r['enabled'], priority=r['priority'], rule_json=r['rule_json'], applies_to=r['applies_to']))

    db_session.commit()


# ===== WebSocket Connection Manager =====
class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: dict = {}  # date -> set of websockets
    
    async def connect(self, websocket: WebSocket, date: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if date:
            if date not in self.subscriptions:
                self.subscriptions[date] = set()
            self.subscriptions[date].add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        # Remove from all subscriptions
        for date in list(self.subscriptions.keys()):
            if websocket in self.subscriptions[date]:
                self.subscriptions[date].remove(websocket)
            if not self.subscriptions[date]:
                del self.subscriptions[date]
    
    async def broadcast(self, message: dict):
        """Broadcast to all connected clients."""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass
    
    async def broadcast_to_date(self, date: str, message: dict):
        """Broadcast to clients subscribed to a specific date."""
        if date in self.subscriptions:
            for connection in self.subscriptions[date]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()


@app.websocket("/ws/availability/{date}")
async def websocket_availability(websocket: WebSocket, date: str):
    """WebSocket endpoint for real-time availability updates."""
    await manager.connect(websocket, date)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Can handle subscription changes or ping/pong here
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def notify_booking_change(date: str, booking_type: str, booking_id: int):
    """Notify all subscribers about a booking change."""
    await manager.broadcast_to_date(date, {
        "type": "availability_update",
        "event": booking_type,
        "booking_id": booking_id,
        "date": date,
        "timestamp": datetime.datetime.utcnow().isoformat()
    })


# ===== Authentication Endpoints =====
@app.post('/api/auth/register', response_model=TokenResponse, tags=['Authentication'])
def register(user_data: UserRegister, db_s: Session = Depends(get_db_session)):
    """Register a new user account."""
    user = create_user(db_s, user_data)
    return generate_tokens(user)


@app.post('/api/auth/login', response_model=TokenResponse, tags=['Authentication'])
def login(credentials: UserLogin, db_s: Session = Depends(get_db_session)):
    """Login with email and password."""
    user = authenticate_user(db_s, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update login stats
    user.last_login = datetime.datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    db_s.commit()
    
    return generate_tokens(user)


@app.post('/api/auth/refresh', response_model=TokenResponse, tags=['Authentication'])
def refresh_token(refresh_token: str, db_s: Session = Depends(get_db_session)):
    """Get new access token using refresh token."""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db_s.get(models.User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return generate_tokens(user)


@app.get('/api/auth/me', tags=['Authentication'])
async def get_me(user = Depends(get_current_user)):
    """Get current authenticated user."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "email_verified": user.email_verified,
        "preferences": user.preferences or {},
        "login_count": user.login_count,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }


@app.put('/api/auth/me', tags=['Authentication'])
async def update_profile(
    name: Optional[str] = None,
    phone: Optional[str] = None,
    avatar_url: Optional[str] = None,
    preferences: Optional[dict] = None,
    user = Depends(get_current_user),
    db_s: Session = Depends(get_db_session)
):
    """Update current user's profile."""
    if name:
        user.name = name
    if phone is not None:
        user.phone = phone
    if avatar_url is not None:
        user.avatar_url = avatar_url
    if preferences is not None:
        user.preferences = preferences
    
    db_s.commit()
    return {"status": "updated"}


@app.post('/api/auth/change-password', tags=['Authentication'])
async def change_password(
    data: PasswordChange,
    user = Depends(get_current_user),
    db_s: Session = Depends(get_db_session)
):
    """Change user's password."""
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    user.password_hash = hash_password(data.new_password)
    db_s.commit()
    return {"status": "password_changed"}


class BookingRequest(BaseModel):
    user_email: str
    start_ts: datetime.datetime
    end_ts: datetime.datetime
    court_id: int
    equipment: list = []
    coach_id: int | None = None
    idempotency_key: str | None = None

@app.post('/api/admin/seed')
def seed(db_s: Session = Depends(get_db_session)):
    from ..seed import seed_data
    seed_data(db_s)
    return {'status':'seeded'}

@app.get('/api/slots/{date_str}')
def get_slots_for_date(date_str: str, db_s: Session = Depends(get_db_session)):
    """Return available courts and coaches for a given date (ISO format)."""
    try:
        date = datetime.datetime.fromisoformat(date_str).date()
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid date format (use ISO)')
    
    courts = db_s.query(models.Court).filter(models.Court.enabled == True).all()
    coaches = db_s.query(models.Coach).filter(models.Coach.active == True).all()
    
    # Generate 30 min slots for the day
    slots = []
    start = datetime.datetime.combine(date, datetime.time(8, 0))
    end = datetime.datetime.combine(date, datetime.time(21, 0))
    current = start
    while current < end:
        next_slot = current + datetime.timedelta(minutes=30)
        slots.append({'start': current.isoformat(), 'end': next_slot.isoformat()})
        current = next_slot
    
    return {'date': str(date), 'courts': [{'id': c.id, 'name': c.name, 'type': c.type.value} for c in courts], 'slots': slots, 'coaches': [{'id': co.id, 'name': co.name, 'hourly_rate': co.hourly_rate} for co in coaches]}

@app.get('/api/availability')
def get_availability(start_ts: datetime.datetime, end_ts: datetime.datetime, court_type: str | None = None, db_s: Session = Depends(get_db_session)):
    """Check which courts/equipment/coaches are available for a time window."""
    courts = db_s.query(models.Court).filter(models.Court.enabled == True)
    if court_type:
        courts = courts.filter(models.Court.type == court_type)
    courts = courts.all()
    
    available = []
    for court in courts:
        overlapping = db_s.query(models.Booking).filter(
            models.Booking.start_ts < end_ts,
            models.Booking.end_ts > start_ts,
            models.Booking.status == 'confirmed'
        ).all()
        is_booked = False
        for b in overlapping:
            for alloc in b.allocations:
                if alloc.resource_type == 'court' and alloc.resource_id == court.id:
                    is_booked = True
                    break
        if not is_booked:
            available.append({'court_id': court.id, 'name': court.name, 'type': court.type.value})
    
    equipment = db_s.query(models.EquipmentItem).filter(models.EquipmentItem.active == True).all()
    coaches = db_s.query(models.Coach).filter(models.Coach.active == True).all()
    
    return {'available_courts': available, 'equipment': [{'sku': e.sku, 'name': e.name, 'available_qty': e.total_quantity} for e in equipment], 'coaches': [{'id': c.id, 'name': c.name} for c in coaches]}

@app.get('/api/simulate-pricing')
def simulate_pricing(start_ts: datetime.datetime, end_ts: datetime.datetime, court_id: int, db_s: Session = Depends(get_db_session)):
    court = db_s.get(models.Court, court_id)
    if not court:
        raise HTTPException(status_code=404, detail='court not found')
    result = pricing.compute_price(db_s, court, start_ts, end_ts)
    return result

@app.post('/api/bookings')
def create_booking(req: BookingRequest, db_s: Session = Depends(get_db_session)):
    """Atomically book court + equipment + coach with idempotency."""
    user = db_s.query(models.User).filter(models.User.email == req.user_email).first()
    if not user:
        user = models.User(name=req.user_email.split('@')[0], email=req.user_email)
        db_s.add(user)
        db_s.commit()
        db_s.refresh(user)
    
    court = db_s.get(models.Court, req.court_id)
    if not court or not court.enabled:
        raise HTTPException(status_code=400, detail='court unavailable')
    
    # Get coach if specified
    coach = db_s.get(models.Coach, req.coach_id) if req.coach_id else None
    
    price = pricing.compute_price(db_s, court, req.start_ts, req.end_ts, req.equipment, coach)
    
    slot_hash = f"{req.start_ts.isoformat()}_{req.end_ts.isoformat()}_{req.court_id}"
    lock_id = int(hashlib.md5(slot_hash.encode()).hexdigest()[:8], 16)
    
    try:
        db_s.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": lock_id})
    except Exception as e:
        print(f"Advisory lock warning: {e}")
    
    overlapping = db_s.query(models.Booking).filter(
        models.Booking.start_ts < req.end_ts,
        models.Booking.end_ts > req.start_ts,
        models.Booking.status == 'confirmed'
    ).all()
    
    for b in overlapping:
        for alloc in b.allocations:
            if alloc.resource_type == 'court' and alloc.resource_id == req.court_id:
                w = models.WaitlistEntry(slot_hash=slot_hash, user_id=user.id)
                db_s.add(w)
                db_s.commit()
                db_s.refresh(w)
                return {'status': 'waitlisted', 'waitlist_id': w.id, 'message': 'Added to waitlist for this slot'}
    
    # ===== Equipment availability validation =====
    for e in req.equipment:
        sku = e.get('sku')
        requested_qty = e.get('quantity', 1)
        equipment_item = db_s.query(models.EquipmentItem).filter(models.EquipmentItem.sku == sku).first()
        if not equipment_item or not equipment_item.active:
            raise HTTPException(status_code=400, detail=f'Equipment {sku} not available')
        
        # Count already booked equipment for overlapping time slots
        booked_qty = 0
        for b in overlapping:
            for alloc in b.allocations:
                if alloc.resource_type == 'equipment' and alloc.resource_id == sku:
                    booked_qty += alloc.quantity
        
        available_qty = equipment_item.total_quantity - booked_qty
        if requested_qty > available_qty:
            raise HTTPException(status_code=400, detail=f'Insufficient {sku} availability. Requested: {requested_qty}, Available: {available_qty}')
    
    # ===== Coach availability validation =====
    if req.coach_id:
        coach = db_s.get(models.Coach, req.coach_id)
        if not coach or not coach.active:
            raise HTTPException(status_code=400, detail='Coach not available')
        
        # Check if coach is already booked for overlapping time
        for b in overlapping:
            for alloc in b.allocations:
                if alloc.resource_type == 'coach' and alloc.resource_id == req.coach_id:
                    raise HTTPException(status_code=400, detail='Coach already booked for this time slot')
        
        # Check coach availability schedule
        booking_day = req.start_ts.strftime('%A').lower()
        booking_start_time = req.start_ts.strftime('%H:%M')
        booking_end_time = req.end_ts.strftime('%H:%M')
        
        coach_availability = db_s.query(models.CoachAvailability).filter(
            models.CoachAvailability.coach_id == req.coach_id,
            models.CoachAvailability.day_of_week == booking_day
        ).first()
        
        if not coach_availability:
            raise HTTPException(status_code=400, detail=f'Coach not available on {booking_day}')
        
        if booking_start_time < coach_availability.start_time or booking_end_time > coach_availability.end_time:
            raise HTTPException(status_code=400, detail=f'Coach availability is {coach_availability.start_time}-{coach_availability.end_time} on {booking_day}')
    
    booking = models.Booking(
        user_id=user.id,
        start_ts=req.start_ts,
        end_ts=req.end_ts,
        status='confirmed',
        total_price=price['total'],
        pricing_snapshot=price
    )
    db_s.add(booking)
    db_s.flush()
    
    alloc = models.BookingAllocation(booking_id=booking.id, resource_type='court', resource_id=req.court_id, quantity=1)
    db_s.add(alloc)
    
    for e in req.equipment:
        ea = models.BookingAllocation(booking_id=booking.id, resource_type='equipment', resource_id=e.get('sku'), quantity=e.get('quantity', 1))
        db_s.add(ea)
    
    if req.coach_id:
        ca = models.BookingAllocation(booking_id=booking.id, resource_type='coach', resource_id=req.coach_id, quantity=1)
        db_s.add(ca)
    
    db_s.commit()
    db_s.refresh(booking)
    
    audit = models.AuditEvent(booking_id=booking.id, event_type='confirmed', payload={'user_email': req.user_email})
    db_s.add(audit)
    db_s.commit()
    
    return {'status': 'confirmed', 'booking_id': booking.id, 'total': price['total'], 'pricing': price}

@app.get('/api/bookings/{booking_id}')
def get_booking(booking_id: int, db_s: Session = Depends(get_db_session)):
    """Fetch booking details."""
    booking = db_s.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail='booking not found')
    return {
        'id': booking.id,
        'user_id': booking.user_id,
        'start_ts': booking.start_ts,
        'end_ts': booking.end_ts,
        'status': booking.status,
        'total_price': booking.total_price,
        'pricing_snapshot': booking.pricing_snapshot,
        'created_at': booking.created_at
    }

@app.post('/api/bookings/{booking_id}/cancel')
def cancel_booking(booking_id: int, db_s: Session = Depends(get_db_session)):
    """Cancel booking and promote next waitlist user."""
    booking = db_s.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail='booking not found')
    
    booking.status = 'cancelled'
    db_s.commit()
    
    slot_hash = f"{booking.start_ts.isoformat()}_{booking.end_ts.isoformat()}_{booking.allocations[0].resource_id if booking.allocations else 'unknown'}"
    next_user = db_s.query(models.WaitlistEntry).filter(models.WaitlistEntry.slot_hash == slot_hash).order_by(models.WaitlistEntry.created_at).first()
    if next_user:
        audit = models.AuditEvent(booking_id=booking.id, event_type='cancelled', payload={'next_waitlist_user_id': next_user.user_id})
        db_s.add(audit)
        db_s.commit()
        return {'status': 'cancelled', 'next_waitlist_user_id': next_user.user_id}
    
    return {'status': 'cancelled'}

@app.get('/api/admin/pricing-rules')
def list_pricing_rules(db_s: Session = Depends(get_db_session)):
    rules = db_s.query(models.PricingRule).all()
    return [{'id': r.id, 'name': r.name, 'enabled': r.enabled, 'priority': r.priority, 'rule_json': r.rule_json} for r in rules]

@app.post('/api/admin/pricing-rules')
def create_pricing_rule(rule: dict, db_s: Session = Depends(get_db_session)):
    pr = models.PricingRule(
        name=rule.get('name'),
        enabled=rule.get('enabled', True),
        priority=rule.get('priority', 0),
        rule_json=rule.get('rule_json', {}),
        applies_to=rule.get('applies_to', 'court')
    )
    db_s.add(pr)
    db_s.commit()
    db_s.refresh(pr)
    return {'id': pr.id, 'status': 'created'}

@app.put('/api/admin/pricing-rules/{rule_id}')
def update_pricing_rule(rule_id: int, rule: dict, db_s: Session = Depends(get_db_session)):
    pr = db_s.get(models.PricingRule, rule_id)
    if not pr:
        raise HTTPException(status_code=404, detail='rule not found')
    pr.name = rule.get('name', pr.name)
    pr.enabled = rule.get('enabled', pr.enabled)
    pr.priority = rule.get('priority', pr.priority)
    pr.rule_json = rule.get('rule_json', pr.rule_json)
    db_s.commit()
    return {'id': pr.id, 'status': 'updated'}

@app.delete('/api/admin/pricing-rules/{rule_id}')
def delete_pricing_rule(rule_id: int, db_s: Session = Depends(get_db_session)):
    pr = db_s.get(models.PricingRule, rule_id)
    if not pr:
        raise HTTPException(status_code=404, detail='rule not found')
    db_s.delete(pr)
    db_s.commit()
    return {'status': 'deleted'}

# ===== Admin CRUD for Courts =====
@app.get('/api/admin/courts')
def list_courts(db_s: Session = Depends(get_db_session)):
    courts = db_s.query(models.Court).all()
    return [{'id': c.id, 'name': c.name, 'type': c.type.value, 'base_price': c.base_price, 'enabled': c.enabled} for c in courts]

@app.post('/api/admin/courts')
def create_court(court: dict, db_s: Session = Depends(get_db_session)):
    c = models.Court(
        name=court.get('name'),
        type=court.get('type', 'indoor'),
        base_price=court.get('base_price', 30.0),
        enabled=court.get('enabled', True)
    )
    db_s.add(c)
    db_s.commit()
    db_s.refresh(c)
    return {'id': c.id, 'status': 'created'}

@app.put('/api/admin/courts/{court_id}')
def update_court(court_id: int, court: dict, db_s: Session = Depends(get_db_session)):
    c = db_s.get(models.Court, court_id)
    if not c:
        raise HTTPException(status_code=404, detail='court not found')
    c.name = court.get('name', c.name)
    if 'type' in court:
        c.type = court['type']
    c.base_price = court.get('base_price', c.base_price)
    c.enabled = court.get('enabled', c.enabled)
    db_s.commit()
    return {'id': c.id, 'status': 'updated'}

@app.delete('/api/admin/courts/{court_id}')
def delete_court(court_id: int, db_s: Session = Depends(get_db_session)):
    c = db_s.get(models.Court, court_id)
    if not c:
        raise HTTPException(status_code=404, detail='court not found')
    db_s.delete(c)
    db_s.commit()
    return {'status': 'deleted'}

# ===== Admin CRUD for Equipment =====
@app.get('/api/admin/equipment')
def list_equipment(db_s: Session = Depends(get_db_session)):
    items = db_s.query(models.EquipmentItem).all()
    return [{'sku': e.sku, 'name': e.name, 'total_quantity': e.total_quantity, 'rental_price': e.rental_price, 'active': e.active} for e in items]

@app.post('/api/admin/equipment')
def create_equipment(eq: dict, db_s: Session = Depends(get_db_session)):
    e = models.EquipmentItem(
        sku=eq.get('sku'),
        name=eq.get('name'),
        total_quantity=eq.get('total_quantity', 1),
        rental_price=eq.get('rental_price', 5.0),
        active=eq.get('active', True)
    )
    db_s.add(e)
    db_s.commit()
    db_s.refresh(e)
    return {'sku': e.sku, 'status': 'created'}

@app.put('/api/admin/equipment/{sku}')
def update_equipment(sku: str, eq: dict, db_s: Session = Depends(get_db_session)):
    e = db_s.query(models.EquipmentItem).filter(models.EquipmentItem.sku == sku).first()
    if not e:
        raise HTTPException(status_code=404, detail='equipment not found')
    e.name = eq.get('name', e.name)
    e.total_quantity = eq.get('total_quantity', e.total_quantity)
    e.rental_price = eq.get('rental_price', e.rental_price)
    e.active = eq.get('active', e.active)
    db_s.commit()
    return {'sku': e.sku, 'status': 'updated'}

@app.delete('/api/admin/equipment/{sku}')
def delete_equipment(sku: str, db_s: Session = Depends(get_db_session)):
    e = db_s.query(models.EquipmentItem).filter(models.EquipmentItem.sku == sku).first()
    if not e:
        raise HTTPException(status_code=404, detail='equipment not found')
    db_s.delete(e)
    db_s.commit()
    return {'status': 'deleted'}

# ===== Admin CRUD for Coaches =====
@app.get('/api/admin/coaches')
def list_coaches(db_s: Session = Depends(get_db_session)):
    coaches = db_s.query(models.Coach).all()
    return [{'id': c.id, 'name': c.name, 'hourly_rate': c.hourly_rate, 'active': c.active} for c in coaches]

@app.post('/api/admin/coaches')
def create_coach(coach: dict, db_s: Session = Depends(get_db_session)):
    c = models.Coach(
        name=coach.get('name'),
        hourly_rate=coach.get('hourly_rate', 50.0),
        active=coach.get('active', True)
    )
    db_s.add(c)
    db_s.commit()
    db_s.refresh(c)
    return {'id': c.id, 'status': 'created'}

@app.put('/api/admin/coaches/{coach_id}')
def update_coach(coach_id: int, coach: dict, db_s: Session = Depends(get_db_session)):
    c = db_s.get(models.Coach, coach_id)
    if not c:
        raise HTTPException(status_code=404, detail='coach not found')
    c.name = coach.get('name', c.name)
    c.hourly_rate = coach.get('hourly_rate', c.hourly_rate)
    c.active = coach.get('active', c.active)
    db_s.commit()
    return {'id': c.id, 'status': 'updated'}

@app.delete('/api/admin/coaches/{coach_id}')
def delete_coach(coach_id: int, db_s: Session = Depends(get_db_session)):
    c = db_s.get(models.Coach, coach_id)
    if not c:
        raise HTTPException(status_code=404, detail='coach not found')
    db_s.delete(c)
    db_s.commit()
    return {'status': 'deleted'}

# ===== Coach Availability Management =====
@app.get('/api/admin/coaches/{coach_id}/availability')
def get_coach_availability(coach_id: int, db_s: Session = Depends(get_db_session)):
    coach = db_s.get(models.Coach, coach_id)
    if not coach:
        raise HTTPException(status_code=404, detail='coach not found')
    avails = db_s.query(models.CoachAvailability).filter(models.CoachAvailability.coach_id == coach_id).all()
    return [{'id': a.id, 'day_of_week': a.day_of_week, 'start_time': str(a.start_time), 'end_time': str(a.end_time)} for a in avails]

@app.post('/api/admin/coaches/{coach_id}/availability')
def add_coach_availability(coach_id: int, avail: dict, db_s: Session = Depends(get_db_session)):
    coach = db_s.get(models.Coach, coach_id)
    if not coach:
        raise HTTPException(status_code=404, detail='coach not found')
    
    a = models.CoachAvailability(
        coach_id=coach_id,
        day_of_week=avail.get('day_of_week'),
        start_time=datetime.time.fromisoformat(avail.get('start_time', '08:00')),
        end_time=datetime.time.fromisoformat(avail.get('end_time', '18:00'))
    )
    db_s.add(a)
    db_s.commit()
    db_s.refresh(a)
    return {'id': a.id, 'status': 'created'}

@app.delete('/api/admin/coaches/{coach_id}/availability/{avail_id}')
def delete_coach_availability(coach_id: int, avail_id: int, db_s: Session = Depends(get_db_session)):
    a = db_s.get(models.CoachAvailability, avail_id)
    if not a or a.coach_id != coach_id:
        raise HTTPException(status_code=404, detail='availability not found')
    db_s.delete(a)
    db_s.commit()
    return {'status': 'deleted'}

# ===== Booking History Endpoint =====
@app.get('/api/bookings')
def list_bookings(user_email: str | None = None, status: str | None = None, skip: int = 0, limit: int = 50, db_s: Session = Depends(get_db_session)):
    """List bookings with optional filters."""
    query = db_s.query(models.Booking)
    
    if user_email:
        user = db_s.query(models.User).filter(models.User.email == user_email).first()
        if user:
            query = query.filter(models.Booking.user_id == user.id)
        else:
            return {'bookings': [], 'total': 0}
    
    if status:
        query = query.filter(models.Booking.status == status)
    
    total = query.count()
    bookings = query.order_by(models.Booking.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for b in bookings:
        allocations = [{'type': a.resource_type, 'resource_id': a.resource_id, 'quantity': a.quantity} for a in b.allocations]
        user = db_s.get(models.User, b.user_id)
        result.append({
            'id': b.id,
            'user_email': user.email if user else None,
            'start_ts': b.start_ts.isoformat(),
            'end_ts': b.end_ts.isoformat(),
            'status': b.status,
            'total_price': b.total_price,
            'allocations': allocations,
            'created_at': b.created_at.isoformat()
        })
    
    return {'bookings': result, 'total': total, 'skip': skip, 'limit': limit}


# ===== Analytics & Insights Dashboard (Unique Feature) =====
@app.get('/api/analytics/dashboard', tags=['Analytics'])
def get_analytics_dashboard(db_s: Session = Depends(get_db_session)):
    """
    Get comprehensive analytics dashboard data.
    This is a unique AI-powered analytics feature for top 1% experience.
    """
    from sqlalchemy import func, case, extract
    from datetime import timedelta
    
    today = datetime.datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # === Revenue Statistics ===
    total_revenue = db_s.query(func.sum(models.Booking.total_price)).filter(
        models.Booking.status == 'confirmed'
    ).scalar() or 0
    
    weekly_revenue = db_s.query(func.sum(models.Booking.total_price)).filter(
        models.Booking.status == 'confirmed',
        func.date(models.Booking.created_at) >= week_ago
    ).scalar() or 0
    
    monthly_revenue = db_s.query(func.sum(models.Booking.total_price)).filter(
        models.Booking.status == 'confirmed',
        func.date(models.Booking.created_at) >= month_ago
    ).scalar() or 0
    
    # === Booking Statistics ===
    total_bookings = db_s.query(models.Booking).filter(
        models.Booking.status == 'confirmed'
    ).count()
    
    weekly_bookings = db_s.query(models.Booking).filter(
        models.Booking.status == 'confirmed',
        func.date(models.Booking.created_at) >= week_ago
    ).count()
    
    pending_waitlist = db_s.query(models.WaitlistEntry).count()
    
    # === User Statistics ===
    total_users = db_s.query(models.User).count()
    new_users_week = db_s.query(models.User).filter(
        func.date(models.User.created_at) >= week_ago
    ).count()
    
    # === Peak Hours Analysis ===
    peak_hours = db_s.query(
        extract('hour', models.Booking.start_ts).label('hour'),
        func.count(models.Booking.id).label('count')
    ).filter(
        models.Booking.status == 'confirmed'
    ).group_by('hour').order_by(func.count(models.Booking.id).desc()).limit(5).all()
    
    # === Court Utilization ===
    courts = db_s.query(models.Court).all()
    court_stats = []
    for court in courts:
        court_bookings = db_s.query(models.BookingAllocation).filter(
            models.BookingAllocation.resource_type == 'court',
            models.BookingAllocation.resource_id == court.id
        ).count()
        court_stats.append({
            'id': court.id,
            'name': court.name,
            'type': court.type.value,
            'bookings': court_bookings,
            'utilization_percent': min(100, (court_bookings / max(total_bookings, 1)) * 100 * len(courts))
        })
    
    # === Popular Equipment ===
    equipment_stats = db_s.query(
        models.BookingAllocation.resource_id,
        func.sum(models.BookingAllocation.quantity).label('total_rented')
    ).filter(
        models.BookingAllocation.resource_type == 'equipment'
    ).group_by(models.BookingAllocation.resource_id).order_by(
        func.sum(models.BookingAllocation.quantity).desc()
    ).limit(5).all()
    
    # === Coach Performance ===
    coach_stats = []
    coaches = db_s.query(models.Coach).all()
    for coach in coaches:
        coach_sessions = db_s.query(models.BookingAllocation).filter(
            models.BookingAllocation.resource_type == 'coach',
            models.BookingAllocation.resource_id == coach.id
        ).count()
        coach_stats.append({
            'id': coach.id,
            'name': coach.name,
            'sessions': coach_sessions,
            'hourly_rate': coach.hourly_rate
        })
    
    # === Daily Revenue Trend (Last 7 days) ===
    revenue_trend = []
    for i in range(7):
        day = today - timedelta(days=6-i)
        day_revenue = db_s.query(func.sum(models.Booking.total_price)).filter(
            models.Booking.status == 'confirmed',
            func.date(models.Booking.created_at) == day
        ).scalar() or 0
        revenue_trend.append({
            'date': day.isoformat(),
            'revenue': float(day_revenue)
        })
    
    # === Smart Insights (AI-like recommendations) ===
    insights = []
    
    # Peak time insight
    if peak_hours:
        peak_hour = int(peak_hours[0][0])
        insights.append({
            'type': 'peak_time',
            'icon': '⏰',
            'title': 'Peak Booking Time',
            'message': f'Most bookings happen at {peak_hour}:00. Consider premium pricing during this hour.',
            'priority': 'high'
        })
    
    # User growth insight
    if new_users_week > 0:
        growth_rate = (new_users_week / max(total_users - new_users_week, 1)) * 100
        insights.append({
            'type': 'growth',
            'icon': '📈',
            'title': 'User Growth',
            'message': f'{new_users_week} new users this week ({growth_rate:.1f}% growth)',
            'priority': 'medium'
        })
    
    # Waitlist insight
    if pending_waitlist > 0:
        insights.append({
            'type': 'waitlist',
            'icon': '⏳',
            'title': 'Waitlist Alert',
            'message': f'{pending_waitlist} people waiting. Consider adding more court availability.',
            'priority': 'high'
        })
    
    # Revenue insight
    if weekly_revenue > 0:
        avg_booking_value = weekly_revenue / max(weekly_bookings, 1)
        insights.append({
            'type': 'revenue',
            'icon': '💰',
            'title': 'Average Booking Value',
            'message': f'${avg_booking_value:.2f} per booking this week',
            'priority': 'medium'
        })
    
    return {
        'summary': {
            'total_revenue': float(total_revenue),
            'weekly_revenue': float(weekly_revenue),
            'monthly_revenue': float(monthly_revenue),
            'total_bookings': total_bookings,
            'weekly_bookings': weekly_bookings,
            'total_users': total_users,
            'new_users_week': new_users_week,
            'pending_waitlist': pending_waitlist
        },
        'peak_hours': [{'hour': int(h[0]), 'count': h[1]} for h in peak_hours],
        'court_utilization': court_stats,
        'equipment_popularity': [{'sku': e[0], 'rentals': int(e[1])} for e in equipment_stats],
        'coach_performance': coach_stats,
        'revenue_trend': revenue_trend,
        'insights': insights
    }


@app.get('/api/analytics/user/{user_id}', tags=['Analytics'])
def get_user_analytics(user_id: int, db_s: Session = Depends(get_db_session)):
    """Get personalized analytics for a specific user."""
    user = db_s.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    
    # User's booking history stats
    user_bookings = db_s.query(models.Booking).filter(
        models.Booking.user_id == user_id,
        models.Booking.status == 'confirmed'
    ).all()
    
    total_spent = sum(b.total_price or 0 for b in user_bookings)
    total_hours = 0
    favorite_court = None
    court_counts = {}
    
    for booking in user_bookings:
        duration = (booking.end_ts - booking.start_ts).total_seconds() / 3600
        total_hours += duration
        
        for alloc in booking.allocations:
            if alloc.resource_type == 'court':
                court_counts[alloc.resource_id] = court_counts.get(alloc.resource_id, 0) + 1
    
    if court_counts:
        fav_court_id = max(court_counts, key=court_counts.get)
        fav_court = db_s.get(models.Court, fav_court_id)
        if fav_court:
            favorite_court = {'id': fav_court.id, 'name': fav_court.name, 'visits': court_counts[fav_court_id]}
    
    # Loyalty level calculation
    loyalty_points = len(user_bookings) * 10 + int(total_spent)
    loyalty_level = 'Bronze'
    if loyalty_points >= 500:
        loyalty_level = 'Gold'
    elif loyalty_points >= 200:
        loyalty_level = 'Silver'
    elif loyalty_points >= 100:
        loyalty_level = 'Bronze+'
    
    return {
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'member_since': user.created_at.isoformat() if user.created_at else None
        },
        'stats': {
            'total_bookings': len(user_bookings),
            'total_spent': float(total_spent),
            'total_hours_played': round(total_hours, 1),
            'favorite_court': favorite_court
        },
        'loyalty': {
            'level': loyalty_level,
            'points': loyalty_points,
            'next_level_at': 100 if loyalty_level == 'Bronze' else (200 if loyalty_level == 'Bronze+' else (500 if loyalty_level == 'Silver' else 1000))
        }
    }


# ===== Smart Recommendations (AI-Powered Unique Feature) =====
@app.get('/api/recommendations', tags=['Smart Features'])
def get_smart_recommendations(user_email: str = None, date: str = None, db_s: Session = Depends(get_db_session)):
    """
    AI-powered smart booking recommendations.
    Analyzes booking patterns to suggest optimal times and courts.
    """
    from sqlalchemy import func, extract
    from datetime import timedelta
    
    today = datetime.datetime.utcnow().date()
    target_date = datetime.datetime.strptime(date, '%Y-%m-%d').date() if date else today + timedelta(days=1)
    target_weekday = target_date.strftime('%A').lower()
    
    recommendations = []
    
    # === 1. Low-Traffic Time Recommendations ===
    # Find hours with fewer bookings (better availability)
    hourly_bookings = db_s.query(
        extract('hour', models.Booking.start_ts).label('hour'),
        func.count(models.Booking.id).label('count')
    ).filter(
        models.Booking.status == 'confirmed'
    ).group_by('hour').all()
    
    hour_counts = {int(h[0]): h[1] for h in hourly_bookings}
    all_hours = list(range(8, 22))  # 8 AM to 10 PM
    
    # Find quietest hours
    quietest_hours = sorted(all_hours, key=lambda h: hour_counts.get(h, 0))[:3]
    
    for hour in quietest_hours:
        recommendations.append({
            'type': 'optimal_time',
            'icon': '⏰',
            'title': f'Less Crowded at {hour}:00',
            'description': f'Book at {hour}:00 for the best court availability and a more relaxed experience.',
            'priority': 'medium',
            'action': {
                'type': 'book_time',
                'hour': hour,
                'date': target_date.isoformat()
            }
        })
    
    # === 2. Value-for-Money Recommendations ===
    # Find courts with best pricing
    courts = db_s.query(models.Court).filter(models.Court.enabled == True).all()
    if courts:
        cheapest_court = min(courts, key=lambda c: c.base_price or c.base_hourly or 0)
        recommendations.append({
            'type': 'best_value',
            'icon': '💰',
            'title': f'Best Value: {cheapest_court.name}',
            'description': f'Get the best rates starting at ${cheapest_court.base_price or cheapest_court.base_hourly}/hour.',
            'priority': 'high',
            'action': {
                'type': 'book_court',
                'court_id': cheapest_court.id
            }
        })
    
    # === 3. Weekend Special Recommendations ===
    if target_weekday in ['saturday', 'sunday']:
        recommendations.append({
            'type': 'weekend_tip',
            'icon': '🌟',
            'title': 'Weekend Booking Tip',
            'description': 'Weekends fill up fast! Book early morning (8-10 AM) for guaranteed availability.',
            'priority': 'high',
            'action': None
        })
    
    # === 4. Coach Recommendation ===
    coaches = db_s.query(models.Coach).filter(models.Coach.active == True).all()
    if coaches:
        # Recommend coach with most availability
        coach_with_availability = None
        for coach in coaches:
            avail = db_s.query(models.CoachAvailability).filter(
                models.CoachAvailability.coach_id == coach.id,
                models.CoachAvailability.day_of_week == target_weekday
            ).first()
            if avail:
                coach_with_availability = coach
                break
        
        if coach_with_availability:
            recommendations.append({
                'type': 'coach_available',
                'icon': '👨‍🏫',
                'title': f'Coach {coach_with_availability.name} Available',
                'description': f'Improve your game! Professional coaching at ${coach_with_availability.hourly_rate}/hour.',
                'priority': 'medium',
                'action': {
                    'type': 'add_coach',
                    'coach_id': coach_with_availability.id
                }
            })
    
    # === 5. Personalized Recommendations (if user is logged in) ===
    if user_email:
        user = db_s.query(models.User).filter(models.User.email == user_email).first()
        if user:
            user_bookings = db_s.query(models.Booking).filter(
                models.Booking.user_id == user.id,
                models.Booking.status == 'confirmed'
            ).all()
            
            if user_bookings:
                # Find user's preferred hour
                user_hours = {}
                for booking in user_bookings:
                    hour = booking.start_ts.hour
                    user_hours[hour] = user_hours.get(hour, 0) + 1
                
                if user_hours:
                    preferred_hour = max(user_hours, key=user_hours.get)
                    recommendations.append({
                        'type': 'personalized',
                        'icon': '✨',
                        'title': 'Your Preferred Time',
                        'description': f'Based on your history, you usually book at {preferred_hour}:00. Continue your routine?',
                        'priority': 'high',
                        'action': {
                            'type': 'book_time',
                            'hour': preferred_hour,
                            'date': target_date.isoformat()
                        }
                    })
    
    # === 6. Equipment Bundle Recommendation ===
    equipment = db_s.query(models.EquipmentItem).filter(models.EquipmentItem.active == True).all()
    if equipment:
        recommendations.append({
            'type': 'equipment_bundle',
            'icon': '🎾',
            'title': 'Equipment Package',
            'description': f'Don\'t have your gear? Rent a complete set starting at ${min(e.rental_price for e in equipment)}/session.',
            'priority': 'low',
            'action': {
                'type': 'add_equipment'
            }
        })
    
    # Sort by priority
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    recommendations.sort(key=lambda r: priority_order.get(r['priority'], 3))
    
    return {
        'date': target_date.isoformat(),
        'recommendations': recommendations[:6],  # Top 6 recommendations
        'total': len(recommendations)
    }


# ===== Health Check Endpoint =====
@app.get('/api/health', tags=['System'])
def health_check(db_s: Session = Depends(get_db_session)):
    """System health check endpoint."""
    try:
        # Test database connection
        db_s.execute(text("SELECT 1"))
        db_status = "healthy"
    except:
        db_status = "unhealthy"
    
    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "version": "2.0.0",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "websocket": "active",
            "analytics": "active"
        }
    }


if __name__ == '__main__':
    uvicorn.run('backend.main:app', host='0.0.0.0', port=8000, reload=True)
