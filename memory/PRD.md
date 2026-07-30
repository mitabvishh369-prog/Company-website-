# Cosmic Elemental - Product Requirements Document

## Original Vision
A centralized platform to organize and connect the global creative community — bringing events, classes, and creative talent under one curated home instead of scattered Instagram / WhatsApp threads.

## Phase 1 (MVP) — Delivered Feb 2026
### Modules
1. **Global Creative Event Discovery & Registration** — organizers publish events (Battle, Cypher, Jam, Festival, Showcase, etc.) with full metadata (judges, guests, sponsors, schedule, rules, capacity, fees, prize money). Advanced filters: country/state/city/date/art form/event type/organizer/skill level.
2. **Classes & Workshops** — instructors/studios list courses with mode (Online/Offline/Hybrid), batches, seats, fees. Filters: art form, city, instructor, skill level, mode.
3. **Artist Directory & Creative Talent Agency** — global directory of dancers, DJs, MCs, cinematographers, visual artists, etc. Portfolio, achievements, socials, "Book This Artist" flow with human-assisted booking pipeline.

### Content Approval
- Every event, class, artist profile enters as `pending` and requires admin approval to go public.

### Integrations
- **Auth**: JWT (email/password) + Emergent Google Auth (both).
- **Object storage**: Emergent Object Storage for posters, portfolios, images.
- **Payments**: Stripe Flow B (BYOK using `sk_test_emergent`) — MOCKED IN TEST MODE, real Stripe test card `4242 4242 4242 4242` works. Note: Flow A (claimable sandbox) unavailable for country IN — using shared test key. Once you deploy from a supported country you can switch to Flow A.

### User Personas
- Audience — browses events, classes, artists.
- Organizer — creates & manages events.
- Instructor — creates & manages classes.
- Artist — maintains portfolio, receives booking requests.
- Admin (seeded `mitabvishh369@gmail.com`) — approves content, reviews booking requests.

### Implemented (Feb 2026)
- Backend: FastAPI + MongoDB, all `/api/*` routes, admin seeding, JWT + Google auth, uploads, events/classes/artists CRUD, bookings, registrations, admin approval, Stripe checkout + webhook.
- Frontend: Landing (editorial hero, marquee, module bento), Events/Classes/Artists list + detail, Auth (JWT + Google), Dashboard (organizer/instructor/artist), Admin console (approvals + bookings + stats), Payment success/cancel, About.
- Design: Light theme, Oswald + Manrope, warm orange accent, editorial motion.

## Backlog / Next Priorities
- P1: Registration CSV filter presets (paid-only, date range); recurring class batches; sponsor logos with upload
- P2: In-platform messaging between clients & artists; artist reviews & ratings; branded PNG share-card generator (Instagram 1:1); subscription auto-renewal via Stripe subscriptions API
- P2: SEO / sitemap; multi-language (i18n); dark theme toggle for admin
- Ops: Consider tightening CORS from `*` to FRONTEND_URL so cookie login works alongside Bearer.

## Implemented — Phase 2 (Feb 2026)
- 3-tier subscriptions (Viewer ₹30 / Artist ₹99 / Organizer ₹99), 30-day free trial for first sub, auto role-promotion on artist/organizer.
- 6% platform commission on paid registrations (INR); shown at checkout + stored on payment_transactions and registrations.
- Registrations capture participant details (name/email/phone/category/ticket_type/txn ID). Multi-tier ticket_types per event.
- Organizer Registrations dashboard: event selector, search, filter (paid/free/pending), sort, one-click CSV export.
- Event Flyer Gallery: multi-upload, move-up/down reorder, swipeable carousel on event page (1080×1350 recommended).
- Resend transactional emails: registration confirmation, payment success, new-registration-to-organizer, event/class/artist approval, booking received (attendee) + admin alert, subscription active. Managed via EMERGENT_EMAIL_KEY.
- Featured Artists — admin toggle to pin approved artists to top of directory (sorted by featured DESC, then created_at).
- Share assets: WhatsApp / X (Twitter) / Facebook / copy-link buttons on event page + `/api/share/event/{id}` OG endpoint with og:title / og:image / og:url for external previews.
