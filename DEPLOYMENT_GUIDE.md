# Deployment & Operations Guide

## Local Development

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 16+ (for frontend)

### Quick Start

```powershell
# 1. Clone and enter directory
cd "c:\Projects\court booking"

# 2. Start Postgres + Redis
cd infra
docker-compose up -d
cd ..

# 3. Setup Python environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt

# 4. Initialize database
python backend/seed.py

# 5. Run backend server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# 6. In another terminal, run tests
pytest backend/tests/ -v

# 7. API docs available at http://localhost:8000/docs
```

## Production Deployment

### Infrastructure (AWS Example)

1. **Managed Postgres (RDS)**
   - PostgreSQL 15+
   - Multi-AZ for HA
   - Automated backups (30 days retention)
   - Connection pooling: pgBouncer (optional)
   - Environment: `DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/courtbooking`

2. **Redis (ElastiCache)**
   - Redis 7+ cluster mode (for distributed locks)
   - Multi-AZ
   - Automatic failover
   - Environment: `REDIS_URL=redis://elasticache-endpoint:6379/0`

3. **Backend (Fargate / App Engine / VPS)**
   - FastAPI app in Docker container
   - Load balancer (ALB/NLB) for HA
   - Auto-scaling based on CPU/memory
   - Environment variables (DATABASE_URL, REDIS_URL, DEBUG=false)

4. **Frontend (CloudFront + S3)**
   - React app built and deployed to S3
   - CloudFront CDN caching
   - SSL/TLS enabled

5. **CI/CD (GitHub Actions)**
   - `.github/workflows/ci.yml` already configured
   - Runs tests on each PR
   - Deploys to staging on merge to main

### Environment Configuration

Create `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@db.example.com:5432/courtbooking
DB_POOL_SIZE=10
DB_POOL_RECYCLE=3600

# Redis
REDIS_URL=redis://cache.example.com:6379/0

# FastAPI
DEBUG=false
LOG_LEVEL=info
CORS_ORIGINS=https://app.example.com

# JWT (production)
JWT_SECRET=<generate_strong_secret>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=<password>
NOTIFICATION_FROM_EMAIL=bookings@example.com
```

### Docker Build

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and push:

```bash
docker build -t courtbooking-backend:latest .
docker tag courtbooking-backend:latest myregistry.azurecr.io/courtbooking-backend:latest
docker push myregistry.azurecr.io/courtbooking-backend:latest
```

### Database Migrations

For production schema updates:

1. Use Alembic (SQLAlchemy migrations):

```bash
alembic init alembic
alembic revision --autogenerate -m "Add new column"
alembic upgrade head
```

2. Store migrations in version control
3. Apply migrations before deploying new code

### Monitoring & Observability

```python
# Add to backend/main.py before app definition

import logging
from pythonjsonlogger import jsonlogger

# JSON logging for production
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)

# Metrics endpoint (for Prometheus)
@app.get("/metrics")
def metrics():
    # Return metrics in Prometheus format
    # e.g., booking_count, price_calculation_time, lock_wait_time
    return {"status": "ok"}
```

**Metrics to Monitor:**
- Booking success rate
- Waitlist size per slot
- Average price calculation time
- DB lock contention
- Redis latency
- API response times (p50, p95, p99)
- Error rates (5xx, database timeouts)

### Logging & Debugging

```python
# All audit events logged to audit_events table
# Event types: confirmed, cancelled, waitlisted, promoted
# Payload includes user ID, resources, timestamps
```

Query logs:

```sql
SELECT * FROM audit_events WHERE event_type = 'confirmed' AND created_at > now() - interval '24 hours';
```

### Backup & Disaster Recovery

**Postgres:**
- Automated daily backups (RDS)
- Point-in-time recovery (24–35 days)
- Export to S3 for long-term storage

**Redis:**
- RDB snapshots: every 5 minutes
- AOF (Append-Only File): optional for durability
- Regular testing of restore procedures

