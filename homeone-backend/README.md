# HOMEONE Backend

Authentication, registration, profile, document upload, OTP verification and
service-provider approval backend for **HOMEONE – All-in-One Home Services**.

| Concern | Choice |
| --- | --- |
| Framework | NestJS 10 on Express |
| Language | TypeScript 5 (strict-ish) |
| Database | Supabase PostgreSQL (PostgREST via `@supabase/supabase-js`) |
| Auth | Supabase Auth (email/password, email OTP, password recovery) |
| Files | Supabase Storage, private buckets + short-lived signed URLs |
| Docs | Swagger at `/api/docs` |
| API prefix | `/api/v1` |

No Docker. No mock auth, no hardcoded OTPs, no seeded user accounts.

---

## 1. Quick start

```bash
npm install
cp .env.example .env      # then fill in your Supabase keys
npm run start:dev
```

- API: `http://localhost:8081/api/v1`
- Swagger UI: `http://localhost:8081/api/docs`
- Swagger JSON: `http://localhost:8081/api/docs-json`
- Health: `http://localhost:8081/api/v1/health`

### Supabase setup

1. **Apply the migrations** — either link the folder with the Supabase CLI

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   or paste the two files into **Supabase Studio → SQL Editor**, in order:
   - `supabase/migrations/0001_init.sql` – tables, constraints, indexes, RLS
   - `supabase/migrations/0002_storage_buckets.sql` – private buckets, storage policies, `promote_to_admin()`

2. **Seed the catalog** — run `supabase/seed.sql` (12 service domains and their
   skills). Idempotent.

3. **Supabase Auth settings** (Authentication → Providers)
   - Enable **Email**
   - Keep "Confirm email" **enabled** (OTP verification is required)
   - Optional: enable an SMS provider and set `AUTH_OTP_CHANNEL=sms`

4. **Environment** — copy the project URL and keys from
   **Project Settings → API** into `.env`:

   ```ini
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_PUBLISHABLE_KEY=...        # shipped to the app
   SUPABASE_SERVICE_ROLE_KEY=...       # server only
   ```

   `SUPABASE_JWT_SECRET` is only needed for projects still on legacy HS256
   tokens. Modern projects use asymmetric keys, which the backend validates via
   the project's JWKS endpoint, so the variable can stay blank.

### Create the first admin

There is no public admin registration. Bootstrap one from the Supabase CLI or
SQL editor:

```sql
select public.promote_to_admin('admin@yourdomain.com');
```

The user must already exist in `auth.users` (create the account through
Supabase Auth, then promote it).

---

## 2. Roles

| Role | How it is assigned | Login expectation |
| --- | --- | --- |
| `CUSTOMER` | Self-service registration (`role: "CUSTOMER"`) | `expectedRole: "CUSTOMER"` (default) |
| `PROFESSIONAL` | Self-service registration via `POST /providers/register` | `expectedRole: "PROFESSIONAL"` |
| `ADMIN` | Only `promote_to_admin()` / trusted backend | `expectedRole: "ADMIN"` |

Exactly one role per account (`user_roles` has a `UNIQUE (user_id)` constraint).
Logging in with the wrong `expectedRole` returns **403**.

---

## 3. Endpoints

All paths are relative to `http://localhost:8081/api/v1`.
`🔓` = public, everything else requires `Authorization: Bearer <accessToken>`.

### Authentication

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register-profile` | 🔓 | Customer registration. Also accepts `role: "PROFESSIONAL"` for the shared flow. |
| POST | `/auth/verify-otp` | 🔓 | Verifies the 6-digit code, returns a session. |
| POST | `/auth/resend-otp` | 🔓 | 60 s per-email cooldown (configurable). |
| POST | `/auth/login` | 🔓 | Email or mobile + password, role-checked. |
| POST | `/auth/refresh-token` | 🔓 | |
| POST | `/auth/logout` | 🔓 | Invalidates the refresh token server-side. |
| POST | `/auth/forgot-password` | 🔓 | Same message whether or not the account exists. |
| POST | `/auth/reset-password` | 🔓 | Body carries the `token_hash` from the email link. |
| GET | `/auth/me` | any | The authenticated principal. |

### Users

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/users/me` | any | Profile + signed profile-photo URL. |
| PATCH | `/users/me` | any | Full name, mobile number. |
| POST | `/users/me/profile-photo` | any | `multipart/form-data`, field `file`. JPG/JPEG/PNG, 5 MB. |
| DELETE | `/users/me/profile-photo` | any | Also available (removes the file and clears the path). |

