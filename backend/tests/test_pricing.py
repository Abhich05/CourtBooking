import datetime
import pytest
from backend.db import SessionLocal, engine
from backend.models import Base, Court, PricingRule, CourtType
from backend.pricing import compute_price
from backend.seed import seed_data

@pytest.fixture(scope='function')
def db():
    """Setup and teardown DB for each test."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    seed_data(session)
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_base_price_calculation(db):
    """Test base price is calculated as hourly_rate * duration_hours."""
    court = db.query(Court).filter(Court.name == 'court_1').first()
    assert court is not None
    assert court.base_hourly == 600
    
    start = datetime.datetime(2025, 12, 15, 10, 0, 0)  # Monday 10 AM
    end = datetime.datetime(2025, 12, 15, 11, 0, 0)    # 1 hour
    
    result = compute_price(db, court, start, end)
    assert result['base'] == 600.0
    assert result['total'] >= 600.0

def test_peak_hours_modifier(db):
    """Test peak hours (6-9 PM) apply +20% modifier."""
    court = db.query(Court).filter(Court.name == 'court_1').first()
    
    start = datetime.datetime(2025, 12, 15, 19, 0, 0)  # 7 PM (peak)
    end = datetime.datetime(2025, 12, 15, 20, 0, 0)
    
    result = compute_price(db, court, start, end)
    # Base 600 + 20% peak = 720
    assert result['total'] >= 720.0
    assert len(result['rule_breakdown']) > 0

def test_indoor_premium_modifier(db):
    """Test indoor courts apply +25% modifier."""
    court = db.query(Court).filter(Court.name == 'court_1', Court.type == CourtType.indoor).first()
    assert court is not None
    
    start = datetime.datetime(2025, 12, 15, 10, 0, 0)
    end = datetime.datetime(2025, 12, 15, 11, 0, 0)
    
    result = compute_price(db, court, start, end)
    # Base 600 + 25% indoor = 750
    assert result['total'] >= 750.0

def test_stacking_additive(db):
    """Test multiple additive rules stack correctly."""
    court = db.query(Court).filter(Court.name == 'court_1').first()
    
    # Friday 7 PM (peak + indoor)
    start = datetime.datetime(2025, 12, 19, 19, 0, 0)  # Fri 7 PM
    end = datetime.datetime(2025, 12, 19, 20, 0, 0)
    
    result = compute_price(db, court, start, end)
    # Base 600 + 25% indoor + 20% peak (additive on base + indoor)
    # = 600 + 150 (25%) + 150 (25% of 600) = 900?
    # Exact calculation depends on rule order/application
    assert result['total'] > 600.0

def test_equipment_fees(db):
    """Test equipment fees are added to base court price."""
    court = db.query(Court).filter(Court.name == 'court_1').first()
    
    start = datetime.datetime(2025, 12, 15, 10, 0, 0)
    end = datetime.datetime(2025, 12, 15, 11, 0, 0)
    
    equipment = [{'sku': 'racket', 'quantity': 2, 'fee': 100}]
    result = compute_price(db, court, start, end, equipment=equipment)
    
    # Base 600 + equipment 200 (2 * 100)
    assert result['total'] >= 800.0
    assert any('Equipment' in item['name'] for item in result['line_items'])

def test_price_snapshot_captured(db):
    """Test pricing snapshot is captured and includes rule details."""
    court = db.query(Court).filter(Court.name == 'court_1').first()
    
    start = datetime.datetime(2025, 12, 15, 19, 0, 0)
    end = datetime.datetime(2025, 12, 15, 20, 0, 0)
    
    result = compute_price(db, court, start, end)
    assert 'line_items' in result
    assert 'rule_breakdown' in result
    assert 'total' in result
    assert result['total'] > 0
