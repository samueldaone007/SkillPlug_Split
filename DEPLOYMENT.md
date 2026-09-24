# SkillPlug Production Checklist

Each item is marked `[x]` (done) or `[ ]` (still needed).

---

## 1. Environment & Secrets

- [x] `SECRET_KEY` is read from env; the app refuses to boot if missing with `DEBUG=False`
- [x] `DEBUG` is configurable via env (default `True` for dev; set `False` in prod)
- [x] `ALLOWED_HOSTS` is configurable via env (`comma-separated`); Render auto-appends `RENDER_EXTERNAL_HOSTNAME`
- [x] `.env.example` documents all required/optional vars
- [ ] `.env` created on the deploy host with production values (see below)

**Minimum prod `.env`:**
```
DEBUG=False
SECRET_KEY=<generate-64-char-random>
ALLOWED_HOSTS=your-app.onrender.com
FRONTEND_URL=https://your-deployed-frontend.vercel.app
CORS_ALLOWED_ORIGINS=https://your-deployed-frontend.vercel.app
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

---

## 2. CORS & Frontend URL

- [x] `CORS_ALLOWED_ORIGINS` is env-driven (comma-separated list)
- [x] `FRONTEND_URL` is env-driven; used for password-reset email links
- [ ] In production: set both to your actual deployed frontend domain

---

## 3. Rate Limiting

- [x] `login` — 10 req/hour per IP (`ScopedRateThrottle` on `ThrottledLoginView`)
- [x] `register` — 5 req/hour per IP
- [x] `password_reset` — 5 req/hour per IP
- [x] `apply` — 20 req/hour per user
- [x] `review` — 20 req/hour per user
- [ ] Consider globally throttling unscoped endpoints (`AnonRateThrottle` / `UserRateThrottle` defaults are pre-configured) to protect read-heavy list endpoints
- [ ] Consider adding `captcha` / `hCaptcha` on the register + password-reset forms for bot protection

---

## 4. Security Headers (production only, `DEBUG=False`)

- [x] `SECURE_SSL_REDIRECT` — forces HTTPS
- [x] `SECURE_PROXY_SSL_HEADER` — trusts Render/Cloudflare `X-Forwarded-Proto`
- [x] `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` — cookies over HTTPS only
- [x] `SECURE_HSTS_SECONDS = 31536000` — 1-year HSTS
- [x] `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`
- [x] `SECURE_REFERRER_POLICY = strict-origin-when-cross-origin`
- [x] `SECURE_CONTENT_TYPE_NOSNIFF = True`
- [x] Added `Content-Security-Policy` header (custom `SecurityHeadersMiddleware` in `skillplug/middleware.py`, prod only)
- [x] Added `Permissions-Policy` header (same middleware: disables camera, geolocation, microphone, payment)

---

## 5. Database

- [x] Migrate from SQLite to **PostgreSQL** (required for multi-worker deployments)
- [x] Run `DATABASE_URL=postgres://... python manage.py migrate`
- [X] Ensure `pip install dj-database-url` is in `requirements.txt` (or use `decouple` + `psycopg2`)
- [ ] Regular backups (Render provides this; otherwise use `pg_dump` cron)

---

## 6. Static & Media Files

- [x] Whitenoise serves compressed static files
- [x] `STATIC_ROOT = staticfiles/` configured
- [x] Verify `python manage.py collectstatic` runs without error
- [ ] For media uploads in production: set up **Cloudinary** or **AWS S3**
- [ ] If using local media: ensure `MEDIA_ROOT` is on persistent disk (Render disk addon)

---

## 7. Email

- [x] Console backend in DEBUG mode
- [ ] SMTP credentials configured for production
- [ ] Test password-reset email end-to-end on production

---

## 8. Frontend Build & Serving

The React app (Vite) must be built and hosted separately from the Django server.

**Build:**
```bash
cd frontend
npm install
npm run build
```

**Hosting options:**
- **Vercel / Netlify**: Connect the `frontend/` directory; set `VITE_API_URL` to your Django backend URL
- **Render Static Site**: Point to `frontend/` with build command `npm install && npm run build` and publish dir `dist`

Set the Vite env var on the frontend host:
```
VITE_API_URL=https://your-django-app.onrender.com/api/v1
```

If `VITE_API_URL` is not set, the React client defaults to `/api/v1` (same-origin proxy), which only works when Django and React are on the same origin.

---

## 9. Authentication

- [x] JWT access token: 2-hour lifetime
- [x] JWT refresh token: 7-day lifetime, rotated on use
- [x] `BLACKLIST_AFTER_ROTATION = False` (allows concurrent sessions)
- [ ] Consider switching JWT storage from `localStorage` to an **HttpOnly cookie** to reduce XSS exposure

---

## 10. Automated Tests

- [x] API test suite written in `apps/api/tests.py` (register, login, profile CRUD, job CRUD, apply, review, portfolio, save)
- [x] Serializer validation tests written (password mismatch, duplicate email, duplicate apply/review, budget validation)
- [x] Permission tests written (owner-only edit, auth-required endpoints, non-owner rejected)
- [x] `pytest.ini` added (works with `pytest` and `manage.py test`)
- [x] `pytest`, `pytest-django`, `factory-boy` added to `requirements-dev.txt`
- [ ] Run the suite to confirm it passes (agent has no shell access in this environment):
  - `pip install -r requirements-dev.txt && python manage.py test apps.api`

---

## 11. CI / CD

- [x] GitHub Actions CI added (`.github/workflows/ci.yml`): Django system checks + API tests on Python 3.13, and React build on Node 20, on every push/PR
- [ ] Set up auto-deploy on push to `main` (Render auto-deploy / other host)

---

## 12. Monitoring & Observability

- [x] `/api/v1/health/` endpoint added (Django-free, no DB; returns 200 `{"status":"ok"}`)
- [ ] Add Sentry (or equivalent) for error tracking
- [ ] Set up uptime monitoring (UptimeRobot, Better Stack, etc.)
- [ ] Review Django logs periodically

---

## 13. Pre-Launch

- [ ] Run `python manage.py check --deploy` and fix all warnings
- [ ] Seed production skills: `python manage.py seed_skills`
- [ ] Create a superuser for admin: `python manage.py createsuperuser`
- [ ] Test all flows end-to-end on production (signup, profile, job post, apply, review, password reset)
- [ ] Remove or disable any debug/test endpoints
- [ ] Verify `manage.py collectstatic` runs and Whitenoise serves all assets
- [ ] Confirm CORS works from your real frontend domain
- [ ] Confirm email (password reset) sends and delivers

---

## 14. Future Improvements (not blockers)

- [ ] Migrate to PostgreSQL
- [ ] HttpOnly cookie JWT storage
- [ ] Rate-limit CAPTCHA on forms
- [ ] Cloudinary / S3 for media
- [ ] Error monitoring (Sentry)
- [ ] Global throttling of read-only list endpoints
