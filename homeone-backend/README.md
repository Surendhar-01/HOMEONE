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
npm run db:migrate        # tables + buckets + seed (needs DATABASE_URL)
npm run start:dev
```

- API: `http://localhost:8081/api/v1`
- Swagger UI: `http://localhost:8081/api/docs`
- Swagger JSON: `http://localhost:8081/api/docs-json`
- Health: `http://localhost:8081/api/v1/health`

### Supabase setup

1. **Apply the migrations** — easiest from here:

   ```bash
   npm run db:migrate   # supabase/migrations/*.sql, then supabase/seed.sql
   ```

   or use the Supabase CLI (`supabase db push`), or paste the files into
   **Supabase Studio → SQL Editor** in order. `npm run db:verify` prints row
   counts and confirms RLS is on for every table.

2. **Supabase Auth settings** (Authentication → Providers)
   - Enable **Email**
   - Keep "Confirm email" **enabled** (OTP verification is required)
   - Optional: enable an SMS provider and set `AUTH_OTP_CHANNEL=sms`

3. **Environment** — copy the project URL and keys from
   **Project Settings → API** into `.env`. The direct Postgres host is
   IPv6-only on many networks, so `DATABASE_URL` should use the IPv4 pooler:

   ```ini
   DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

   `SUPABASE_JWT_SECRET` is only needed for legacy HS256 tokens. Modern
   projects use asymmetric keys, which the backend validates via the project's
   JWKS endpoint, so the variable can stay blank.

### Create the first admin

There is no public admin registration. Bootstrap one from the SQL editor:

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
From an Android emulator the host maps to `http://10.0.2.2:8081/api/v1`.

### Authentication

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register-profile` | 🔓 | Customer registration. Also accepts `role: "PROFESSIONAL"`. |
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
| DELETE | `/users/me/profile-photo` | any | Removes the file and clears the path. |

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
are redacted from returned bodies.

---

## 5. Flows

### Customer

```
POST /auth/register-profile  (agreedToTerms: true)
      → Supabase Auth account + profiles + user_roles(CUSTOMER)
      → OTP emailed
POST /auth/verify-otp        → accessToken + refreshToken
GET  /users/me
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
approved directly.

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

---

## 7. Security

- **JWT validation** — every Supabase access token is verified against the
  project's JWKS, falling back to HS256 when `SUPABASE_JWT_SECRET` is set.
  `aud = authenticated` and the issuer are both pinned.
- **Authentication is on by default** — `JwtAuthGuard` is registered globally;
  a route must be marked `@Public()` to skip it. `RolesGuard` is global too.
- **Ownership** — homes, documents, notifications and provider records are all
  scoped to the verified `user_id`; cross-account access returns 403/404.
- **Admin-only actions** — verification transitions live in
  `ProviderVerificationService`, reachable only from `AdminController` behind
  `@Roles('ADMIN')`. The acting admin's id comes from the verified token.
- **Rate limiting** — global 120 req/min, tighter per-route limits on
  registration, login, OTP resend and password recovery.
- **Validation** — global `ValidationPipe` (`whitelist` +
  `forbidNonWhitelisted`). Password policy, mobile format, email format,
  non-negative experience, and end-time-after-start-time are enforced before any
  database call.
- **Uploads** — in-memory Multer with MIME allowlists and hard size caps,
  re-checked in `StorageService`.
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
| `DATABASE_URL` | _(blank)_ | Used only by `npm run db:migrate` / `db:verify` |
| `CORS_ORIGINS` | _(blank = allow all)_ | Comma-separated allowed origins |
| `AUTH_OTP_CHANNEL` | `email` | `email` or `sms` |
| `AUTH_OTP_RESEND_COOLDOWN_SECONDS` | `60` | Resend cooldown |
| `UPLOAD_MAX_IMAGE_BYTES` | `5242880` | 5 MB |
| `UPLOAD_MAX_DOCUMENT_BYTES` | `10485760` | 10 MB |

Two `@nestjs/config` gotchas handled in this codebase: pass custom validators
via `validate:` (a `validationSchema` that is not Joi silently drops the file
values), and look namespaced config up with the plain namespace name, not
`registerAs(...).KEY` (which is the internal `CONFIGURATION(name)` token).

---

## 9. Folder structure

```
homeone-backend/
├── src/
│   ├── main.ts                     # bootstrap, Swagger, CORS, global pipes
│   ├── app.module.ts               # module graph + global guard/interceptor/filter
│   ├── config/                     # typed config + env validation
│   ├── database/                   # Supabase clients, row types, error mapping
│   ├── auth/                       # register, OTP, login, recovery
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
├── scripts/                        # db-migrate, db-verify (pooler-based)
├── test/                           # e2e suites (bootstrap, role guards)
└── .env.example
```

---

## 10. Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint + prettier
npm test            # unit tests
npm run test:e2e    # boot, guards, DTO validation
npm run build       # compile to dist/
```

Unit tests cover password policy, mobile normalisation, ISO date parsing,
working-hours validation, the verification state machine, and the OTP resend
cooldown. E2E tests cover boot, 401/403 guard behaviour, and DTO validation.
Nothing outside the validation and guard layers is safe to assume without a
live Supabase project; `npm run db:verify` confirms the schema after applying
migrations.

---

## 11. Scope

Implemented: registration, OTP verification, login, password recovery, profile
and profile photo, home addresses with live coordinates, provider registration
with documents and working hours, admin verification, notifications.

Not implemented (out of scope for this phase): booking, payments, AI matching,
service discovery, and any other module.