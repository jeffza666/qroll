# STATE.md — Qroll Handoff Tracker

> ต้องอ่านไฟล์นี้หลัง `INSTRUCTIONS.md` ทุกครั้ง เพื่อรู้ว่าโปรเจกต์ทำถึงไหนแล้ว  
> อัปเดตทุกครั้งที่จบงาน เพื่อไม่ให้ session ถัดไปหลงทาง

---

## Current Status

**Phase:** `Phase 4.6 — Roster + Session Overhaul` ✅ **IMPLEMENTED**
**Next:** `Phase 5 — Teacher Dashboard + Reports`
**Last updated:** 2026-05-05

Phase 4.6 ทำเสร็จแล้วและเป็นรอบ overhaul ให้ระบบตรงกับ workflow จริงมากขึ้น: roster import เปลี่ยนจาก email-based เป็น `studentId`-based, รองรับไฟล์จริงที่มีแค่เลขทะเบียน/ชื่อและ metadata rows ก่อน header, `User.email` เป็น nullable สำหรับนักศึกษาที่ pre-import ไว้, import/manual add ไม่ overwrite user เดิม และมี dialog เพิ่มนักศึกษาทีละคนข้างปุ่ม Import บน roster tab แล้ว ฝั่ง auth ใช้ TU API `type` เป็น source of truth สำหรับ role, email domain เป็น sanity check เสริม, login TU ครั้งแรกจะ link กลับ pre-imported student ด้วย `studentId`, และชื่อจาก TU API ใช้ `displayname_th` ก่อน `displayname_en`. ฝั่ง session ลบ QR rotation ออกแล้ว: แต่ละ open session ใช้ static QR token + static entry code ชุดเดียวจนปิด session, QR/code ไม่เปลี่ยนตอน “เลยเวลา”, ปิด session แล้ว clear token/code, และ lazy auto-close ที่ `endsAt + 30 นาที`. ฝั่ง teacher UI เปลี่ยน countdown เป็นเวลาเหลือ/เลยเวลาจาก `endsAt`, ทำวง countdown สี QRoll red รอบ QR ให้ QR เด่นขึ้น, ปรับ fullscreen presenter mode ให้เหลือเฉพาะข้อมูลจำเป็น, และ sync เอกสาร PRP/INSTRUCTIONS/STATE/review ให้ตรงกับ decision ล่าสุด โดย review ละเอียดอยู่ที่ `docs/reviews/phase-4.6-review.md`

---

## Next Step

### Phase 5 — Teacher Dashboard + Reports

งานถัดไปคือทำ dashboard/report ฝั่งอาจารย์ต่อจากข้อมูลจริงที่ Phase 4.6 เตรียมไว้แล้ว:

1. สรุป attendance ต่อ session/course
2. ดูรายชื่อนักศึกษาที่มา/สาย/ขาด
3. แยกข้อมูล demo ออกจากรายงานจริง
4. เตรียมพื้นฐาน export/report ใน Phase 6

---

## Phase Roadmap

| Phase | Goal                                                   | Status     |
| ----- | ------------------------------------------------------ | ---------- |
| 0     | Setup project + Context Architecture                   | ✅ Done    |
| 1     | Database (Prisma + Supabase + schema)                  | ✅ Done    |
| 2     | Auth via TU API (NextAuth v5)                          | ✅ Done    |
| 3     | Teacher: AppShell + Courses + Roster import (CSV/XLSX) | ✅ Done    |
| 3.5   | Teacher: Schedule + ClassSession lifecycle             | ✅ Done    |
| 4     | Teacher: Dynamic QR Display (rotate 30s + fullscreen)  | ✅ Done    |
| 4.5   | Student: Login + Scan QR + Check-in                    | ✅ Done    |
| 4.6   | Roster + Session Overhaul (real Excel + QR static)     | ✅ Done    |
| 5     | Teacher: Live + Historical Dashboard                   | ⏳ Pending |
| 6     | Geofence + Manual Edit + Export                        | ⏳ Pending |
| 7     | Face Scan + Email notify                               | ⏳ Pending |

---

## PRP Index

