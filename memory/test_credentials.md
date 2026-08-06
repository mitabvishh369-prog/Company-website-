# Test Credentials — Cosmic Elemental

## Admin Account (Owner)
- Email: `mitabvishh369@gmail.com`
- Password: `Cosmic@Admin2026!`
- Role: `admin`
- Access: /admin dashboard for approving events, classes, artist portfolios & viewing booking requests.

## Auth Endpoints (all under /api)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/refresh

## Roles
- `user` (default) — audience
- `organizer` — creates events
- `instructor` — creates classes/workshops
- `artist` — has portfolio
- `admin` — approves content, sees bookings

## Notes for QA
- Admin is seeded at backend startup from env `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- After signup users can upgrade their role via `PATCH /api/users/me/role` with `{ "role": "artist" | "organizer" | "instructor" }`.
- Content approval: newly created events/classes/artist-profiles have `status: "pending"` and only appear publicly after admin approves.
