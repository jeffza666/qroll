# QRoll

QRoll is a classroom attendance app for Thammasat University. A teacher opens a class session and puts a QR code on the projector. Students check in from their phones. The server decides whether the check-in counts, using the session token, enrollment, GPS geofence, and an optional face match.

The interface is Thai. The project is a portfolio piece for junior frontend and full-stack roles: Next.js App Router, server actions, Auth.js, Prisma, and a Postgres database.

There are no screenshots in this repository. The hosted app is the visual reference.

## Features

- Sign in with the Thammasat University API. Students and teachers are separate roles.
- Courses with sections, weekly schedules, rosters, and archiving.
- Roster import from CSV or Excel, plus manual add, edit, and drop.
- A live session with a QR code and a 6-digit backup code.
- Check-in rules enforced on the server: open session, active enrollment, one row per student, late cutoff, optional GPS radius, optional face match.
- Teacher home with today's classes, a latest-session summary, and courses whose attendance has dropped below 80%.
- Course report with an attendance matrix, risk groups, and a CSV export that marks a missed closed session as absent.
- Student home with an attendance rate for each course, and a course page that lists missed sessions as well as check-ins.
- A public demo check-in that writes to its own table, separate from real attendance.

## Tech stack

- Next.js 15 (App Router) and React 19
- TypeScript
- Tailwind CSS 4
- Prisma and PostgreSQL (designed for Supabase)
- Auth.js / NextAuth v5 with the Credentials provider
- Zod
- QR rendering and scanning (`qrcode`, `html5-qrcode`)
- Face embeddings with `@vladmandic/human` (the original photo is not stored)

## Try the hosted app

- App: [https://q-roll-nu.vercel.app](https://q-roll-nu.vercel.app)
- Demo check-in: [https://q-roll-nu.vercel.app/demo/checkin](https://q-roll-nu.vercel.app/demo/checkin)

The home page asks for a Thammasat account. `/demo/checkin` is public and does not require login. On the current deployment, demo mode is off, so that page explains how to turn it on. When `DEMO_CHECKIN_ENABLED=true`, a visitor types a display name after scanning the session QR. Those rows are demo data only.

## Local setup

Requirements: Node.js 22+, and a Postgres database you control. Do not point this setup at a production database.

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from the template and fill in your own database and Auth.js secret:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres URL used by the app |
| `DIRECT_URL` | Direct Postgres URL used by Prisma migrations |
| `NEXTAUTH_URL` | App URL, `http://localhost:3000` locally |
| `NEXTAUTH_SECRET` | Random secret, `openssl rand -base64 32` |
| `BYPASS_TU_AUTH` | `true` only on your machine, so seed users can sign in without the TU API |
| `DEMO_CHECKIN_ENABLED` | `true` to try `/demo/checkin` |
| `ENABLE_FACE_SEED` | `true` only for local face-enrollment experiments |
| `TU_API_URL` / `TU_API_KEY` | Required for real Thammasat logins |

`BYPASS_TU_AUTH` and `ENABLE_FACE_SEED` are refused when the app is running as a production deployment. Leave both `false` anywhere real students check in.

3. Apply the existing Prisma migrations to your own database, generate the client, and seed local users:

```bash
npx prisma migrate dev
npx prisma db seed
```

Seed accounts, with any password while bypass is on:

- Teacher: `teacher@tu.ac.th`
- Student: `6500000001` or `test.student@dome.tu.ac.th`

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sample roster files live in `sample-imports/`.

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```

`npm test` runs the Node.js test runner against the attendance math, Bangkok dates, redirect checks, geofence distance, face distance, roster parsing, email domain checks, and CSV export. It does not connect to a database.