### Customer (role `CUSTOMER`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/customer/homes` | Address text + optional GPS pair. First address becomes default. |
| GET | `/customer/homes` | |
| PATCH | `/customer/homes/:id` | Ownership checked. |
| DELETE | `/customer/homes/:id` | |

### Service Provider (role `PROFESSIONAL`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/providers/register` | 🔓 Creates account + profile + provider row (`PENDING`) + skills + hours, dispatches OTP. |
| GET | `/providers/me` | |
| PATCH | `/providers/me` | Editing an approved/rejected/blocked profile sends it back to `PENDING`. |
| POST | `/providers/documents` | `multipart/form-data`: `documentType` = `GOVERNMENT_ID` \| `CERTIFICATE`, field `file`. Or `noCertificate=true` instead of a file. |
| GET | `/providers/documents` | Metadata + 5-minute signed URLs. |
| POST | `/providers/work-photos` | `multipart/form-data`, field `files`, up to 10 images. |
| PUT | `/providers/skills` | Full replace of the selected skills. |
| PUT | `/providers/working-hours` | Full replace; each day once, `endTime` after `startTime`. |
| GET | `/providers/verification-status` | Status + the exact notification copy + `canAccessDashboard`. |

### Catalog (🔓)

| Method | Path |
| --- | --- |
| GET | `/service-domains` |
| GET | `/services?domainId=<uuid>` |

### Admin (role `ADMIN`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/providers/pending` | `?limit=&offset=`, oldest submission first. |
| GET | `/admin/providers/:id` | Full review detail + verification history. |
| GET | `/admin/providers/:id/documents` | Signed URLs for ID / certificates / work photos. |
| GET | `/admin/providers/:id/history` | Audit log. |
| PATCH | `/admin/providers/:id/approve` | |
| PATCH | `/admin/providers/:id/reject` | Body `{ "reason": "…" }` (required, ≥ 3 chars). |
| PATCH | `/admin/providers/:id/block` | Body `{ "reason": "…" }` (required, ≥ 3 chars). |

### Notifications

| Method | Path |
| --- | --- |
| GET | `/notifications?limit=&offset=&unreadOnly=` |
| PATCH | `/notifications/:id/read` |
| PATCH | `/notifications/read-all` |

### Health

| Method | Path |
| --- | --- |
| GET | `/health` |

---

## 4. Response shapes

Successful responses are wrapped by `TransformInterceptor`:

```json
{
  "success": true,
  "data": { "...": "..." },
  "timestamp": "2026-02-01T10:00:00.000Z"
}
```

Errors come from `AllExceptionsFilter`:

```json
{
  "statusCode": 400,
  "message": ["Password is required and must be at least 8 characters."],
  "error": "Bad Request",
  "path": "/api/v1/auth/register-profile",
  "timestamp": "2026-02-01T10:00:00.000Z"
}
```

`password`, `confirmPassword`, `token`, `otp`, `code` and `authorization` keys
are redacted from logged/returned bodies.

---

## 5. Flows

### Customer

```
POST /auth/register-profile  (agreedToTerms: true)
      → Supabase Auth account + profiles + user_roles(CUSTOMER)
      → OTP emailed
POST /auth/verify-otp        → accessToken + refreshToken
GET  /users/me               → profile
POST /users/me/profile-photo → optional
POST /customer/homes         → address + live GPS
```

### Service Provider

```
GET  /service-domains
GET  /services?domainId=…
POST /providers/register                 → PENDING, OTP emailed
POST /auth/verify-otp
POST /providers/documents   (GOVERNMENT_ID)
POST /providers/documents   (CERTIFICATE | noCertificate=true)
POST /providers/work-photos
GET  /providers/verification-status      → PENDING copy
--- admin ---
GET  /admin/providers/pending
GET  /admin/providers/:id/documents
PATCH /admin/providers/:id/approve | /reject | /block
--- provider ---
GET  /providers/verification-status      → new status + copy
GET  /notifications
```