**Restore Procedure:**
```bash
# Postgres from RDS snapshot: AWS console or CLI
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier courtbooking-restored \
  --db-snapshot-identifier courtbooking-snapshot-2025-12-10

# Redis from RDB dump
redis-cli --rdb /tmp/dump.rdb
```

### Performance Tuning

1. **Database Indexing**
```sql
CREATE INDEX idx_bookings_start_end ON bookings(start_ts, end_ts) WHERE status = 'confirmed';
CREATE INDEX idx_waitlist_slot_hash ON waitlist_entries(slot_hash, created_at);
```

2. **Connection Pooling**
```python
from sqlalchemy import create_engine
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_recycle=3600,
    pool_pre_ping=True
)
```

3. **Query Optimization**
- Eager load allocations: `db.query(Booking).options(joinedload(Booking.allocations))`
- Cache pricing rules in Redis (TTL: 1 hour)

4. **Concurrency Tuning**
- Increase Postgres `max_connections` if needed
- Use connection pooling (pgBouncer) in front of RDS
- Tune advisory lock timeout

### Security Checklist

- [ ] Enable HTTPS/TLS (certificate from Let's Encrypt)
- [ ] Add JWT authentication to all endpoints
- [ ] Rate limiting (e.g., 100 requests/min per IP)
- [ ] CSRF protection on state-changing endpoints
- [ ] Input validation on all user inputs
- [ ] SQL injection protection (use ORM properly)
- [ ] Secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] DDoS protection (WAF, CloudFlare)
- [ ] Regular security audits and penetration testing
- [ ] Log sensitive data policy (PII masking)

### Load Testing

Using `locust`:

```python
# locustfile.py
from locust import HttpUser, task, between

class BookingUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def book_slot(self):
        self.client.post('/api/bookings', json={
            'user_email': 'user@example.com',
            'start_ts': '2025-12-20T19:00:00',
            'end_ts': '2025-12-20T20:00:00',
            'court_id': 1,
            'equipment': []
        })

    @task
    def check_availability(self):
        self.client.get('/api/availability?start_ts=2025-12-20T18:00:00&end_ts=2025-12-20T21:00:00')
```

Run:
```bash
locust -f locustfile.py -u 100 -r 5 --run-time 5m
```

### Runbooks (Operational Procedures)

#### Incident: High Lock Contention

```sql
-- Check lock waits
SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';

-- Kill long-running transactions
SELECT pg_cancel_backend(pid) FROM pg_stat_activity 
WHERE duration > '10 minutes' AND state = 'active';
```

#### Incident: Booking Service Down

1. Check application logs: `docker logs <container_id>`
2. Verify database connectivity: `psql postgresql://...`
3. Verify Redis: `redis-cli ping`
4. Restart service: `docker restart <container_id>`
5. Monitor for errors: Check error rate in metrics

#### Incident: Waitlist Backlog

```sql
-- Check waitlist size
SELECT slot_hash, COUNT(*) as queue_size FROM waitlist_entries 
GROUP BY slot_hash ORDER BY queue_size DESC;

-- Manually promote if needed (trigger async worker)
SELECT * FROM waitlist_entries LIMIT 10;
```

---

## Cost Estimation (AWS Example, 1 year)

| Service | Cost |
| --- | --- |
| RDS PostgreSQL (db.t3.medium, Multi-AZ) | $2,000/mo |
| ElastiCache Redis (cache.t3.micro) | $300/mo |
| Fargate (0.5 vCPU, 1 GB memory) | $500/mo |
| Application Load Balancer | $200/mo |
| CloudFront + S3 (frontend) | $100/mo |
| **Total** | **~$3,100/mo** ($37k/year) |

Scaling to 10x load: +50% costs (larger RDS, more Fargate tasks)

---

## Production Rollout Checklist

- [ ] Database schema and migrations tested
- [ ] All endpoints tested with realistic load
- [ ] Error handling and retry logic verified
- [ ] Monitoring and alerting configured
- [ ] Backup and restore procedures tested
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Runbooks prepared
- [ ] Incident response plan in place
- [ ] Launch date confirmed
- [ ] Rollback plan prepared
