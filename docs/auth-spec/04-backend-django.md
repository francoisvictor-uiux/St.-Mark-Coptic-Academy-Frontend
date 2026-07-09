# Part 4 — Backend Architecture: Django + DRF + PostgreSQL

Specification only (no code). Defines project structure, database schema, API contract conventions, email delivery, security hardening, and how the backend connects to the existing Next.js 16 frontend.

---

## 1. Stack & Packages

| Concern | Choice |
|---|---|
| Framework | Django 5.x + Django REST Framework |
| Auth tokens | `djangorestframework-simplejwt` (access 15 min / rotating refresh in httpOnly cookie) |
| Password hashing | Argon2id via `argon2-cffi` (Django's `Argon2PasswordHasher` first in `PASSWORD_HASHERS`) |
| DB | PostgreSQL 16, `psycopg[binary]` |
| Migrations | Django migrations (built-in) |
| Async jobs | Start with Django-native background threads are NOT acceptable — use **Celery + Redis** or, to defer Redis, `django-tasks`/management-command queue; emails must be off-request |
| Throttling | DRF throttles + `django-axes` for login lockout |
| CORS | `django-cors-headers` |
| API docs | `drf-spectacular` (OpenAPI — becomes the living API contract) |
| Env config | `django-environ`; `.env` git-ignored |
| Media (prod) | S3-compatible via `django-storages` (local `MEDIA_ROOT` in dev) |

**Project layout (apps):**

```
backend/
  config/          # settings (base/dev/prod), urls, asgi/wsgi
  apps/
    accounts/      # custom User model, auth endpoints, OTP, invitations, sessions
    rbac/          # modules, permissions catalog, roles, assignments, permission cache
    students/      # student_profiles, documents, completion logic
    audit/         # append-only audit log + middleware/signals
    academics/     # churches, dioceses, programs (reference data)
  templates/emails/  # bilingual (ar/en) HTML+text email templates
```

Rule: **custom User model from day one** (`AUTH_USER_MODEL = accounts.User`) — retrofitting later is the classic Django trap. Django Admin stays enabled at a non-obvious path for Super-Admin emergency access only; the real admin UX is the Next.js dashboard.

---

## 2. Database Schema (PostgreSQL)

All tables: `id` UUID pk (uuid7 preferred), `created_at`, `updated_at`. FKs `ON DELETE` noted where non-default. Soft delete = nullable `deleted_at`.

### accounts

**users**

| Column | Type | Notes |
|---|---|---|
| email | citext UNIQUE | login identifier |
| username | citext UNIQUE NULL | optional secondary identifier |
| password_hash | text | Argon2id; NULL while `invited` |
| first_name_ar / last_name_ar | varchar(50) | |
| full_name_en | varchar(100) | |
| phone | varchar(20) NULL | E.164 |
| user_type | enum: `super_admin, admin, student` | |
| status | enum: `pending_verification, active, suspended, invited, pending_approval` | `pending_approval` reserved (approval toggle) |
| locale | varchar(5) default `ar` | |
| email_verified_at / phone_verified_at | timestamptz NULL | |
| last_login_at | timestamptz NULL | |
| failed_login_count | smallint default 0 | mirrored by django-axes |
| locked_until | timestamptz NULL | |
| terms_version / terms_accepted_at | varchar / timestamptz | consent record |
| invited_by | FK users NULL | |
| account_expires_at | timestamptz NULL | temporary staff |
| deleted_at | timestamptz NULL | soft delete, 30-day restore |

Indexes: `(user_type, status)`, `lower(email)`, partial index on `deleted_at IS NULL`.

**otp_codes** — one table for every code purpose

| Column | Type |
|---|---|
| user_id | FK users CASCADE |
| purpose | enum: `email_verify, phone_verify, password_reset, invite, two_factor` |
| code_hash | text (or signed token hash for `invite`) |
| sent_to | varchar (email/phone snapshot) |
| expires_at | timestamptz |
| attempts / max_attempts | smallint (default 0 / 3–5 by purpose) |
| consumed_at | timestamptz NULL |

Unique active-code rule: creating a new code invalidates prior unconsumed codes of same (user, purpose).

**refresh_tokens**

| Column | Type |
|---|---|
| user_id | FK users CASCADE |
| token_hash | text UNIQUE |
| family_id | uuid (rotation family — reuse detection revokes whole family) |
| device_label / user_agent / ip | text (session list UI) |
| expires_at / revoked_at / last_used_at | timestamptz |

**login_history**: `user_id NULL (unknown identity), identifier_entered, ip, user_agent, result enum(success, bad_credentials, locked, suspended, unverified), created_at`. Partitionable by month.

**password_history**: `user_id, password_hash, created_at` — keep last 3, checked on reset/change.

### rbac

**modules**: `key UNIQUE (e.g. 'articles'), name_ar, name_en, group enum(content, academic, events, system), sort_order, is_active` — drives the matrix rows.

**permissions**: `module_id FK, action enum(view, create, edit, delete, publish, approve, export, import, assign, archive, restore), is_guarded bool, depends_on jsonb (permission ids), UNIQUE(module_id, action)` — drives matrix cells.

**roles**: `slug UNIQUE, name_ar, name_en, description, is_system bool (super_admin/admin/student bases undeletable), created_by FK, deleted_at`.

**role_permissions**: `role_id FK CASCADE, permission_id FK CASCADE, UNIQUE(role_id, permission_id)`.

**user_roles**: `user_id FK CASCADE, role_id FK RESTRICT, assigned_by FK, assigned_at, scope jsonb NULL (reserved: {"diocese_id": …}), UNIQUE(user_id, role_id)`.

**user_permission_overrides** (v1.1, table reserved): `user_id, permission_id, effect enum(grant, deny)` — deny wins over role grants.

Effective permissions = union(role_permissions of user_roles) ± overrides; `super_admin` bypasses (all). Computed server-side, cached (§5).

### students / academics

**student_profiles**: `user_id FK UNIQUE CASCADE, country_code char(2), diocese_id FK NULL, church_id FK NULL, church_other_text, program_interest_id FK NULL, photo_path, gender enum NULL, date_of_birth date NULL, nationality_code char(2) NULL, education_level enum NULL, education_field, church_service, confession_father, bio varchar(500), emergency_name / emergency_relation / emergency_phone, completion_pct smallint (server-computed)`.

**student_documents**: `user_id FK CASCADE, file_path, original_name, mime, size_bytes, verified_by FK NULL, verified_at NULL, deleted_at`.

**dioceses**: `name_ar, name_en, country_code, is_active` · **churches**: `diocese_id FK, name_ar, name_en, city, is_active, is_user_submitted bool (escape-hatch entries pending review)` · **programs**: `name_ar, name_en, slug, is_published` (grows with LMS).

### audit

**audit_log** (append-only; app DB role granted INSERT+SELECT only):

| Column | Type |
|---|---|
| actor_id | FK users SET NULL |
| actor_label | varchar (snapshot — survives user deletion) |
| action | varchar (verb.noun: `role.permissions_updated`, `user.deactivated`, `auth.login_failed`) |
| module | varchar |
| target_type / target_id / target_label | varchar/uuid/varchar |
| before / after | jsonb NULL (minimal diffs, ids+labels not documents) |
| ip / user_agent | inet / text |
| created_at | timestamptz, index (brin) |

Monthly partitions once >1M rows. Retention 24 months (archival job).

---

## 3. API Contract Conventions

- Base path `/api/v1/`; JSON; errors envelope: `{"error": {"code": "email_taken", "message_ar": "…", "message_en": "…", "fields": {"email": ["…"]}}}` — codes stable, messages localizable (client may override via next-intl).
- Auth: `Authorization: Bearer <access>`; refresh via cookie-only endpoint. All mutating endpoints CSRF-safe by design (bearer header, SameSite cookie used only on `/auth/refresh` + `/auth/logout` which require the custom header `X-Requested-With` as CSRF mitigation).
- Permission enforcement: DRF permission classes mapping view → required `<module>.<action>`; object-level checks for privilege ceiling (admin cannot mutate admin/super_admin).
- Pagination: cursor-based (`?cursor=`) for tables and audit; page-size cap 100.
- Full endpoint inventory: consolidated from Parts 2–3 —

```
AUTH      POST /auth/login | /auth/refresh | /auth/logout | /auth/register
          POST /auth/check-email | /auth/verify-email | /auth/resend-otp
          POST /auth/forgot-password | /auth/verify-reset-code | /auth/reset-password
          POST /auth/accept-invite {token, password}
          GET  /auth/me            (profile + permissions — hydrates the client on load)
META      GET  /meta/registration-options   (public, cached, ETag)
STUDENT   GET|PATCH /students/me/profile · POST /students/me/photo
          POST|DELETE /students/me/documents
ADMIN     GET|POST /admin/users · GET|PATCH|DELETE /admin/users/{id}
          PATCH /admin/users/{id}/status · POST /admin/users/{id}/reset-password
          POST /admin/users/{id}/resend-invite | revoke-invite
          GET /admin/users/{id}/activity · GET|DELETE /admin/users/{id}/sessions[/{sid}]
          POST /admin/users/export
RBAC      GET /admin/permissions/catalog
          GET|POST /admin/roles · GET|PATCH|DELETE /admin/roles/{id}
          PUT /admin/roles/{id}/permissions · POST /admin/roles/{id}/duplicate
AUDIT     GET /admin/audit · POST /admin/audit/export
SESSIONS  GET /me/sessions · DELETE /me/sessions/{id} · DELETE /me/sessions (all others)
```

### Next.js integration

- Dev: Django on `:8000`, Next on `:3000`; add a Next.js **rewrite** proxying `/api/v1/*` → `http://localhost:8000/api/v1/*` so the browser sees one origin — cookies work without cross-site headaches, CORS list stays empty. Keep the same pattern in production (reverse proxy on one domain).
- The existing placeholder `src/app/api/apply/route.ts` migrates into Django later.
- Client hydration: on app load call `/auth/me`; render dashboard nav from `permissions[]`; guard routes client-side for UX and always server-side for truth.

---

## 4. Email Delivery — Gmail SMTP (initial)

- Django `smtp.EmailBackend`: host `mail.smcacademy.org`, port 587 STARTTLS, user `info@smcacademy.org` (the Academy's official mailbox on the domain host), all in env vars: `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL="St. Mark Coptic Academy <info@smcacademy.org>"`.
- All sends queued (Celery) with 3 retries + exponential backoff; failures logged + surfaced in an admin "email failures" view later.
- Templates: bilingual HTML+plaintext, RTL-safe HTML (dir=rtl, inline styles, web-safe fonts), templates: `verify_email, welcome, reset_code, password_changed, admin_invitation, account_suspended`.
- **Known limits (accepted for now):** ~500 recipients/day cap, sender shows Gmail address, weaker deliverability to institutional inboxes. **Migration trigger:** before public launch or first bulk announcement — swap to Resend/SES by changing backend env config only; templates and queue are provider-agnostic by design.
- Dev mode: `console.EmailBackend` prints emails/OTPs to the runserver console.

---

## 5. Security Hardening Checklist

1. Argon2id hashing; per-site `SECRET_KEY` rotation plan; `SECURE_*` settings on in prod (HSTS, SSL redirect, secure cookies).
2. Login throttling: django-axes — 5 failures/15 min per (identity, IP) combo → 423 with `Retry-After`; identical responses for unknown identities (axes lockout on identifier string).
3. JWT: 15-min access, 7/30-day rotating refresh, family reuse detection → revoke family + audit `auth.token_reuse_detected`.
4. Permission cache: effective permission set cached (Redis or DB cache table) keyed by user + `permissions_version`; any role/assignment mutation bumps the version → next request recomputes. Never cache inside the JWT beyond a version claim.
5. OTPs hashed, single-use, purpose-bound, constant-time compared; send rate 5/hour/identity; verify rate 10/min/IP.
6. Uploads: extension **and** magic-byte validation, images re-encoded + EXIF-stripped, served via signed URLs, no execution permissions on media storage, per-user quota (25MB v1).
7. Privilege ceiling middleware: mutations on `user_type in (admin, super_admin)` require actor `super_admin`; self-targeting guards (no self-delete/deactivate/demote; last-super-admin invariant enforced in a transaction with row lock).
8. Audit everything in Part 3 ADM-06 list, including permission-denied (403) attempts on guarded endpoints.
9. `DEBUG=False` prod, allowed hosts pinned, admin path randomized, dependency audit (`pip-audit`) in CI, `.env` never committed.
10. Backups: nightly `pg_dump` + weekly restore test; media backup separate.

---

## 6. Milestone Plan (suggested build order)

| # | Milestone | Contents |
|---|---|---|
| M1 | Foundation | Django project, custom User, PostgreSQL connection, settings split, OpenAPI, Next rewrite proxy |
| M2 | Core auth | login/refresh/logout, lockout, login_history, `/auth/me` |
| M3 | Registration | wizard endpoints, OTP + Gmail SMTP, reference data (churches/dioceses/programs) seeding |
| M4 | Password recovery | forgot/verify/reset, password_history, notification email |
| M5 | RBAC | catalog seed, roles CRUD, matrix save, permission classes, cache+versioning |
| M6 | Admin console APIs | users list/detail/status/invite flows, sessions |
| M7 | Audit | signals + middleware, list/export |
| M8 | Student profile | sections PATCH, photo, documents |
| M9 | Hardening pass | throttles review, pen-test checklist, backup drill — then frontend integration complete |

---

## 7. Future Scalability

- **2FA/TOTP** → `two_factor` OTP purpose + `users.totp_secret` (encrypted) + step-up screen slot (AUTH-01 §15).
- **SSO Google/Microsoft** → `social_identities (user_id, provider, subject, email)` table; account-linking flow; login screen slots already reserved.
- **Approval gate** → flip platform setting; `pending_approval` status + ADM approval queue reuse the invitation UI patterns.
- **Scoped roles** (diocese-level admins) → `user_roles.scope` jsonb already reserved; permission checks gain a scope resolver.
- **LMS growth** → new modules are catalogue rows (`courses`, `enrollments`, `grades`) — matrix UI and permission classes pick them up without redesign.
- **Multi-language beyond ar/en** → all reference tables already dual-named; add columns or move to a translations table when a third locale appears.
