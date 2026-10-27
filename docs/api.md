# SlotSync API Documentation

Base URL: `/api`
All timestamps, slots, and business date logic adhere to the `Asia/Kolkata` (IST, UTC+05:30) timezone.
Session authentication is handled via `httpOnly` JWT cookie (`token`) or `Authorization: Bearer <token>`.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Registers a new user account. Always assigns the `student` role regardless of payload.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@campus.edu",
    "password": "Password123!",
    "department": "Computer Science"
  }
  ```
- **Response**: `201 Created` with User object and sets `httpOnly` cookie.

### `POST /api/auth/login`
Authenticates a user and sets an `httpOnly` cookie.
- **Request Body**:
  ```json
  {
    "email": "jane@campus.edu",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK` with User object and sets `httpOnly` cookie.

### `POST /api/auth/logout`
Clears the JWT authentication cookie.
- **Response**: `200 OK` with `{ "message": "Logged out successfully" }`.

### `GET /api/auth/me`
Retrieves the currently authenticated user's session profile.
- **Response**: `200 OK` with `{ "user": { ... } }`.

---

## 2. Rooms & Availability (`/api/rooms`)

### `GET /api/rooms`
Lists active rooms with optional search filtering by equipment, capacity, and building.
- **Query Parameters**:
  - `capacity` (number, optional)
  - `equipment` (comma-separated string, optional: e.g. `computers,projector`)
- **Response**: `200 OK` with `{ "rooms": [ ... ] }`.

### `GET /api/rooms/availability`
Returns a 24-hour slot matrix for each room on the requested IST date, indicating whether each slot is `free`, `occupied`, `mine`, `blackout`, or `past`. Also returns `waitlistCount` and whether the user is already on the waitlist.
- **Query Parameters**:
  - `date` (string, required: `YYYY-MM-DD`)
  - `capacity` (number, optional)
  - `startHour` (number 0-23, optional)
  - `endHour` (number 0-23, optional)
  - `equipment` (string, optional)
- **Response**: `200 OK` with `{ "date": "2026-10-28", "rooms": [ ... ] }`.

### `POST /api/rooms` (Admin only)
Creates a new campus facility.
- **Request Body**:
  ```json
  {
    "name": "Robotics Lab R-202",
    "building": "Engineering Hall",
    "capacity": 30,
    "equipment": ["computers", "projector", "ac"],
    "requiresApproval": true,
    "openHour": 8,
    "closeHour": 20
  }
  ```
- **Response**: `201 Created`.

### `PATCH /api/rooms/:id` (Admin only)
Updates an existing room's configuration.

### `DELETE /api/rooms/:id` (Admin only)
Soft-deletes a room (`isActive: false`).

---

## 3. Bookings (`/api/bookings`)

### `POST /api/bookings`
Attempts to book a room slot atomically.
- **Request Body**:
  ```json
  {
    "roomId": "653a1f...",
    "date": "2026-10-28",
    "slot": 10,
    "purpose": "Study Group on Algorithms"
  }
  ```
- **Response Codes**:
  - `201 Created`: Booking successful (status: `approved` or `pending` if restricted room).
  - `400 Bad Request`: Validation failure (past slot, outside operating hours, date beyond 14 days, blackout holiday).
  - `409 Conflict`:
    - `SLOT_TAKEN`: The slot was claimed by another user concurrently.
    - `USER_CONFLICT`: User already has an active reservation during this slot in another room.
    - `QUOTA_EXCEEDED`: User exceeded their daily booking quota (student: 3, faculty: 6).

### `GET /api/bookings/my`
Lists bookings for the authenticated user, separated into `upcoming` and `past`.
- **Response**: `200 OK` with `{ "upcoming": [ ... ], "past": [ ... ] }`.

### `POST /api/bookings/:id/cancel`
Cancels an upcoming booking. If cancelled by owner or admin, triggers automatic FIFO promotion from the waitlist.
- **Response**: `200 OK`.

### `POST /api/bookings/:id/check-in`
Checks into an approved reservation.
- **Window**: Allowed only within `[startsAt - 10 minutes, checkInDeadline]`.
- **Response**: `200 OK` (status changes to `checked_in`).

---

## 4. FIFO Waitlist (`/api/waitlist`)

### `POST /api/waitlist`
Joins the waitlist queue for an occupied slot.
- **Request Body**:
  ```json
  {
    "roomId": "653a1f...",
    "date": "2026-10-28",
    "slot": 10
  }
  ```
- **Response**: `201 Created` with `{ "waitlist": { ... }, "queuePosition": 1 }`.

### `GET /api/waitlist/my`
Lists active and past waitlist entries for the authenticated user with real-time queue position.

### `DELETE /api/waitlist/:id`
Leaves the waitlist queue voluntarily.

---

## 5. Administrative Approvals & Suite (`/api/admin`)

### `GET /api/admin/pending` (Admin only)
Lists all reservations awaiting administrative approval (`status: "pending"`).

### `POST /api/admin/bookings/:id/approve` (Admin only)
Approves a pending reservation and updates its status to `approved`.
- **Request Body**: `{ "note": "Approved for lab coursework" }`
- **Response**: `200 OK`.

### `POST /api/admin/bookings/:id/reject` (Admin only)
Rejects a pending reservation, releases the slot hold, and auto-promotes the next person in the FIFO waitlist.
- **Request Body**: `{ "note": "Priority faculty lecture scheduled" }`
- **Response**: `200 OK`.

---

## 6. Blackout Dates (`/api/blackouts`)

### `GET /api/blackouts`
Lists upcoming campus holiday or maintenance blackout dates.

### `POST /api/blackouts` (Admin only)
Declares a blackout date for a single room or campus-wide (`roomId: null`).

### `DELETE /api/blackouts/:id` (Admin only)
Removes a blackout date.

---

## 7. Analytics & User Administration

### `GET /api/analytics/dashboard` (Admin only)
Returns aggregated platform metrics:
- Overall KPIs (total bookings, active rate, no-show rate, completion rate).
- Utilization % by room.
- Hourly peak booking volume.
- 14-day booking volume trend.
- Top no-show offenders list.

### `GET /api/users` (Admin only)
Search, list, and filter registered users.

### `PATCH /api/users/:id/role` (Admin only)
Elevates or demotes a user role (`student`, `faculty`, `admin`). Protected against self-demotion.

---

## 8. Real-time Notifications & AI Query

### `GET /api/notifications`
Fetches user notifications and unread counter.

### `PATCH /api/notifications/read-all`
Marks all notifications as read.

### `POST /api/ai/parse`
Parses natural language requests into structured booking search parameters with graceful fallback if no API key is configured.
- **Request Body**: `{ "prompt": "Need a lab with 30 computers tomorrow at 2 PM" }`
- **Response**: `200 OK` with `{ "parsed": { ... }, "message": "..." }`.
