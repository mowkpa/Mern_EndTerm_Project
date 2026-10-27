# SlotSync: Full Design and Build Specification

This document is the authoritative specification for building SlotSync.

## 1. System Architecture & Roles
- **Roles**:
  - `student`: Search rooms, book (quota 3 active slots/day), check in, cancel own bookings, join/leave waitlist, receive notifications.
  - `faculty`: Same as student with quota 6 active slots/day.
  - `admin`: Unlimited quota, room management (CRUD), blackout dates, approve/reject pending bookings, cancel any booking, update user roles, view analytics.
- **Registration**:
  - Always creates a `student`. The `role` field from client requests is strictly ignored.
  - Initial admin is provisioned via the seed script. Admins can update roles via `/api/users/:id/role`.

## 2. Business Rules & Defaults
- Slot length: 1 hour (integers 0 to 23 representing start hours).
- Booking window: Today up to `MAX_ADVANCE_DAYS` (default 14 days) in `Asia/Kolkata` (IST).
- Operating hours: Per-room configurable `openHour` (default 8) to `closeHour` (default 20).
- Check-in window: `slotStart - 10 min` up to `slotStart + GRACE_MINUTES` (default 15 min).
- Pending request expiry: Pending requests that are not approved before slot start expire automatically.
- Waitlist: User can join only if slot is currently occupied and user does not already hold a booking for that slot.

## 3. Data Models & Schemas

### User Schema (`user.model.js`)
- `name`: String, required, 2-60 chars
- `email`: String, required, unique, lowercase, trimmed
- `password`: String, required, select: false (bcrypt hash)
- `role`: String, enum: `["student", "faculty", "admin"]`, default: `"student"`
- `department`: String, optional
- `timestamps`: true

### Room Schema (`room.model.js`)
- `name`: String, required, unique, e.g. "Computer Lab A-101"
- `building`: String, required
- `capacity`: Number, required, min: 1
- `equipment`: `[String]`, lowercase tags (e.g. `["projector", "computers", "whiteboard", "ac"]`)
- `requiresApproval`: Boolean, default: false
- `openHour`: Number, default: 8
- `closeHour`: Number, default: 20
- `isActive`: Boolean, default: true
- `description`: String
- `timestamps`: true

### Booking Schema (`booking.model.js`)
- `room`: ObjectId, ref: `Room`, required
- `user`: ObjectId, ref: `User`, required
- `date`: String, format "YYYY-MM-DD" (IST), required
- `slot`: Number, integer 0-23, required
- `purpose`: String, required, 3-200 chars
- `status`: String, enum: `["pending", "approved", "checked_in", "completed", "rejected", "cancelled", "expired", "no_show"]`
- `holdsSlot`: Boolean, default: false
- `checkInDeadline`: Date
- `checkedInAt`: Date
- `decidedBy`: ObjectId, ref: `User`
- `decisionNote`: String
- `cancelledBy`: ObjectId, ref: `User`
- `fromWaitlist`: Boolean, default: false
- `startsAt`: Date
- `endsAt`: Date
- `timestamps`: true

**Indexes**:
- `{ room: 1, date: 1, slot: 1 }` (unique, `partialFilterExpression: { holdsSlot: true }`, name: `uniq_active_room_slot`)
- `{ user: 1, date: 1, slot: 1 }` (unique, `partialFilterExpression: { holdsSlot: true }`, name: `uniq_active_user_slot`)
- `{ user: 1, date: 1 }`
- `{ status: 1, checkInDeadline: 1 }`
- `{ room: 1, date: 1 }`

### Waitlist Schema (`waitlist.model.js`)
- `room`: ObjectId, ref: `Room`, required
- `date`: String, required
- `slot`: Number, required
- `user`: ObjectId, ref: `User`, required
- `status`: String, enum: `["waiting", "promoted", "cancelled", "expired"]`, default: `"waiting"`
- `timestamps`: true

**Indexes**:
- `{ room: 1, date: 1, slot: 1, user: 1 }` (unique, `partialFilterExpression: { status: "waiting" }`)
- `{ room: 1, date: 1, slot: 1, status: 1, createdAt: 1 }` (for FIFO queue order)

### Blackout Schema (`blackout.model.js`)
- `date`: String, required ("YYYY-MM-DD")
- `room`: ObjectId, ref: `Room`, default null (null applies to all rooms)
- `reason`: String, required
- `timestamps`: true
- Index: `{ date: 1, room: 1 }`

### Notification Schema (`notification.model.js`)
- `user`: ObjectId, ref: `User`, required
- `type`: String, enum: `["approval_requested", "booking_approved", "booking_rejected", "booking_cancelled_by_admin", "waitlist_promoted", "no_show_released", "pending_expired"]`
- `message`: String, required
- `booking`: ObjectId, ref: `Booking`
- `isRead`: Boolean, default: false
- `timestamps`: true
- Index: `{ user: 1, createdAt: -1 }`

## 4. State Transitions
Valid transitions:
- `pending` -> `["approved", "rejected", "cancelled", "expired"]`
- `approved` -> `["checked_in", "cancelled", "no_show"]`
- `checked_in` -> `["completed"]`
- `completed`, `rejected`, `cancelled`, `expired`, `no_show` are terminal states.

Every transition is executed atomically using `Booking.findOneAndUpdate` checking the current state.
