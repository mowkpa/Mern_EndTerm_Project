# SlotSync: Redesign and Enhancement Spec

This file extends SPEC.md. SPEC.md defined what to build. This file defines how to make it look and feel like a finished product, and adds a few features with real engineering depth. Hand it to Claude Code together with SPEC.md.

## 0. How to Use This File
1. Put ENHANCE.md in the repo root next to SPEC.md.
2. Work on a branch so the deployed app never breaks:
   `git checkout -b ui-redesign`
   Merge into main (which auto-deploys on Vercel and Render) only when npm test passes in backend/ and npm run build passes in frontend/vite-project/.
3. Paste the prompts from section 9 one at a time, in order. Each prompt is self-contained, ends with a commit, and says what must not break.
4. After each prompt, verify in browser.
5. Deadline guard: the visual work (section 9, prompts E0 to E2 and E7) gives the biggest improvement per hour.

## 1. What Looks Wrong Right Now
- On Find Rooms, past slots fill most of every row on today's date (squeezing useful info).
- The slot grid is clipped at right edge with no scroll hint.
- Every slot tile repeats "Free / Click to book" or "Past / Unavailable" (text noise).
- Pale grey and mint tiles on white card on grey page (low contrast).
- Every section is the same rounded white card with the same shadow (no hierarchy).
- Admin pages are plain tables.
- Admin navigation is a crowded row of 8 items.
- No home screen after login.
- No landing page before login for evaluator explanation.
- Analytics is a table-heavy page without actionable summary insights.

## 2. Design Direction
- **Subject**: Campus booking tool used by students between classes, and by admin who needs a clear overview.
- **The memorable thing**: A timetable board. Rooms are rows, hours are columns, and a live "now" line moves across it. Everything else in the app stays quiet so the board is the hero.

### Palette
| Token | Hex | Used for |
|---|---|---|
| `--ink` | `#121A2B` | Primary text, sidebar background |
| `--paper` | `#F4F6FA` | App background |
| `--surface` | `#FFFFFF` | Panels and the board |
| `--line` | `#E1E6EF` | Borders and dividers |
| `--text-2` | `#5B667C` | Secondary text (meets contrast on white) |
| `--mine` | `#3D3BF3` | Primary action, "your booking" |
| `--free` | `#0E9F8E` | Free slots, success |
| `--pending` | `#D9890B` | Awaiting approval, warnings |
| `--booked` | `#E9EDF4` | Occupied slots (fill), with `--text-2` icon |
| `--danger` | `#E5484D` | Errors, no-shows, blackout hatch, the "now" line |

Tint variants (10-14%):
- `--free-bg`: `#E4F6F3`
- `--pending-bg`: `#FFF4DB`
- `--mine-bg`: `#E9E9FE`
- `--danger-bg`: `#FDEBEC`

### Typography
- Headings & Big numbers: `Bricolage Grotesque` (600, 700)
- Body & UI: `Public Sans` (400, 500, 600)
- Packages: `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/public-sans`
- `font-variant-numeric: tabular-nums` on all times and counts.
- Motion: `motion` from `motion.dev` / `motion/react`.

### Shape, Depth and Motion
- Controls (inputs, buttons): 8 px radius, border `--line`, no shadow
- Panels (board, tables, forms): 14 px radius, flat, 1 px `--line` border, no shadow
- Chips and badges: 6 px radius, tinted fill
- Floating layers (drawer, popover, toast, modal): 18 px radius, shadow `0 12px 32px rgba(18,26,43,.14)`
- Icons: `lucide-react`, 18 px, stroke 1.75.

## 3. App Shell
- Desktop (>= 1024px): Left sidebar, 232 px, `--ink` background.
  - Logo, Nav links (Home, Find a room, My bookings, Waitlist), Divider, Admin section with live count badge on Approvals.
  - Bottom: user avatar, name, role badge, sign out.
  - Top header: page title, bell popover with unread dot.
- Tablet (640-1023px): Sidebar collapses to icon rail with tooltips.
- Mobile (< 640px): Bottom tab bar (Home, Find, Bookings, Waitlist, More).

## 4. Component Library (`src/components/ui/`)
- `Button`: primary (`--mine`), secondary (outline), ghost, danger; sm/md; loading state; 2px focus ring.
- `Input`, `Select`, `Textarea`: label above, helper & error below, 40px height.
- `Badge`: tinted fill + text + optional dot.
- `StatusBadge`: maps booking status to label and variant.
- `Panel`: flat surface, 14px radius, 1px border.
- `Drawer`: right-side sheet (480px, full width mobile), focus trap, Escape closes, shadow.
- `Modal`: centered confirmation modal.
- `Toast`: bottom-right auto-dismiss 4s with optional action.
- `Skeleton`: shimmer blocks matching layout.
- `EmptyState`: icon, title, description, clear action.
- `ErrorState`: failure reason, try again button.
- `Stat`: big number (Bricolage), label, optional delta.
- `Tabs`, `SegmentedControl`: sliding indicator.
- `Countdown`: live relative time updating every 30s.
- `Avatar`: initials on tinted circle.
- `Popover`: notification bell & quick filters.
- `DataTable`: sticky header, row hover, sortable, responsive.

## 5. Page Specifications
- 5.1 Landing page: 10s elevator pitch, mini timetable with animated now-line, how it works, no API calls.
- 5.2 Login / Register: 2-column layout (left `--ink` panel with mini timetable, right form).
- 5.3 Home: "Next up" with countdown & check-in window, "Free right now", quick book chips, waitlist reminder, recent updates. Admin home with 4 KPIs, pending queue, today's board.
- 5.4 Timetable Board (`/search`): rooms grouped by building, sticky room column & hour header, collapsed "Earlier" column, auto-scroll to current hour, red "now" line, icon-only cells, hover tooltip, keyboard arrows, range select (up to 4 hours), Booking Drawer & Taken-slot Drawer with alternatives & release-rate.
- 5.5 My Bookings: Upcoming & Past tabs, countdown, check-in button, calendar export (.ics), cancel modal.
- 5.6 Waitlist: queue position dots (`●●○○`), leave waitlist.
- 5.7 Notifications: Bell popover & `/notifications` page.
- 5.8 Admin pages: Approvals cards with inline actions, Rooms table with drawer, Blackouts calendar list, Users table, Activity log.
- 5.9 Analytics: Periods (7d/30d/custom), CSV export, KPI cards with deltas, rule-based insights, utilization bar chart, demand heatmap, attended vs no-show line chart, sortable room table.

## 6. Feature Enhancements
- 6.1 Smart alternatives (`GET /api/rooms/alternatives`) & room release likelihood (`GET /api/analytics/room-release-rate`).
- 6.2 Multi-hour range booking with all-or-nothing compensation (`POST /api/bookings/batch`).
- 6.3 Reminders (`sendReminders` in scheduler, 10 min before start).
- 6.4 Calendar export (`GET /api/bookings/:id/ics`).
- 6.5 Admin activity log (`AuditLog` model, service hooks, `GET /api/admin/activity`).
- 6.6 Analytics upgrades (heatmap, deltas, rule-based insights, CSV export).
- 6.7 Polish (favorites, dark mode, keyboard shortcuts).
