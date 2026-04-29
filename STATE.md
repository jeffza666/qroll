# STATE.md — Qroll Handoff Tracker

> ต้องอ่านไฟล์นี้หลัง `INSTRUCTIONS.md` ทุกครั้ง เพื่อรู้ว่าโปรเจกต์ทำถึงไหนแล้ว  
> อัปเดตทุกครั้งที่จบงาน เพื่อไม่ให้ session ถัดไปหลงทาง

---

## Current Status

**Phase:** `Phase 4.5 — Student Check-in Flow` ✅ **IMPLEMENTED**
**Last updated:** 2026-04-29

Phase 4.5 now has real student QR check-in and separated public demo check-in. Real flow writes `Attendance` only after login + enrollment check. Demo flow writes to `DemoCheckIn` through `/demo/checkin` and is controlled by `DEMO_CHECKIN_ENABLED`.

---

## Next Step

### Phase 5 — Teacher Dashboard + Reports

งานถัดไปคือ dashboard ฝั่งอาจารย์แบบ live/historical:

1. สรุป attendance ต่อ session/course
2. ดูรายชื่อนักศึกษาที่มา/สาย/ขาด
3. แยกข้อมูล demo ออกจากรายงานจริง
4. เตรียมพื้นฐาน export/report ใน Phase 6

---

## Phase Roadmap

| Phase | Goal                                                   | Status         |
| ----- | ------------------------------------------------------ | -------------- |
| 0     | Setup project + Context Architecture                   | ✅ Done        |
| 1     | Database (Prisma + Supabase + schema)                  | ✅ Done        |
| 2     | Auth via TU API (NextAuth v5)                          | ✅ Done        |
| 3     | Teacher: AppShell + Courses + Roster import (CSV/XLSX) | ✅ Done        |
| 3.5   | Teacher: Schedule + ClassSession lifecycle             | ✅ Done        |
| 4     | Teacher: Dynamic QR Display (rotate 30s + fullscreen)  | ✅ Done        |
| 4.5   | Student: Login + Scan QR + Check-in                    | ✅ Done        |
| 5     | Teacher: Live + Historical Dashboard                   | ⏳ Pending     |
| 6     | Geofence + Manual Edit + Export                        | ⏳ Pending     |
| 7     | Face Scan + Email notify                               | ⏳ Pending     |

---

## PRP Index

| File                                 | Topic                                      | Status     |
| ------------------------------------ | ------------------------------------------ | ---------- |
| `docs/prps/00-security-model.md`     | Security Model                             | ✅ Done    |
| `docs/prps/01-database-schema.md`    | Database Schema                            | ✅ Done    |
| `docs/prps/02-auth-tu-api.md`        | NextAuth v5 + TU API custom provider       | ✅ Done    |
| `docs/prps/03-teacher-courses.md`    | Teacher Courses + Roster import            | ✅ Done    |
| `docs/prps/03.5-schedule-session.md` | Schedule + ClassSession lifecycle          | ✅ Done    |
| `docs/prps/04-dynamic-qr.md`         | Dynamic QR Display                         | ✅ Done    |
| `docs/prps/05-checkin-flow.md`       | Student check-in flow                      | ✅ Approved |
| `docs/prps/06-teacher-dashboard.md`  | Teacher dashboard + reports                | ⏳ Pending |

---

## Completed Work

### Phase 0 — Project Setup

| # | Task                                      | Status | Note                              |
| - | ----------------------------------------- | ------ | --------------------------------- |
| 1 | Create Next.js project                    | ✅     | App Router                        |
| 2 | Create `INSTRUCTIONS.md`                  | ✅     | Project constitution              |
| 3 | Downgrade Next.js 16.2.4 → 15.5.15        | ✅     | Stability + community support     |
| 4 | Fix ESLint config for Next 15             | ✅     | ESM resolver                      |
| 5 | Verify build                              | ✅     | `npm run build` passed            |
| 6 | Create context architecture               | ✅     | `STATE.md`, `docs/prps/`          |
| 7 | Write PRP 01                              | ✅     | Database schema blueprint         |

### Phase 1 — Database

| # | Task                                      | Status | Note                              |
| - | ----------------------------------------- | ------ | --------------------------------- |
| 1 | Create Supabase project                   | ✅     | Singapore region                  |
| 2 | Install Prisma 5.22 + server-only         | ✅     | Downgraded from Prisma 7          |
| 3 | Create Prisma schema                      | ✅     | Domain + NextAuth models          |
| 4 | Create `.env.local` + `.env`              | ✅     | Both gitignored                   |
| 5 | Run initial migration                     | ✅     | Supabase synced                   |
| 6 | Create `src/lib/db.ts`                    | ✅     | Prisma singleton                  |
| 7 | Create seed script                        | ✅     | Teacher + student seed users      |
| 8 | Verify build                              | ✅     | Passed                            |

