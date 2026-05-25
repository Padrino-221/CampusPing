# CampusVoice — Bulk SMS Campaign Platform
### Technical Design & Implementation Document

> **Project Type:** Full-Stack Web Application
> **Target Users:** University political aspirants, SRC candidates, campus campaign managers
> **Primary Provider:** Arkesel SMS API
> **Stack:** FastAPI · PostgreSQL · Redis · Celery · React/Vite
> **Author:** Padrino
> **Version:** 1.0.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack & Rationale](#3-tech-stack--rationale)
4. [Database Design](#4-database-design)
5. [Backend — FastAPI](#5-backend--fastapi)
6. [Arkesel SMS Integration](#6-arkesel-sms-integration)
7. [Async Task Queue — Celery + Redis](#7-async-task-queue--celery--redis)
8. [Frontend — React/Vite](#8-frontend--reactvite)
9. [Admin Panel](#9-admin-panel)
10. [Credits & Billing System](#10-credits--billing-system)
11. [Security & Compliance](#11-security--compliance)
12. [Deployment](#12-deployment)
13. [Environment Variables](#13-environment-variables)
14. [AI Agent Prompts](#14-ai-agent-prompts)

---

## 1. Project Overview

**CampusVoice** is a multi-tenant, web-based bulk SMS campaign platform designed for university political aspirants. Candidates register on the platform, purchase SMS credits, compose targeted campaigns, and send them to filtered segments of a sanitized student directory — all through a clean, self-service dashboard.

### Core Value Proposition

- Candidates reach the right voters (by gender, level, department, faculty, hall) without manual list management
- Real-time audience size preview before sending
- Custom sender IDs (e.g. `KWAME4SRC`) for brand recognition
- Full delivery tracking per campaign

### User Roles

| Role | Responsibilities |
|---|---|
| **Super Admin** | Manages institutions, student directories, sender ID approvals, credits, platform billing |
| **Candidate** | Registers, buys credits, builds and sends campaigns, views delivery stats |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React/Vite SPA                     │
│         (Candidate Dashboard + Admin Panel)             │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS / REST API
┌────────────────────▼────────────────────────────────────┐
│               FastAPI Application Server                │
│         (8 Gunicorn workers + Uvicorn workers)          │
│                                                         │
│  /auth   /candidates   /students   /campaigns   /admin  │
└──────┬──────────────────────────────────────┬───────────┘
       │                                      │
┌──────▼──────┐                    ┌──────────▼──────────┐
│ PostgreSQL  │                    │   Redis (Broker)    │
│  (Primary   │                    │  + Session Store    │
│   Database) │                    └──────────┬──────────┘
└─────────────┘                               │
                                   ┌──────────▼──────────┐
                                   │   Celery Workers    │
                                   │  (SMS Dispatch +    │
                                   │  Delivery Polling)  │
                                   └──────────┬──────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │    Arkesel API      │
                                   │  (SMS Gateway)      │
                                   └─────────────────────┘
```

### Request Flow — Campaign Send

```
Candidate clicks "Send Campaign"
        │
FastAPI validates credits + filters
        │
Celery task queued (Redis broker)
        │
Worker fetches filtered student phones from DB
        │
Worker chunks list → Arkesel bulk SMS endpoint
        │
Arkesel dispatches SMS units
        │
Worker polls Arkesel delivery reports (async)
        │
campaign_logs updated (sent / delivered / failed)
        │
Candidate dashboard reflects live stats
```

---

## 3. Tech Stack & Rationale

| Layer | Technology | Why |
|---|---|---|
| Backend API | FastAPI (Python 3.11+) | Async-native, fast, familiar from GoQuali |
| Database | PostgreSQL 15 | Relational filters on student directory, ACID compliance |
| ORM | SQLAlchemy 2.x (async) | Full async ORM support with FastAPI |
| Migrations | Alembic | Schema versioning |
| Task Queue | Celery 5.x | Proven async dispatch, same pattern as GoQuali |
| Message Broker | Redis 7 | Fast, lightweight broker + session cache |
| Frontend | React 18 + Vite | Reactive campaign builder, component reuse |
| Styling | Tailwind CSS | Rapid, consistent UI |
| HTTP Client | Axios | API calls from React |
| State Management | Zustand | Lightweight, no boilerplate |
| SMS Provider | Arkesel | Ghanaian provider, bulk SMS + sender ID support |
| Auth | JWT (HTTPOnly cookies) | Secure, stateless, familiar pattern |
| Process Manager | Gunicorn + Uvicorn | Production-grade ASGI serving |
| Reverse Proxy | Nginx | SSL termination, static file serving |

---

## 4. Database Design

### 4.1 Schema Overview

```sql
institutions
candidates
student_directories
campaigns
campaign_logs
sender_ids
credit_transactions
credit_packages
```

### 4.2 Full Table Definitions

```sql
-- Institutions (universities/campuses)
CREATE TABLE institutions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,  -- e.g. "uenr", "knust"
    country     VARCHAR(100) DEFAULT 'Ghana',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates (platform users / aspirants)
CREATE TABLE candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    position        VARCHAR(255),           -- e.g. "SRC President"
    hashed_password TEXT NOT NULL,
    profile_photo   TEXT,                  -- URL to uploaded image
    credits_balance INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Student Directory
CREATE TABLE student_directories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE,
    full_name       VARCHAR(255),
    phone           VARCHAR(20) NOT NULL,
    gender          VARCHAR(10),           -- 'male', 'female', 'other'
    level           INTEGER,               -- 100, 200, 300, 400, 500
    department      VARCHAR(255),
    faculty         VARCHAR(255),
    hall            VARCHAR(255),
    programme       VARCHAR(255),
    student_id      VARCHAR(50),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, phone)
);

-- Sender IDs
CREATE TABLE sender_ids (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID REFERENCES candidates(id) ON DELETE CASCADE,
    sender_name     VARCHAR(11) NOT NULL,  -- Arkesel max 11 chars
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    arkesel_ref     TEXT,                  -- Arkesel registration reference
    rejection_note  TEXT,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id     UUID REFERENCES candidates(id) ON DELETE CASCADE,
    sender_id_ref    UUID REFERENCES sender_ids(id),
    title            VARCHAR(255),          -- internal label
    message          TEXT NOT NULL,
    filters          JSONB,                 -- stored filter snapshot
    recipient_count  INTEGER DEFAULT 0,
    credits_used     INTEGER DEFAULT 0,
    status           VARCHAR(20) DEFAULT 'draft',  -- draft, queued, sending, completed, failed
    scheduled_at     TIMESTAMPTZ,
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Delivery Logs
CREATE TABLE campaign_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    student_id      UUID REFERENCES student_directories(id),
    phone           VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'queued',  -- queued, sent, delivered, failed
    arkesel_msg_id  TEXT,
    error_message   TEXT,
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Packages
CREATE TABLE credit_packages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,     -- e.g. "Bronze", "Gold"
    credits     INTEGER NOT NULL,          -- SMS units
    price_ghs   NUMERIC(10,2) NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE
);

-- Credit Transactions
CREATE TABLE credit_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID REFERENCES candidates(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL,  -- 'purchase', 'deduction', 'refund'
    amount          INTEGER NOT NULL,      -- positive = credit, negative = debit
    balance_after   INTEGER NOT NULL,
    reference       TEXT,                  -- payment gateway ref or campaign ID
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Key Indexes

```sql
CREATE INDEX idx_students_institution ON student_directories(institution_id);
CREATE INDEX idx_students_gender ON student_directories(gender);
CREATE INDEX idx_students_level ON student_directories(level);
CREATE INDEX idx_students_department ON student_directories(department);
CREATE INDEX idx_students_faculty ON student_directories(faculty);
CREATE INDEX idx_students_hall ON student_directories(hall);
CREATE INDEX idx_campaigns_candidate ON campaigns(candidate_id);
CREATE INDEX idx_logs_campaign ON campaign_logs(campaign_id);
CREATE INDEX idx_logs_status ON campaign_logs(status);
```

---

## 5. Backend — FastAPI

### 5.1 Project Structure

```
campusvoice-backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── candidate.py
│   │   ├── student.py
│   │   ├── campaign.py
│   │   ├── sender_id.py
│   │   └── credits.py
│   ├── schemas/
│   │   ├── candidate.py
│   │   ├── student.py
│   │   ├── campaign.py
│   │   └── credits.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── candidates.py
│   │   ├── students.py
│   │   ├── campaigns.py
│   │   ├── sender_ids.py
│   │   ├── credits.py
│   │   └── admin.py
│   ├── services/
│   │   ├── arkesel.py          # Arkesel API wrapper
│   │   ├── filter_engine.py    # Student audience filtering
│   │   ├── credits.py          # Credit deduction logic
│   │   └── sms_dispatch.py     # Orchestrates send flow
│   ├── tasks/
│   │   ├── celery_app.py
│   │   ├── send_campaign.py    # Celery task
│   │   └── poll_delivery.py    # Celery beat task
│   ├── middleware/
│   │   └── auth.py             # JWT dependency
│   └── utils/
│       ├── security.py
│       └── pagination.py
├── alembic/
├── tests/
├── requirements.txt
├── .env
├── Dockerfile
└── START_APP.bat
```

### 5.2 Core API Endpoints

#### Authentication
```
POST   /api/auth/register          # Candidate registration
POST   /api/auth/login             # Returns JWT in HTTPOnly cookie
POST   /api/auth/logout
GET    /api/auth/me                # Current candidate profile
POST   /api/auth/refresh
```

#### Candidates
```
GET    /api/candidates/profile
PUT    /api/candidates/profile
POST   /api/candidates/profile/photo
```

#### Student Directory
```
GET    /api/students/filters/options    # Returns unique values for each filter field
POST   /api/students/count             # Body: filter object → returns audience count
GET    /api/students/                  # Admin: paginated list
POST   /api/students/import            # Admin: CSV/Excel upload
DELETE /api/students/{id}             # Admin: soft delete
```

#### Campaigns
```
POST   /api/campaigns/                 # Create campaign (draft)
GET    /api/campaigns/                 # List candidate's campaigns
GET    /api/campaigns/{id}            # Campaign detail + stats
PUT    /api/campaigns/{id}            # Update draft
POST   /api/campaigns/{id}/send       # Queue for dispatch
POST   /api/campaigns/{id}/schedule   # Schedule for later
DELETE /api/campaigns/{id}            # Delete draft
```

#### Sender IDs
```
POST   /api/sender-ids/               # Submit new sender ID
GET    /api/sender-ids/               # List candidate's sender IDs
DELETE /api/sender-ids/{id}
```

#### Credits
```
GET    /api/credits/balance
GET    /api/credits/transactions
GET    /api/credits/packages
POST   /api/credits/purchase          # Initiate payment
POST   /api/credits/webhook           # Payment gateway callback
```

#### Admin
```
GET    /api/admin/candidates
PUT    /api/admin/candidates/{id}/toggle
GET    /api/admin/sender-ids/pending
PUT    /api/admin/sender-ids/{id}/approve
PUT    /api/admin/sender-ids/{id}/reject
GET    /api/admin/campaigns
GET    /api/admin/revenue
POST   /api/admin/students/import
GET    /api/admin/institutions
POST   /api/admin/institutions
```

### 5.3 Filter Engine

The filter engine dynamically builds a PostgreSQL query from the candidate's chosen filters:

```python
# app/services/filter_engine.py

from sqlalchemy import select, and_
from app.models.student import StudentDirectory

async def get_filtered_students(db, institution_id: str, filters: dict) -> list:
    conditions = [StudentDirectory.institution_id == institution_id,
                  StudentDirectory.is_active == True]

    if filters.get("gender"):
        conditions.append(StudentDirectory.gender.in_(filters["gender"]))

    if filters.get("levels"):
        conditions.append(StudentDirectory.level.in_(filters["levels"]))

    if filters.get("departments"):
        conditions.append(StudentDirectory.department.in_(filters["departments"]))

    if filters.get("faculties"):
        conditions.append(StudentDirectory.faculty.in_(filters["faculties"]))

    if filters.get("halls"):
        conditions.append(StudentDirectory.hall.in_(filters["halls"]))

    stmt = select(StudentDirectory.phone, StudentDirectory.id).where(and_(*conditions))
    result = await db.execute(stmt)
    return result.fetchall()


async def get_filtered_count(db, institution_id: str, filters: dict) -> int:
    students = await get_filtered_students(db, institution_id, filters)
    return len(students)
```

### 5.4 SMS Unit Calculator

```python
def calculate_sms_units(message: str) -> int:
    """
    GSM-7 charset: 160 chars = 1 unit
    Unicode (non-GSM): 70 chars = 1 unit
    Multi-part: each part is 153 (GSM) or 67 (Unicode) chars
    """
    GSM7_CHARS = set(
        "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !"
        "#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "ÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyz äöñüà"
    )
    is_unicode = any(c not in GSM7_CHARS for c in message)
    length = len(message)

    if is_unicode:
        if length <= 70:
            return 1
        return -(-length // 67)  # ceiling division
    else:
        if length <= 160:
            return 1
        return -(-length // 153)
```

---

## 6. Arkesel SMS Integration

### 6.1 Arkesel API Reference

- **Base URL:** `https://sms.arkesel.com/api/v2`
- **Auth:** API key via header `api-key: YOUR_KEY`
- **Bulk SMS endpoint:** `POST /sms/send`

### 6.2 Arkesel Service Wrapper

```python
# app/services/arkesel.py

import httpx
from app.config import settings

ARKESEL_BASE = "https://sms.arkesel.com/api/v2"

class ArkeselService:

    def __init__(self):
        self.headers = {
            "api-key": settings.ARKESEL_API_KEY,
            "Content-Type": "application/json"
        }

    async def send_bulk(self, sender: str, message: str, recipients: list[str]) -> dict:
        """
        recipients: list of phone numbers e.g. ["0241234567", "0551234567"]
        sender: approved sender ID string
        """
        # Arkesel expects E.164 or local format
        payload = {
            "sender": sender,
            "message": message,
            "recipients": recipients
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ARKESEL_BASE}/sms/send",
                json=payload,
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

    async def check_balance(self) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ARKESEL_BASE}/clients/balance-details",
                headers=self.headers
            )
            return response.json()

    async def get_delivery_report(self, message_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ARKESEL_BASE}/sms/{message_id}",
                headers=self.headers
            )
            return response.json()


arkesel = ArkeselService()
```

### 6.3 Phone Number Normalisation

Ghana mobile numbers must be normalized before sending:

```python
def normalize_phone(phone: str) -> str:
    """
    Accepts: 0241234567, +233241234567, 233241234567
    Returns: 0241234567 (Arkesel local format)
    """
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+233"):
        return "0" + phone[4:]
    if phone.startswith("233") and len(phone) == 12:
        return "0" + phone[3:]
    return phone
```

### 6.4 Chunking Large Recipient Lists

Arkesel may have per-request recipient limits. Always chunk:

```python
def chunk_list(lst: list, size: int = 100) -> list:
    return [lst[i:i+size] for i in range(0, len(lst), size)]
```

---

## 7. Async Task Queue — Celery + Redis

### 7.1 Celery App Setup

```python
# app/tasks/celery_app.py

from celery import Celery
from app.config import settings

celery_app = Celery(
    "campusvoice",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.send_campaign", "app.tasks.poll_delivery"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Accra",
    enable_utc=True,
    beat_schedule={
        "poll-delivery-every-5-min": {
            "task": "app.tasks.poll_delivery.poll_pending_logs",
            "schedule": 300.0,  # every 5 minutes
        }
    }
)
```

### 7.2 Campaign Send Task

```python
# app/tasks/send_campaign.py

from app.tasks.celery_app import celery_app
from app.services.arkesel import arkesel
from app.services.filter_engine import get_filtered_students
from app.utils.phone import normalize_phone, chunk_list
from app.database import get_sync_db
from app.models.campaign import Campaign, CampaignLog
import uuid

@celery_app.task(bind=True, max_retries=3)
def dispatch_campaign(self, campaign_id: str):
    db = get_sync_db()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return

        # Update status to sending
        campaign.status = "sending"
        db.commit()

        # Fetch filtered students
        students = get_filtered_students(db, campaign.candidate.institution_id, campaign.filters)
        phones = [normalize_phone(s.phone) for s in students]

        sender = db.query(SenderID).filter(SenderID.id == campaign.sender_id_ref).first()
        sender_name = sender.sender_name if sender else "CampusVoice"

        # Chunk and send
        chunks = chunk_list(phones, 100)
        all_logs = []

        for chunk in chunks:
            result = arkesel.send_bulk_sync(sender_name, campaign.message, chunk)
            # Parse result and create logs
            for phone in chunk:
                log = CampaignLog(
                    id=str(uuid.uuid4()),
                    campaign_id=campaign_id,
                    phone=phone,
                    status="sent",
                    arkesel_msg_id=result.get("data", {}).get("id")
                )
                all_logs.append(log)

        db.bulk_save_objects(all_logs)
        campaign.status = "completed"
        campaign.recipient_count = len(phones)
        db.commit()

    except Exception as exc:
        campaign.status = "failed"
        db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
```

### 7.3 Delivery Polling Task

```python
# app/tasks/poll_delivery.py

@celery_app.task
def poll_pending_logs():
    """Poll Arkesel for delivery updates on 'sent' logs"""
    db = get_sync_db()
    try:
        pending = db.query(CampaignLog).filter(
            CampaignLog.status == "sent",
            CampaignLog.arkesel_msg_id.isnot(None)
        ).limit(500).all()

        for log in pending:
            report = arkesel.get_delivery_report_sync(log.arkesel_msg_id)
            status = report.get("data", {}).get("status")
            if status == "delivered":
                log.status = "delivered"
                log.delivered_at = datetime.utcnow()
            elif status in ["failed", "rejected", "undelivered"]:
                log.status = "failed"
                log.error_message = status

        db.commit()
    finally:
        db.close()
```

---

## 8. Frontend — React/Vite

### 8.1 Project Structure

```
campusvoice-frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api/
│   │   ├── axios.js           # Axios instance with interceptors
│   │   ├── auth.js
│   │   ├── campaigns.js
│   │   ├── students.js
│   │   └── credits.js
│   ├── store/
│   │   ├── authStore.js       # Zustand
│   │   └── campaignStore.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── NewCampaign.jsx    # Campaign builder
│   │   ├── CampaignDetail.jsx
│   │   ├── CampaignHistory.jsx
│   │   ├── SenderIDs.jsx
│   │   ├── Credits.jsx
│   │   └── Profile.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   └── TopBar.jsx
│   │   ├── campaign/
│   │   │   ├── AudienceFilter.jsx   # Multi-select filter panel
│   │   │   ├── AudienceCounter.jsx  # Live count display
│   │   │   ├── MessageComposer.jsx  # Textarea + char counter
│   │   │   ├── SmsUnitCounter.jsx   # Real-time SMS unit calc
│   │   │   └── CampaignCard.jsx
│   │   ├── shared/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ConfirmModal.jsx
│   └── utils/
│       ├── smsCalculator.js
│       └── formatters.js
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

### 8.2 Campaign Builder — Key Component Logic

#### AudienceFilter.jsx
```jsx
// Multi-select filter panel with live audience count

const AudienceFilter = ({ institutionId, onFilterChange }) => {
  const [options, setOptions] = useState({});   // filter options from API
  const [filters, setFilters] = useState({
    gender: [],
    levels: [],
    departments: [],
    faculties: [],
    halls: []
  });
  const [audienceCount, setAudienceCount] = useState(0);
  const [counting, setCounting] = useState(false);

  // Fetch available filter options on mount
  useEffect(() => {
    api.students.getFilterOptions(institutionId).then(setOptions);
  }, [institutionId]);

  // Debounced live count
  useEffect(() => {
    const timeout = setTimeout(async () => {
      setCounting(true);
      const { count } = await api.students.getCount(institutionId, filters);
      setAudienceCount(count);
      onFilterChange(filters, count);
      setCounting(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [filters]);

  return (
    <div className="space-y-4">
      <MultiSelect label="Gender" options={options.genders} onChange={v => setFilters(f => ({...f, gender: v}))} />
      <MultiSelect label="Level" options={options.levels} onChange={v => setFilters(f => ({...f, levels: v}))} />
      <MultiSelect label="Department" options={options.departments} onChange={v => setFilters(f => ({...f, departments: v}))} />
      <MultiSelect label="Faculty" options={options.faculties} onChange={v => setFilters(f => ({...f, faculties: v}))} />
      <MultiSelect label="Hall" options={options.halls} onChange={v => setFilters(f => ({...f, halls: v}))} />

      <div className="bg-blue-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-500">Estimated Audience</p>
        <p className="text-3xl font-bold text-blue-600">
          {counting ? "..." : audienceCount.toLocaleString()}
        </p>
        <p className="text-xs text-gray-400">students match your filters</p>
      </div>
    </div>
  );
};
```

#### MessageComposer.jsx
```jsx
const MessageComposer = ({ onChange }) => {
  const [message, setMessage] = useState("");
  const { units, remaining, isUnicode } = useSmsCalculator(message);

  return (
    <div className="space-y-2">
      <textarea
        className="w-full border rounded-lg p-3 h-36 resize-none font-mono text-sm"
        placeholder="Write your campaign message here..."
        value={message}
        onChange={e => { setMessage(e.target.value); onChange(e.target.value); }}
        maxLength={800}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{isUnicode ? "⚠ Unicode characters detected" : "✓ Standard characters"}</span>
        <span>
          <strong>{remaining}</strong> chars remaining · <strong>{units}</strong> SMS unit{units !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
};
```

### 8.3 Campaign Send Flow (Frontend)

```
1. Candidate fills campaign title + selects sender ID
2. AudienceFilter → live count updates as filters change
3. MessageComposer → character + SMS unit counter updates live
4. Credits check: if audienceCount × smsUnits > balance → show "Buy Credits" CTA
5. "Send Now" button → POST /api/campaigns/ (create) → POST /api/campaigns/{id}/send
6. Redirect to CampaignDetail page → polling for status updates
```

### 8.4 Campaign Detail — Live Stats

```jsx
// Poll campaign status every 10 seconds while status is 'sending'
useEffect(() => {
  if (campaign?.status !== "sending") return;
  const interval = setInterval(async () => {
    const updated = await api.campaigns.getById(id);
    setCampaign(updated);
    if (updated.status !== "sending") clearInterval(interval);
  }, 10000);
  return () => clearInterval(interval);
}, [campaign?.status]);
```

---

## 9. Admin Panel

The admin panel is a protected section of the same React app, accessible only to `super_admin` role.

### 9.1 Admin Sections

| Section | Description |
|---|---|
| **Student Directory** | Import CSV/Excel, view, soft-delete students |
| **Sender ID Review** | Approve or reject candidate sender ID submissions |
| **Candidates** | View all registered candidates, activate/deactivate |
| **Campaigns** | Read-only overview of all campaigns sent |
| **Credit Management** | Manually top up candidate credits, view transactions |
| **Revenue Dashboard** | Total credits sold, total SMS units dispatched |
| **Institutions** | Add/edit campuses |

### 9.2 Student Directory Import

- Accept `.csv` or `.xlsx` file
- Required columns: `phone`, `full_name`, `gender`, `level`, `department`, `faculty`, `hall`
- Validation: phone format check, duplicate detection
- On import: upsert by `(institution_id, phone)`
- Return import summary: rows imported, duplicates skipped, errors

```python
# app/routers/admin.py — /students/import

@router.post("/students/import")
async def import_students(
    file: UploadFile,
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    contents = await file.read()
    # Parse CSV/Excel
    # Validate rows
    # Upsert to student_directories
    # Return { imported: N, skipped: M, errors: [...] }
```

---

## 10. Credits & Billing System

### 10.1 Flow

```
Admin creates credit packages (e.g. Bronze 500 = GH₵ 20)
         │
Candidate views packages → selects one → initiates payment
         │
Payment gateway (Paystack / MTN MoMo via Arkesel Pay) callback
         │
Webhook received → verify payment → credit candidate account
         │
Transaction logged in credit_transactions
         │
On campaign send: deduct (recipient_count × sms_units) credits
         │
If insufficient credits → return 402 Payment Required
```

### 10.2 Credit Deduction Logic

```python
async def deduct_credits(db, candidate_id: str, amount: int, campaign_id: str):
    candidate = await db.get(Candidate, candidate_id)
    if candidate.credits_balance < amount:
        raise InsufficientCreditsError()

    candidate.credits_balance -= amount
    transaction = CreditTransaction(
        candidate_id=candidate_id,
        type="deduction",
        amount=-amount,
        balance_after=candidate.credits_balance,
        reference=campaign_id,
        description=f"Campaign dispatch: {amount} SMS units"
    )
    db.add(transaction)
    await db.commit()
```

### 10.3 Suggested Credit Packages

| Package | Credits | Price (GH₵) | Notes |
|---|---|---|---|
| Starter | 200 | 10 | ~200 single SMS |
| Bronze | 500 | 22 | Small candidate |
| Silver | 1,500 | 60 | Mid-tier candidate |
| Gold | 3,000 | 110 | SRC presidential |
| Custom | — | Negotiated | Large scale |

*1 credit = 1 SMS unit. Bulk pricing gives operator margin over Arkesel wholesale rate.*

---

## 11. Security & Compliance

### 11.1 Auth & API Security

- JWT stored in **HTTPOnly, Secure, SameSite=Strict** cookie
- Refresh token rotation
- Rate limiting on login (5 attempts/minute per IP)
- All admin endpoints protected by `require_admin` dependency
- CORS configured for frontend domain only
- Input validation via Pydantic on all endpoints

### 11.2 Data Privacy

- Student phone numbers stored only for dispatch — never exposed via API to candidates (candidates see counts, not the actual list)
- Delivery logs store phone but do not return individual phones in campaign stats responses
- Soft delete only — no hard deletion of student records without admin action

### 11.3 Sender ID Policy

- Sender IDs must be reviewed and approved by admin before use
- Admin registers approved IDs with Arkesel before allowing dispatch
- Candidates cannot send with an unapproved or rejected sender ID

### 11.4 Compliance Notes

- Ensure student directory is sourced from the institution's official body (SRC, Student Affairs)
- Platform should display a notice that recipients are registered students of the institution
- No spam: daily send cap per candidate (configurable in admin settings)

---

## 12. Deployment

### 12.1 Recommended VPS Setup

| Component | Spec |
|---|---|
| VPS | Hetzner CX32 (4 vCPU, 8GB RAM) |
| OS | Ubuntu 22.04 LTS |
| Python | 3.11+ |
| PostgreSQL | 15 (managed or on-server) |
| Redis | 7 |

### 12.2 Process Architecture

```
Nginx (port 80/443)
    → React SPA (static files)
    → FastAPI (Gunicorn: 4 workers × Uvicorn)

Celery Worker (2 concurrency)
Celery Beat (scheduler for delivery polling)
```

### 12.3 Startup Script

```bat
:: START_CAMPUSVOICE.bat (Windows dev)
@echo off
echo Starting CampusVoice...

:: Start Redis
start "Redis" redis-server

:: Start FastAPI
cd campusvoice-backend
start "FastAPI" uvicorn app.main:app --reload --port 8000

:: Start Celery Worker
start "Celery Worker" celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2

:: Start Celery Beat
start "Celery Beat" celery -A app.tasks.celery_app beat --loglevel=info

:: Start Frontend
cd ../campusvoice-frontend
start "Frontend" npm run dev

echo All services started!
```

---

## 13. Environment Variables

```env
# App
APP_NAME=CampusVoice
SECRET_KEY=your-jwt-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/campusvoice
SYNC_DATABASE_URL=postgresql://user:password@localhost:5432/campusvoice

# Redis
REDIS_URL=redis://localhost:6379/0

# Arkesel
ARKESEL_API_KEY=your-arkesel-api-key
ARKESEL_SENDER_ID=CampusVoice   # default fallback sender

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Admin credentials (first-time setup)
ADMIN_EMAIL=admin@campusvoice.com
ADMIN_PASSWORD=change-me-on-first-login
```

---

## 14. AI Agent Prompts

Use these prompts sequentially with your AI coding agent (Cursor, Copilot, Claude Code, etc.) to scaffold and build the platform.

---

### PROMPT 1 — Project Scaffold

```
Create a FastAPI project called `campusvoice-backend` with the following structure:

app/
  main.py           - FastAPI app, CORS middleware, router includes
  config.py         - Pydantic BaseSettings loading from .env
  database.py       - Async SQLAlchemy engine, session factory, Base, get_db dependency
  models/           - Empty __init__.py
  schemas/          - Empty __init__.py
  routers/          - Empty __init__.py
  services/         - Empty __init__.py
  tasks/            - Empty __init__.py
  middleware/       - auth.py with JWT decode dependency
  utils/            - security.py (password hash/verify with passlib), pagination.py

requirements.txt with: fastapi, uvicorn[standard], gunicorn, sqlalchemy[asyncio], asyncpg, 
psycopg2-binary, alembic, pydantic-settings, python-jose[cryptography], passlib[bcrypt], 
python-multipart, httpx, celery[redis], redis, python-dotenv, pandas, openpyxl

Also create a .env file with placeholder values for all variables listed in the env section.

Use Python 3.11+. All database operations must use async SQLAlchemy. Use UUIDs (not integers) 
as primary keys. Set up Alembic for migrations.
```

---

### PROMPT 2 — Database Models

```
In the campusvoice-backend project, create all SQLAlchemy ORM models in app/models/ 
based on the following schema:

1. Institution — id (UUID PK), name, slug (unique), country, is_active, created_at
2. Candidate — id, institution_id (FK), full_name, email (unique), phone, position, 
   hashed_password, profile_photo, credits_balance (int default 0), is_active, is_verified, created_at
3. StudentDirectory — id, institution_id (FK), full_name, phone, gender, level (int), 
   department, faculty, hall, programme, student_id, is_active, created_at. 
   Unique constraint on (institution_id, phone)
4. SenderID — id, candidate_id (FK), sender_name (max 11 chars), status (pending/approved/rejected), 
   arkesel_ref, rejection_note, reviewed_at, created_at
5. Campaign — id, candidate_id (FK), sender_id_ref (FK to SenderID), title, message (text), 
   filters (JSONB), recipient_count, credits_used, status, scheduled_at, sent_at, created_at
6. CampaignLog — id, campaign_id (FK), student_id (FK nullable), phone, status, arkesel_msg_id, 
   error_message, sent_at, delivered_at, created_at
7. CreditPackage — id, name, credits, price_ghs (numeric 10,2), is_active
8. CreditTransaction — id, candidate_id (FK), type (purchase/deduction/refund), amount (int), 
   balance_after (int), reference, description, created_at

Add all indexes listed in section 4.3 of the technical document.
Create an Alembic migration for the full schema.
```

---

### PROMPT 3 — Auth System

```
In campusvoice-backend, implement full JWT authentication for candidates:

1. POST /api/auth/register
   - Accept: full_name, email, password, institution_id, position, phone
   - Hash password with bcrypt
   - Create candidate record (is_verified=False)
   - Return: candidate profile (no password)

2. POST /api/auth/login
   - Accept: email, password
   - Verify credentials
   - Issue access token (60 min) + refresh token (7 days)
   - Store both as HTTPOnly, Secure, SameSite=Strict cookies
   - Return: candidate profile

3. POST /api/auth/logout — clear cookies

4. GET /api/auth/me — return current candidate from JWT

5. POST /api/auth/refresh — issue new access token from refresh token

Create a `get_current_candidate` dependency in app/middleware/auth.py that:
- Reads JWT from cookie
- Decodes with python-jose
- Returns candidate object from DB
- Raises 401 if invalid or expired

Also create a `require_admin` dependency that checks a separate admin users table 
(or a role flag on a separate admin model).

Use HTTPOnly cookies only — do not return tokens in the response body.
```

---

### PROMPT 4 — Student Filter Engine & Count Endpoint

```
In campusvoice-backend, implement the student filter engine:

1. Create app/services/filter_engine.py with:
   - async get_filtered_students(db, institution_id, filters: dict) -> list
   - async get_filtered_count(db, institution_id, filters: dict) -> int
   - Filters dict supports: gender (list), levels (list of ints), departments (list), 
     faculties (list), halls (list)
   - Empty filter list means "all values" for that field (no filtering on that dimension)
   - Always filter by institution_id and is_active=True

2. GET /api/students/filters/options?institution_id=xxx
   - Return all unique values for: genders, levels, departments, faculties, halls
   - Used to populate the filter dropdowns in the frontend

3. POST /api/students/count
   - Body: { institution_id: str, filters: {...} }
   - Return: { count: int }
   - Protected: authenticated candidates only
   - Add a 400ms debounce note in comments (debounce handled on frontend)

4. POST /api/admin/students/import (admin only)
   - Accept multipart file upload (.csv or .xlsx)
   - Required columns: phone, full_name, gender, level, department, faculty, hall
   - Validate phone format (Ghanaian numbers)
   - Upsert by (institution_id, phone)
   - Return: { imported: N, skipped: M, errors: [{ row, reason }] }

Use pandas for CSV/Excel parsing. Normalize phone numbers using a util function 
that handles 0241234567, +233241234567, 233241234567 formats.
```

---

### PROMPT 5 — Arkesel Integration & SMS Dispatch

```
In campusvoice-backend, implement the Arkesel SMS service and campaign dispatch:

1. Create app/services/arkesel.py:
   - Class ArkeselService with async methods:
     - send_bulk(sender, message, recipients: list[str]) -> dict
     - check_balance() -> dict
     - get_delivery_report(message_id) -> dict
   - Also sync versions (send_bulk_sync, get_delivery_report_sync) for Celery tasks
   - Base URL: https://sms.arkesel.com/api/v2
   - Auth header: api-key: ARKESEL_API_KEY from settings
   - Chunk recipient lists to max 100 per request

2. Create app/utils/phone.py:
   - normalize_phone(phone) -> str (returns local format 0XXXXXXXXX)
   - chunk_list(lst, size=100) -> list of lists

3. Create app/utils/sms.py:
   - calculate_sms_units(message: str) -> int
   - Implements GSM-7 vs Unicode detection
   - Correct multi-part calculation

4. Create Celery tasks in app/tasks/:
   - celery_app.py: Celery instance with Redis broker, include both task modules, 
     Celery Beat schedule to run poll_pending_logs every 5 minutes
   - send_campaign.py: dispatch_campaign(campaign_id) task
     - Set campaign status to 'sending'
     - Get filtered students using stored campaign.filters
     - Normalize phones, chunk, dispatch via Arkesel
     - Create CampaignLog entries for each recipient
     - Set campaign status to 'completed' or 'failed'
     - Retry up to 3 times on exception with 60s backoff
   - poll_delivery.py: poll_pending_logs() task
     - Fetch campaign_logs with status='sent' limit 500
     - Check delivery status via Arkesel for each arkesel_msg_id
     - Update status to 'delivered' or 'failed'
```

---

### PROMPT 6 — Campaign CRUD API

```
In campusvoice-backend, implement the campaigns router at /api/campaigns:

1. POST /api/campaigns/ — Create campaign (status=draft)
   Body: { title, message, sender_id_ref, filters: {...}, scheduled_at? }
   - Validate sender_id_ref belongs to current candidate and is approved
   - Calculate recipient_count from filter engine
   - Calculate credits_needed = recipient_count × sms_units(message)
   - Do NOT deduct credits yet (only on send)
   - Return created campaign

2. GET /api/campaigns/ — List current candidate's campaigns (paginated, newest first)

3. GET /api/campaigns/{id} — Campaign detail including stats:
   { ...campaign, stats: { sent: N, delivered: N, failed: N } }
   Stats computed from campaign_logs

4. PUT /api/campaigns/{id} — Update draft campaign only (status must be 'draft')

5. POST /api/campaigns/{id}/send — Queue campaign for immediate dispatch
   - Check campaign status is 'draft'
   - Check candidate credits_balance >= credits_needed
   - Deduct credits via credit deduction service
   - Set status to 'queued'
   - Queue dispatch_campaign.delay(campaign_id) Celery task
   - Return { message: "Campaign queued", campaign_id }

6. POST /api/campaigns/{id}/schedule — Same as send but set scheduled_at field
   (Celery Beat eta parameter for future execution)

7. DELETE /api/campaigns/{id} — Delete draft only, refund no credits

All endpoints require authentication. Candidates can only access their own campaigns.
```

---

### PROMPT 7 — Sender ID & Credits Endpoints

```
In campusvoice-backend:

SENDER IDs:
1. POST /api/sender-ids/ 
   - Submit new sender ID (status=pending)
   - Validate max 11 alphanumeric characters
   - A candidate can have max 3 sender IDs

2. GET /api/sender-ids/ — List current candidate's sender IDs

3. DELETE /api/sender-ids/{id} — Delete if not in use by any campaign

4. PUT /api/admin/sender-ids/{id}/approve (admin only)
   - Set status=approved
   - Store arkesel_ref if provided

5. PUT /api/admin/sender-ids/{id}/reject (admin only)
   - Set status=rejected, store rejection_note

CREDITS:
1. GET /api/credits/balance — Return current balance + pending spend
2. GET /api/credits/transactions — Paginated transaction history
3. GET /api/credits/packages — List active credit packages
4. POST /api/credits/purchase — Create pending purchase, return payment URL 
   (placeholder for payment gateway integration — log intent to credit_transactions with type='pending')
5. POST /api/credits/webhook — Verify payment, credit account, log transaction
   (Accept Paystack webhook format: event=charge.success, data.reference)

Also create app/services/credits.py:
- deduct_credits(db, candidate_id, amount, campaign_id) — atomic deduction with insufficient check
- add_credits(db, candidate_id, amount, reference, description) — credit top-up
- get_balance(db, candidate_id) -> int
```

---

### PROMPT 8 — React/Vite Frontend Scaffold

```
Create a React/Vite frontend project called `campusvoice-frontend` with:

Dependencies: react, react-dom, react-router-dom, axios, zustand, tailwindcss, 
@headlessui/react, lucide-react, react-hot-toast, date-fns

Structure:
src/
  api/
    axios.js — Axios instance, base URL from env, withCredentials: true, 
               401 interceptor → redirect to login
    auth.js — register, login, logout, getMe
    campaigns.js — CRUD + send + schedule
    students.js — getFilterOptions, getCount
    credits.js — getBalance, getTransactions, getPackages

  store/
    authStore.js — Zustand: { candidate, setCandidate, logout }
    campaignStore.js — Zustand: { campaigns, currentCampaign, filters, audienceCount }

  pages/ — Login, Register, Dashboard, NewCampaign, CampaignDetail, 
            CampaignHistory, SenderIDs, Credits, Profile (all stubbed)

  components/
    layout/ — Sidebar with nav links, TopBar with user menu + credit balance
    shared/ — ProtectedRoute, LoadingSpinner, ConfirmModal, EmptyState
    campaign/ — AudienceFilter, MessageComposer, SmsUnitCounter, CampaignCard

  utils/
    smsCalculator.js — useSmsCalculator(message) hook: returns { units, remaining, isUnicode }
    formatters.js — formatDate, formatNumber, formatCurrency (GHS)

App.jsx: React Router setup with protected routes
main.jsx: Root render

Tailwind configured with a blue/indigo primary color palette.
All forms use controlled components — no HTML <form> tags, use button onClick handlers.
Environment: VITE_API_BASE_URL=http://localhost:8000
```

---

### PROMPT 9 — Campaign Builder Page

```
In campusvoice-frontend, build the full NewCampaign page (src/pages/NewCampaign.jsx):

The page is a multi-step campaign builder:

STEP 1 — Audience
- AudienceFilter component with multi-select checkboxes for: Gender, Level (100-400), 
  Department, Faculty, Hall
- Fetch filter options from GET /api/students/filters/options on mount
- Debounce filter changes 400ms, then call POST /api/students/count to get live audience count
- Display: large number showing estimated audience, update in real-time
- "No filters selected = all students" behavior — show full count when filters are empty

STEP 2 — Message
- Dropdown: select approved sender ID (fetch from GET /api/sender-ids/ filtered to approved)
- Text input: Campaign title (internal label only)
- Textarea: Message body (max 800 chars)
- Live SMS unit counter: show units used, chars remaining, warn if Unicode detected
- Preview box: shows how the SMS will look on a phone (sender ID + message)

STEP 3 — Review & Send
- Summary card: audience count, message preview, sender ID, SMS units, total credits needed
- Credits required vs balance display. If insufficient: "You need X more credits" + Buy Credits button
- "Send Now" button (disabled if insufficient credits)
- "Schedule" option: date/time picker, "Schedule Send" button
- On send: POST /api/campaigns/ then POST /api/campaigns/{id}/send → redirect to CampaignDetail

Show a stepper/progress indicator at the top (Step 1, 2, 3).
Use react-hot-toast for success/error notifications.
```

---

### PROMPT 10 — Campaign Detail & Dashboard

```
In campusvoice-frontend:

1. CampaignDetail page (src/pages/CampaignDetail.jsx):
   - Fetch campaign + stats from GET /api/campaigns/{id}
   - Display: title, sender ID, message, filters used, recipient count, status badge
   - Stats cards: Total Sent, Delivered, Failed, Pending (with colored icons)
   - Delivery rate progress bar: (delivered / total) × 100%
   - If status is 'sending': poll GET /api/campaigns/{id} every 10 seconds, 
     stop polling when status changes to 'completed' or 'failed'
   - "Duplicate Campaign" button: pre-fill NewCampaign form with this campaign's data

2. Dashboard page (src/pages/Dashboard.jsx):
   - Welcome card: "Hi [name], running for [position]"
   - Stats overview: Total Campaigns, Total Recipients Reached, Credits Balance, 
     Avg Delivery Rate
   - Recent campaigns list (last 5): CampaignCard components
   - Quick action: "+ New Campaign" button

3. CampaignHistory page (src/pages/CampaignHistory.jsx):
   - Paginated table: Title, Sender ID, Recipients, Credits Used, Status, Date, Actions
   - Filter bar: by status (all/draft/queued/sending/completed/failed)
   - Status badge component with color coding

All pages use the shared Sidebar + TopBar layout.
```

---

### PROMPT 11 — Admin Panel

```
In campusvoice-frontend, add an Admin Panel section accessible only when the JWT 
decoded role is 'admin'. Add an /admin/* route group.

Admin pages:

1. /admin/students — Student Directory
   - Table: phone, name, gender, level, department, faculty, hall, status
   - Search by phone or name
   - Soft delete button per row
   - Import button → file upload modal → POST /api/admin/students/import
   - Show import result: { imported, skipped, errors } in a summary modal

2. /admin/sender-ids — Sender ID Review
   - Table: candidate name, sender_name, submitted date, status
   - Filter: pending only (default view)
   - Approve button → PUT /api/admin/sender-ids/{id}/approve
   - Reject button → modal to enter rejection note → PUT /api/admin/sender-ids/{id}/reject
   - Badge colors: pending=yellow, approved=green, rejected=red

3. /admin/candidates — Candidate List
   - Table: name, email, position, institution, credits balance, status
   - Toggle active/inactive
   - View campaigns link

4. /admin/revenue — Revenue Dashboard
   - Total credits sold (sum of purchase transactions)
   - Total SMS units dispatched (sum of credits_used across all campaigns)
   - Revenue by period (simple table: month, credits sold, GHS value)

Add an Admin link in the Sidebar that only renders if the current user is admin.
```

---

### PROMPT 12 — Deployment Config

```
In the campusvoice-backend project, create production deployment files:

1. Dockerfile:
   - Python 3.11 slim base
   - Install requirements
   - Copy app
   - CMD: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

2. docker-compose.yml:
   Services: api (FastAPI), worker (Celery), beat (Celery Beat), db (PostgreSQL 15), 
   redis (Redis 7)
   - api and worker share the same image
   - worker CMD: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2
   - beat CMD: celery -A app.tasks.celery_app beat --loglevel=info
   - All services load from .env file

3. nginx.conf:
   - Serve React build from /var/www/campusvoice (static files)
   - Proxy /api/ to FastAPI on port 8000
   - Enable gzip compression
   - SSL-ready (certbot placeholder)

4. alembic.ini and alembic/env.py:
   - Load DATABASE_URL from environment
   - Use async engine for autogenerate
   - Target metadata from all models in app/models/

Also create a START_CAMPUSVOICE.bat for local Windows development that starts 
Redis, FastAPI (uvicorn --reload), Celery worker, Celery beat, and the Vite 
dev server in separate terminal windows.
```

---

*End of CampusVoice Technical Document — v1.0.0*

---

> **Next Steps:**
> 1. Run Prompts 1–3 to scaffold and set up auth
> 2. Run Prompt 4 to build the filter engine (core differentiator)
> 3. Run Prompt 5 to integrate Arkesel
> 4. Run Prompts 6–7 for remaining API
> 5. Run Prompts 8–10 to build the frontend
> 6. Run Prompt 11 for admin panel
> 7. Run Prompt 12 for deployment
