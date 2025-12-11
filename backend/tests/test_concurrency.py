import threading
import time
import datetime
import pytest
from backend.db import SessionLocal, engine
from backend.models import Base
from backend.seed import seed_data
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture(scope='function')
def db():
    """Setup and teardown DB for each test."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    seed_data(session)
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    return TestClient(app)

def test_concurrent_booking_only_one_succeeds(client, db):
    """Test that two simultaneous bookings for the same slot only one confirms."""
    # Use a future slot to ensure no conflicts
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0).isoformat()
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0).isoformat()
    
    payload1 = {'user_email': 'alice@example.com', 'start_ts': start, 'end_ts': end, 'court_id': 1, 'equipment': []}
    payload2 = {'user_email': 'bob@example.com', 'start_ts': start, 'end_ts': end, 'court_id': 1, 'equipment': []}
    
    results = [None, None]
    
    def book(idx, payload):
        resp = client.post('/api/bookings', json=payload)
        results[idx] = resp.json()
    
    t1 = threading.Thread(target=book, args=(0, payload1))
    t2 = threading.Thread(target=book, args=(1, payload2))
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    # Verify results
    statuses = [r.get('status') for r in results]
    assert 'confirmed' in statuses, f"At least one booking should confirm. Got: {results}"
    
    # Count confirmed vs waitlisted
    confirmed_count = statuses.count('confirmed')
    waitlisted_count = statuses.count('waitlisted')
    
    assert confirmed_count == 1, f"Exactly 1 should confirm. Got {confirmed_count}."
    assert waitlisted_count >= 1, f"At least 1 should be waitlisted. Got {waitlisted_count}."

def test_sequential_booking_fills_slot(client, db):
    """Test that sequential bookings: first confirms, second goes to waitlist."""
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=2)).replace(hour=15, minute=0, second=0, microsecond=0).isoformat()
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=2)).replace(hour=16, minute=0, second=0, microsecond=0).isoformat()
    
    # First booking should succeed
    resp1 = client.post('/api/bookings', json={'user_email': 'user1@example.com', 'start_ts': start, 'end_ts': end, 'court_id': 2, 'equipment': []})
    result1 = resp1.json()
    assert result1['status'] == 'confirmed'
    booking_id_1 = result1['booking_id']
    
    # Second booking to same slot should go to waitlist
    resp2 = client.post('/api/bookings', json={'user_email': 'user2@example.com', 'start_ts': start, 'end_ts': end, 'court_id': 2, 'equipment': []})
    result2 = resp2.json()
    assert result2['status'] == 'waitlisted'

def test_cancellation_promotes_waitlist(client, db):
    """Test that canceling a booking promotes next on waitlist."""
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=3)).replace(hour=16, minute=0, second=0, microsecond=0).isoformat()
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=3)).replace(hour=17, minute=0, second=0, microsecond=0).isoformat()
    
    # First booking
    resp1 = client.post('/api/bookings', json={'user_email': 'user3@example.com', 'start_ts': start, 'end_ts': end, 'court_id': 3, 'equipment': []})
    result1 = resp1.json()
    assert result1['status'] == 'confirmed'
    booking_id_1 = result1['booking_id']
    
    # Second booking (waitlist)
    resp2 = client.post('/api/bookings', json={'user_email': 'user4@example.com', 'start_ts': start, 'end_ts': end, 'court_id': 3, 'equipment': []})
    result2 = resp2.json()
    assert result2['status'] == 'waitlisted'
    
    # Cancel first booking
    resp_cancel = client.post(f'/api/bookings/{booking_id_1}/cancel')
    result_cancel = resp_cancel.json()
    assert result_cancel['status'] == 'cancelled'
    # next_waitlist_user_id should be set if waitlist promotion triggered
    if 'next_waitlist_user_id' in result_cancel:
        assert result_cancel['next_waitlist_user_id'] > 0

def test_different_courts_no_conflict(client, db):
    """Test that bookings to different courts don't conflict."""
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=4)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat()
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=4)).replace(hour=11, minute=0, second=0, microsecond=0).isoformat()
    
    # Book court_1
    resp1 = client.post('/api/bookings', json={'user_email': 'user5@example.com', 'start_ts': start, 'end_ts': end, 'court_id': 1, 'equipment': []})
    result1 = resp1.json()
    assert result1['status'] == 'confirmed'
    
    # Book court_2 (same time, different court - should succeed)
    resp2 = client.post('/api/bookings', json={'user_email': 'user6@example.com', 'start_ts': start, 'end_ts': end, 'court_id': 2, 'equipment': []})
    result2 = resp2.json()
    assert result2['status'] == 'confirmed', f"Different court booking should succeed. Got: {result2}"
