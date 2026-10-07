# ServiceDesk Pro

ServiceDesk Pro is an IT Service Management (ITSM) helpdesk: employees file tickets, technicians and asset
managers work them under SLA deadlines computed against business hours, and IT managers and system administrators
oversee it all under two-dimensional role-and-department access control. It's a capstone project built in phases,
from the server skeleton up through a working ticket lifecycle, SLA-driven auto-escalation, and a live deployment.

## Live demo
https://servicedesk-pro-b45.vercel.app

> The backend is on Render's free tier, which sleeps when idle. The **first** request after a period of
> inactivity can take up to ~50 seconds to wake it up — the frontend shows a "waking up" screen while it waits,
> this is expected, not a bug.

## Demo credentials

Seeded by `server/src/utils/seed.js`. All seeded users share the same password.

| Role | Email | Password |
|---|---|---|
| System Admin | `admin@servicedesk.test` | `Password@123` |
| IT Manager | `manager@servicedesk.test` | `Password@123` |
| Technician | `tech@servicedesk.test` | `Password@123` |
| Asset Manager | `assets@servicedesk.test` | `Password@123` |
| Employee | `employee@servicedesk.test` | `Password@123` |

A second Employee, `employee.facilities@servicedesk.test` (same password), is seeded in a different department
("Facilities" vs. the rest in "IT Support") specifically to exercise department-scoped visibility — log in as
this user to see a ticket list and `/users` view that are genuinely narrower than the first Employee's.

## What it does

- **Authentication** — JWT access tokens (15 min, `HS256`) paired with an opaque, rotating `httpOnly` refresh
  cookie. Every refresh issues a new token and revokes the old one; presenting an already-revoked token is
  treated as theft and revokes the entire session family, not just that one token.
- **Role-and-department authorization** — every list and single-resource endpoint scopes its query from the
  actor's role *and* department at the service layer, not just a route-level role gate. Reaching a resource that
  exists but is out of scope returns 403, not a silently-filtered empty result.
- **Ticket lifecycle** — `NEW → ASSIGNED → IN_PROGRESS → (WAITING_ON_REQUESTER) → RESOLVED → CLOSED`, with
  `REOPENED` and `ESCALATED` branches. Every transition is checked server-side by a single pure function
  (`canTransition`) against who's asking, and logged to the ticket's own history.
- **Priority derivation** — impact × urgency run through a fixed 3×3 matrix at creation. A manager can layer a
  `priorityOverride` (with a logged reason) on top without ever mutating the derived value underneath it.
- **SLA engine** — response and resolution deadlines are computed in *business* minutes (Mon–Fri, 09:00–18:00)
  and snapshotted onto the ticket at creation. A background sweep runs every 5 minutes inside the server process
  and auto-escalates anything that's blown its resolution deadline.
- **Comments** — public and internal (`isInternal`) notes on a ticket; internal ones are stripped out
  server-side for the requester when they're an Employee, never hidden only by the client.
- **Reference data** — departments and a two-level category tree, served from the API (`GET /reference`,
  `GET /departments`, `GET /categories`) instead of being duplicated as constants in the client.
- **Dashboard** — ticket counts by status plus an overdue count, each a clickable tile that deep-links into the
  matching filtered view of the ticket list.

## Tech stack

**Backend** — Node.js (≥22.9), Express 5.2, MongoDB with Mongoose 9.10, `jsonwebtoken` 9.0, `bcrypt` 6.0,
`helmet` 8.3, `cors` 2.8, `express-rate-limit` 8.7, `morgan` 1.12.

**Frontend** — React 19.3, Vite 8.3, React Router 7.18, Tailwind CSS 4.3.

**Deployment** — Vercel (client), Render (server), MongoDB Atlas (database).

## Architecture decisions

Every non-trivial decision — what was built, why, and what it cost or traded away — is recorded in
[`docs/DECISIONS.md`](docs/DECISIONS.md), organized by project phase (P0 server skeleton through P8 SLA engine).
It's written to be defensible in a viva, not just a changelog.

## Known limitations

These are deliberate scoping choices for a time-boxed project, not oversights — each one is written up in
`docs/DECISIONS.md` with the reasoning behind it.

- **SLA targets are hardcoded**, not admin-editable from the database (`SLA_TARGETS` in `utils/constants.js`).
  Making them DB-tunable is deferred.
- **SLA deadlines never pause.** They're snapshotted once at creation and never recalculated — a ticket sitting
  in `WAITING_ON_REQUESTER` keeps accumulating against its resolution deadline rather than having the clock
  stopped, which simplifies the originally-scoped "pausable" SLA clock.
- **Cross-site refresh cookie (`SameSite=None`).** The frontend and backend are on different domains (Vercel /
  Render), so the refresh cookie can't use the stricter `SameSite=Lax`. Known costs: it's blocked by some
  third-party-cookie policies (Safari, private browsing), and CSRF origin-checking on `/auth/refresh` and
  `/auth/logout` is deferred rather than implemented.
- **In-memory rate limiting** on login and refresh resets on every restart or redeploy and isn't shared across
  multiple server instances. A persistent store (Redis or similar) is the intended fix, not yet built.
- **No per-account login lockout** — only IP-based rate limiting. A lockout was deliberately left out: it would
  let an attacker lock a real user out of their own account just by trying their email with wrong passwords.
- **Comments have no edit, delete, or attachments.** They're append-only notes for now.
- **No audit log of admin actions** beyond what a ticket's own `history` records.
- **Assets and Knowledge Base/AI features are out of scope entirely** — not partially built, not started.
  They were later phases in the original plan and the project stopped at the SLA engine.
- **`history[].by` and `Comment.author` are raw user ids in API responses**, not populated with a name — a
  deliberate choice to show a shortened id in the UI rather than fake a name, until that's worth a real fix.

## Running locally

**Prerequisites:** Node.js ≥22.9, and a MongoDB instance reachable at a connection string (local `mongod`, or an
Atlas cluster).

### Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env and set JWT_ACCESS_SECRET (32+ characters). Generate one with:
#   node -p "crypto.randomBytes(48).toString('base64url')"
# MONGO_URI defaults to a local database; point it at Atlas instead if you don't have MongoDB running locally.

npm run seed              # departments + one user per role (see Demo credentials above)
npm run seed-categories   # the Hardware / Software / Network / Accounts & Access / Other category tree
npm run seed-tickets      # ~17 realistic demo tickets across every status (requires the two seeds above)

npm run dev                # starts the API on PORT (default 5000), reloading on change
```

### Client

```bash
cd client
npm install
cp .env.example .env
# VITE_API_URL defaults to http://localhost:5000/api/v1, matching the server's default PORT above.

npm run dev   # starts Vite on http://localhost:5173
```

Open `http://localhost:5173` and sign in with any of the [demo credentials](#demo-credentials) above.
