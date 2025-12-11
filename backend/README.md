Backend (FastAPI)
=================

Prereqs:
- Docker (for Postgres + Redis) or a local Postgres and Redis instance
- Python 3.10+

Quick start (with Docker Compose):

1. From repo root run:

```powershell
cd "c:\Projects\court booking\infra"
docker-compose up -d
```

2. Create and activate virtualenv, install deps:

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r ../backend/requirements.txt
```

3. Seed dev data and run the app:

```powershell
python ../backend/seed.py
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at `http://localhost:8000/docs`.