### Phase 2 — Auth via TU API

| # | Task                                      | Status | Note                              |
| - | ----------------------------------------- | ------ | --------------------------------- |
| 1 | Write PRP 02                              | ✅     | `docs/prps/02-auth-tu-api.md`     |
| 2 | Install NextAuth v5 beta + Zod + icons    | ✅     | Auth + validation                 |
| 3 | Create Credentials provider               | ✅     | BYPASS mode + TU API contract     |
| 4 | Create auth helpers                       | ✅     | `requireAuth`, role guards        |
| 5 | Create middleware auth gate               | ✅     | Redirect to login                 |
| 6 | Create login UI                           | ✅     | Server shell + client form        |
| 7 | Update env template                       | ✅     | TU + NextAuth vars                |
| 8 | Verify build + BYPASS smoke test          | ✅     | Passed                            |

### Phase 3 — Teacher Courses + Roster

| #  | Task                                     | Status | Note                              |
| -- | ---------------------------------------- | ------ | --------------------------------- |
| 1  | Write PRP 03                             | ✅     | `docs/prps/03-teacher-courses.md` |
| 2  | Install `xlsx`, `papaparse`, `qrcode`    | ✅     | QR package installed early        |
| 3  | Add QRoll brand tokens + Sarabun font     | ✅     | Tailwind v4 theme tokens          |
| 4  | Root role-based redirect                 | ✅     | Teacher/student routing           |
| 5  | AppShell                                 | ✅     | Sidebar + user card               |
| 6  | Nav config                               | ✅     | Role-aware links                  |
| 7  | Teacher dashboard                        | ✅     | DB-backed stats                   |
| 8  | Course list + create form                | ✅     | `/teacher/courses`                |
| 9  | Course detail + roster table             | ✅     | `/teacher/courses/[id]`           |
| 10 | Settings stub                            | ✅     | `/teacher/settings`               |
| 11 | Course actions                           | ✅     | create/delete                     |
| 12 | Roster import action                     | ✅     | CSV + XLSX                        |
| 13 | Roster import modal                      | ✅     | Summary UI                        |
| 14 | `requireCourseOwner`                     | ✅     | Ownership guard                   |
| 15 | Verify build                             | ✅     | Passed                            |

### Phase 3.5 — Schedule + ClassSession Lifecycle

| #  | Task                                     | Status | Note                              |
| -- | ---------------------------------------- | ------ | --------------------------------- |
| 1  | Write PRP 03.5                           | ✅     | Schedule/session plan             |
| 2  | Add `Schedule` model + migration          | ✅     | Weekly recurring schedule         |
| 3  | Add partial unique index                 | ✅     | One open session per course       |
| 4  | Add schedule validation                  | ✅     | Zod schema                        |
| 5  | Add schedule actions                     | ✅     | create/delete                     |
| 6  | Add session actions                      | ✅     | open/close                        |
| 7  | Add lazy auto-close helper               | ✅     | `endsAt + 30min`                  |
| 8  | Add Schedule tab in course detail         | ✅     | `?tab=schedule`                   |
| 9  | Add today schedule on dashboard           | ✅     | Bangkok timezone                  |
| 10 | Add session page skeleton                | ✅     | Placeholder before Phase 4        |
| 11 | Verify build                             | ✅     | Passed                            |

### Phase 4 — Dynamic QR Display

| # | Task                                      | Status | Note                              |
| - | ----------------------------------------- | ------ | --------------------------------- |
| 1 | Review PRP 04                             | ✅     | `docs/prps/04-dynamic-qr.md`      |
| 2 | Add schema fields + migration             | ✅     | `phase4_dynamic_qr`               |
| 3 | Generate initial token in `openSession`   | ✅     | QR token + entry code + lateAfter |
| 4 | Add token cleanup on close/auto-close     | ✅     | Null token/code fields            |
| 5 | Add QR helpers                            | ✅     | config/token/rotate/verify        |
| 6 | Add QR polling Route Handler              | ✅     | `/api/sessions/[id]/qr`           |
| 7 | Build real session UI                     | ✅     | QR, countdown, code, fullscreen   |
| 8 | Add checked-in sidebar skeleton           | ✅     | For Phase 4.5 live feed later     |
| 9 | Verify build                              | ✅     | `npm.cmd run build` passed        |

### Phase 4.5 — Student Check-in Flow