| File                                          | Topic                                                           | Status      |
| --------------------------------------------- | --------------------------------------------------------------- | ----------- |
| `docs/prps/00-security-model.md`              | Security Model                                                  | ✅ Done     |
| `docs/prps/01-database-schema.md`             | Database Schema                                                 | ✅ Done     |
| `docs/prps/02-auth-tu-api.md`                 | NextAuth v5 + TU API custom provider                            | ✅ Done     |
| `docs/prps/03-teacher-courses.md`             | Teacher Courses + Roster import                                 | ✅ Done     |
| `docs/prps/03.5-schedule-session.md`          | Schedule + ClassSession lifecycle                               | ✅ Done     |
| `docs/prps/04-dynamic-qr.md`                  | Dynamic QR Display                                              | ✅ Done     |
| `docs/prps/05-checkin-flow.md`                | Student check-in flow                                           | ✅ Approved |
| `docs/prps/06-roster-and-session-overhaul.md` | Roster + Session Overhaul (real Excel + QR static + manual add) | ✅ Approved |
| `docs/prps/07-teacher-dashboard.md`           | Teacher dashboard + reports                                     | ⏳ Pending  |

---

## Completed Work

### Phase 0 — Project Setup

| #   | Task                               | Status | Note                          |
| --- | ---------------------------------- | ------ | ----------------------------- |
| 1   | Create Next.js project             | ✅     | App Router                    |
| 2   | Create `INSTRUCTIONS.md`           | ✅     | Project constitution          |
| 3   | Downgrade Next.js 16.2.4 → 15.5.15 | ✅     | Stability + community support |
| 4   | Fix ESLint config for Next 15      | ✅     | ESM resolver                  |
| 5   | Verify build                       | ✅     | `npm run build` passed        |
| 6   | Create context architecture        | ✅     | `STATE.md`, `docs/prps/`      |
| 7   | Write PRP 01                       | ✅     | Database schema blueprint     |

### Phase 1 — Database

| #   | Task                              | Status | Note                         |
| --- | --------------------------------- | ------ | ---------------------------- |
| 1   | Create Supabase project           | ✅     | Singapore region             |
| 2   | Install Prisma 5.22 + server-only | ✅     | Downgraded from Prisma 7     |
| 3   | Create Prisma schema              | ✅     | Domain + NextAuth models     |
| 4   | Create `.env.local` + `.env`      | ✅     | Both gitignored              |
| 5   | Run initial migration             | ✅     | Supabase synced              |
| 6   | Create `src/lib/db.ts`            | ✅     | Prisma singleton             |
| 7   | Create seed script                | ✅     | Teacher + student seed users |
| 8   | Verify build                      | ✅     | Passed                       |

### Phase 2 — Auth via TU API

| #   | Task                                   | Status | Note                          |
| --- | -------------------------------------- | ------ | ----------------------------- |
| 1   | Write PRP 02                           | ✅     | `docs/prps/02-auth-tu-api.md` |
| 2   | Install NextAuth v5 beta + Zod + icons | ✅     | Auth + validation             |
| 3   | Create Credentials provider            | ✅     | BYPASS mode + TU API contract |
| 4   | Create auth helpers                    | ✅     | `requireAuth`, role guards    |
| 5   | Create middleware auth gate            | ✅     | Redirect to login             |
| 6   | Create login UI                        | ✅     | Server shell + client form    |
| 7   | Update env template                    | ✅     | TU + NextAuth vars            |
| 8   | Verify build + BYPASS smoke test       | ✅     | Passed                        |

### Phase 3 — Teacher Courses + Roster

| #   | Task                                  | Status | Note                              |
| --- | ------------------------------------- | ------ | --------------------------------- |
| 1   | Write PRP 03                          | ✅     | `docs/prps/03-teacher-courses.md` |
| 2   | Install `xlsx`, `papaparse`, `qrcode` | ✅     | QR package installed early        |
| 3   | Add QRoll brand tokens + Sarabun font | ✅     | Tailwind v4 theme tokens          |
| 4   | Root role-based redirect              | ✅     | Teacher/student routing           |
| 5   | AppShell                              | ✅     | Sidebar + user card               |
| 6   | Nav config                            | ✅     | Role-aware links                  |
| 7   | Teacher dashboard                     | ✅     | DB-backed stats                   |
| 8   | Course list + create form             | ✅     | `/teacher/courses`                |
| 9   | Course detail + roster table          | ✅     | `/teacher/courses/[id]`           |
| 10  | Settings stub                         | ✅     | `/teacher/settings`               |
| 11  | Course actions                        | ✅     | create/delete                     |
| 12  | Roster import action                  | ✅     | CSV + XLSX                        |
| 13  | Roster import modal                   | ✅     | Summary UI                        |
| 14  | `requireCourseOwner`                  | ✅     | Ownership guard                   |
| 15  | Verify build                          | ✅     | Passed                            |

### Phase 3.5 — Schedule + ClassSession Lifecycle

