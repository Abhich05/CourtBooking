from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .models import PricingRule, Court, Coach
import datetime

def rule_applies(rule_json: Dict[str, Any], target: Dict[str,Any], start_ts: datetime.datetime, end_ts: datetime.datetime) -> bool:
    # Basic match: checks time-of-day and days
    match = rule_json.get('match', {})
    if not match:
        return True
    # check days
    days = match.get('days')
    if days:
        weekday = start_ts.strftime('%a').lower()
        days_lower = [d[:3].lower() for d in days]
        if weekday[:3].lower() not in days_lower:
            return False
    # time window
    start_t = match.get('start')
    end_t = match.get('end')
    if start_t and end_t:
        st = datetime.time.fromisoformat(start_t)
        et = datetime.time.fromisoformat(end_t)
        if not (st <= start_ts.time() < et):
            return False
    # court type
    applies_to = rule_json.get('applies_to')
    if applies_to and target.get('type') and applies_to != 'all':
        if applies_to != target.get('type'):
            return False
    return True

def compute_price(db: Session, court: Court, start_ts: datetime.datetime, end_ts: datetime.datetime, equipment: List[Dict[str,int]] = None, coach: Coach = None) -> Dict[str,Any]:
    # Base price: pro-rate hourly base
    duration_hours = (end_ts - start_ts).total_seconds() / 3600.0
    base = (court.base_hourly or 0) * duration_hours
    line_items = [{'name': f'Court {court.name} base', 'amount': base}]

    # gather rules
    rules = db.query(PricingRule).filter(PricingRule.enabled == True).all()
    applicable = []
    target = {'type': court.type.value if hasattr(court.type,'value') else court.type}
    for r in rules:
        if rule_applies(r.rule_json, target, start_ts, end_ts):
            applicable.append({'priority': r.priority, 'rule': r})

    applicable.sort(key=lambda x: x['priority'], reverse=True)

    total = base
    breakdown_rules = []
    for ar in applicable:
        r = ar['rule']
        mod = r.rule_json.get('modifier', {})
        typ = mod.get('type')
        val = mod.get('value', 0)
        stack = r.rule_json.get('stack_behavior', 'additive')
        if typ == 'percentage':
            if stack == 'additive':
                delta = total * (val/100.0)
                total += delta
            elif stack == 'multiplicative':
                total = total * (1 + val/100.0)
            elif stack == 'max':
                total = max(total, total * (1 + val/100.0))
            breakdown_rules.append({'name': r.name, 'modifier': f"{val}%", 'after': total})
        elif typ == 'absolute':
            total += val
            breakdown_rules.append({'name': r.name, 'modifier': f"{val}", 'after': total})

    # equipment fees (flat per-item from rule or item meta)
    eq_total = 0
    if equipment:
        for e in equipment:
            # e: {'sku':..., 'quantity':n, 'fee': optional}
            qty = e.get('quantity',1)
            fee = e.get('fee')
            if fee is None:
                fee = e.get('meta', {}).get('fee', 0)
            amount = fee * qty
            if amount:
                line_items.append({'name': f"Equipment {e.get('sku')}", 'amount': amount})
            eq_total += amount
    total += eq_total

    # coach fee
    coach_total = 0
    if coach:
        coach_total = (coach.hourly_rate or 0) * duration_hours
        line_items.append({'name': f"Coach {coach.name}", 'amount': coach_total})
        total += coach_total

    return {'base': base, 'rule_breakdown': breakdown_rules, 'line_items': line_items, 'total': total}
