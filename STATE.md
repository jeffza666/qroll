# STATE.md — Qroll Handoff Tracker

> 📌 **ต้องอ่านไฟล์นี้หลัง `INSTRUCTIONS.md` เพื่อรู้ว่าโปรเจกต์ทำถึงไหนแล้ว**
> อัปเดตทุกครั้งที่จบงาน — อย่าให้ stale

---

## 🎯 Current Status

**Phase:** `Phase 3.5 — Schedule + ClassSession Lifecycle` ✅ **DONE**
**Last updated:** 2026-04-29

---

## ✅ ทำเสร็จแล้ว (Phase 0)

| #   | Task                                                  | สถานะ | Note                                |
| --- | ----------------------------------------------------- | ----- | ----------------------------------- |
| 1   | สร้างโปรเจกต์ Next.js                                 | ✅    | `npx create-next-app`               |
| 2   | เขียน `INSTRUCTIONS.md` (Project Constitution)        | ✅    | v1.1                                |
| 3   | Downgrade Next.js 16.2.4 → 15.5.15                    | ✅    | เพื่อ stability + community support |
| 4   | แก้ `eslint.config.mjs` ให้ตรง Next 15 ESM resolver   | ✅    | เพิ่ม `.js` ใน import path          |
| 5   | Verify build (`npm run build`)                        | ✅    | ผ่าน ไม่มี warning                  |
| 6   | สร้าง Context Architecture (`STATE.md`, `docs/prps/`) | ✅    | ไฟล์นี้                             |
| 7   | เขียน PRP 01 — Database Schema                        | ✅    | `docs/prps/01-database-schema.md`   |

---

## ✅ ทำเสร็จแล้ว (Phase 1)

| #   | Task                                              | สถานะ | Note                                                |
| --- | ------------------------------------------------- | ----- | --------------------------------------------------- |
| 1   | สร้าง Supabase project (Singapore)                | ✅    | ได้ DATABASE_URL + DIRECT_URL                       |
| 2   | Install Prisma 5.22 + server-only + ts-node       | ✅    | downgrade จาก 7 → 5 (stability)                     |
| 3   | สร้าง `prisma/schema.prisma` (8 models + 2 enums) | ✅    | ตาม PRP 01 blueprint                                |
| 4   | สร้าง `.env.local` + `.env` + ตรวจ gitignore      | ✅    | ทั้งสองถูก gitignore ด้วย `.env*`                   |
| 5   | รัน `npx prisma migrate dev --name init`          | ✅    | migration สำเร็จ, 8 tables + unique constraints ครบ |
| 6   | สร้าง `src/lib/db.ts` Prisma client singleton     | ✅    | มี `import "server-only"` กัน bundle ฝั่ง browser   |
| 7   | สร้าง `prisma/seed.ts` + รัน `npx prisma db seed` | ✅    | teacher + student seed user พร้อมสำหรับ Phase 2 dev |
| 8   | Verify build (`npm run build`)                    | ✅    | ผ่าน                                                |

---

## ✅ ทำเสร็จแล้ว (Phase 2)

| #   | Task                                          | สถานะ | Note                                                       |
| --- | --------------------------------------------- | ----- | ---------------------------------------------------------- |
| 1   | เขียน PRP 02 — Auth via TU API                | ✅    | `docs/prps/02-auth-tu-api.md`                              |
| 2   | Install NextAuth v5 beta + Zod + lucide-react | ✅    | auth, validation, icons                                    |
| 3   | สร้าง NextAuth Credentials provider           | ✅    | BYPASS mode + real TU API contract                         |
| 4   | สร้าง auth helpers                            | ✅    | `requireAuth`, `requireTeacher`, `requireStudent`          |
| 5   | สร้าง middleware auth gate                    | ✅    | redirect ไป `/login?from=...`                              |
| 6   | สร้าง login page จาก HTML design              | ✅    | Server shell + Client form                                 |
| 7   | Update env template                           | ✅    | `TU_API_URL`, `TU_API_KEY`, `NEXTAUTH_*`, `BYPASS_TU_AUTH` |
| 8   | Verify lint/build + BYPASS smoke test         | ✅    | teacher/student session claims ถูกต้อง                     |

