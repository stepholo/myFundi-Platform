# eFundi — Home Services Marketplace

eFundi connects customers with verified, local technicians for electrical, plumbing, carpentry, cleaning, and appliance-repair jobs. Customers creates bookings, receive a price quote from the first technician who accepts, pay via M-Pesa, and leave a review — all in one flow.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development (without Docker)](#local-development-without-docker)
  - [Docker Compose](#docker-compose)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Business Logic](#business-logic)
- [Testing](#testing)
- [Contributing](#contributing)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                   React SPA (Vite)               │
│  Customer │ Technician │ Admin portals           │
└─────────────────────┬────────────────────────────┘
                      │  REST  /api/v1/
┌─────────────────────▼────────────────────────────┐
│              Django REST Framework               │
│  JWT auth · Role-based permissions               │
│  drf-spectacular (OpenAPI 3 schema)              │
└──────┬──────────────┬───────────────┬────────────┘
       │              │               │
  PostgreSQL       Redis          Celery worker
  (primary DB)   (cache +        (email delivery,
                  broker)         auto-payout tasks)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Django 6.0.5 + Django REST Framework 3.15.2 |
| Authentication | JWT (simplejwt) + Google OAuth (django-allauth) |
| Database | PostgreSQL 16 |
| Task queue | Celery + Redis 7 |
| Payments | M-Pesa STK Push + B2C via Intasend |
| Admin UI | django-unfold |
| API docs | drf-spectacular (Swagger UI + Redoc) |
| Frontend | React 19 + Vite 8 |
| State management | Zustand |
| Server state | TanStack Query v5 |
| Styling | Tailwind CSS v4 |
| HTTP client | Axios (with auto-refresh interceptor) |
| Backend tests | pytest + pytest-django + factory-boy |
| Frontend tests | Vitest + React Testing Library + MSW |

---

## Project Structure

```
eFundi Project/
├── efundi_app/               # Django project root
│   ├── accounts/             # Custom User model, auth views, email verification
│   ├── bookings/             # Booking lifecycle + service price catalogue
│   ├── commissions/          # Audit log of platform commission per payment
│   ├── common/               # Shared utilities (geo-location, live tracking)
│   ├── customers/            # Client profile (auto-created from User signal)
│   ├── mpesa_custom/         # Intasend wrapper for STK Push & B2C
│   ├── notifications/        # In-app notification records
│   ├── payments/             # Payment records, technician wallet, withdrawals
│   ├── reviews/              # Post-job customer reviews
│   ├── technicians/          # Technician profiles + specializations
│   ├── utils/                # Permissions, email helpers, Celery tasks
│   ├── conftest.py           # Shared pytest fixtures and model factories
│   └── pytest.ini            # pytest configuration
├── frontend/                 # React SPA
│   └── src/
│       ├── api/              # Axios service modules per backend app
│       ├── components/       # Shared UI components and layouts
│       ├── hooks/            # Custom React hooks
│       ├── pages/            # Route-level page components
│       ├── store/            # Zustand auth store
│       └── test/             # MSW handlers, server setup, test utilities
├── docker-compose.yml        # Multi-service container setup
├── requirements.txt          # Python dependencies
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 14+ (or Docker)
- Redis 7+ (or Docker)

---

### Local Development (without Docker)

**1. Clone and set up the Python environment**

```bash
git clone <repo-url>
cd "eFundi Project"
python3 -m venv .venv
source .venv/bin/activate
pip install django-environ psycopg2-binary gunicorn drf-spectacular -r requirements.txt
```

**2. Configure environment variables**

```bash
cp efundi_app/.env.example efundi_app/.env
# Edit efundi_app/.env with your local values (see Environment Variables below)
```

**3. Create the database, run migrations, and start the backend**

```bash
cd efundi_app
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver          # http://localhost:8000
```

**4. Start the Celery worker (separate terminal)**

```bash
cd efundi_app
celery -A efundi_app worker --loglevel=info
```

**5. Start the frontend**

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 — proxies /api/* to http://localhost:8000
```

---

### Docker Compose

Starts all five services (PostgreSQL, Redis, backend, Celery worker, frontend) with a single command.

```bash
# Fill in efundi_app/.env first (see Environment Variables)
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1/ |
| Swagger UI | http://localhost:8000/api/v1/schema/swagger-ui/ |
| Redoc | http://localhost:8000/api/v1/schema/redoc/ |
| Django Admin | http://localhost:8000/admin/ |

---

## Environment Variables

Create `efundi_app/.env` with the following keys:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
# Set DB_HOST=db when running inside Docker; omit (or set to 127.0.0.1) for local dev
DB_NAME=efundi_db
DB_USER=efundi_user
DB_PASSWORD=your-db-password
DB_HOST=db

# Redis
REDIS_URL=redis://127.0.0.1:6379/1   # redis://redis:6379/1 inside Docker

# Email
# Leave blank to fall back to the console backend during development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=eFundi <noreply@efundi.com>

# Intasend (M-Pesa payments)
INTASEND_PUBLIC_KEY=your-public-key
INTASEND_SECRET_KEY=your-secret-key
INTASEND_TEST_MODE=True

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
```

---

## API Reference

Full interactive documentation is available at `/api/v1/schema/swagger-ui/` once the server is running.

**Base URL:** `http://localhost:8000/api/v1/`

| Prefix | App | Notes |
|---|---|---|
| `/accounts/` | Auth | Register, login, logout, profile, email verification, password reset |
| `/auth/token/` | JWT | Obtain and refresh access tokens |
| `/bookings/` | Bookings | Create, accept, decline, start, complete, cancel; service price catalogue |
| `/clients/` | Customers | Customer profile management |
| `/technicians/` | Technicians | Profiles, verification, specializations |
| `/payments/` | Payments | M-Pesa STK Push, payment callback, wallet, withdrawal requests |
| `/commissions/` | Commissions | Platform commission audit log (Admin only) |
| `/notifications/` | Notifications | In-app notifications with mark-read support |
| `/reviews/` | Reviews | Post-job customer reviews |
| `/common/` | Common | Geo-location, nearby technician search, live tracking |

**Authentication:** Include `Authorization: Bearer <access_token>` on all protected endpoints. Tokens are issued by `/auth/token/` (or `/accounts/login/`). The Axios client automatically retries with a refreshed token on 401 responses.

---

## Business Logic

### Roles

| Role | Capabilities |
|---|---|
| **Customer** | Create Bookings, make payments, submit reviews |
| **Technician** | Accept/decline/work bookings, manage wallet, request withdrawals |
| **Admin** | Verify technicians, manage all bookings, approve/reject withdrawals |
| **Super Admin** | Full platform access |

Technician and Customer profiles are created automatically via Django `post_save` signals when a new User is registered with the matching role.

### Booking Lifecycle

```
requested → broadcasted → assigned → in_progress → completed
                  ↓                       ↓
             cancelled               cancelled
```

- A new booking is broadcast to nearby available, verified technicians.
- **First-accept-wins:** the first technician to `PATCH /bookings/{id}/accept/` locks the booking atomically via `SELECT FOR UPDATE`.
- The technician sets the quoted amount; the worker payout is computed from the service price catalogue (or falls back to **35%** of the quoted amount when no catalogue entry is matched).

### Payments (M-Pesa)

- Customers initiate payments via **M-Pesa STK Push** (Intasend).
- Technicians request withdrawals; admins approve and trigger **B2C** payouts.
- Wallet balance is updated atomically using `F()` expressions to prevent race conditions.

---

## Testing

### Backend

Tests live inside each Django app's `tests/` directory. The shared `efundi_app/conftest.py` provides model factories (`UserFactory`, `CustomerFactory`, `TechnicianFactory`, etc.) and fixtures (`make_booking`, `make_service_fault`, `api_client`).

```bash
cd efundi_app
source ../.venv/bin/activate

# Run all backend tests
pytest accounts/tests/ payments/tests/ bookings/tests/ commissions/tests/ \
       customers/tests/ notifications/tests/ reviews/tests/ technicians/tests/ -v

# Run a single app
pytest bookings/tests/ -v

# Generate a coverage report
pytest --cov=. --cov-report=term-missing
```

**149 tests — all passing.**

Key conventions:
- `APIClient.force_authenticate()` for role/permission testing.
- Celery tasks mocked via `monkeypatch.setattr('...task.delay', lambda *a, **kw: None)`.
- External APIs (Intasend, SMTP) isolated with `unittest.mock.patch` / `MagicMock`.
- `--nomigrations` in `pytest.ini` keeps the test database fast.

### Frontend

Test files live alongside the source files they cover (`*.test.jsx` / `*.test.js`).

```bash
cd frontend

# Run once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch
```

**33 tests — all passing.**

Key conventions:
- `renderWithProviders()` (`src/test/utils.jsx`) wraps components in `QueryClientProvider` + `MemoryRouter`.
- MSW intercepts all HTTP calls — no real network traffic in tests.
- Override individual handlers per test with `server.use(http.post(...))`.
- Form inputs queried by `name` attribute (`container.querySelector('input[name="..."]')`) rather than fragile placeholder text.

---

## Contributing

- **Pull before you push** — always `git pull` before starting work and before pushing.
- **Branch naming:** `feature/<short-description>`, `fix/<short-description>`, `hotfix/<short-description>`.
- **Commit messages:** concise and imperative — describe *why*, not just *what*.
- **Keep file paths short** — no spaces or special characters in file names.
- **Add temporary and generated files to `.gitignore`** before committing.
- **Never commit `.env` files** or credentials.

---

## License

See [LICENSE](LICENSE) for details.