| #   | Task                              | Status | Note                        |
| --- | --------------------------------- | ------ | --------------------------- |
| 1   | Write PRP 03.5                    | ✅     | Schedule/session plan       |
| 2   | Add `Schedule` model + migration  | ✅     | Weekly recurring schedule   |
| 3   | Add partial unique index          | ✅     | One open session per course |
| 4   | Add schedule validation           | ✅     | Zod schema                  |
| 5   | Add schedule actions              | ✅     | create/delete               |
| 6   | Add session actions               | ✅     | open/close                  |
| 7   | Add lazy auto-close helper        | ✅     | `endsAt + 30min`            |
| 8   | Add Schedule tab in course detail | ✅     | `?tab=schedule`             |
| 9   | Add today schedule on dashboard   | ✅     | Bangkok timezone            |
| 10  | Add session page skeleton         | ✅     | Placeholder before Phase 4  |
| 11  | Verify build                      | ✅     | Passed                      |

### Phase 4 — Dynamic QR Display

| #   | Task                                    | Status | Note                              |
| --- | --------------------------------------- | ------ | --------------------------------- |
| 1   | Review PRP 04                           | ✅     | `docs/prps/04-dynamic-qr.md`      |
| 2   | Add schema fields + migration           | ✅     | `phase4_dynamic_qr`               |
| 3   | Generate initial token in `openSession` | ✅     | QR token + entry code + lateAfter |
| 4   | Add token cleanup on close/auto-close   | ✅     | Null token/code fields            |
| 5   | Add QR helpers                          | ✅     | config/token/rotate/verify        |
| 6   | Add QR polling Route Handler            | ✅     | `/api/sessions/[id]/qr`           |
| 7   | Build real session UI                   | ✅     | QR, countdown, code, fullscreen   |
| 8   | Add checked-in sidebar skeleton         | ✅     | For Phase 4.5 live feed later     |
| 9   | Verify build                            | ✅     | `npm.cmd run build` passed        |

### Phase 4.5 — Student Check-in Flow

| #   | Task                                       | Status | Note                                                                         |
| --- | ------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| 1   | Write/approve PRP 05                       | ✅     | real + separated demo scope                                                  |
| 2   | Add `DemoCheckIn` schema + migration       | ✅     | `phase45_checkin_flow` applied                                               |
| 3   | Add real check-in Server Action            | ✅     | auth + enrollment + server time                                              |
| 4   | Add demo check-in Server Action            | ✅     | writes only to `DemoCheckIn`                                                 |
| 5   | Add `/checkin?t=<token>` mobile page       | ✅     | student identity from login                                                  |
| 6   | Add `/demo/checkin?t=<token>` mobile page  | ✅     | guarded by env flag                                                          |
| 7   | Preserve query string through login        | ✅     | middleware uses path + search                                                |
| 8   | Wire teacher session live sidebar          | ✅     | real/demo lists separated                                                    |
| 9   | Add student dashboard/course/history pages | ✅     | basic student routes for dashboard, enrolled courses, and attendance history |
| 10  | Verify build                               | ✅     | `npm.cmd run build` passed                                                   |

### Phase 4.6 — Roster + Session Overhaul

| #   | Task                                      | Status | Note                                                                 |
| --- | ----------------------------------------- | ------ | -------------------------------------------------------------------- |
| 1   | Apply `roster_overhaul` migration         | ✅     | `email` nullable + remove QR rotation fields in one migration        |
| 2   | Make student identity `studentId`-based   | ✅     | roster/import/auth linking use studentId as primary student identity |
| 3   | Overhaul roster import parser             | ✅     | supports real Excel/CSV, metadata rows, Thai/English header variants |
| 4   | Prevent import overwrite                  | ✅     | existing users are enrolled only; name/email/role are not overwritten |
| 5   | Add manual one-student dialog             | ✅     | button placed beside Import on roster tab                            |
| 6   | Update roster UI                          | ✅     | Thai copy + email removed from main roster column                     |
| 7   | Update TU auth role mapping               | ✅     | role comes from TU API `type`; email domain is sanity check only     |
| 8   | Add auth fallback by `studentId`          | ✅     | links first TU login to pre-imported `email=null` user               |
| 9   | Prefer Thai display name                  | ✅     | `displayname_th` before `displayname_en`                             |
| 10  | Replace QR rotation with static QR        | ✅     | one token + one entry code per open session                          |
| 11  | Add session stale safety behavior         | ✅     | QR/code stay static when overdue; auto-close at `endsAt + 30min`     |
| 12  | Repurpose teacher countdown               | ✅     | time left / overtime from `endsAt`                                   |
| 13  | Redesign QR countdown ring                | ✅     | QRoll red ring surrounds QR and is larger than the QR                |
| 14  | Simplify fullscreen presenter mode        | ✅     | large QR + only course, time, entry code, fullscreen control         |
| 15  | Sync PRPs / instructions / reviews        | ✅     | old PRPs marked historical; Phase 4.6 review added                   |
| 16  | Verify implementation                     | ✅     | build passed earlier; UI/docs follow-up checked with TypeScript/docs |

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

