# AWADH Sports Live — Sports Broadcast & Media Platform

A complete sports broadcasting, live telecast, media-production **and** business-management platform, built from the *Sports Broadcast & Media Platform — Complete Project Plan v1.0*.

It is not just a showcase website: it combines a **public sports-media website** + **customer enquiry/booking system (no login)** + **employee operations portal** + **admin control center**.

---

## Project Overview

- **Name**: AWADH Sports Live (`webapp`)
- **Tagline**: Every sport. Every moment. Live.
- **Goal**: Public sports-media website + booking system without login + employee operations portal + admin control centre, built to grow without redesign.
- **Plan sections implemented**: 4 (public pages), 5 (Live hub), 6 (booking workflow), 7 (employee portal), 8 (production manager), 9 (admin control centre), 10 (event & production mgmt), 11 (database), 13 (API architecture), 14 (RBAC matrix), 17 (UI direction), 18 (security checklist).
- **Contact**: Sector 142, Noida · +91 79854 28973 · info.awadhsports@gmail.com · YouTube [@awadh_sports](https://youtube.com/@awadh_sports.)
- **Design theme**: derived from the AWADH logo — deep black base (`#0d0d11`), red/orange action accent (`#ff3c00`), electric-blue secondary (`#0088ff`).
- **Contact entry**: a floating animated button in the bottom-right corner (not in the navbar).

## Integrated content
- **YouTube channel videos** — the latest broadcasts from the AWADH Sports channel are shown on the **Home**, **Live** and **Gallery** pages; the Live hub also supports a currently-live video and an **Upcoming** list. Managed by admin at `/admin/youtube`.
- **Tournaments & leagues as Portfolio** — the AWADH Sports **YouTube playlists** are used as real proof of work. Each playlist is a competition we produced end-to-end (RPL Delhi NCR, Game Changer League, Neori Premier League, ISCA 2024, ACKO Premier League, Bira 91 Premier League, MPL 3.0, DHCBA, St. Basil, Rockwell, and more). They appear on **`/portfolio`** and on the **Home** page, each linking to its YouTube playlist. Stored in the `youtube_playlists` table; "Featured" ones surface first.
- **About-page team** — Founder, Production Manager and Administrator are listed on `/about`; managed by admin at `/admin/team`.

## What We Do — 8 Services

All eight are distinct deliverables (no repetition). Match **Production** creates the professional live feed; Digital **Streaming** delivers that feed to the online audience — different jobs.

1. **Match Production** — Multi-camera match coverage, live direction, camera switching and production control.
2. **Digital Streaming** — Deliver live matches to audiences through YouTube, Facebook and other digital platforms.
3. **Sports Commentary** — Professional Hindi, English and bilingual commentary to bring every match to life.
4. **Live Scores & Graphics** — Real-time scoreboards, player statistics, team line-ups, match results and on-screen graphics.
5. **Sports Photography** — Professional action shots, player portraits, team photographs and event coverage.
6. **Video Production** — Player interviews, promotional videos, sponsor films, event videos and behind-the-scenes content.
7. **Highlights & Social Content** — Match highlights, best moments, reels, short-form edits and social media-ready content.
8. **Tournament Media & Branding** — Sponsor visibility, tournament promotions, branded content and complete media support.

## URLs

- **Production**: https://0fc78a65-5636-4d4f-800e-f105bddb1b91.vip.gensparksite.com
- **Local preview**: http://localhost:3000
- **Health check**: `/api/health`

## Tech Stack (adapted for Cloudflare edge)

The original plan specified React + Node/Express + PostgreSQL + Socket.IO. Because this deploys to **Cloudflare Pages/Workers**, the stack was adapted feature-for-feature:

| Plan stack | Implemented as |
|---|---|
| React + TypeScript | **Hono JSX** server-rendered pages + **Tailwind CSS** (CDN) |
| Node.js + Express | **Hono** on **Cloudflare Workers** |
| PostgreSQL | **Cloudflare D1** (SQLite), 30 tables |
| JWT + refresh tokens | **Server-side sessions** (DB-backed, HttpOnly cookie) |
| Socket.IO / WebSocket | On-demand fetch / refresh (Workers cannot hold WebSockets) |
| Cloud object storage | Media URLs / R2-ready |

## Data Architecture

- **Storage service**: Cloudflare **D1** (binding `DB`), database `primecast-production`.
- **Schema**: `migrations/0001_initial_schema.sql` — 30 tables:
  `users, customers, employees, attendance, tasks, events, event_team, services, bookings, booking_services, booking_messages, quotations, documents, equipment, equipment_assignments, live_events, media, portfolio, notifications, activity_logs, website_content, otp_codes, sessions, inquiries, leave_requests, issue_reports, task_comments, production_schedule, job_openings, job_applications, role_permissions`.
- **Seed data**: `seed.sql` (services, customers, bookings, quotations, employees, events, live streams, equipment, media, portfolio, jobs, CMS).

## User Guide

### Public website
Home · About · Services · Portfolio · Events (with per-event pages) · **Live hub** · Media Gallery · Contact · Careers · **Book / Request Quote** · **Track Booking**.

### Booking without login (Section 6)
1. Open **/book**, fill contact + event details, tick required services, submit.
2. System returns a **Booking ID** (e.g. `SBM-2026-6Q0L1V`).
3. Open **/track**, enter the Booking ID → an **OTP** is generated.
4. Enter the OTP → see status, customer-visible messages, quotations and documents.

> **Security**: booking details are never shown from the Booking ID alone — **OTP verification is required**. OTPs are hashed at rest, expire in 10 minutes, and are attempt-limited. Internal admin notes are hidden from customers.

### Sign Up / Sign In

The login page is a plain **Sign In** form (no "staff/admin" wording, no role explainer panel). A new visitor registers first; the data is saved, and only then do they sign in.

**1. Sign Up — `/register`**
Fields: full name, email, phone (optional), password, confirm password, organisation (optional).
The account is saved immediately as a **customer** (`users` row with `role='customer'` plus a linked `customers` row), then the visitor is sent to Sign In with a success message.
Validation: required fields, email format, password ≥ 6 chars, passwords match, duplicate emails rejected.

**2. Sign In — `/login`**
Every active role signs in here and is routed automatically to their own workspace.

| Role | Account | Password | Lands on |
|---|---|---|---|
| **Owner Admin (yours)** | **`admin@awadhsports.com`** | **`Awadh@2026`** | `/admin` control centre |
| Demo Admin | `admin@primecast.example` | `Admin@123` | `/admin` control centre |
| Production Manager | `manager@primecast.example` | `Password@123` | `/portal` employee dashboard |
| Employee | `employee@primecast.example` | `Password@123` | `/portal` employee dashboard |
| Customer | `customer@awadhsports.example` | `Admin@123` | `/` the public home page |

> **Your own admin control account** is `admin@awadhsports.com` / `Awadh@2026` — sign in with this to add employees, manage bookings, tasks, attendance and all website content. Change the password any time from **`/profile`**. The remaining `@primecast.example` accounts are demo data only.

**Log in / log out behaviour:** the navbar shows **Sign Up / Sign In** only to visitors who are not signed in. As soon as anyone (customer, employee or admin) is logged in, those buttons are **removed everywhere** (navbar, mobile nav and footer) and replaced by their **user menu · My Profile · Logout**.

### One profile for every user
Whichever role signs in, a full **profile** is created and reachable at **`/profile`** (also in the navbar user menu and the staff sidebar): avatar, name, email, role badge, last login, editable contact details and a **change-password** form.

- **Customer** → lands on the public **home page** and browses the **whole website**; the navbar shows a user menu with **My Profile · My Dashboard (`/account`) · New Booking · Logout**, so they can process bookings, quotations and enquiries.
- **Employee / Manager** → lands on the **employee dashboard** (`/portal`): **attendance check-in / check-out**, **assigned tasks**, **upcoming events**, production schedule, equipment, media upload, issue reports, leave and notifications — plus their own profile.
- **Admin** → lands on the **admin control centre** and sees **everything**.

### Three distinct role experiences (admin · employee · customer)

| Role | What they get after signing in |
|---|---|
| **Customer** | The public **home page + whole website overview**, and a personal dashboard (`/account`) with their bookings, statuses, messages and quotations, profile editing and new booking requests. |
| **Employee** | Their own **employee dashboard** (`/portal`): attendance check-in / check-out, assigned tasks, upcoming events, production schedule, equipment, media, issues, leave, notifications. Cannot reach admin or customer areas. |
| **Admin** | **Full control of the platform**: view/update bookings, manage customers, create employee accounts (email + password), assign tasks, **track attendance**, manage events & live control, **view all accounts and logins**, and change website content (services, live events, latest YouTube matches, photos/media, About team). |

Role access is enforced **server-side** on every protected route, so a customer cannot open `/admin` or `/portal` and an employee cannot open `/admin` or `/account`.

### Admin visibility into every account
- **`/admin/users` — Users & Logins**: counts of **customer / employee / admin accounts**, how many signed in **today** and in the **last 7 days**, a filterable list of every account with role + last-login + status, and a **recent login activity** feed (logins, sign-ups, logouts).
- **`/admin` dashboard**: an *Accounts & logins* row (customer accounts, employee accounts, admin accounts, logged in today, active last 7 days) sits beside the booking/event/employee KPIs.
- **`/admin/attendance` — Attendance Tracking**: pick any date to see who checked in/out, per-employee **month present / late / absent** summary, and **Export CSV**.

- **Customer dashboard** (`/account`): signed-in customers see their bookings, statuses, message/quote counts and can update their profile (`/account/profile`) — and still browse the whole public website and create new bookings.
- **Employee portal** (`/portal`): dashboard, attendance (check-in/out), my tasks, my events, production schedule, equipment, media upload, issue reports, leave, notifications.
- **Admin control centre** (`/admin`): dashboard, bookings, customers, employees, roles & permissions, events, live control, tasks/production, equipment, media, **YouTube videos**, **Team & About**, portfolio/services, reports, notifications, CMS, activity logs, settings.
- **Admin → Employees**: create an employee account with **any email + password**; the person then signs in at `/login` and reaches their own portal. Admin can deactivate/reactivate any account and retains full control.
- **Admin → YouTube Videos**: add videos by URL or ID (title + thumbnail auto-fetched), mark one as **Live** or **Upcoming**, hide/delete — controlling what appears on the Live hub, Gallery and Home.
- **Admin → Team & About**: manage the About-page team members (Founder, Production Manager, Administrator …).
- **Production Manager**: event/team/production access; blocked from CMS, settings and employee management (enforced server-side per the Section 14 matrix).

## Functional Entry URIs

| Area | Paths |
|---|---|
| Public | `/`, `/about`, `/services`, `/portfolio`, `/events`, `/events/:id`, `/live`, `/gallery`, `/contact`, `/careers`, `/book`, `/track` |
| Auth | `/register` (GET/POST), `/login` (GET/POST), `/logout` (POST) |
| Profile (all roles) | `/profile` (GET/POST), `/profile/password` (POST) |
| Customer | `/account`, `/account/profile` |
| Employee dashboard | `/portal`, `/portal/attendance`, `/portal/tasks`, `/portal/events`, `/portal/schedule`, `/portal/equipment`, `/portal/media`, `/portal/issues`, `/portal/leave`, `/portal/notifications` |
| Admin | `/admin`, `/admin/bookings`, `/admin/bookings/:id`, `/admin/customers`, `/admin/users`, `/admin/employees`, `/admin/attendance`, `/admin/attendance/export`, `/admin/roles`, `/admin/events`, `/admin/events/:id`, `/admin/live`, `/admin/tasks`, `/admin/equipment`, `/admin/media`, `/admin/youtube`, `/admin/team`, `/admin/portfolio`, `/admin/reports`, `/admin/notifications`, `/admin/cms`, `/admin/logs`, `/admin/settings` |
| Public API | `POST /api/bookings`, `POST /api/bookings/track/request-otp`, `POST /api/bookings/track/verify`, `POST /api/contact`, `POST /api/careers/apply` |
| Staff API | `POST /api/attendance/checkin`, `/checkout`, `POST /api/tasks/:id/status`, `POST /api/notifications/read-all`, `GET /api/health` |

## Security (Section 18)

- Passwords hashed with **PBKDF2-SHA256** (100k iterations, per-user salt) — never plaintext.
- Server-side **authorization on every protected route** (session guard + module RBAC guard).
- **Rate limiting** on login, booking, OTP request and OTP verify endpoints.
- OTPs **hashed at rest**, expire in 10 minutes, max 5 attempts, invalidated on reuse.
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- **Activity logs** record key admin actions; secrets belong in environment variables.

## Not Yet Implemented (per plan → Future enhancements)

- Payments / invoices, automated CRM workflows.
- Email / SMS / WhatsApp delivery of OTPs and notifications (provider integration). *Currently the OTP is surfaced in the UI as a demo code because no provider is configured.*
- Automatic YouTube sync (videos are added by admin from `/admin/youtube`; the title is auto-fetched from YouTube on add).
- Advanced analytics / forecasting dashboards, PWA/mobile app.

## Deployment

- **Platform**: Cloudflare Pages / Workers (Genspark Hosted Deploy).
- **Status**: ✅ Live & verified (redeployed 2026-09-27 via Genspark Hosted Deploy).
- **Last Updated**: 2026-09-27

## Local Development

```bash
npm run build                     # build to dist/
npm run db:migrate:local          # apply D1 migrations
npm run db:seed                   # load demo data
pm2 start ecosystem.config.cjs    # serve on :3000
```

Regenerate demo password hashes: `node scripts/hash-passwords.mjs`.