### Status rules

| Status | `canAccessDashboard` | Notification |
| --- | --- | --- |
| `PENDING` | false | "Your registration has been submitted successfully. Your documents are under verification. Please wait for admin approval." |
| `APPROVED` | true | "Congratulations! Your service provider account has been approved. You can now access your service provider dashboard." |
| `REJECTED` | false | "Your service provider registration has been rejected. Please review the verification details and contact support or resubmit the required documents." + the admin's reason |
| `BLOCKED` | false | "Your service provider account has been blocked by the administrator. Please contact support for further information." + the admin's reason |

Transitions go through `ProviderVerificationService` only, which writes
`provider_verification_history` (old status, new status, reason, reviewer,
timestamp) and creates the notification in the same call. Providers cannot set
their own status — there is no endpoint for it. A blocked provider cannot be
approved directly; it must be moved out of `BLOCKED` first.

---

## 6. Storage

| Bucket | Contents | Max | MIME |
| --- | --- | --- | --- |
| `profile-photos` | Profile pictures | 5 MB | jpg, jpeg, png |
| `provider-documents` | Government ID, certificates | 10 MB | jpg, jpeg, png, pdf |
| `provider-work-photos` | Work photos | 5 MB | jpg, jpeg, png |

All three are private (`public = false`). Paths are namespaced by user id
(`<user-id>/image/<uuid>.jpg`), which the storage RLS policies key on. Nothing is
ever returned as a public URL — the backend issues 5-minute (documents) or
15-minute (profile) signed URLs after an ownership or admin check.

Re-uploading a government ID or certificate replaces the previous file: the old
object is deleted and the row removed.

---

## 7. Security

- **JWT validation** — every Supabase access token is verified against the
  project's JWKS, falling back to HS256 when `SUPABASE_JWT_SECRET` is set.
  `aud = authenticated` and the issuer are both pinned.
- **Authentication is on by default** — `JwtAuthGuard` is registered globally;
  a route must be marked `@Public()` to skip it. `RolesGuard` is global too, so a
  new controller is protected unless it says otherwise.
- **Ownership** — home addresses, provider documents, notifications and
  provider records are all scoped to `user_id` in the query, and cross-account
  access returns 403/404 rather than data.
- **Admin-only actions** — verification transitions live in
  `ProviderVerificationService`, which is only reachable from `AdminController`
  behind `@Roles('ADMIN')`. The acting admin's id is taken from the verified
  token, never the request body.
- **Rate limiting** — a global 120 req/min budget, with tighter per-route limits
  on registration (5/10 min), login (10/5 min), OTP resend (5/10 min) and
  password recovery (5/15 min).
- **Validation** — global `ValidationPipe` with `whitelist` and
  `forbidNonWhitelisted`, so unknown fields are rejected. Password policy
  (≥ 8 chars, upper + lower + digit), mobile format, email format, positive
  years of experience, and end-time-after-start-time are all enforced before any
  database call.
- **Uploads** — in-memory Multer with MIME allowlists and hard size caps,
  re-checked in `StorageService`.
- **Password recovery** — the endpoint returns an identical response for known
  and unknown addresses so it cannot enumerate accounts.
- **No secrets in logs** — passwords, OTPs, tokens, government ID images are
  never logged. The service-role key never leaves the server.

Passwords and OTPs live only inside Supabase Auth. No `profiles` column, table,
or RPC in this project stores them.

---

## 8. Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8081` | HTTP port |
| `NODE_ENV` | `development` | Environment name |
| `SUPABASE_URL` | — | Project URL (required) |
| `SUPABASE_PUBLISHABLE_KEY` | — | Client key used for Auth flows (required) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Server-only key, bypasses RLS (required) |
| `SUPABASE_JWT_SECRET` | _(blank)_ | Only for legacy HS256 tokens |
| `CORS_ORIGINS` | _(blank = allow all)_ | Comma-separated allowed origins |
| `PASSWORD_RESET_REDIRECT_TO` | `homeone://reset-password` | Deep link for reset emails |
| `AUTH_OTP_CHANNEL` | `email` | `email` or `sms` |
| `AUTH_OTP_LENGTH` | `6` | Documentational; Supabase owns the real length |
| `AUTH_OTP_RESEND_COOLDOWN_SECONDS` | `60` | Resend cooldown |
| `UPLOAD_MAX_IMAGE_BYTES` | `5242880` | 5 MB |
| `UPLOAD_MAX_DOCUMENT_BYTES` | `10485760` | 10 MB |