### Phase 4.6 Files

- `prisma/migrations/20260505000000_roster_overhaul/migration.sql`
- `prisma/schema.prisma`
- `src/app/actions/roster.ts`
- `src/components/import/RosterImport.tsx`
- `src/components/import/AddStudentDialog.tsx`
- `src/lib/auth.ts`
- `src/app/actions/session.ts`
- `src/app/api/sessions/[id]/qr/route.ts`
- `src/lib/qr-verify.ts`
- `src/lib/session-helpers.ts`
- `src/components/sessions/SessionView.tsx`
- `src/components/sessions/QrDisplay.tsx`
- `src/components/sessions/FullscreenButton.tsx`
- `src/components/courses/CloseSessionButton.tsx`
- `INSTRUCTIONS.md`
- `docs/prps/06-roster-and-session-overhaul.md`
- `docs/reviews/project-overview-phase-0-to-4.5.md`
- `docs/reviews/phase-4.6-review.md`

---

## Decision Log

### 2026-05-05 — Phase 4.6 Final UI/Auth/Docs Adjustments

- **Decision:** ชื่อผู้ใช้จาก TU API ใช้ `displayname_th` ก่อน `displayname_en`
- **Why:** UI หลักเป็นภาษาไทย และรายชื่อนักศึกษา/อาจารย์ในบริบทห้องเรียนควรแสดงชื่อไทยเมื่อ TU API มีข้อมูลให้
- **Decision:** หน้า roster ไม่ใช้ email เป็น column หลัก
- **Why:** email ไม่ใช่ข้อมูลที่อาจารย์ใช้ตรวจ roster จริง, pre-imported students อาจยังไม่มี email, และข้อมูลหลักของ roster คือ `studentId` + ชื่อ
- **Decision:** ยังไม่ทำสถานะ “เข้าเรียนเกิน 80% / ควรติดตาม” ใน roster table ตอน Phase 4.6
- **Why:** metric นี้ต้องนิยาม denominator, late/absent policy, session ที่นับได้, และการ exclude `DemoCheckIn` ให้ชัดก่อน จึงย้ายไป Phase 5 dashboard/report
- **Decision:** Countdown ring ใช้ QRoll red เป็นสีหลักและย้ายไปเป็นวงรอบ QR
- **Why:** ผู้ใช้เลือกให้สีแดงเด่นกว่า threshold palette เดิม และวงรอบ QR ทำให้ QR เป็นพระเอกบน projector มากกว่าวงเล็กแยกด้านล่าง
- **Decision:** Fullscreen presenter mode ต้องลดความรก เหลือ QR ใหญ่ + ข้อมูลจำเป็นเท่านั้น
- **Why:** ตอนฉายหน้าห้อง นักศึกษาต้อง scan QR เป็นหลัก จึงควรซ่อนรายละเอียด/sidebar ที่ไม่ช่วยการ scan และคง entry code เป็น fallback
- **Decision:** Session ที่เลย `endsAt` ยังไม่ regenerate QR/code และ auto-close ที่ `endsAt + 30 นาที`
- **Why:** หลังลบ rotation แล้ว QR/code ต้อง static ตาม session lifecycle ส่วน grace 30 นาทีช่วยกันกรณีอาจารย์ลืมปิดโดยไม่ต้องใช้ cron/background worker
- **Decision:** Review `project-overview-phase-0-to-4.5.md` คงไว้เป็น snapshot และสร้าง `docs/reviews/phase-4.6-review.md` แยก
- **Why:** ไม่ rewrite history ของ Phase 4.5 แต่มีเอกสารละเอียดสำหรับสิ่งที่เปลี่ยนจริงใน Phase 4.6 ให้อ่านทวนและใช้อธิบายกับอาจารย์

### 2026-05-05 — PRP Docs Sync After Phase 4.6

- **Decision:** เก็บ PRP เก่าไว้เป็น historical design แต่เพิ่ม implementation update / superseded note ด้านบนของ PRP 00-05
- **Why:** เอกสารยังเล่าเส้นทางการตัดสินใจได้ แต่คนอ่านจะไม่เข้าใจผิดว่า email-required roster หรือ dynamic QR rotation 30s ยังเป็น source of truth ปัจจุบัน
- **Decision:** ให้ PRP 06 + `prisma/schema.prisma` เป็น source of truth สำหรับ roster import, nullable email, TU role mapping, static QR, และ auto-close หลัง `endsAt + 30 นาที`
- **Why:** นี่คือ decision ล่าสุดที่ตรงกับโค้ดจริงหลัง Phase 4.6 และเป็นสิ่งที่ควรใช้อธิบายกับอาจารย์ต่อ

