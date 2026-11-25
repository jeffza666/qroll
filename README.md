# QRoll

A classroom attendance web app that combines university credential verification,
QR check-in, location checks, and face verification. Teachers can manage courses
and review attendance; students can check in and view their history.

**Status:** University project with implemented teacher and student workflows.
Face enrollment uses a development/demo tool that simulates a university photo
registry; automatic synchronization with an official TU photo service is not
implemented.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 15 App Router, React 19 |
| Language and styling | TypeScript, Tailwind CSS 4 |
| Database | PostgreSQL on Supabase, Prisma 5 |
| Authentication | Auth.js / NextAuth v5 Credentials Provider, JWT sessions |
| Validation | Zod |
| Face processing | Human (`@vladmandic/human`), browser camera |
| QR and roster tools | `qrcode`, `html5-qrcode`, Papa Parse, SheetJS |

## Implemented features

- **University login:** Verify credentials through the TU API and authorize
  teacher/student actions on the server.
- **Course management:** Manage courses, schedules, student rosters, and CSV/XLSX
  roster imports; archive courses while preserving attendance history.
- **Attendance sessions:** Open sessions with a QR token and entry code, a
  check-in window, and an optional late-arrival grace period. Each open session
  uses a fixed token/code, which is cleared when the session closes. Dropped
  students cannot check in, and the entry code only resolves for enrolled
  students.
- **Location verification:** Calculate Haversine distance on the server when a
  classroom anchor is configured; check GPS accuracy before accepting check-in.
- **Face verification:** Extract face descriptors in the browser with passive
  and head-turn liveness checks; compare the submitted descriptor with the
  enrolled descriptor on the server.
- **Attendance rates:** Show each student's rate per course, and list courses
  below 80% on the teacher home. The teacher home and the course report use the
  same calculation.
- **Reports:** View course/session attendance, update attendance statuses, export
  reports to CSV, and let students view their own history.

## Design decisions and limitations

- A closed session with no check-in counts as absent. Sessions that started
  before a student was added to the course are left out of that student's rate.
  Late counts as half, and excused sessions are not counted.
- A session that is still open does not count toward the rate yet. Students
  still see their own check-in for it right away.
- Student GPS coordinates are processed for verification but are not persisted.
  Attendance records store computed distance and accuracy metrics; classroom
  anchor coordinates are stored separately.
- Face enrollment stores a descriptor and enrollment timestamp rather than the
  uploaded image. Face verification currently applies to students with enrolled
  descriptors; students without one skip this step.
- Demo check-ins are stored separately from academic attendance and excluded
  from attendance reports.
- Location and face checks add verification layers, but device accuracy, camera
  conditions, and biometric matching can affect results. Production use would
  require broader validation and a complete enrollment process.

Known gaps are listed in [docs/notes/known-limitations.md](docs/notes/known-limitations.md).

## Screenshots

> **TODO — Teacher session:** Add a screenshot of an open session showing its QR
> code and entry code, using a fictional course and roster.

<!-- When ready: ![Teacher attendance session](docs/images/teacher-session.png) -->

> **TODO — Student verification:** Add a mobile screenshot of the face-scan step
> or successful check-in. Use a consenting demo participant and fictional data.

<!-- When ready: ![Student verification](docs/images/student-checkin.png) -->

> **TODO — Attendance report:** Add a course/session report screenshot showing
> attendance statuses and location indicators with fictional students.

<!-- When ready: ![Attendance report](docs/images/attendance-report.png) -->

Create `docs/images/` when adding images, then replace each TODO with its image
link.

## Try the hosted app

- App: [https://q-roll-nu.vercel.app](https://q-roll-nu.vercel.app)
- Demo check-in: [https://q-roll-nu.vercel.app/demo/checkin](https://q-roll-nu.vercel.app/demo/checkin)

The app asks for a Thammasat account. `/demo/checkin` is public; it only accepts
check-ins when `DEMO_CHECKIN_ENABLED=true` on the deployment.

## Run locally

Requirements: Node.js 22.6+ (needed by `npm test`), npm, and a development
PostgreSQL database. TU API access is needed for real credential verification.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env` and fill in the values below. Use a development
   database and keep real credentials out of version control.

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | Pooled Postgres URL used by the app |
   | `DIRECT_URL` | Direct Postgres URL used by Prisma migrations |
   | `NEXTAUTH_URL` | App URL, `http://localhost:3000` locally |
   | `NEXTAUTH_SECRET` | Random secret, e.g. `openssl rand -base64 32` |
   | `TU_API_URL` / `TU_API_KEY` | Required for real Thammasat logins |
   | `BYPASS_TU_AUTH` | `true` only on your machine, so seed users can sign in without the TU API |
   | `DEMO_CHECKIN_ENABLED` | `true` to try `/demo/checkin` |
   | `ENABLE_FACE_SEED` | `true` only for local face-enrollment experiments |

   Next.js also reads `.env.local` and gives it precedence over `.env`, but the
   Prisma CLI only reads `.env`. Keep `DATABASE_URL` and `DIRECT_URL` the same in
   both files if you use `.env.local`.

3. Generate Prisma Client, apply the committed migrations, and start the app:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npm run dev
   ```

Open http://localhost:3000. Camera and location access require a secure browser
context; use HTTPS when testing from a phone on another host.

For local demo accounts, inspect `prisma/seed.ts` before running
`npx prisma db seed`. With `BYPASS_TU_AUTH=true`, any password works for
`teacher@tu.ac.th` and student `6500000001`. `BYPASS_TU_AUTH` and
`ENABLE_FACE_SEED` are refused on a production deployment. Sample roster files
are in `sample-imports/`.

## Verification

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm test` uses the Node.js test runner for the attendance math, Bangkok dates,
redirect checks, geofence and face distance, roster parsing, email domain checks,
and CSV export. It does not connect to a database.

For manual checks, test teacher/student authorization, roster import, valid and
expired sessions, duplicate check-ins, location rejection, face match/mismatch,
students without an enrolled face, and attendance reports.

## Technical references

- [Security model](docs/prps/00-security-model.md)
- [Database schema](prisma/schema.prisma)
- [Geofencing design](docs/prps/08-geofence.md)
- [Face verification design](docs/prps/09-face-scan.md)
- [Known limitations](docs/notes/known-limitations.md)

Design documents capture decisions made during development; current source code
is the reference for implemented behavior.