| # | Task                                      | Status | Note                              |
| - | ----------------------------------------- | ------ | --------------------------------- |
| 1 | Write/approve PRP 05                      | ✅     | real + separated demo scope       |
| 2 | Add `DemoCheckIn` schema + migration      | ✅     | `phase45_checkin_flow` applied    |
| 3 | Add real check-in Server Action           | ✅     | auth + enrollment + server time   |
| 4 | Add demo check-in Server Action           | ✅     | writes only to `DemoCheckIn`      |
| 5 | Add `/checkin?t=<token>` mobile page      | ✅     | student identity from login       |
| 6 | Add `/demo/checkin?t=<token>` mobile page | ✅     | guarded by env flag               |
| 7 | Preserve query string through login       | ✅     | middleware uses path + search     |
| 8 | Wire teacher session live sidebar         | ✅     | real/demo lists separated         |
| 9 | Add student dashboard/course/history pages| ✅     | keeps student nav usable          |
| 10 | Verify build                             | ✅     | `npm.cmd run build` passed        |

---

## Important Files

### Phase 3.5 Files

- `prisma/migrations/20260429050626_phase35_schedule_session/migration.sql`
- `src/lib/validations/schedule.ts`
- `src/app/actions/schedule.ts`
- `src/app/actions/session.ts`
- `src/lib/session-helpers.ts`
- `src/components/courses/ScheduleForm.tsx`
- `src/components/courses/ScheduleDeleteButton.tsx`
- `src/components/courses/OpenSessionButton.tsx`
- `src/components/courses/CloseSessionButton.tsx`
- `src/app/(app)/teacher/sessions/[id]/page.tsx`

### Phase 4 Files

- `prisma/migrations/20260429060250_phase4_dynamic_qr/migration.sql`
- `src/lib/qr-config.ts`
- `src/lib/qr-token.ts`
- `src/lib/qr-rotate.ts`
- `src/lib/qr-verify.ts`
- `src/app/api/sessions/[id]/qr/route.ts`
- `src/components/sessions/SessionView.tsx`
- `src/components/sessions/QrDisplay.tsx`
- `src/components/sessions/EntryCodeCard.tsx`
- `src/components/sessions/FullscreenButton.tsx`
- `src/components/sessions/CheckedInSidebar.tsx`

### Phase 4.5 Files

- `docs/prps/05-checkin-flow.md`
- `prisma/migrations/20260429072441_phase45_checkin_flow/migration.sql`
- `src/lib/checkin.ts`
- `src/lib/validations/checkin.ts`
- `src/app/actions/checkin.ts`
- `src/app/checkin/page.tsx`
- `src/app/demo/checkin/page.tsx`
- `src/app/api/sessions/[id]/checkins/route.ts`
- `src/components/checkin/CheckInShell.tsx`
- `src/components/checkin/SessionSummary.tsx`
- `src/components/checkin/StudentCheckInForm.tsx`
- `src/components/checkin/DemoCheckInForm.tsx`
- `src/components/checkin/StatusPanel.tsx`
- `src/app/(app)/student/page.tsx`
- `src/app/(app)/student/courses/page.tsx`
- `src/app/(app)/student/history/page.tsx`

---

## Decision Log

### 2026-04-29 — Phase 4.5 Student Check-in + Demo Mode

- **Decision:** Real student check-in uses logged-in Auth.js identity only; no student name picker.
- **Why:** Login proves the person, QR proves the session, and `Enrollment` proves permission to check in.
- **Decision:** Public showcase check-in uses `/demo/checkin?t=<token>` and writes to `DemoCheckIn`.
- **Why:** Visitors can try the product with phones while real `Attendance`, `User`, and `Enrollment` data stays clean.
- **Decision:** Demo mode is controlled by `DEMO_CHECKIN_ENABLED`.
- **Why:** The feature can be enabled for showcase and disabled for real production use without deleting code.
- **Decision:** Teacher session sidebar shows real attendance and demo check-ins in separate sections.
- **Why:** Good for presentation, but still keeps the meaning of academic attendance clear.

### 2026-04-29 — Phase 4 Dynamic QR Rotation

- **Decision:** ใช้ client polling ทุก 30 วินาทีผ่าน `/api/sessions/[id]/qr`
- **Why:** เหมาะกับ MVP และ Vercel serverless มากกว่า SSE/WebSocket ดูแลง่ายและ debug ง่าย
- **Decision:** ใช้ DB-backed opaque token 32-byte แทน JWT
- **Why:** token ไม่มี metadata, revoke ได้ทันที, และ DB เป็น source of truth สำหรับ Phase 4.5
- **Decision:** เก็บ previous token 1 รอบ (`qrPrevToken`)
- **Why:** ลดปัญหานักศึกษาสแกนตอน QR เพิ่ง rotate โดยยอมรับ window รวมประมาณ 60 วินาที
- **Decision:** มี entry code 6 หลักเป็น fallback
- **Why:** ใช้ได้เมื่อกล้องเสียหรือสแกน QR ไม่ได้ และยังหมดอายุตาม server
- **Decision:** ไม่ทำ Pause/Resume ใน v1
- **Why:** ลด schema และ edge case; workaround คือปิด session แล้วเปิดใหม่

