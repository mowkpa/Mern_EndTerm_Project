# SlotSync

A smart campus room and lab booking system with timetable board, multi-hour range booking, automated waitlists, no-show release, smart alternatives, admin audit trail, and operational analytics.

| Detail | Information |
|---|---|
| **Author** | SlotSync Engineering Team |
| **Live application** | [https://slotsync.vercel.app](https://slotsync.vercel.app) |
| **Backend API** | [https://slotsync-api.onrender.com](https://slotsync-api.onrender.com) (health check: `/health`) |
| **Full design spec** | [SPEC.md](SPEC.md) & [ENHANCE.md](ENHANCE.md) |
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
5. [Tech Stack & Design System](#5-tech-stack--design-system)
6. [Architecture & Concurrency Safety](#6-architecture--concurrency-safety)
7. [Local Setup](#7-local-setup)
8. [Environment Variables](#8-environment-variables)
9. [Deployment](#9-deployment)
10. [Testing Suite (93 Tests)](#10-testing-suite-93-tests)
11. [Security & Compliance](#11-security--compliance)

---

## 1. Problem Statement
Shared spaces on campus (study rooms, computer labs, seminar halls) are frequently scheduled via spreadsheets or chat messages. This causes major recurring problems:
- **Double bookings**: Two groups arrive for the same space simultaneously.
- **Ghost bookings**: People book rooms and fail to show up, leaving spaces empty while others are turned away.
- **Fragmented scheduling**: Booking multi-hour blocks is prone to partial conflicts and race conditions.
- **Manual approval bottlenecks**: High-value rooms (specialized labs, seminar halls) require staff permission that gets delayed or lost.
- **Zero data visibility**: Administration cannot determine which rooms are over- or under-utilized.

---

## 2. Target Users
- **Students**: Search available study spaces on a live timetable board, book up to 4-hour contiguous ranges within quota (3 slots/day), check in on arrival, export bookings to calendar (.ics), or join waitlists.
- **Faculty**: Reserve classrooms and project labs with higher quotas (6 slots/day) and smart alternatives recommendations.
- **Admins & Department Staff**: Review approval queues, configure rooms via slide-over drawers, schedule blackouts grouped by month, manage user roles, audit administrative actions, and analyze demand heatmaps.

---

## 3. Solution
SlotSync automates room scheduling through stateful business rules:
- **Race-Safe Booking**: MongoDB partial unique compound indexes enforce single-occupancy guarantees at the database level.
- **All-or-Nothing Multi-Hour Booking**: Contiguous ranges up to 4 hours with compensating rollbacks on partial failure.
- **Smart Alternatives & Historical Release Likelihood**: Ranked alternate rooms based on building proximity, capacity fit, and equipment superset, plus a 30-day historical release rate.
- **Automatic Waitlists & Reminders**: FIFO queues with auto-promotion on cancellation or no-show; 10-minute check-in reminders and RFC 5545 `.ics` downloads.
- **Immutable Admin Audit Trail**: Complete activity logs for all approvals, cancellations, room modifications, blackouts, and role changes.
- **Operational Analytics & Insights**: 7x24 demand heatmap, period-over-period deltas, rule-based congestion alerts, and RFC 4180 CSV export.

---

## 4. Key Features

### 📅 Timetable Board (`/search`)
- Rooms grouped by building with sticky headers and sticky room column.
- Live red "now" line with pulsing head positioned across current hour.
- Contiguous range booking (up to 4 hours) with instant preview drawer.
- Taken-slot drawer displaying room release likelihood and 1-click alternative suggestions.

### 🏠 Student & Admin Dashboards (`/home`)
- **Student**: "Next up" card with live countdown, 1-click check-in window button, quick-book shortcuts, waitlist reminders, and recent notification feed.
- **Admin**: 4 KPI cards (Today's Bookings, Capacity Utilization, No-Show Rate, Active Rooms) with deltas, pending approval queue, and quick navigation.

### 🛡️ Admin Management & Audit Log (`/admin/*`)
- **Approvals**: Card-based review with requester profile, room specs, and inline Approve/Reject with note.
- **Rooms**: Table with slide-over `Drawer` for physical specs, equipment tags, approval requirements, and active toggle.
- **Blackouts**: Grouped by month with non-destructive overlap notices.
- **Users**: Directory with instant role delegation, quota indicators, and self-demote safeguards.
- **Activity Log**: Chronological audit timeline showing actor, action badge, summary sentence, and timestamp.

### 📊 Upgraded Analytics (`/admin/analytics`)
- Period presets (7d, 30d, custom date range).
- 4 KPI cards with percentage deltas vs previous period.
- Rule-based insight banners (high no-shows >25%, peak congestion >85%, low utilization <20%, stale approvals >24h).
- 7-day x 24-hour demand heatmap matrix with interactive hover stats.
- Room utilization bar chart and attended vs no-show trend lines via Recharts.
- RFC 4180 compliant CSV export streaming.

### 🎨 Design System & Accessibility
- Typography: Bricolage Grotesque (headings) & Public Sans (body, tabular nums).
- Design tokens with CSS custom properties (`--ink`, `--paper`, `--surface`, `--line`, `--mine`, `--free`, `--pending`, `--danger`).
- Smooth animations via `motion/react` with spring damping and `prefers-reduced-motion` compliance.
- Complete dark mode toggle saved in `localStorage`.

---

## 5. Tech Stack & Design System
- **Frontend**: React 18, Vite, Redux Toolkit, React Router 6, Axios, Recharts, Tailwind CSS, Motion (`motion/react`), Lucide Icons.
- **Backend**: Node.js, Express (ES Modules), Mongoose, Socket.IO, node-cron, Zod.
- **Database**: MongoDB Atlas with partial unique indexes.
- **Testing**: Vitest, Supertest, mongodb-memory-server.
- **Deployment**: Vercel (Frontend), Render (Backend), MongoDB Atlas.

---

## 6. Architecture & Concurrency Safety
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

### Frontend (`frontend/vite-project/.env`)
| Variable | Required | Example |
|---|---|---|
| `VITE_API_URL` | Yes | `http://localhost:8084` |

---

## 9. Deployment
- **Backend on Render**: Root Directory: `backend`, Build: `npm install`, Start: `npm start`. Set `NODE_ENV=production` and `CLIENT_URL` to Vercel URL.
- **Frontend on Vercel**: Root Directory: `frontend/vite-project`, Build: `npm run build`, Output: `dist`. Set `VITE_API_URL` to Render backend URL.

---

## 10. Testing Suite (93 Tests)
Run the backend test suite:
```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **Concurrency & Race Conditions**: 10 simultaneous requests for the same slot result in exactly 1 success (201) and 9 conflicts (409 `SLOT_TAKEN`).
- **Multi-Hour Batch Booking**: All-or-nothing atomicity, compensating rollback on partial failure, quota enforcement.
- **Smart Alternatives & Release Rate**: Ranking formula with building bonus, capacity penalty, equipment superset, and release percentage.
- **Reminders & iCalendar**: Idempotent reminder dispatching and RFC 5545 `.ics` export validation.
- **Admin Audit Trail**: Immutable logging across approvals, cancellations, room modifications, and role updates.
- **Analytics Upgrades**: 7x24 demand heatmap, period deltas, rule-based insights, and CSV streaming.
- **Waitlists & No-Show Release**: FIFO queues, skip logic, and automated room reassignment.

---

## 11. Security & Compliance
- Passwords hashed with `bcryptjs` (salt rounds 10).
- JWT transmitted exclusively in `httpOnly`, `SameSite` cookies.
- Helmet security headers, rate limiting on authentication routes, and strict CORS.
- All request bodies and query parameters validated via Zod schemas.
- Administrators protected with self-demote prevention.