`SUPABASE_SERVICE_ROLE_KEY` must never be shipped in the React Native bundle.
The app only ever needs `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` for direct
Auth calls; everything else goes through this backend.

---

## 9. Folder structure

```
homeone-backend/
├── src/
│   ├── main.ts                     # bootstrap, Swagger, CORS, global pipes
│   ├── app.module.ts               # module graph + global guard/interceptor/filter
│   ├── config/                     # typed config + env validation
│   ├── database/                   # Supabase clients, row types, error mapping
│   ├── auth/                       # register, OTP, login, password recovery
│   │   ├── guards/                 # JwtAuthGuard, RolesGuard (registered globally)
│   │   └── dto/
│   ├── users/                      # profile + profile photo
│   ├── customer/                   # home addresses
│   ├── providers/                  # provider registration, skills, working hours
│   ├── provider-documents/         # private document read access + URL signing
│   ├── provider-verification/      # the only writer of verification_status
│   ├── service-domains/            # domain catalog
│   ├── services/                   # skills per domain
│   ├── admin/                      # pending list, review detail, approve/reject/block
│   ├── notifications/
│   ├── storage/                    # private bucket wrapper + multer config
│   ├── health/
│   └── common/                     # decorators, filters, interceptors, validators
├── supabase/
│   ├── migrations/0001_init.sql    # tables, constraints, indexes, RLS
│   ├── migrations/0002_storage_buckets.sql
│   └── seed.sql                    # service domains + skills
├── test/                           # e2e suites (bootstrap, role guards)
└── .env.example
```

`provider-documents` and `provider-verification` are standalone modules imported
by both `ProvidersModule` and `AdminModule`, so the owner path and the reviewer
path share one access-control implementation and one audit-log implementation.

---

## 10. Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint + prettier
npm test            # unit tests
npm run test:e2e    # boot, guards, DTO validation
npm run build       # compile to dist/
```

Current state, from the last run in this repo:

```
npm test        → 5 suites, 43 tests passing
npm run test:e2e → 2 suites, 21 tests passing
npm run typecheck → clean
npm run lint      → clean
```

What the suites cover:

- **Unit** — password policy, mobile normalisation, ISO date parsing,
  working-hours validation, and the full verification state machine (approve /
  reject / block, reason required, no-op rejected, blocked cannot be approved,
  audit row + notification written).
- **OTP cooldown** — first send succeeds, immediate resend is refused, resend is
  allowed after the cooldown, cooldown is tracked per email and normalised.
- **e2e boot** — the dependency graph resolves, `/health` answers, protected
  routes 401 without a token, and invalid registration payloads are rejected
  before any Supabase call.
- **e2e roles** — 401 without a token on every protected route, 403 for
  cross-role access in all combinations, and 400 for bad payloads on
  homes / working-hours / document type / years of experience / admin reason.

### What has **not** been verified

There is no test run against a real Supabase project in this repo. Everything
that depends on live Supabase — actual OTP delivery, sign-up, password
recovery, storage upload, signed URLs, RLS, and the admin review round trip —
has **not** been exercised. The unit tests stub the Supabase client, and the e2e
tests stop at the guard and validation layers.

To verify against a real project:

1. Apply the migrations and `seed.sql`.
2. Copy `.env.example` to `.env` with real keys.
3. `npm run start:dev`, then walk the flows in §5 in Swagger.
4. `select * from provider_verification_history order by reviewed_at desc;` to
   confirm the audit log, and check Supabase Storage → each private bucket for
   the uploaded objects.

---

## 11. Scope

Implemented: registration, OTP verification, login, password recovery, profile
and profile photo, home addresses with live coordinates, provider registration
with documents and working hours, admin verification, notifications.

Not implemented (out of scope for this phase): booking, payments, AI matching,
service discovery, and any other module.