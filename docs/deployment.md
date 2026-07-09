# Deployment Guide — smcacademy.org

Production topology (spec Part 4 §3): one domain, one reverse proxy. The browser
only ever talks to Next.js' origin; `/api/v1/*` and `/media/*` are proxied to Django.

```
Internet ──> nginx (TLS, smcacademy.org)
               ├── /            → Next.js  (node, port 3000)
               ├── /api/v1/*    → Django   (gunicorn, port 8000)
               └── /media/*     → served from backend/media (X-Accel or alias)
PostgreSQL 16 (localhost:5432) · Gmailless SMTP via mail.smcacademy.org
```

---

## 1. Environment variables

`backend/.env` (never committed — `.env.example` is the template):

| Variable | Production value |
|---|---|
| `DJANGO_ENV` | `prod` |
| `DJANGO_SECRET_KEY` | 64+ random chars (`python -c "import secrets;print(secrets.token_urlsafe(64))"`) |
| `DJANGO_ALLOWED_HOSTS` | `smcacademy.org,www.smcacademy.org` |
| `DATABASE_URL` | `postgres://stmark_app:<password>@127.0.0.1:5432/stmark` |
| `EMAIL_HOST` / `EMAIL_PORT` | `mail.smcacademy.org` / `587` |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | `info@smcacademy.org` / mailbox password |
| `DEFAULT_FROM_EMAIL` | `"St. Mark Coptic Academy" <info@smcacademy.org>` |
| `FRONTEND_LOGIN_URL` | `https://smcacademy.org/ar/login` |
| `CORS_ALLOWED_ORIGINS` | *(empty — same-origin via proxy)* |
| `CSRF_TRUSTED_ORIGINS` | `https://smcacademy.org,https://www.smcacademy.org` |
| `DJANGO_ADMIN_PATH` | random path, e.g. `manage-7f3k2/` (emergency Django admin) |

Frontend (`.env.production` or process env):

| Variable | Value |
|---|---|
| `BACKEND_URL` | `http://127.0.0.1:8000` (server-side fetches + rewrites) |

## 2. Backend (Django + gunicorn)

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt gunicorn
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_rbac && .venv/bin/python manage.py seed_reference && .venv/bin/python manage.py seed_content
.venv/bin/python manage.py collectstatic --noinput
.venv/bin/python manage.py createsuperuser   # first Super Admin
DJANGO_ENV=prod .venv/bin/python manage.py check --deploy   # must show 0 security issues
.venv/bin/gunicorn config.wsgi -b 127.0.0.1:8000 --workers 3
```

Run under systemd (Restart=always). Media dir (`backend/media`) must be writable
by the service user and **must not** allow script execution (nginx serves it as
static bytes only).

## 3. Frontend (Next.js)

```bash
npm ci && npm run build
BACKEND_URL=http://127.0.0.1:8000 node .next/standalone/server.js   # or: npm run start
```

Run under systemd/pm2 on port 3000.

## 4. nginx essentials

```nginx
server {
  server_name smcacademy.org www.smcacademy.org;
  # TLS via certbot

  location /api/v1/ { proxy_pass http://127.0.0.1:8000; proxy_set_header X-Forwarded-Proto https; proxy_set_header Host $host; }
  location /media/  { alias /srv/stmark/backend/media/; add_header Content-Disposition ""; }
  location /        { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
```

`SECURE_PROXY_SSL_HEADER` is already configured — nginx must set `X-Forwarded-Proto`.

## 5. Backups (spec §5.10)

- Windows: schedule `backend/scripts/backup.ps1` daily (Task Scheduler).
- Linux equivalent cron:
  ```
  0 3 * * * PGPASSWORD=<pw> pg_dump -U stmark_app -h 127.0.0.1 -F c -f /backups/stmark_$(date +\%F).dump stmark && tar czf /backups/media_$(date +\%F).tgz -C /srv/stmark/backend media
  ```
- **Weekly restore drill**: restore into a scratch DB and count rows
  (`pg_restore -d stmark_restore_test --no-owner <dump>` → verify `users`, `articles`, `audit_log`).
- Keep 14 daily + offsite copy (spec: media backup separate).

## 6. Email deliverability

- SPF exists (`include:spf.a2hosting.com`), DMARC is `p=none`.
- Before launch: ask A2 Hosting to confirm **DKIM** signing for smcacademy.org,
  then tighten DMARC to `p=quarantine`.
- Email sends are logged in the `email_log` table (Django admin → Email logs);
  monitor failures after launch.
- Gmail-scale limits don't apply (own mail server), but for newsletters to
  hundreds of recipients consider a queued sender (Celery) — templates are ready.

## 7. Pre-launch checklist (spec Part 4 §5 status)

| # | Item | Status |
|---|---|---|
| 1 | Argon2id hashing, strong SECRET_KEY, SECURE_* on | ✅ done (prod.py refuses dev key) |
| 2 | Login lockout 5/15min (django-axes, HTTP 423) | ✅ done |
| 3 | JWT 15min access, rotating refresh, blacklist | ✅ done |
| 4 | Permission cache w/ versioning (Redis) | ⏳ deferred — recompute per request is fine at current scale |
| 5 | OTP hashed, single-use, rate-limited | ✅ done |
| 6 | Upload magic-byte validation, re-encode, EXIF strip | ✅ done |
| 7 | Privilege ceiling + last-super-admin invariant | ✅ done |
| 8 | Audit incl. permission-denied on admin endpoints | ✅ done |
| 9 | DEBUG off, hosts pinned, admin path via env, pip-audit | ✅ done (pip-audit clean) |
| 10 | Nightly pg_dump + restore test | ✅ script + drill verified |

Post-deploy smoke: register → OTP email arrives → login → publish an article →
appears on the homepage within 60s → audit log shows the actions.