---

## ✅ ทำเสร็จแล้ว (Phase 3)

| #   | Task                                                | สถานะ | Note                                        |
| --- | --------------------------------------------------- | ----- | ------------------------------------------- |
| 1   | เขียน PRP 03 — Teacher Courses + Roster             | ✅    | `docs/prps/03-teacher-courses.md`           |
| 2   | Install deps: `xlsx`, `papaparse`, `qrcode` + types | ✅    | server-side parse เท่านั้น                  |
| 3   | QRoll brand tokens + Sarabun font                   | ✅    | `globals.css` — Tailwind v4 `@theme`        |
| 4   | Root page → role-based redirect                     | ✅    | teacher→/teacher, student→/student          |
| 5   | AppShell (Sidebar + UserCard + layout)              | ✅    | `src/components/shell/`                     |
| 6   | Nav config                                          | ✅    | `src/lib/nav-config.ts` — role-aware links  |
| 7   | Teacher Dashboard                                   | ✅    | `/teacher` — stat cards จาก DB จริง         |
| 8   | Courses list + create form                          | ✅    | `/teacher/courses` + `/teacher/courses/new` |
| 9   | Course detail + roster table                        | ✅    | `/teacher/courses/[id]`                     |
| 10  | Settings stub                                       | ✅    | `/teacher/settings`                         |
| 11  | Server Action: `createCourse`, `deleteCourse`       | ✅    | `src/app/actions/course.ts`                 |
| 12  | Server Action: `importRoster` (CSV + XLSX)          | ✅    | `src/app/actions/roster.ts`                 |
| 13  | `RosterImport` UI (modal + summary)                 | ✅    | `src/components/import/RosterImport.tsx`    |
| 14  | `requireCourseOwner` helper                         | ✅    | `src/lib/auth-helpers.ts`                   |
| 15  | `npm run build` ผ่าน 100%                           | ✅    | TypeScript + ESLint clean                   |

---

## 🎯 Next Step (Phase 4 — Dynamic QR Display)

**Teacher: Dynamic QR Code (rotate ทุก 30s + fullscreen)**

> ⚠️ เขียน PRP 04 ก่อนเขียนโค้ดทุกครั้ง

1. เขียน PRP 04 — Dynamic QR Display
2. สร้าง `qrToken` + `qrTokenExpiresAt` ตอน `openSession`
3. Server Action/Route Handler: `refreshQrToken(sessionId)` → generate token ใหม่ ทุก 30s
4. UI `/teacher/sessions/[id]` → แสดง QR จริง (ใช้ package `qrcode`)
5. Client-side auto-refresh ทุก 30s (polling หรือ SSE)
6. Fullscreen mode สำหรับฉายบน projector

---

## 🛤️ Phase Roadmap

| Phase | Goal                                                   | Status         |
| ----- | ------------------------------------------------------ | -------------- |
| 0     | Setup project + Context Architecture                   | ✅ Done        |
| 1     | Database (Prisma + Supabase + schema)                  | ✅ Done        |
| 2     | Auth via TU API (NextAuth v5)                          | ✅ Done        |
| 3     | Teacher: AppShell + Courses + Roster import (CSV/XLSX) | ✅ Done        |
| 3.5   | Teacher: Schedule + Class Session lifecycle            | ✅ Done        |
| 4     | Teacher: Dynamic QR Display (rotate 30s + fullscreen)  | 🔜 **Up next** |
| 4.5   | Student: Login + Scan QR + Check-in                    | ⏳             |
| 5     | Teacher: Live + Historical Dashboard                   | ⏳             |
| 6     | Milestone — Geofence + Manual Edit + Export            | ⏳             |
| 7     | Milestone — Face Scan + Email notify                   | ⏳             |

---

## 📚 PRP Index (Plan-Research-Pattern docs)

