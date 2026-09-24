# Architectural Decisions

Every decision that shaped the codebase, with the reasoning, so each can be defended in the viva.
Format: **Decision** (what we did) · **Why** (the reason) · **Trade-off** (what it costs, or what we rejected).

Entries are numbered in the order they were made and are never renumbered. If a decision is reversed, add a new entry that supersedes it and mark the old one `Superseded by D-0xx`.

---

## P0 — Server skeleton

### D-001 · Express 5 with no `asyncHandler` wrapper
- **Decision:** Use Express 5 and let async route handlers throw or reject freely.
- **Why:** Express 5 forwards rejected promises and thrown errors from handlers to the error middleware itself. In Express 4 an unhandled rejection in an `async` handler left the request hanging, which is why the `asyncHandler(fn)` wrapper existed. Here the wrapper would be dead code.
- **Trade-off:** Any tutorial written for Express 4 shows the wrapper; ignore it. Express 5 also rejects bare wildcard routes such as `app.get("*")` (see D-007).

### D-002 · Native `--env-file`, no `dotenv`; Node ≥ 22.9
- **Decision:** Load `.env` with Node's own flag. `dev` uses `--env-file=.env` (strict). `start` uses `--env-file-if-exists=.env`. `engines.node` is `>=22.9.0`.
- **Why:** Node 20.6+ reads `.env` natively, so `dotenv` is an unnecessary dependency. In dev the strict flag fails loudly if `.env` is missing. In production the platform injects real environment variables and there is no `.env` file; the strict flag would crash `npm start` there, so `start` tolerates absence.
- **Trade-off:** `--env-file-if-exists` needs Node 22.9+, so `engines` says so rather than claiming support for versions where `npm start` breaks. The requested `>=20.6.0` was raised for this reason.

### D-003 · One validated, frozen `env` object; nothing else reads `process.env`
- **Decision:** `config/env.js` reads `process.env` once, validates it, and exports `Object.freeze({...})`. All other code imports `env`.
- **Why:** Configuration errors are found at boot, not at first use. All missing variables are reported together, so they are not fixed one restart at a time. `PORT` is coerced to a number and range-checked because environment variables are always strings. `NODE_ENV` is checked against `development | production | test`: a typo like `prod` would otherwise silently disable production behaviour. Freezing prevents runtime mutation.
- **Trade-off:** The process exits with code 1 on bad config. This is intentional: an app with invalid config should not start.

### D-004 · One response envelope, sent through `sendSuccess()`
- **Decision:** Success is `{ success: true, message, data }`; failure is `{ success: false, message, errors }`. `sendSuccess(res, { statusCode, message, data })` emits the success shape.
- **Why:** The client can parse every response the same way. A single helper means the shape cannot drift between controllers. `204` sends headers only, because HTTP forbids a body on 204.
- **Trade-off:** Slightly more ceremony than `res.json(...)` in every handler.

