# Architectural Decisions Record (ADR) - SlotSync

## ADR 001: Slot Time Unit and Storage
- **Decision**: All bookings use fixed 1-hour slots indexed by start hour (0 to 23). Dates are stored as `YYYY-MM-DD` strings in the Asia/Kolkata timezone (IST, UTC+05:30).
- **Rationale**: Avoids edge cases with server timezone mismatches (e.g. UTC server on Render vs local IST campus). Simplifies slot queries, blackouts, and daily quotas without datetime drift.

## ADR 002: Concurrency & Double-Booking Prevention via Partial Unique Index
- **Decision**: Bookings have a boolean field `holdsSlot`. Statuses `["pending", "approved", "checked_in"]` set `holdsSlot = true`. A partial unique compound index on `{ room: 1, date: 1, slot: 1 }` with `{ holdsSlot: true }` is enforced in MongoDB. A second partial unique index `{ user: 1, date: 1, slot: 1 }` prevents a user from holding two slots simultaneously across rooms.
- **Rationale**: Check-then-insert code paths fail under concurrency. MongoDB partial unique index guarantees zero double-bookings at the database engine level, returning Mongo error code 11000 which is mapped to HTTP 409 `SLOT_TAKEN` or `USER_CONFLICT`.

## ADR 003: State Machine & Atomic Transitions
- **Decision**: State transitions are strictly controlled via `Booking.findOneAndUpdate({ _id, status: fromStatus }, { $set: { status: toStatus, holdsSlot: ... } }, { new: true })`.
- **Rationale**: Prevents race conditions during simultaneous approvals, cancellations, or no-show releases. If state changed between read and write, the conditional update returns null and fails safely.

## ADR 004: Lazy Reconcile for Free-Tier Backend
- **Decision**: In addition to a 1-minute `node-cron` scheduler, `reconcile(now)` is run on server startup and throttled (max once per 20s) at the start of `GET /api/rooms/availability`.
- **Rationale**: Render's free tier sleeps when idle. If the server wakes up at 11:30 for a 10:00 booking, running lazy reconcile immediately cleans up no-shows and pending expiries before rendering the availability grid to the user.

## ADR 005: Promotion Logic Reusing Booking Engine
- **Decision**: Auto-promotion from the waitlist invokes the central `createBooking` function with `fromWaitlist: true`.
- **Rationale**: Ensures promoted users are subject to the exact same validations (daily quota, blackout dates, approval requirements) without duplicated code.

## ADR 006: Multi-Hour Range Booking with All-or-Nothing Compensation
- **Decision**: Multi-hour bookings (up to 4 contiguous hours) are submitted via `POST /api/bookings/batch`. Slots are acquired sequentially with a shared `batchId`. If any slot in the requested range fails (due to concurrency conflict, quota limit, or blackout), all previously booked slots in that batch are immediately rolled back via a compensating cancel step.
- **Rationale**: Prevents users from getting partial reservations (e.g. 10:00-11:00 and 12:00-13:00 when they requested 10:00-13:00), providing ACID-like atomicity over single-document MongoDB operations.

## ADR 007: Smart Alternatives Ranking Heuristic & Historical Release Likelihood
- **Decision**: When a slot is unavailable, `GET /api/rooms/alternatives` ranks alternative available rooms using a multi-factor scoring function:
  - Base score: 100
  - Same building bonus: +30
  - Capacity fit: Penalized proportional to surplus seats (`(capacity - required) * 0.5`, capped at 25)
  - Time distance: Penalized by `|slot - targetSlot| * 15`
  - Equipment superset: Only rooms possessing all requested equipment are considered
  - Exclusions: Blackout dates, quota violations, and the original slot are excluded
- **Release Likelihood**: `GET /api/analytics/room-release-rate` computes historical release likelihood over past 30 days as `(cancelled + no_show) / total bookings`. If total bookings < 10, likelihood is hidden (`null`) to avoid misleading small-sample statistics.

## ADR 008: Automated Check-in Reminders & RFC 5545 iCalendar (.ics) Export
- **Decision**: 
  - Reminders: Scheduler runs `sendReminders(now)` every minute, querying approved bookings starting 10 to 15 minutes in the future with `{ reminderSentAt: null }`. An atomic `findOneAndUpdate({ _id, reminderSentAt: null }, { reminderSentAt: now })` prevents duplicate notifications.
  - Calendar Export: `GET /api/bookings/:id/ics` generates a valid RFC 5545 iCalendar file (`text/calendar; charset=utf-8`) with CRLF line endings, UTC start/end timestamps, and stable UID `booking-<id>@slotsync`, enabling one-click import into Google Calendar, Apple Calendar, and Outlook.

## ADR 009: Centralized Audit Trail with Service-Level Hooks
- **Decision**: Administrative actions (approvals, rejections, admin cancellations, room CRUD/deactivations, blackout additions/removals, and user role updates) write immutable records to an `AuditLog` collection through a shared `logAudit` service. Hooks are placed in business logic services rather than HTTP controllers.
- **Rationale**: Ensures audit records are created consistently regardless of how a mutation is triggered (HTTP endpoint, background worker, or batch routine) and preserves clear caller accountability.

## ADR 010: Demand Heatmap, Trend Deltas & Rule-Based Operational Insights
- **Decision**: 
  - Heatmap: `GET /api/analytics/heatmap` outputs a 7-day x 24-hour demand matrix aggregated from historical bookings.
  - Deltas: `GET /api/analytics/summary` automatically computes percentage and percentage-point deltas against an equivalent preceding time window.
  - Insights: Rule-based heuristics proactively highlight rooms with high no-show rates (>25%), hours with severe peak congestion (>85%), underutilized facilities (<20%), and pending approvals older than 24 hours.

## ADR 011: Design System Architecture with CSS Custom Properties, Watermelon UI & Motion
- **Decision**: The UI uses CSS custom properties (`--ink`, `--paper`, `--surface`, `--line`, `--mine`, `--free`, `--pending`, `--danger`) paired with Tailwind utility classes. Token values are swapped on `.dark` root for accessible dark mode. Animations are powered by `motion/react` with spring damping and strict `prefers-reduced-motion` compliance.