| File                                 | หัวข้อ                                     | สถานะ      |
| ------------------------------------ | ------------------------------------------ | ---------- |
| `docs/prps/00-security-model.md`     | Security Model (threats + controls)        | ✅ Done    |
| `docs/prps/01-database-schema.md`    | Database Schema (Prisma blueprint)         | ✅ Done    |
| `docs/prps/02-auth-tu-api.md`        | NextAuth v5 + TU API custom provider       | ✅ Done    |
| `docs/prps/03-teacher-courses.md`    | Teacher Courses + Roster import (CSV/XLSX) | ✅ Done    |
| `docs/prps/03.5-schedule-session.md` | Schedule + ClassSession lifecycle          | ✅ Done    |
| `docs/prps/04-dynamic-qr.md`         | Dynamic QR (refresh ทุก 30s + token)       | ⏳ Pending |
| `docs/prps/05-checkin-flow.md`       | Student check-in flow                      | ⏳ Pending |
| `docs/prps/06-teacher-dashboard.md`  | Teacher dashboard + reports                | ⏳ Pending |

---

## 🧠 Decision Log

### 2026-04-27 — Stack version pin

- **Decision:** ใช้ Next.js 15.5.15 (downgrade จาก 16.2.4)
- **Why:** Next 16 ใหม่เกินไป — AI training data + community examples ยังไม่ครอบคลุม + breaking changes (`middleware.ts` → `proxy.ts`) เพิ่มความเสี่ยงโดยไม่จำเป็น
- **Pinned versions:** Next.js `^15.5.0`, React `19.2.4`, Tailwind CSS `v4`

### 2026-04-27 — Context Architecture

- **Decision:** ใช้ระบบ `INSTRUCTIONS.md` (กฎเหล็ก) + `STATE.md` (handoff) + `docs/prps/*.md` (deep dive ต่อ feature)
- **Why:** ป้องกัน AI session ใหม่ "หลงทาง" — ทุก session อ่าน 3 ไฟล์นี้ก่อนเริ่มงาน

### 2026-04-27 — Auth strategy

- **Decision:** ใช้ TU API จริง (มี endpoint + credentials) ผ่าน NextAuth v5 Custom Provider
- **Why:** Dome email (`@dome.tu.ac.th`) เป็น single source of truth — ไม่ใช้ Google OAuth filtered

### 2026-04-27 — Schema naming: ClassSession (ไม่ใช่ Session)

- **Decision:** เปลี่ยนชื่อ table "Session" ใน INSTRUCTIONS.md ข้อ 5 → `ClassSession` ใน Prisma schema
- **Why:** NextAuth v5 ใช้ `Session` table มาตรฐาน → ชนกัน
- **Action:** PRP 01 ระบุชัด, ตอน implement ให้ใช้ `ClassSession`

### 2026-04-28 — เอกสาร Security Model และอัปเดต PRP 01

- **Decision:** สร้าง `docs/prps/00-security-model.md` เป็นเอกสารอ้างอิงหลักด้าน security
- **Why:** ระบบเช็คชื่อมีความเสี่ยงเรื่องการโกงและการโจมตีหลายแบบ จึงต้องมีเอกสารกลางก่อน implement

### 2026-04-28 — Prisma version pin: 5.22 (downgrade จาก 7.8)

- **Decision:** ใช้ Prisma 5.22.0 แทน Prisma 7.8.0 ที่ติดตั้งมา
- **Why:** Prisma 7 เปลี่ยน architecture ใหญ่มาก — `url`/`directUrl` ย้ายออกจาก `schema.prisma` ไปอยู่ใน `prisma.config.ts` (TypeScript config file ใหม่) ทำให้ไม่เข้ากับ Supabase PgBouncer setup + ไม่มี community example รองรับเพียงพอสำหรับ final project — Prisma 5 ใช้ `directUrl` ใน schema.prisma ได้ตามปกติ

### 2026-04-28 — Two env files: `.env` + `.env.local`

- **Decision:** ใช้ 2 ไฟล์ — `.env.local` สำหรับ Next.js runtime, `.env` สำหรับ Prisma CLI
- **Why:** Prisma 5 CLI อ่านแค่ `.env` (dotenv default) ไม่อ่าน `.env.local` — Next.js อ่านทั้งสองไฟล์ — ทั้งสองถูก gitignore ด้วย `.env*` rule ใน `.gitignore`