### 2026-05-05 — Phase 4.6 PRP 06 Roster + Session Overhaul (Approved)

- **Decision:** Migration รวมเป็นครั้งเดียวชื่อ `roster_overhaul`
- **Why:** email nullable กับการลบ QR rotation fields เป็น schema refactor ชุดเดียวกัน และ DB ตอนนี้มีแต่ test data จึงไม่ต้องแยก rollback/backup ซับซ้อน
- **Decision:** Email field ใน User → nullable, match user ด้วย studentId เป็น primary identity
- **Why:** ไฟล์ Excel จริงของ ม.ธรรมศาสตร์มีแค่ `เลขทะเบียน, ชื่อ` (ไม่มี email) → ต้อง pre-import แบบ email=null ได้
- **Decision:** Role จาก TU login ใช้ `type` จาก TU Authentication API เป็น source of truth (`student` → STUDENT, `employee` → TEACHER)
- **Why:** TU API ส่ง account type มาให้โดยตรงอยู่แล้ว email domain จึงเป็นแค่ validation เสริม ไม่ใช่ตัวแยก role
- **Decision:** Never overwrite ข้อมูล user ที่มีอยู่ตอน roster import — ถ้า studentId มีอยู่แล้วก็ enroll อย่างเดียว ไม่ update name/email
- **Why:** Typo studentId ในวิชา A จะไม่ corrupt user ในวิชา B (orphan user ลบทิ้งได้แทน)
- **Decision:** ลบ QR token rotation 30s ออก → static QR + entryCode ตลอด session
- **Why:** ป้องกัน screenshot sharing ไม่ได้จริง (เพื่อนสแกนทันใน 30s) + เพิ่ม complexity โดยไม่มี value → จะใช้ location-based check เป็น primary defense ใน Phase 5+ แทน
- **Decision:** Repurpose countdown ring ที่จอ teacher → แสดง "เวลาเหลือก่อนคาบจบ" จาก `endsAt` แทน
- **Why:** เก็บ visual ที่สวยไว้ + ใส่ความหมายที่มี value ต่ออาจารย์จริง
- **Decision:** Countdown ring palette จาก PRP ถูกปรับสุดท้ายมาใช้ QRoll red เป็นสีหลักตลอด
- **Why:** เข้ากับ brand red, เด่นบน projector, และหลัง UI เปลี่ยนเป็นวงรอบ QR แล้วความชัดสำคัญกว่า threshold หลายสี
- **Decision:** ปุ่ม manual add อยู่ข้างปุ่ม Import บน roster tab
- **Why:** เป็น action ระดับ roster เหมือน import แต่ใช้สำหรับเพิ่มทีละคน ไม่ควรซ่อนเป็น empty state อย่างเดียว
- **Decision:** Optimistic close + Tailwind fade 300ms ฝั่ง teacher
- **Why:** ปัญหา "ปิดช้า" จริงๆ อยู่ที่จอ teacher (poll 30s + ไม่มี optimistic update) — student page ไม่ poll และไม่เห็น QR อยู่แล้ว, server reject ที่ submit ถ้า session closed (ปลอดภัยอยู่แล้ว)
- **Decision:** Shared User table (ไม่ duplicate per-course)
- **Why:** Match by studentId + never overwrite ตอบโจทย์ cross-course corruption ได้แล้ว ไม่ต้อง refactor schema ใหญ่ + login ใช้ user เดียวเห็นทุกวิชา
- **Decision:** Export CSV ย้ายไป Phase 6
- **Why:** PRP 06 scope ใหญ่พอแล้ว + Phase 6 เดิมตั้งใจทำ Export อยู่แล้ว → จะออกแบบพร้อมกัน อาจ pivot เป็น Excel format ม.ธรรมศาสตร์ต้นฉบับ ไม่ต้องทำ CSV ทิ้ง

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
- **Why:** TU API เป็น source of truth สำหรับการยืนยันตัวตน และ field `type` เป็น source of truth สำหรับ role; email เป็นข้อมูลประกอบหลัง auth สำเร็จ

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
- `npx.cmd prisma migrate deploy` ✅ (`20260505000000_roster_overhaul`)
- `npx.cmd prisma generate` ✅
- `npm.cmd run build` ✅
