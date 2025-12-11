"""
Booking integration tests: end-to-end workflow validation.
"""
import datetime
import pytest
from backend.db import SessionLocal, engine
from backend.models import Base, Booking, User
from backend.seed import seed_data
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture(scope='function')
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    seed_data(session)
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    return TestClient(app)

def test_full_booking_flow(client, db):
    """End-to-end: user books court + equipment + coach successfully."""
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=5)).replace(hour=18, minute=0, second=0, microsecond=0).isoformat()
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=5)).replace(hour=19, minute=0, second=0, microsecond=0).isoformat()
    
    payload = {
        'user_email': 'john@example.com',
        'start_ts': start,
        'end_ts': end,
        'court_id': 1,
        'equipment': [{'sku': 'racket', 'quantity': 1}],
        'coach_id': 1
    }
    
    resp = client.post('/api/bookings', json=payload)
    result = resp.json()
    
    assert result['status'] == 'confirmed'
    assert 'booking_id' in result
    assert result['total'] > 0
    assert 'pricing' in result

def test_availability_query(client, db):
    """Test availability endpoint returns correct slot status."""
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=6)).replace(hour=9, minute=0, second=0, microsecond=0)
    end = start + datetime.timedelta(hours=1)
    
    # Check availability
    resp = client.get(f'/api/availability?start_ts={start.isoformat()}&end_ts={end.isoformat()}')
    result = resp.json()
    
    assert 'available_courts' in result
    assert 'equipment' in result
    assert 'coaches' in result
    assert len(result['available_courts']) > 0

def test_simulate_pricing_endpoint(client, db):
    """Test that /api/simulate-pricing returns correct breakdown."""
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=7)).replace(hour=19, minute=0, second=0, microsecond=0).isoformat()
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=7)).replace(hour=20, minute=0, second=0, microsecond=0).isoformat()
    
    resp = client.get(f'/api/simulate-pricing?start_ts={start}&end_ts={end}&court_id=1')
    result = resp.json()
    
    assert 'base' in result
    assert 'line_items' in result
    assert 'total' in result
    assert result['total'] >= result['base']

def test_booking_retrieval(client, db):
    """Test fetching booking details by ID."""
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=8)).replace(hour=11, minute=0, second=0, microsecond=0).isoformat()
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=8)).replace(hour=12, minute=0, second=0, microsecond=0).isoformat()
    
    # Create booking
    create_resp = client.post('/api/bookings', json={
        'user_email': 'jane@example.com',
        'start_ts': start,
        'end_ts': end,
        'court_id': 1,
        'equipment': []
    })
    booking_id = create_resp.json()['booking_id']
    
    # Retrieve booking
    get_resp = client.get(f'/api/bookings/{booking_id}')
    result = get_resp.json()
    
    assert result['id'] == booking_id
    assert result['status'] == 'confirmed'
    assert result['total_price'] > 0

def test_admin_pricing_rules_crud(client, db):
    """Test admin can create and update pricing rules."""
    # Create new rule
    new_rule = {
        'name': 'Early morning discount',
        'enabled': True,
        'priority': 5,
        'rule_json': {
            'match': {'start': '08:00', 'end': '10:00'},
            'modifier': {'type': 'percentage', 'value': -10}
        },
        'applies_to': 'court'
    }
    
    resp = client.post('/api/admin/pricing-rules', json=new_rule)
    result = resp.json()
    assert result['status'] == 'created'
    rule_id = result['id']
    
    # List rules
    list_resp = client.get('/api/admin/pricing-rules')
    rules = list_resp.json()
    assert any(r['name'] == 'Early morning discount' for r in rules)
    
    # Update rule
    updated_rule = {
        'name': 'Early morning discount (updated)',
        'enabled': False,
        'priority': 3,
        'rule_json': {'match': {'start': '08:00', 'end': '10:30'}, 'modifier': {'type': 'percentage', 'value': -15}}
    }
    update_resp = client.put(f'/api/admin/pricing-rules/{rule_id}', json=updated_rule)
    assert update_resp.json()['status'] == 'updated'