### 2026-04-29 — Phase 3.5 Schedule + Session

- **Decision:** Schedule เป็น recurring weekly (`dayOfWeek`, `startTime`, `endTime`)
- **Why:** เข้าใจง่ายสำหรับ final project และพอสำหรับ MVP
- **Decision:** `ClassSession.scheduleId` เป็น required
- **Why:** ไม่ให้มี orphan session ที่ย้อนหา slot ไม่ได้
- **Decision:** เปิด session ด้วย manual button เท่านั้น
- **Why:** ไม่ต้องใช้ cron/background worker
- **Decision:** auto-close แบบ lazy ที่ `endsAt + 30min`
- **Why:** ปลอดภัยกว่าเปิดค้างตลอด และไม่ต้องมี worker
- **Decision:** ใช้ partial unique index `WHERE isOpen=true`
- **Why:** กันเปิด session ซ้อนใน course เดียวกันที่ระดับ DB

### 2026-04-29 — Roster Import Parsing

- **Decision:** ใช้ `xlsx` สำหรับ Excel และ `papaparse` สำหรับ CSV ฝั่ง server เท่านั้น
- **Why:** ลด client bundle และให้ validation/ownership อยู่ฝั่ง server

### 2026-04-29 — Course Ownership Helper

- **Decision:** รวม `requireCourseOwner(courseId)` ไว้ใน `src/lib/auth-helpers.ts`
- **Why:** ownership check อยู่ที่เดียว ถ้าวันหลังมี co-teacher จะแก้จุดเดียว

### 2026-04-28 — JWT Session Strategy

- **Decision:** ใช้ NextAuth v5 Credentials provider + JWT session strategy โดยยังไม่ใช้ PrismaAdapter
- **Why:** Phase 2 ต้องการ claims สั้น ๆ ใน middleware และลด moving parts

### 2026-04-28 — TU Login Upsert

- **Decision:** Real TU login upsert user แต่ไม่ update role ของ user เดิม
- **Why:** ป้องกัน privilege drift จากข้อมูลภายนอกหรือ mapping ผิด

### 2026-04-28 — Two Env Files

- **Decision:** ใช้ทั้ง `.env.local` และ `.env`
- **Why:** Next.js อ่าน `.env.local` ได้ แต่ Prisma 5 CLI อ่าน `.env` เป็นหลัก

### 2026-04-28 — Prisma Version Pin

- **Decision:** ใช้ Prisma 5.22.0 แทน Prisma 7
- **Why:** Prisma 7 เปลี่ยน architecture ใหญ่และเสี่ยงเกินไปสำหรับ final project MVP

### 2026-04-27 — Auth Strategy

- **Decision:** ใช้ TU API จริงผ่าน NextAuth v5 Custom Credentials provider
- **Why:** Dome email เป็น source of truth ของนักศึกษา TU

### 2026-04-27 — Schema Naming

- **Decision:** ใช้ `ClassSession` แทน `Session`
- **Why:** ไม่ชนกับ NextAuth `Session`

### 2026-04-27 — Stack Version Pin

- **Decision:** ใช้ Next.js 15.5.15, React 19, Tailwind v4
- **Why:** Next 15 stable กว่า Next 16 สำหรับโปรเจกต์จบและ community examples มีเยอะกว่า

---

## Blockers / Open Questions

ไม่มี blocker ตอนนี้

สิ่งที่ต้องเช็กก่อนเริ่ม Phase 5:

- Test real check-in manually with an enrolled student before demo day.
- Set `DEMO_CHECKIN_ENABLED=true` in local/showcase env when public demo mode is needed.
- Phase 5 reports must exclude `DemoCheckIn` from real attendance metrics.

---

## Dev Notes

### Commands

```bash
npm run dev
npm run build
npx prisma migrate dev --name <name>
npx prisma studio
npx prisma generate
```

### Dev Login

- Teacher: `teacher@tu.ac.th`
- Student: `test.student@dome.tu.ac.th`
- Student ID: `0000000001`
- ใช้กับ `BYPASS_TU_AUTH=true` ใน `.env.local`

### Installed Stack

- Next.js `15.5.15`
- React `19.2.4`
- Tailwind CSS v4
- Prisma `5.22.0`
- NextAuth v5 beta
- Zod
- lucide-react
- `xlsx`
- `papaparse`
- `qrcode`

### Latest Verification

- `npx.cmd prisma migrate dev --name phase4_dynamic_qr` ✅
- `npx.cmd prisma migrate dev --name phase45_checkin_flow` ✅
- `npx.cmd prisma generate` ✅
- `npm.cmd run build` ✅
