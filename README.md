# PrimeCast — Sports Broadcast & Media Platform

A complete sports broadcasting, live telecast, media-production **and** business-management platform, built from the *Sports Broadcast & Media Platform — Complete Project Plan v1.0*.

It is not just a showcase website: it combines a **public sports-media website** + **customer enquiry/booking system (no login)** + **employee operations portal** + **admin control center**.

---

## Project Overview

- **Name**: PrimeCast Sports Media Platform (`webapp`)
- **Goal**: Public sports-media website + booking system without login + employee operations portal + admin control centre, built to grow without redesign.
- **Plan sections implemented**: 4 (public pages), 5 (Live hub), 6 (booking workflow), 7 (employee portal), 8 (production manager), 9 (admin control centre), 10 (event & production mgmt), 11 (database), 13 (API architecture), 14 (RBAC matrix), 17 (UI direction), 18 (security checklist).

## URLs

- **Production**: _(set after Hosted Deploy)_
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

### Staff / Admin portal
Sign in at **/login**.

| Role | Demo account | Password |
|---|---|---|
| Admin | `admin@primecast.example` | `Admin@123` |
| Production Manager | `manager@primecast.example` | `Password@123` |
| Employee | `employee@primecast.example` | `Password@123` |

- **Employee portal** (`/portal`): dashboard, attendance (check-in/out), my tasks, my events, production schedule, equipment, media upload, issue reports, leave, notifications.
- **Admin control centre** (`/admin`): dashboard, bookings, customers, employees, roles & permissions, events, live control, tasks/production, equipment, media, portfolio/services, reports, notifications, CMS, activity logs, settings.
- **Production Manager**: event/team/production access; blocked from CMS, settings and employee management (enforced server-side per the Section 14 matrix).

## Functional Entry URIs

| Area | Paths |
|---|---|
| Public | `/`, `/about`, `/services`, `/portfolio`, `/events`, `/events/:id`, `/live`, `/gallery`, `/contact`, `/careers`, `/book`, `/track` |
| Auth | `/login` (POST), `/logout` (POST) |
| Employee portal | `/portal`, `/portal/attendance`, `/portal/tasks`, `/portal/events`, `/portal/schedule`, `/portal/equipment`, `/portal/media`, `/portal/issues`, `/portal/leave`, `/portal/notifications` |
| Admin | `/admin`, `/admin/bookings`, `/admin/bookings/:id`, `/admin/customers`, `/admin/employees`, `/admin/roles`, `/admin/events`, `/admin/events/:id`, `/admin/live`, `/admin/tasks`, `/admin/equipment`, `/admin/media`, `/admin/portfolio`, `/admin/reports`, `/admin/notifications`, `/admin/cms`, `/admin/logs`, `/admin/settings` |
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
- Automated YouTube/platform channel API integration for latest-video retrieval.
- Advanced analytics / forecasting dashboards, PWA/mobile app.

## Deployment

- **Platform**: Cloudflare Pages / Workers (Genspark Hosted Deploy).
- **Status**: code complete, locally built & tested.
- **Last Updated**: 2026-09-17

## Local Development

```bash
npm run build                     # build to dist/
npm run db:migrate:local          # apply D1 migrations
npm run db:seed                   # load demo data
pm2 start ecosystem.config.cjs    # serve on :3000
```

Regenerate demo password hashes: `node scripts/hash-passwords.mjs`.