### 2026-04-28 — JWT session strategy for NextAuth

- **Decision:** ใช้ NextAuth v5 Credentials provider + JWT session strategy โดยไม่ wire PrismaAdapter
- **Why:** Phase 2 ต้องการ claims สั้น ๆ (`id`, `role`, `studentId`) ที่ middleware อ่านได้ตรง และลด moving parts ใน final project MVP

### 2026-04-28 — TU login upsert ไม่ update role

- **Decision:** ตอน real TU login ให้ `upsert` user แต่ update เฉพาะ `name` เมื่อ user มีอยู่แล้ว
- **Why:** ป้องกัน privilege drift ถ้าข้อมูลภายนอกเปลี่ยน หรือ mapping ผิดพลาดแล้วทำให้ role ใน Qroll ถูกยกระดับ/ลดระดับโดยไม่ตั้งใจ

### 2026-04-28 — Phase 2 auth helper scope

- **Decision:** Phase 2 มีแค่ `requireAuth`, `requireTeacher`, `requireStudent`
- **Why:** `requireCourseOwner` และ `requireEnrolledStudent` ต้องอิง course/enrollment actions จริง จึงค่อยเพิ่มใน Phase 3/5 เพื่อไม่สร้าง dead code

### 2026-04-29 — CSV/XLSX parse: xlsx + papaparse (server-side only)

- **Decision:** ใช้ `xlsx` สำหรับ Excel และ `papaparse` สำหรับ CSV — parse ฝั่ง server ใน Server Action เท่านั้น
- **Why:** ไม่ต้องการ client-side parsing library ที่หนัก — ส่ง raw `File` ผ่าน `FormData` ไปให้ server จัดการ ปลอดภัยกว่าและ bundle size ไม่บวม

### 2026-04-29 — requireCourseOwner แยกเป็น helper ใน auth-helpers.ts

- **Decision:** `requireCourseOwner(courseId)` อยู่ใน `src/lib/auth-helpers.ts` รวมกับ `requireTeacher` / `requireStudent`
- **Why:** ทุก ownership check อยู่ที่เดียว — ถ้า logic เปลี่ยน (เช่น เพิ่ม co-teacher) แก้ที่เดียวจบ ไม่กระจายใน actions แต่ละไฟล์

### 2026-04-29 — Roster import modal viewport fix

- **Done:** Fixed the roster import modal in `src/components/import/RosterImport.tsx` so it stays inside the viewport and scrolls internally when content is taller than the screen.
- **Why:** This keeps the teacher import workflow usable after pressing Import without changing the roster import server action or data validation rules.
- **Verify:** `npm.cmd run build` passed. Existing NextAuth/Jose Edge Runtime warnings still appear and are unrelated to this UI fix.

### 2026-04-29 — Phase 3.5: Schedule + ClassSession design decisions

- **Schedule pattern:** Recurring weekly (`dayOfWeek` Int 0-6 = JS `Date.getDay()`, `startTime`/`endTime` String "HH:MM")
- **Session binding:** Must bind — `scheduleId` NOT NULL → ไม่มี orphan session
- **Open mechanism:** Manual กดปุ่มเท่านั้น (ไม่มี cron)
- **Close behavior:** Hybrid — manual + lazy auto-close (`endsAt + 30min`) ตอน read (ไม่มี background job)
- **Multi-slot:** 1 course → N schedules รองรับ lecture + lab
- **Day strictness:** Flexible — เปิดวันไหนก็ได้ (รองรับคาบชดเชย)
- **Schedule delete:** Block ถ้ามี session (`onDelete: Restrict`)
- **Partial unique index:** Raw SQL `WHERE isOpen=true` — Prisma 5 DSL ไม่รองรับ WHERE clause ใน @@unique
- **Bangkok timezone:** Server-side คำนวณ `startsAt`/`endsAt` จาก `sv-SE` locale trick — ห้ามรับจาก client

---

## ✅ ทำเสร็จแล้ว (Phase 3.5)

