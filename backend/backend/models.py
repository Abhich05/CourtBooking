from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Float, ForeignKey, Enum, func
from sqlalchemy.orm import relationship, declarative_base
import enum

Base = declarative_base()

class CourtType(enum.Enum):
    indoor = 'indoor'
    outdoor = 'outdoor'

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String)
    password_hash = Column(String, nullable=True)  # Nullable for existing users
    role = Column(String, default='customer')  # 'customer', 'admin', 'staff'
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)
    avatar_url = Column(String, nullable=True)
    preferences = Column(JSON, default={})
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Court(Base):
    __tablename__ = 'courts'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(Enum(CourtType), nullable=False)
    enabled = Column(Boolean, default=True)
    meta = Column(JSON, default={})
    base_hourly = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

class EquipmentItem(Base):
    __tablename__ = 'equipment_items'
    id = Column(Integer, primary_key=True)
    sku = Column(String, unique=True)
    name = Column(String)
    total_quantity = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    meta = Column(JSON, default={})

class Coach(Base):
    __tablename__ = 'coaches'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    bio = Column(String)
    hourly_rate = Column(Integer, default=0)
    active = Column(Boolean, default=True)

class CoachAvailability(Base):
    __tablename__ = 'coach_availability'
    id = Column(Integer, primary_key=True)
    coach_id = Column(Integer, ForeignKey('coaches.id'))
    day_of_week = Column(String)  # 'monday', 'tuesday', etc.
    start_time = Column(String)   # '08:00'
    end_time = Column(String)     # '20:00'

class Booking(Base):
    __tablename__ = 'bookings'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    start_ts = Column(DateTime, index=True)
    end_ts = Column(DateTime, index=True)
    status = Column(String, default='confirmed', index=True)
    total_price = Column(Float, default=0.0)
    pricing_snapshot = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    allocations = relationship('BookingAllocation', back_populates='booking')

class BookingAllocation(Base):
    __tablename__ = 'booking_allocations'
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey('bookings.id'))
    resource_type = Column(String)
    resource_id = Column(Integer)
    quantity = Column(Integer, default=1)
    booking = relationship('Booking', back_populates='allocations')

class PricingRule(Base):
    __tablename__ = 'pricing_rules'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    enabled = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    rule_json = Column(JSON)
    applies_to = Column(JSON)
    type = Column(String, default='modifier')
    created_at = Column(DateTime, server_default=func.now())

class WaitlistEntry(Base):
    __tablename__ = 'waitlist_entries'
    id = Column(Integer, primary_key=True)
    slot_hash = Column(String, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, server_default=func.now())
    position = Column(Integer, default=0)
    notified_until_ts = Column(DateTime, nullable=True)

class AuditEvent(Base):
    __tablename__ = 'audit_events'
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=True)
    event_type = Column(String)
    payload = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
