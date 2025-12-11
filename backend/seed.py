import os
from typing import Optional
from backend.db import engine, SessionLocal
from backend.models import Base, Court, EquipmentItem, Coach, PricingRule, CoachAvailability, User
from backend.auth import hash_password
import sqlalchemy
import json

def seed_data(db_sess = None):
    # create tables
    Base.metadata.create_all(bind=engine)
    db = db_sess or SessionLocal()

    # Create admin user
    admin_exists = db.query(User).filter(User.email == 'admin@courtbook.com').first()
    if not admin_exists:
        admin = User(
            name='Admin User',
            email='admin@courtbook.com',
            phone='+1234567890',
            password_hash=hash_password('Admin123!'),
            role='admin',
            is_active=True,
            email_verified=True
        )
        db.add(admin)
    
    # Create demo customer user
    demo_exists = db.query(User).filter(User.email == 'demo@courtbook.com').first()
    if not demo_exists:
        demo = User(
            name='Demo User',
            email='demo@courtbook.com',
            phone='+1987654321',
            password_hash=hash_password('Demo123!'),
            role='customer',
            is_active=True,
            email_verified=True
        )
        db.add(demo)

    # courts
    courts = [
        {'name':'court_1','type':'indoor','base_hourly':600},
        {'name':'court_2','type':'indoor','base_hourly':600},
        {'name':'court_3','type':'outdoor','base_hourly':400},
        {'name':'court_4','type':'outdoor','base_hourly':400},
    ]
    for c in courts:
        exists = db.query(Court).filter(Court.name==c['name']).first()
        if not exists:
            court = Court(name=c['name'], type=c['type'], base_hourly=c['base_hourly'])
            db.add(court)

    # equipment
    eq = [
        {'sku':'racket','name':'Racket','total_quantity':10},
        {'sku':'shoes','name':'Shoes','total_quantity':8}
    ]
    for e in eq:
        exists = db.query(EquipmentItem).filter(EquipmentItem.sku==e['sku']).first()
        if not exists:
            item = EquipmentItem(sku=e['sku'], name=e['name'], total_quantity=e['total_quantity'])
            db.add(item)

    # coaches
    coaches = [
        {'name':'Coach A','hourly_rate':300},
        {'name':'Coach B','hourly_rate':250},
        {'name':'Coach C','hourly_rate':200}
    ]
    for c in coaches:
        exists = db.query(Coach).filter(Coach.name==c['name']).first()
        if not exists:
            coach = Coach(name=c['name'], hourly_rate=c['hourly_rate'])
            db.add(coach)
    
    db.commit()  # commit coaches first to get their IDs
    
    # coach availability (Mon-Sat, 8am-8pm for all coaches)
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    all_coaches = db.query(Coach).all()
    for coach in all_coaches:
        for day in days:
            exists = db.query(CoachAvailability).filter(
                CoachAvailability.coach_id == coach.id,
                CoachAvailability.day_of_week == day
            ).first()
            if not exists:
                avail = CoachAvailability(
                    coach_id=coach.id,
                    day_of_week=day,
                    start_time='08:00',
                    end_time='20:00'
                )
                db.add(avail)

    # pricing rules
    rules = [
        {
            'name':'Peak 18-21', 'enabled':True, 'priority':10,
            'rule_json':{'match':{'start':'18:00','end':'21:00','days':['mon','tue','wed','thu','fri','sat','sun']}, 'modifier':{'type':'percentage','value':20}, 'stack_behavior':'additive'},
            'applies_to':'court'
        },
        {
            'name':'Weekend +15', 'enabled':True, 'priority':5,
            'rule_json':{'match':{'days':['sat','sun']}, 'modifier':{'type':'percentage','value':15}, 'stack_behavior':'additive'},
            'applies_to':'court'
        },
        {
            'name':'Indoor +25', 'enabled':True, 'priority':8,
            'rule_json':{'match':{}, 'applies_to':'indoor', 'modifier':{'type':'percentage','value':25}, 'stack_behavior':'additive'},
            'applies_to':'court'
        }
    ]
    for r in rules:
        exists = db.query(PricingRule).filter(PricingRule.name==r['name']).first()
        if not exists:
            pr = PricingRule(name=r['name'], enabled=r['enabled'], priority=r['priority'], rule_json=r['rule_json'], applies_to=r['applies_to'])
            db.add(pr)

    db.commit()
    print('seed complete')

if __name__ == '__main__':
    seed_data()