| #   | Task                                           | สถานะ | Note                                                 |
| --- | ---------------------------------------------- | ----- | ---------------------------------------------------- |
| 1   | เขียน PRP 03.5                                 | ✅    | `docs/prps/03.5-schedule-session.md`                 |
| 2   | Schedule model + migration                     | ✅    | Prisma + raw SQL partial unique index                |
| 3   | Partial unique index (DB-level)                | ✅    | `ClassSession_one_open_per_course WHERE isOpen=true` |
| 4   | Zod validation schema                          | ✅    | `src/lib/validations/schedule.ts`                    |
| 5   | Server Actions: createSchedule, deleteSchedule | ✅    | `src/app/actions/schedule.ts`                        |
| 6   | Server Actions: openSession, closeSession      | ✅    | `src/app/actions/session.ts`                         |
| 7   | autoCloseIfExpired helper                      | ✅    | `src/lib/session-helpers.ts`                         |
| 8   | Tab "ตารางสอน" ใน course detail                | ✅    | URL param `?tab=schedule`                            |
| 9   | "ตารางสอนวันนี้" บน dashboard                  | ✅    | query จาก DB จริง, Bangkok timezone                  |
| 10  | Skeleton `/teacher/sessions/[id]`              | ✅    | open/close status + QR placeholder                   |
| 11  | `npm run build` ผ่าน 100%                      | ✅    | TypeScript + ESLint clean                            |

---

## 🚧 Blockers / Open Questions

ไม่มีตอนนี้ — Phase 4 พร้อมเริ่ม (รอเขียน PRP 04 ก่อน)

---

## 📝 Notes for Next Session

1. **อ่าน 3 ไฟล์นี้ตามลำดับก่อนเขียนโค้ด:**
   - `INSTRUCTIONS.md` (กฎเหล็ก)
   - `STATE.md` (ไฟล์นี้ — รู้สถานะ)
   - `docs/prps/03.5-schedule-session.md` (ต้องเขียนก่อน Phase 3.5)

2. **Stack ที่ติดตั้งจริง** (ดู `package.json`):
   - Next.js `15.5.15`, React `19.2.4`, Tailwind `v4`
   - Prisma `5.22.0`, `@prisma/client` `5.22.0`, `server-only`, `ts-node`
   - NextAuth v5 beta, Zod, lucide-react
   - `xlsx` `0.18.5`, `papaparse` `5.5.3`, `qrcode` `1.5.4` + types ครบ

3. **ไฟล์หลักที่สร้างใน Phase 3:**
   - `src/app/actions/course.ts` — createCourse, deleteCourse
   - `src/app/actions/roster.ts` — importRoster (CSV + XLSX)
   - `src/lib/auth-helpers.ts` — requireAuth, requireTeacher, requireStudent, requireCourseOwner
   - `src/lib/nav-config.ts` — role-aware nav links
   - `src/components/shell/` — AppShell, Sidebar, UserCard
   - `src/components/import/RosterImport.tsx` — modal + summary UI

4. **ไฟล์หลักที่สร้างใน Phase 3.5:**
   - `prisma/migrations/20260429050626_phase35_schedule_session/migration.sql` — Schedule table + partial unique index
   - `src/lib/validations/schedule.ts` — Zod schemas
   - `src/app/actions/schedule.ts` — createSchedule, deleteSchedule
   - `src/app/actions/session.ts` — openSession, closeSession
   - `src/lib/session-helpers.ts` — autoCloseIfExpired
   - `src/components/courses/` — ScheduleForm, ScheduleDeleteButton, OpenSessionButton, CloseSessionButton
   - `src/app/(app)/teacher/sessions/[id]/page.tsx` — skeleton session page

5. **Seed users (dev login):**
   - Teacher: `teacher@tu.ac.th`
   - Student: `test.student@dome.tu.ac.th` / studentId: `0000000001`
   - ใช้กับ `BYPASS_TU_AUTH=true` ใน `.env.local` ตอนทดสอบ

6. **Prisma Studio:** รัน `npx prisma studio` เพื่อดู 8 tables + seed data ใน GUI