### D-005 · `ApiError` with an `isOperational` flag
- **Decision:** `ApiError extends Error` carries `statusCode`, `errors[]`, and `isOperational` (default `true`), with helpers `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `validation`.
- **Why:** Failures come in two kinds. *Operational* errors are expected outcomes we chose to throw ("not found", "wrong password"); their message is written by us and is safe to show. *Programmer* errors are bugs or infrastructure failures whose messages come from the runtime and can leak file paths, query fragments, or library names. The flag lets the error handler show the first kind and hide the second.
- **Trade-off / safety property:** Anything that is not an operational `ApiError` is treated as a bug, so a forgotten case fails **safe**: it becomes a generic 500 and appears in the server log, and nothing internal reaches the client.
- **Status codes:** `400` = malformed request; `422` = well-formed but invalid values (`ApiError.validation`), per CLAUDE.md.

### D-006 · Central error handler
- **Decision:** `middleware/errorHandler.js` is the only place errors become responses.
  - Operational `ApiError` → its own status, message, and `errors`.
  - `entity.parse.failed` (malformed JSON from `express.json()`) → 400.
  - `entity.too.large` (body over the limit) → 413. *Added beyond the original spec; without it a client mistake would be reported as a 500.*
  - Everything else → generic `500 "Internal server error"`; the real error is logged server-side only.
  - The `stack` field is included only when `env.isDevelopment`.
  - If `res.headersSent`, the error is passed to Express's default handler; a second response cannot be sent.
- **Why the fourth parameter stays:** Express identifies error middleware by `fn.length === 4`. With three parameters the function is treated as normal middleware, is skipped when errors occur, and Express's default handler (HTML, leaking stack traces outside production) takes over. The unused parameter is named `_next` to show it is intentional.
- **Trade-off:** Stack traces appear when `NODE_ENV=development`. This is why D-003 validates `NODE_ENV` strictly: an unknown value can never be treated as development.

### D-007 · 404 via `app.use()`, not a wildcard route
- **Decision:** `notFound` is registered with `app.use()` after all routes and calls `next(ApiError.notFound(...))`.
- **Why:** Express 5's router rejects a bare `*` path at startup. `app.use()` with no path matches everything that reached it. Forwarding with `next()` rather than responding keeps all error formatting in D-006.

### D-008 · `app.js` builds the app; `server.js` starts it
- **Decision:** `app.js` exports the configured Express app and never calls `listen()`. `server.js` owns `listen()`, the database connection, and process signals.
- **Why:** The app can be imported by tests without opening a port. Process concerns (signals, exit codes) stay out of the request pipeline.

### D-009 · Middleware order and limits
- **Decision:** `helmet` → `cors` → `express.json` (10 kb) → `urlencoded` (10 kb) → `morgan` (development only) → `/api/v1` routes → `notFound` → `errorHandler`.
- **Why:** Security headers and CORS apply to every response, including errors. `notFound` and `errorHandler` must be last to catch what everything above them misses. `cors` uses `origin: env.clientUrl` with `credentials: true`; a wildcard origin is not allowed with credentials, and the origin differs per environment (CLAUDE.md: no hardcoded config). The 10 kb body limit bounds memory use per request; the `urlencoded` limit is the same value.
- **Known gap:** `morgan` sits after the body parsers, so requests that fail body parsing (malformed JSON, 413) are not access-logged. The client still gets the correct error.

### D-010 · Graceful shutdown
- **Decision:** On `SIGINT`, `SIGTERM`, or `unhandledRejection`: stop accepting connections with `server.close()`, close the DB, then exit. A 10-second `unref()`'d timer forces exit if a connection never finishes. A `shuttingDown` flag prevents double shutdown.
- **Why:** In-flight requests complete instead of being cut off. `SIGTERM` is what hosting platforms send to stop a process. An `unhandledRejection` is a bug, so shutdown exits with code 1 to signal failure.
- **Limit:** Signal handling was verified only through the `unhandledRejection` path on Windows. Ctrl+C in a real terminal exercises the `SIGINT` path.

### D-011 · Temporary `/health/boom` and inline health handlers
- **Decision:** `health.routes.js` has inline handlers (no controller), plus a `/boom` route that throws an `ApiError`.
- **Why:** The health check is trivial, so a controller file adds nothing; real resources get controllers from P2 onwards. `/boom` exists only to verify the error pipeline end to end.
- **Follow-up:** Remove `/boom` before P1's work ships to any shared environment. It exercises only the operational path; the generic-500 path has no route.

---

## P1 — Database and the User model

### D-012 · Connect once at startup, and only then listen
- **Decision:** `await connectDB()` runs in `server.js` before `app.listen()`.
- **Why:** Connecting is expensive (TCP handshake, authentication, topology discovery). Mongoose keeps a pool of connections (default 100) shared by every model; requests borrow and return sockets. Connecting per request would bypass the pool, add latency to every call, and risk exhausting MongoDB's connection limit. Connecting before listening means the server never accepts traffic it cannot serve, and a bad URI is found at boot.
- **Trade-off:** The process cannot start without a reachable database (see D-013).

### D-013 · Connection failure policy
- **Decision:**
  - Initial connection failure → log a clear message, `process.exit(1)`.
  - After a successful connection, `disconnected` / `reconnected` listeners only log; they do not exit.
  - `serverSelectionTimeoutMS: 5000`.
  - `autoIndex: false` when `NODE_ENV === "production"`.
  - Log `host/dbname`, never the URI.
  - `disconnectDB()` is exported and is called in the shutdown path, after HTTP has drained.
- **Why:** The app is useless without a database, so failing fast beats limping. Once connected, the driver reconnects on its own; exiting on a brief network blip would turn it into an outage. The driver default of 30 s makes a dead host look like a hang. Index builds can be slow and lock work on large collections, so in production they should be a deliberate step. The URI will hold credentials once we use Atlas (P10).
- **Observed quirks:** A failed initial attempt logs `MongoDB disconnected` before the failure message, and takes about 8 s rather than 5 s. Both are harmless and left as-is.
- **Follow-up:** Because production has no `autoIndex`, the unique email index must be created deliberately at deploy time (P12).

### D-014 · User model shape
- **Decision:** Fields per CLAUDE.md; `role` enum comes from `utils/constants.js` (`ROLES`, `ROLE_VALUES`), default `EMPLOYEE`; `timestamps: true`; `password` has `select: false`; `isActive` is the soft-delete flag; `department` is an `ObjectId` ref to a `Department` model that does not exist until P5.
- **Why:** The role list is needed by P3 (authorization) and the client, so it lives in one shared, frozen constant. `select: false` means a password hash is never returned unless a query asks with `.select("+password")`. Users are never hard-deleted because tickets and audit entries reference them.
- **Trade-off:** The constants file sits in `utils/` because CLAUDE.md's layout has no `constants/` folder, and the client cannot import from `server/`, so it will keep its own copy or fetch the list from an endpoint. Populating `department` will fail until P5.

### D-015 · Password hashing lives in a `pre('save')` hook
- **Decision:** An `async function` hook hashes with `bcrypt` at cost 12, guarded by `if (!this.isModified("password")) return;`. A regular function is used so `this` is the document. `comparePassword(candidate)` wraps `bcrypt.compare`.
- **Why:** Hashing is a data invariant ("a stored password is always a hash"), not HTTP work. In the model it covers every code path: registration, password reset, admin creation, seed, cron. In a controller, one forgotten call stores plaintext. Validation runs before the hook, so `minlength: 8` is checked on the plaintext (a hash is always 60 characters and would always pass). The `isModified` guard stops any unrelated save from hashing the existing hash. This was verified: after changing only `firstName` the hash was byte-identical, and a control that changed the password produced a new single-hashed value.
- **Cost factor 12:** each +1 doubles hashing time. 12 balances brute-force resistance against login latency.
- **Library choice:** `bcrypt` (native) over `bcryptjs` (pure JavaScript): faster, and prebuilt Windows binaries exist. `bcryptjs` remains the fallback if a native build ever fails.
- **`comparePassword` guard:** it throws a clear error if the document was loaded without `+password`, rather than returning a silent `false` or bcrypt's cryptic message.
- **Critical limitation — what bypasses the hook:** `insertMany`, `updateOne/updateMany`, `findOneAndUpdate` / `findByIdAndUpdate`, `replaceOne`, `bulkWrite`, and raw driver access do not fire `pre('save')`. `User.findByIdAndUpdate(id, { password: "x" })` stores plaintext without error.
- **Rule (binding from P2):** to change a password, **load the document, assign the field, call `.save()`.** Never write the `password` field through a query-style update.
- **Note:** Mongoose 9 is newer than most tutorials; the async hook without `next()` was tested against it rather than assumed.

### D-016 · `toJSON` strips secrets
- **Decision:** `toJSON` deletes `password` and `__v` and enables virtuals (so `fullName` appears; `id` appears beside `_id`).
- **Why:** `res.json()` serialises through `toJSON`, so a hash cannot leak even if a query selected it explicitly.
- **Known gap:** `toObject()` is not covered and would still include a selected hash. Adding the same transform to `toObject` is a small change, recommended in P2.

### D-017 · Indexes
- **Decision:** Uniqueness on email comes from `unique: true` on the field; a compound `{ role: 1, department: 1 }` index is declared with `schema.index()`.
- **Why:** Declaring both `unique: true` and `schema.index({ email: 1 })` creates a duplicate-index warning. The compound index matches the query shape of P3's role-and-department scope filter.
- **Emails** are stored lowercase and trimmed, so `ADA@Example.com` and `ada@example.com` are the same user.

### D-018 · Uniqueness is enforced by the database, not by Mongoose validation
- **Decision:** Duplicate-email handling must map MongoDB error code **11000** to a 409 `ApiError.conflict` in the error handler.
- **Why:** `unique: true` only builds an index. A duplicate insert fails in the database with `MongoServerError` code 11000 (`keyValue` names the field); it is **not** a Mongoose `ValidationError`. Verified through both mongosh and Mongoose. Without a mapping, a duplicate registration would fall through to a generic 500.
- **Status:** **Open. Implement in P2** (the first phase where users can be created through the API).
- **Related:** Role validation *is* a Mongoose rule (`ValidationError`, kind `enum`); MongoDB itself has no schema validation configured, so an invalid role written through mongosh succeeds. Every write must therefore go through the model.

### D-019 · Seed script
- **Decision:** `utils/seed.js` (`npm run seed`) refuses to run when `NODE_ENV === "production"`, clears `users`, creates one user per role with `User.create()` in a loop, reads them back, disconnects, exits 0 (1 on failure).
- **Why:** It deletes data, hence the production refusal. `create()` runs `.save()`, so the hash hook fires; `insertMany()` would store plaintext (D-015). Users are created sequentially because bcrypt at cost 12 is deliberately slow and there are five of them. It reads back from the database to show what was actually stored. Emails use the reserved `.test` TLD (RFC 2606) so they can never reach a real mailbox.
- **Known password:** all seeded users share one dev-only password defined in the script. It is a public fixture, not a secret, and it is not printed.
- **Limit:** The guard checks only `NODE_ENV`. A development `NODE_ENV` combined with a production `MONGO_URI` would still be wiped. A stricter guard (refuse non-localhost URIs) could be added.

---

## Open items

| # | Item | Where |
|---|---|---|
| 1 | Map MongoDB error 11000 to 409 in the error handler | D-018, P2 |
| 2 | Apply the `toJSON` transform to `toObject` as well | D-016, P2 |
| 3 | Move `password` changes to load → assign → `.save()` only | D-015, binding rule |
| 4 | Remove `/health/boom` before deploying | D-011 |
| 5 | Create indexes deliberately in production (`autoIndex` is off) | D-013, P12 |
| 6 | `Department` model; until then `department` cannot be populated | D-014, P5 |
| 7 | Consider a stricter seed guard (refuse non-local `MONGO_URI`) | D-019 |
| 8 | Add `morgan` before body parsers if failed-parse requests must be logged | D-009 |
| 9 | Test `SIGINT` shutdown in a real terminal (Windows shell could not send it) | D-010 |

---

## P2 — Authentication

### D2.1 · Account creation
No public registration. Accounts are created by SYSTEM_ADMIN / IT_MANAGER (endpoint lands in P3). First SYSTEM_ADMIN via `npm run create-admin`. Public register + role in body = privilege escalation; even the admin endpoint whitelists body fields.

### D2.2 · Access token
JWT HS256, 15 min, payload { sub } only. Verification pins algorithms ['HS256']. Role/department are never read from the token.

### D2.3 · Per-request user lookup
authenticate loads the user from the DB on every request. Token missing/invalid/expired, user missing, or user inactive -> 401. req.user is the DB document. Cost: one indexed _id read per request. Benefit: deactivation, demotion and transfer take effect immediately.

### D2.4 · Refresh token
Opaque random (48 bytes, base64url), stored only as a SHA-256 hash in the refreshtokens collection (userId, tokenHash unique, familyId, expiresAt TTL index, revokedAt). SHA-256 not bcrypt: the token is high-entropy and must be looked up by hash. Delivered as httpOnly, SameSite=Strict, Secure-in-production cookie, Path=/api/v1/auth, 7 days. The access token is returned in the JSON body and held in memory by the client.

### D2.5 · Rotation with reuse detection
Every refresh revokes the presented token and issues a new one in the same family. Presenting an already-revoked token revokes the whole family. Known trade-off: two tabs refreshing concurrently can trigger a false reuse; grace window deferred to P12.

### D2.6 · Logout
Logout revokes the presented token's family, clears the cookie, and is idempotent (200 even with no cookie). Password change and deactivation revoke all of a user's refresh tokens. Access tokens cannot be revoked; they live <=15 min, and D2.3 covers deactivation anyway.

### D2.7 · Login failures
One generic 401 "Invalid email or password" for unknown email, wrong password and inactive account. When the user is not found, run a dummy bcrypt compare (cost 12) to equalize timing. Body fields must be strings (blocks NoSQL operator injection). IP rate limit on login. Per-account lockout deferred: it lets an attacker lock out victims.

### D2.8 · Temporary passwords
Admin-set temporary password + mustChangePassword flag. While set, authenticate returns 403 code PASSWORD_CHANGE_REQUIRED except on /auth/change-password, /auth/me, /auth/logout. Risk: the admin knows the temp password. Invite-link flow revisited in P12.

### D2.9 · Duplicate-key mapping
errorHandler maps Mongo duplicate key (11000) -> 409.

---

## P3 — Authorization (RBAC) and user management

### D3.1 · Two layers
authorize(...roles) is a coarse route gate. Record-level access is decided in services from `actor` (= req.user, the DB document per D2.3), never from the token or request body. A route gate alone is never sufficient.

### D3.2 · Explicit role lists, no hierarchy
authorize() validates role names at route-definition time (unknown role throws at boot). Fails closed: no req.user -> 401; role not listed -> 403.

### D3.3 · User-management policy
SYSTEM_ADMIN manages any role in any department. IT_MANAGER manages only TECHNICIAN, ASSET_MANAGER, EMPLOYEE, and only in its own department; it cannot create, modify or assign SYSTEM_ADMIN or IT_MANAGER. TECHNICIAN, ASSET_MANAGER, EMPLOYEE have no access to /users (self via /auth/me). View scope for IT_MANAGER = own department; manage scope = own department AND target role in its manageable set.

### D3.4 · Scoping
List queries use a scope filter built from the actor. Single-resource-by-id: 404 if it does not exist, 403 if it exists but is out of scope (project convention; trade-off: reveals that the ID exists). Fail closed: a non-admin actor with no department gets 403; never build a { department: null } filter. ObjectIds are compared with .equals().

### D3.5 · Mass assignment
Each endpoint has a field whitelist; any other key -> 400 naming the key. isActive, role, department, mustChangePassword never come from create-time client input except where the endpoint explicitly whitelists them. Passwords are never accepted via PATCH.

### D3.6 · Self-protection
A user cannot change their own role, department or isActive via /users/:id. The last active SYSTEM_ADMIN cannot be demoted or deactivated (409). Check-then-write; the race is accepted for now.

### D3.7 · Deactivation and role changes
Deactivation revokes all of the user's refresh tokens (D2.6). Role/department changes take effect on the next request (D2.3); no token action needed.

### D3.8 · Admin password reset
Admin password reset sets a temporary password, sets mustChangePassword=true and revokes all refresh tokens. Own password goes through /auth/change-password only.

### D3.9 · Minimal Department model
Minimal Department model introduced in P3 (name unique, isActive) because create-user must validate department; P5 extends it. Department is required for every role except SYSTEM_ADMIN.

### Deferred
Audit logging of user-admin actions -> P7. In-memory rate limiter, refresh grace window, invite-link flow -> P12.
