# SlotSync

A smart campus room and lab booking system with approvals, waitlists, no-show release, and usage analytics.

| Detail | Information |
|---|---|
| **Author** | SlotSync Engineering Team |
| **Live application** | [https://slotsync.vercel.app](https://slotsync.vercel.app) |
| **Backend API** | [https://slotsync-api.onrender.com](https://slotsync-api.onrender.com) (health check: `/health`) |
| **Full design spec** | [SPEC.md](SPEC.md) |
| **Architectural decisions** | [docs/DECISIONS.md](docs/DECISIONS.md) |

### Demo Accounts (Seeded Demo Data)

| Role | Email | Password | Daily Quota |
|---|---|---|---|
| **Admin** | `admin@slotsync.demo` | `Demo@12345` | Unlimited |
| **Faculty** | `faculty@slotsync.demo` | `Demo@12345` | 6 slots/day |
| **Student** | `student1@slotsync.demo` | `Demo@12345` | 3 slots/day |

> [!NOTE]
> The backend runs on Render. The first request after a cold start can take up to 45 seconds to wake up. Open `/health` first if visiting after idle periods.

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Target Users](#2-target-users)
3. [Solution](#3-solution)
4. [Key Features](#4-key-features)
5. [Tech Stack](#5-tech-stack)
6. [Architecture](#6-architecture)
7. [Local Setup](#7-local-setup)
8. [Environment Variables](#8-environment-variables)
9. [Deployment](#9-deployment)
10. [Testing](#10-testing)
11. [Security](#11-security)
12. [Known Limitations](#12-known-limitations)

---

## 1. Problem Statement
Shared spaces on campus (study rooms, computer labs, seminar halls) are frequently scheduled via spreadsheets or chat messages. This causes major recurring problems:
- **Double bookings**: Two groups arrive for the same space simultaneously.
- **Ghost bookings**: People book rooms and fail to show up, leaving spaces empty while others are turned away.
- **Manual approval bottlenecks**: High-value rooms (specialized labs, seminar halls) require staff permission that gets delayed or lost.
- **Zero data visibility**: Administration cannot determine which rooms are over- or under-utilized.

---

## 2. Target Users
- **Students**: Search available study spaces, book within quota (3 slots/day), check in on arrival, or join waitlists for popular slots.
- **Faculty**: Reserve classrooms and project labs with higher quotas (6 slots/day).
- **Admins & Department Staff**: Review approval queues, configure rooms and blackout dates, oversee user roles, and monitor utilization analytics.

---

## 3. Solution
SlotSync automates room scheduling through stateful business rules:
- **Race-Safe Booking**: MongoDB partial unique compound indexes enforce single-occupancy guarantees at the database level.
- **Approval Engine**: Restricted spaces automatically route to pending approval queues.
- **Automatic Waitlists**: If a slot is cancelled or released, the earliest eligible waitlisted student is auto-promoted and notified in real time.
- **No-Show Scheduler**: Bookings not checked into within 15 minutes of slot start are released to the waitlist.
- **Admin Analytics**: Real-time charts covering room utilization, peak hours, and no-show rates.

---

## 4. Key Features
- **Workflow 1: Auth & Roles**: JWT in httpOnly cookie; student, faculty, and admin role enforcement.
- **Workflow 2: Search & Book**: Room filters (date, time window, capacity, equipment), interactive color-coded slot grid (`free`, `booked`, `mine`, `blackout`, `past`), and quota validation.
- **Workflow 3: Approvals**: Restricted rooms require staff approval with rejection reason support.
- **Workflow 4: Waitlist Auto-Promotion**: FIFO queue with automatic promotion on cancellation or no-show.
- **Workflow 5: No-Show Release & Analytics**: Automated check-in window and analytics visualizations via Recharts.

---

## 5. Tech Stack
- **Frontend**: React 18, Vite, Redux Toolkit, React Router 6, Axios, Recharts, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express (ES Modules), Mongoose, Socket.IO, node-cron, Zod.
- **Database**: MongoDB Atlas with partial unique indexes.
- **Testing**: Vitest, Supertest, mongodb-memory-server.
- **Deployment**: Vercel (Frontend), Render (Backend), MongoDB Atlas.

---

## 6. Architecture
```
                         USER (Browser)
                              |
                              v
                     +------------------+
                     |  Vercel          |
                     |  React SPA (Vite)|
                     +--------+---------+
                              |
                  HTTPS REST + Socket.IO (Cookie Auth)
                              |
                              v
                     +------------------+
                     |  Render          |
                     |  Express API     |
                     |  Socket.IO       |
                     |  node-cron jobs  |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     |  MongoDB Atlas   |
                     +------------------+
```

### Backend Layering
```
routes  ->  middlewares (auth, role, validate, rateLimit)
        ->  controllers (HTTP request/response handling)
        ->  services    (All state transitions & business logic)
        ->  models      (Mongoose schemas & indexes)
```

### Booking State Machine
```
                      +-----------+
   restricted room -> |  pending  | --reject--> rejected
                      +-----+-----+
                            | approve                \
                            v                         +--> expired (admin did not decide in time)
   open room ------> +-----------+
                     | approved  | --cancel--> cancelled --> promote next waitlisted user
                     +-----+-----+
                           | check-in (window: 10 min before to 15 min after start)
                           v
                     +-----------+            +-----------+
                     | checked_in| --end----> | completed |
                     +-----------+            +-----------+

   approved and not checked in by deadline --> no_show --> promote next waitlisted user
```

---

## 7. Local Setup

### Prerequisites
- Node.js 18+
- Git

### Steps
```bash
# 1. Clone repository
git clone https://github.com/USERNAME/slotsync.git
cd slotsync

# 2. Backend Setup
cd backend
cp .env.example .env
npm install
npm run seed       # Seeds demo accounts, rooms, blackouts, and sample bookings
npm run dev        # Runs on http://localhost:8084

# 3. Frontend Setup (in a separate terminal)
cd ../frontend/vite-project
cp .env.example .env
npm install
npm run dev        # Runs on http://localhost:5173
```

Log in using `admin@slotsync.demo` or `student1@slotsync.demo` with password `Demo@12345`.

---

## 8. Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Example | Purpose |
|---|---|---|---|
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/slotsync` | Database connection URI |
| `JWT_SECRET` | Yes | `64+ char random hex string` | Signs JWT session cookies |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed CORS and Socket.IO origin |
| `NODE_ENV` | Yes | `development` | Environment mode (`development` or `production`) |
| `PORT` | No | `8084` | Server listening port |
| `GRACE_MINUTES` | No | `15` | Check-in grace duration |
| `MAX_ADVANCE_DAYS` | No | `14` | Advance booking window |
| `QUOTA_STUDENT` | No | `3` | Daily slot limit for students |
| `QUOTA_FACULTY` | No | `6` | Daily slot limit for faculty |
| `ANTHROPIC_API_KEY` | No | `sk-ant-...` | Optional AI booking parser |

### Frontend (`frontend/vite-project/.env`)
| Variable | Required | Example |
|---|---|---|
| `VITE_API_URL` | Yes | `http://localhost:8084` |

---

## 9. Deployment
- **Backend on Render**: Root Directory: `backend`, Build: `npm install`, Start: `npm start`. Set `NODE_ENV=production` and `CLIENT_URL` to Vercel URL.
- **Frontend on Vercel**: Root Directory: `frontend/vite-project`, Build: `npm run build`, Output: `dist`. Set `VITE_API_URL` to Render backend URL.
- Include `vercel.json` SPA rewrite so client-side routes don't 404 on refresh.

---

## 10. Testing
Run the backend test suite (uses `mongodb-memory-server`):
```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **Concurrency**: 10 simultaneous requests for the same slot result in exactly 1 success (201) and 9 conflict errors (409 `SLOT_TAKEN`).
- **Validation**: Past slots, non-operating hours, blackout dates, advance windows, and role quotas.
- **Approval**: Pending state on restricted rooms, approval, rejection, and slot expiry.
- **Waitlist**: FIFO order, ineligible user skipping, and auto-promotion.
- **Scheduler**: Idempotent reconciliation and automated no-show releases.
- **Authorization**: 401 unauthenticated, 403 unauthorized role enforcement.

---

## 11. Security
- Passwords hashed with `bcryptjs` (salt rounds 10).
- JWT transmitted exclusively in `httpOnly`, `SameSite` cookies.
- Helmet security headers, rate limiting on authentication routes, and strict CORS.
- All request bodies and query parameters validated via Zod schemas.

---

## 12. Known Limitations
- Slots are atomic 1-hour durations (multi-hour bookings require booking adjacent slots).
- Free-tier Render server spins down after idle periods; lazy reconcile handles state synchronization upon wake.
