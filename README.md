# SkillPlug - Nigerian Student Skills Marketplace

A production-ready MVP that connects Nigerian university students with clients who need affordable digital services. Built with a **Django REST API backend**, a **React (Vite) frontend**, and a **server-rendered Django/HTMX frontend**, backed by PostgreSQL.

## Features

### Core Platform
- **User Authentication** - Sign up, login, logout, password reset (allauth for the server-rendered app, JWT for the React app)
- **Student Profiles** - Full profile with school, department, bio, skills, WhatsApp
- **Verification System** - Students upload a student ID for admin approval; verified students get a badge
- **Portfolio System** - Upload project images with titles and descriptions
- **Job Board** - Post jobs, browse listings, apply with messages
- **WhatsApp Integration** - One-click contact via WhatsApp click-to-chat
- **Reviews & Ratings** - 5-star rating system with comments
- **Saved Freelancers** - Bookmark favorite students
- **In-App Notifications** - Real-time bell with unread badge and a browser chime sound; notified on verification outcomes, job applications, application status changes, new reviews/saves, chat messages, and moderation decisions. Notifications are paginated with a "Load more" button, and you can mute the sound or opt out per notification type in **Settings**
- **In-App Messaging** - Direct chats between clients and freelancers (`/messages`), with read receipts, unread badges, and new-message notifications
- **Reports & Moderation** - Report suspicious profiles or jobs; admins review them in the reports queue and can deactivate the offending job/user
- **Dark Mode** - Toggle between light and dark themes
- **Password Strength** - Registration enforces 8+ characters with uppercase, lowercase, and a number
- **HTMX Live Search** - Real-time freelancer search on the server-rendered frontend
- **Responsive Design** - Mobile-first with bottom navigation on both frontends

### Frontends
- **React SPA** (`frontend/`) - Vite + React + TailwindCSS, talks to the Django REST API, dev server proxied to Django
- **Server-rendered** (`templates/`) - Django templates + TailwindCSS + HTMX

### Admin Features
- Full Django Admin integration
- In-app verification queue (`/admin/verifications` in the React app) — admins review submitted student IDs and approve/reject from the frontend; rejecting requires a reason that's shown to the student
- Admin overview (`/admin/overview`) — aggregate platform stats (users, verification load, jobs by status, reviews, ratings)
- Reports queue (`/admin/reports`) — admins review user reports, resolve (deactivates the offending profile/job) or dismiss, and reporters get an outcome notification
- Bulk verify/unverify students (`verify_students` / `unverify_students` actions in Django admin)
- Moderate job posts and applications
- Manage users, skills, and reviews

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Django 5.0 | Backend framework |
| Django REST Framework | REST API for the React frontend |
| Simple JWT | JWT auth for the API |
| React 18 + Vite | Frontend SPA |
| TailwindCSS | Styling (CDN for templates, PostCSS for React) |
| HTMX | Interactive features on the server-rendered frontend |
| django-allauth | Authentication (server-rendered frontend) |
| django-crispy-forms | Form rendering |
| PostgreSQL | Database (also runs with SQLite locally) |
| django-cors-headers | Cross-origin API access from the React app |
| Pillow | Image processing |
| WhiteNoise | Static file serving |
| Gunicorn | WSGI server |
| pytest + factory-boy | Testing |

## Project Structure

```
skillplug/
├── apps/
│   ├── accounts/          # Custom user model, auth, profiles, verification
│   ├── api/               # Django REST Framework API (React frontend backend)
│   ├── marketplace/       # Freelancer browsing, portfolio, home
│   ├── jobs/              # Job postings and applications
│   ├── reviews/           # Ratings and reviews
│   ├── notifications/     # In-app notifications (bell + chime, paginated)
│   ├── chat/              # Direct messaging between users
│   └── moderation/        # User reports and admin review queue
├── frontend/              # React (Vite) single-page app
│   └── src/
│       ├── api/           # Axios client (VITE_API_URL or /api/v1)
│       ├── components/    # Navbar, cards, mobile nav, etc.
│       ├── context/       # AuthContext (JWT state)
│       ├── pages/         # Home, Dashboard, Jobs, Profiles, etc.
│       └── utils/         # Formatting helpers
├── templates/             # Server-rendered HTML templates (HTMX frontend)
│   ├── accounts/          # Auth and profile templates
│   ├── marketplace/       # Home, freelancer list
│   ├── jobs/              # Job board templates
│   ├── reviews/           # Review form
│   └── partials/          # Reusable components
├── static/                # CSS, JS, images (server-rendered frontend)
├── media/                 # User uploads
├── skillplug/             # Project settings
├── manage.py
├── requirements.txt
├── requirements-dev.txt
├── pytest.ini
├── .env.example
└── DEPLOYMENT.md          # Production checklist
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 13+ (or SQLite for local dev)
- Virtual environment tool (venv or virtualenv)

### 1. Clone and Set Up the Backend

```bash
# Clone the repository
git clone <repository-url>
cd skillplug

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DB_NAME=skillplug
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_HOST=localhost
# DB_PORT=5432
```

The default DB settings point at a local PostgreSQL instance. You can also switch the engine to SQLite for offline development.

### 3. Run Migrations and Seed Data

```bash
# Apply migrations
python manage.py migrate

