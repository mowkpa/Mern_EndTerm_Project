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