# Create superuser (for the Django admin)
python manage.py createsuperuser

# Seed sample data (optional)
python manage.py seed_data
```

### 4. Run the Backend

```bash
python manage.py runserver
```

- Server-rendered app: http://127.0.0.1:8000/
- Django admin: http://127.0.0.1:8000/admin/

### 5. Run the React Frontend (optional)

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173/ — the Vite dev server proxies `/api` and `/media` to Django at `http://127.0.0.1:8000`. The API base URL is read from `VITE_API_URL` (default `/api/v1`, see `frontend/.env`).

### 6. Run Tests

```bash
pip install -r requirements-dev.txt
python manage.py test apps.api   # or: pytest
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Debug mode | `True` |
| `SECRET_KEY` | Django secret key | (required in production) |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `FRONTEND_URL` | Deployed frontend URL (password-reset links) | `http://localhost:5173` |
| `EMAIL_BACKEND` | Email backend (`console` in dev, `smtp` in prod) | `console` (when DEBUG) |
| `EMAIL_HOST_USER` | SMTP email | (optional) |
| `EMAIL_HOST_PASSWORD` | SMTP password | (optional) |
| `DEFAULT_FROM_EMAIL` | From address for outgoing email | `noreply@skillplug.ng` |
| `WHATSAPP_DEFAULT_MESSAGE` | Default WhatsApp click-to-chat message | (see `.env.example`) |
| `REDIS_URL` | Redis URL for response caching (e.g. `redis://localhost:6379/0`). Falls back to in-memory cache when empty | *(empty)* |

Frontend (`frontend/.env`):

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Django API base URL | `/api/v1` |

## Student Verification

1. Students upload a student ID (`verification_doc`) via profile creation/edit — uploading one automatically queues a verification request (`verification_requested=True`).
2. If the ID is already on file, students submit the request from their dashboard (**Request Verification**), or via the server-rendered dashboard's **Request Verification** button.
3. Admins approve/reject from the React app at **Verifications** (`/admin/verifications`) — the pending queue shows each student's ID document with Verify/Reject buttons:
   - **Verify** sets `verified=True`, clears the request, and stamps `verification_date`.
   - **Reject** asks for a reason, clears the request without verifying, and shows the reason to the student (dashboard + profile edit).
   - Outcomes are delivered as in-app notifications with a bell badge and a chime sound.
4. Alternatively, admins can use Django `admin/`:
   - **Verify selected students** bulk action approves them (sets `verified=True`, clears the request).
   - **Reject selected verification requests** clears pending requests.
   - The **Verification** list filter and status column (`Pending Review` / `Verified`) make the queue easy to review.
   - Per-user `verified` checkbox still works for direct edits.
5. Once verified, the student gets the badge and appears in the featured/verified sections. Re-uploading an ID resets `verified=False` so it must be re-approved.

## In-App Notifications

The bell icon in the React app (top-right on desktop, inline on mobile) polls the API every 30 seconds while you're signed in:

- **Unread badge** shows the number of unread notifications and updates automatically.
- **Chime sound** (Web Audio, no audio files needed) plays when new notifications arrive — browsers only play it after your first interaction with the page.
- Clicking a notification marks it read and jumps to its link (profile, job, etc.). Use **Mark all read** to clear the badge.
- Admins are notified when a student submits a verification request; students get notified on verification results, application status changes, new reviews, and when someone saves their profile.
- Chat partners and reporters also get notifications (`message` and moderation types).
- The list is paginated (12 per page) — open the bell and hit **Load more** to fetch older notifications.
- **Settings** (`/settings`) lets you mute the chime sound entirely and toggle each notification type on/off.

## API Endpoints (`/api/v1/`)

| Method | URL | Description | Auth |
|--------|-----|-------------|------|
| GET | `/health/` | Health check | No |
| POST | `/auth/register/` | Register | No |
| POST | `/auth/login/` | Login (JWT) | No |
| POST | `/auth/refresh/` | Refresh JWT | No |
| GET/PUT | `/auth/profile/` | Get / update own profile | Yes |
| POST | `/auth/password-reset/` | Request reset | No |
| POST | `/auth/password-reset/confirm/<uidb64>/<token>/` | Confirm reset | No |
| GET | `/users/saved/` | Saved freelancers | Yes |
| GET | `/users/<username>/` | Public profile | No |
| POST | `/users/<username>/save/` | Toggle save | Yes |
| GET | `/users/<username>/portfolio/` | User portfolio | No |
| GET | `/admin/verifications/` | Pending verification queue | Staff |
| POST | `/admin/verifications/<id>/` | Verify / reject request (with reason) | Staff |
| GET | `/admin/stats/` | Platform overview stats | Staff |
| GET | `/notifications/` | Own notifications (paginated) | Yes |
| GET | `/notifications/unread-count/` | Unread count | Yes |
| POST | `/notifications/read-all/` | Mark all read | Yes |
| POST | `/notifications/<id>/read/` | Mark one read | Yes |
| GET | `/conversations/` | Your conversations | Yes |
| POST | `/conversations/start/<username>/` | Open/create a chat | Yes |
| GET | `/conversations/<id>/` | Messages (marks read) | Participant |
| POST | `/conversations/<id>/` | Send a message | Participant |
| POST | `/reports/` | Report a profile/job | Yes |
| GET | `/admin/reports/` | Reports queue (`?status=pending`) | Staff |
| POST | `/admin/reports/<id>/action/` | Resolve / dismiss a report | Staff |
| GET | `/dashboard/` | Dashboard data | Yes |
| POST | `/toggle-dark-mode/` | Toggle dark mode | Yes |
| GET | `/skills/` | List skills | No |
| GET | `/freelancers/` | Browse freelancers (`?verified=true`) | No |
| GET | `/home/` | Home data | No |
| GET | `/jobs/` | Job listings | No |
| POST | `/jobs/create/` | Post job | Yes |
| GET | `/jobs/<id>/` | Job detail | No |
| POST | `/jobs/<id>/apply/` | Apply | Yes |
| GET | `/jobs/<id>/applications/` | Job applications | Owner |
| POST | `/jobs/<id>/status/<status>/` | Update application status | Owner |
| GET | `/jobs/my-jobs/` | Own jobs | Yes |
| GET | `/jobs/my-applications/` | Own applications | Yes |
| GET/POST | `/portfolio/` | List / create portfolio items | Yes |
| GET/PUT/DELETE | `/portfolio/<id>/` | Manage portfolio item | Owner |
| GET | `/reviews/<username>/` | Freelancer reviews | No |
| POST | `/reviews/<username>/create/` | Leave review | Yes |

## Server-Rendered URL Routes

| URL | Description | Auth Required |
|-----|-------------|---------------|
| `/` | Home page | No |
| `/accounts/signup/` | Registration | No |
| `/accounts/login/` | Sign in | No |
| `/accounts/logout/` | Sign out | Yes |
| `/accounts/password-reset/` | Password reset | No |
| `/accounts/profile/create/` | Complete profile | Yes |
| `/accounts/profile/edit/` | Edit profile | Yes |
| `/accounts/dashboard/` | User dashboard | Yes |
| `/accounts/saved/` | Saved freelancers | Yes |
| `/accounts/@username/` | Public profile | No |
| `/marketplace/freelancers/` | Browse freelancers | No |
| `/marketplace/freelancers/search/` | HTMX search | No |
| `/marketplace/portfolio/add/` | Add portfolio item | Yes |
| `/jobs/` | Job board | No |
| `/jobs/post/` | Post a job | Yes |
| `/jobs/<id>/` | Job detail | No |
| `/jobs/<id>/apply/` | Apply for job | Yes |
| `/reviews/freelancer/<username>/review/` | Leave review | Yes |
| `/admin/` | Django admin | Staff only |

## Sample Data Credentials

After running `python manage.py seed_data`, you can log in with:

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full production checklist (secrets, CORS, security headers, static/media hosting, CI/CD, and monitoring). Summary:

1. Set production env vars (`DEBUG=False`, real `SECRET_KEY`, `ALLOWED_HOSTS`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`).
2. Migrate a PostgreSQL DB and `collectstatic`.
3. Build + host the React frontend (`cd frontend && npm run build`), pointing `VITE_API_URL` at the backend.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For questions or support, please open an issue on the repository or contact the maintainers.

---

Built with care for Nigerian students. Connect, create, and earn with SkillPlug!