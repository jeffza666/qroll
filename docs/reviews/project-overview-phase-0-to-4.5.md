# QRoll — สรุปภาพรวมทั้งโปรเจกต์ (Phase 0 → 4.5)

> **Snapshot note:** ไฟล์นี้เป็นภาพรวม ณ ตอนจบ Phase 4.5 เท่านั้น หลังจากนั้น Phase 4.6 มีการ overhaul สำคัญเรื่อง roster import, nullable email, auth linking ด้วย `studentId`, role จาก TU API `type`, static QR ต่อ session, countdown UI, และ auto-close หลัง `endsAt + 30 นาที` ดูสรุปแยกที่ [phase-4.6-review.md](phase-4.6-review.md)

> เอกสารฉบับนี้เป็นภาพรวมของทั้งโปรเจกต์ QRoll ตั้งแต่เริ่มจน Phase 4.5 (สถานะปัจจุบัน)
> เป้าหมาย: ให้คนที่ไม่ได้อ่านโค้ดทุกบรรทัดเข้าใจได้ว่า "อะไรอยู่ตรงไหน ทำอะไร ทำไม"
> และพอจะเดินไปเปิดโค้ดดูต่อได้ตรงจุด พร้อมรู้ว่าเหลืออะไรต้องทำต่อจนถึง 100%
>
> **อัปเดตล่าสุด:** 2026-05-03
> **สถานะ:** Phase 4.5 — Student Check-in Flow ✅ ใช้งานได้แล้ว

---

## สารบัญ

1. [เกริ่นนำ + เป้าหมายโปรเจกต์](#1-เกริ่นนำ--เป้าหมายโปรเจกต์)
2. [Tech Stack สรุป](#2-tech-stack-สรุป)
3. [Architecture & ความคิดหลัก](#3-architecture--ความคิดหลัก)
4. [แยก Layer: Frontend / Backend / DevOps](#4-แยก-layer-frontend--backend--devops)
5. [Database Schema (สำหรับคนอ่อน backend)](#5-database-schema-สำหรับคนอ่อน-backend)
6. [Phase-by-Phase Breakdown](#6-phase-by-phase-breakdown)
7. [แผนผังหน้า UI ทั้งหมด](#7-แผนผังหน้า-ui-ทั้งหมด)
8. [Security Model — 8 ช่องโหว่ที่ต้องอุด](#8-security-model--8-ช่องโหว่ที่ต้องอุด)
9. [Flow ที่สำคัญ end-to-end](#9-flow-ที่สำคัญ-end-to-end)
10. [Routes & Files Map](#10-routes--files-map)
11. [Environment Variables](#11-environment-variables)
12. [สิ่งที่กำลังจะทำต่อ (Phase 5–7)](#12-สิ่งที่กำลังจะทำต่อ-phase-57)
13. [เกณฑ์ "เสร็จ 100%"](#13-เกณฑ์-เสร็จ-100)
14. [Quick Reference](#14-quick-reference)

---

## 1. เกริ่นนำ + เป้าหมายโปรเจกต์

**Qroll (คิวโรล)** คือระบบเช็คชื่อเข้าเรียนอัจฉริยะสำหรับนักศึกษามหาวิทยาลัยธรรมศาสตร์ เป็นโปรเจกต์จบการศึกษา

**ปัญหาที่แก้:**

- การขานชื่อในห้องใหญ่ใช้เวลานาน
- กระดาษเซ็นชื่อโดนเซ็นแทนกันได้ง่าย
- อาจารย์เก็บข้อมูลแล้วต้องไปนับเอง สรุปยาก

**ทางออกของ Qroll:**

- อาจารย์เปิดคาบเรียน → ระบบสร้าง QR ที่หมุนเปลี่ยนทุก 30 วินาที
- นักศึกษาสแกนด้วยมือถือ → ระบบดึงข้อมูลตัวตนจาก login → บันทึก `Attendance` ลง DB จริง
- อาจารย์เห็นรายชื่อคนเช็คชื่อแบบ live ทันที

**สถานะปัจจุบัน (Phase 4.5):**

ฟังก์ชันหลัก "เปิดคาบ → สแกน → บันทึก" ทำงานได้จริงแบบ end-to-end แล้ว เหลือ Phase 5/6/7 ที่เน้น dashboard, geofence, export, face scan

**Target user:**

- **Teacher (อาจารย์)** — login ด้วยบัญชี TU ผ่าน TU API; ระบบ map เป็น `TEACHER` จาก `type = "employee"` และตรวจ `@tu.ac.th` เป็น domain sanity check
- **Student (นักศึกษา)** — login ด้วยบัญชี TU/Dome ผ่าน TU API; ระบบ map เป็น `STUDENT` จาก `type = "student"` และตรวจ `@dome.tu.ac.th` เป็น domain sanity check

---

## 2. Tech Stack สรุป

| Layer        | เครื่องมือ                        | เหตุผลที่เลือก                                                            |
| ------------ | --------------------------------- | ------------------------------------------------------------------------- |
| Framework    | **Next.js 15.5.x** (App Router)   | Full-stack ในตัว, มี Server Actions + Server Components stable            |
| Runtime      | **React 19.2.4**                  | Server Components default, รองรับ form action และ `use` hook              |
| Language     | **TypeScript** (strict mode)      | type safety เต็มรูปแบบ ลดบั๊กแบบไม่รู้ตัว                                 |
| Styling      | **Tailwind CSS v4**               | utility-first, config ใหม่ผ่าน `postcss.config.mjs`                       |
| Database     | **PostgreSQL บน Supabase Cloud**  | production-grade, มี free tier, host อยู่สิงคโปร์ (เหมาะสำหรับ TU)        |
| ORM          | **Prisma 5.22**                   | type-safe, migration ดี, schema เดียวสร้างได้ทั้ง DB และ TypeScript types |
| Auth         | **NextAuth.js v5 (Auth.js)** beta | custom Credentials provider เชื่อม TU API                                 |
| QR (gen)     | **`qrcode`**                      | สร้าง QR data URL ฝั่ง client เพื่อแสดงบนจออาจารย์                        |
| Validation   | **Zod 4**                         | validate input ทุกจุด — form, API, env                                    |
| Roster parse | **`xlsx` + `papaparse`**          | อ่าน Excel/CSV ฝั่ง server เท่านั้น ลด client bundle                      |
| Icons        | **`lucide-react`**                | ไอคอนเบา ๆ สวย                                                            |
| Deployment   | **Vercel**                        | เข้ากับ Next.js ดีที่สุด, deploy อัตโนมัติจาก git                         |

> หมายเหตุ:
>
> - เคยเริ่มที่ Next 16.2.4 แล้ว downgrade กลับเป็น 15.5 เพื่อ stability
> - เคยพิจารณา Prisma 7 แล้วเลือก Prisma 5.22 เพราะ Prisma 7 เปลี่ยน architecture ใหญ่ เสี่ยงเกินไปสำหรับโปรเจกต์จบ

---

## 3. Architecture & ความคิดหลัก

### 3.1 รูปแบบการเขียน

- **Server Component เป็น default** ใส่ `"use client"` เฉพาะที่ต้องการ interaction
- **Server Actions** เป็น default pattern สำหรับ mutation จาก UI ภายในระบบ (form submit / button onClick)
- **Route Handlers** (`app/api/.../route.ts`) ใช้เฉพาะกรณีต้องเปิดให้ external client เรียก เช่น polling จาก client component, mobile

### 3.2 3-Layer Auth Defense

| Layer               | ที่ไหน                                                   | หน้าที่                                                   | เชื่อถือได้แค่ไหน                      |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| 1. Optimistic       | [`src/middleware.ts`](../../src/middleware.ts)           | redirect ถ้าไม่มี cookie session                          | **ต่ำ** — แค่ UX ห้ามใช้เป็น auth จริง |
| 2. Session callback | [`src/lib/auth-config.ts`](../../src/lib/auth-config.ts) | reject ถ้า email ไม่ใช่ `@dome.tu.ac.th` หรือ `@tu.ac.th` | กลาง                                   |
| 3. Authoritative    | Server Action / Route Handler / Server Component         | `await auth()` + DB query                                 | **สูง — ของจริง**                      |

**กฎเหล็ก:** Server Action ถูกเรียกตรงผ่าน HTTP POST ได้เสมอ ดังนั้นทุก Server Action ต้อง `requireAuth()` หรือ `requireTeacher()` หรือ `requireStudent()` ก่อนทำงาน

### 3.3 Real lane vs Demo lane

โปรเจกต์มี "ทาง" ของข้อมูลแยก 2 เลน:

- **Real lane** — `Attendance` + `User` + `Enrollment` คือข้อมูลจริง
- **Demo lane** — `DemoCheckIn` แยกตารางคนละชุด เปิด/ปิดด้วย `DEMO_CHECKIN_ENABLED`

เหตุผล: วันนำเสนอจริงคนทั่วไปอยากลองเล่นด้วยมือถือ แต่ต้องไม่ปนข้อมูลกับนักศึกษาจริง

### 3.4 เวลาฝั่ง server เท่านั้น

ทุกการคำนวณเวลา (เปิด session, เช็ค late, expired QR, auto-close) ใช้ server time (Asia/Bangkok) **ห้าม** เชื่อ timestamp จาก client เพราะนักศึกษาเปลี่ยนเวลาในมือถือได้

---

## 4. แยก Layer: Frontend / Backend / DevOps

### 4.1 Frontend

**สรุปง่าย:** ทุกอย่างที่ผู้ใช้เห็นและจับต้องบน browser

**เทคโนโลยีที่ใช้:**

- **Next.js App Router** — ทุกหน้าเขียนใน `src/app/` โดย folder = URL
- **React 19** Server Components default + Client Components (`"use client"`) เมื่อต้องการ state/effect
- **Tailwind CSS v4** — utility class ทุกที่
- **Lucide icons** — ไอคอนทั้งระบบ
- **`qrcode` package** — `QRCode.toDataURL(...)` ฝั่ง client เพื่อ render QR เป็นรูป
- **Polling pattern** — แทน WebSocket
  - QR rotation: client polling ทุก 30 วินาที → [`SessionView.tsx`](../../src/components/sessions/SessionView.tsx)
  - Live attendance list: polling ทุก 5 วินาที → [`CheckedInSidebar.tsx`](../../src/components/sessions/CheckedInSidebar.tsx)

**โฟลเดอร์หลัก:**

```
src/app/                  ← หน้าทั้งหมด
src/components/           ← UI components แยกตามฟีเจอร์
  ├── shell/              ← AppShell + Sidebar (layout หลัก)
  ├── sessions/           ← QR display + countdown
  ├── checkin/            ← หน้าเช็คชื่อมือถือ
  ├── courses/            ← form/button ของฝั่งอาจารย์
  └── import/             ← roster import modal
```

**ทำไมเลือกแบบนี้:** Server Components ลด JavaScript ที่ส่งให้ client → โหลดเร็วขึ้น
ส่วน Polling ใช้แทน WebSocket เพราะ Vercel serverless รองรับ poll ได้ดีกว่าและ debug ง่าย

### 4.2 Backend

**สรุปง่าย:** ทุกอย่างที่ทำงานบน server, query DB, ตัดสินใจด้าน security, และส่งข้อมูลกลับให้ frontend

**3 รูปแบบของ "backend code" ในโปรเจกต์นี้:**

#### (A) Server Actions

ไฟล์ขึ้นต้นด้วย `"use server"` — ใช้สำหรับ **mutation** จาก UI

| ไฟล์                                                               | ใช้ทำอะไร                                          |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| [`src/app/actions/course.ts`](../../src/app/actions/course.ts)     | สร้าง/ลบรายวิชา                                    |
| [`src/app/actions/roster.ts`](../../src/app/actions/roster.ts)     | upload CSV/XLSX, parse, สร้าง User + Enrollment    |
| [`src/app/actions/schedule.ts`](../../src/app/actions/schedule.ts) | สร้าง/ลบตารางสอนรายสัปดาห์                         |
| [`src/app/actions/session.ts`](../../src/app/actions/session.ts)   | เปิด/ปิด ClassSession + คำนวณเวลา + สร้าง QR token |
| [`src/app/actions/checkin.ts`](../../src/app/actions/checkin.ts)   | บันทึก Attendance จริง + DemoCheckIn               |

#### (B) Route Handlers (REST API)

ไฟล์ใน `src/app/api/.../route.ts` — ใช้สำหรับ **read endpoint** ที่ client component เรียก polling

| Endpoint                           | ทำอะไร                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /api/sessions/[id]/qr`        | คืน QR token ปัจจุบัน + rotate ถ้าหมดอายุ → [route.ts](../../src/app/api/sessions/[id]/qr/route.ts)      |
| `GET /api/sessions/[id]/checkins`  | คืนรายชื่อ check-in ล่าสุด (real + demo) → [route.ts](../../src/app/api/sessions/[id]/checkins/route.ts) |
| `GET/POST /api/auth/[...nextauth]` | endpoint ของ NextAuth (handle login/logout/session)                                                      |

#### (C) Lib Helpers (server-only utilities)

ไฟล์ใน `src/lib/` ขึ้นต้นด้วย `import "server-only"` — ห้าม client import เด็ดขาด

| ไฟล์                                                             | หน้าที่                                                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`src/lib/db.ts`](../../src/lib/db.ts)                           | Prisma client singleton (กัน hot-reload connection leak)                                      |
| [`src/lib/auth.ts`](../../src/lib/auth.ts)                       | NextAuth setup + Credentials provider + TU API call                                           |
| [`src/lib/auth-config.ts`](../../src/lib/auth-config.ts)         | shared config + email domain validation                                                       |
| [`src/lib/auth-helpers.ts`](../../src/lib/auth-helpers.ts)       | `requireAuth()`, `requireTeacher()`, `requireStudent()`, `requireCourseOwner()`               |
| [`src/lib/qr-config.ts`](../../src/lib/qr-config.ts)             | constants (`QR_REFRESH_INTERVAL_MS = 30s`, `QR_GRACE_WINDOW_MS = 30s`, `LATE_AFTER_MIN = 15`) |
| [`src/lib/qr-token.ts`](../../src/lib/qr-token.ts)               | `generateQrToken()` (32-byte random) + `generateEntryCode()` (6-digit)                        |
| [`src/lib/qr-rotate.ts`](../../src/lib/qr-rotate.ts)             | rotate token ถ้าหมดอายุ + เก็บ previous token                                                 |
| [`src/lib/qr-verify.ts`](../../src/lib/qr-verify.ts)             | verify token (current หรือ previous) + verify entry code                                      |
| [`src/lib/checkin.ts`](../../src/lib/checkin.ts)                 | `getCheckInContext(token)` + `isDemoCheckInEnabled()`                                         |
| [`src/lib/session-helpers.ts`](../../src/lib/session-helpers.ts) | `autoCloseIfExpired()` (lazy close หลัง endsAt + 30 นาที)                                     |
| [`src/lib/validations/*.ts`](../../src/lib/validations/)         | Zod schema ใช้ร่วม client/server                                                              |
| [`src/lib/nav-config.ts`](../../src/lib/nav-config.ts)           | nav items ของ teacher/student sidebar                                                         |

### 4.3 DevOps / Infra

**สรุปง่าย:** ทุกอย่างที่ทำให้โค้ด run ได้จริงบน production และ dev environment

| สิ่งที่ทำ        | เครื่องมือ                                                                                   | รายละเอียด                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Database hosting | Supabase (PostgreSQL managed)                                                                | region สิงคโปร์ มี connection pooling ใน free tier                            |
| DB migration     | Prisma migrations                                                                            | ทุกไฟล์ schema change อยู่ใน [`prisma/migrations/`](../../prisma/migrations/) |
| Deployment       | Vercel                                                                                       | deploy auto จาก main branch                                                   |
| Build pipeline   | `npm run build` = `prisma generate && next build`                                            | กัน type drift ระหว่าง schema และโค้ด                                         |
| Auth gate        | [`src/middleware.ts`](../../src/middleware.ts)                                               | optimistic redirect (Layer 1)                                                 |
| Env management   | `.env.local` (Next.js, gitignored) + `.env` (Prisma CLI)                                     | สอง env file เพราะ Prisma 5 CLI อ่าน `.env` เป็นหลัก                          |
| Feature flags    | `BYPASS_TU_AUTH=true` (dev login skip TU API) + `DEMO_CHECKIN_ENABLED=true` (เปิด demo lane) | เปิด/ปิดได้ระหว่าง local/production/showcase                                  |
| Secret handling  | NEVER commit `.env*`, `NEXTAUTH_SECRET` ตั้งบน Vercel                                        | ใช้ Vercel Environment Variables                                              |

**Migration ที่มีอยู่ตอนนี้:**

```
prisma/migrations/
├── 20260428112049_init/                       ← Phase 1: schema เริ่มต้น
├── 20260429050626_phase35_schedule_session/   ← Phase 3.5: Schedule + ClassSession + partial unique
├── 20260429060250_phase4_dynamic_qr/          ← Phase 4: เพิ่ม qrToken, entryCode ฯลฯ
└── 20260429072441_phase45_checkin_flow/       ← Phase 4.5: เพิ่ม DemoCheckIn table
```

---

## 5. Database Schema (สำหรับคนอ่อน backend)

> ส่วนนี้ตั้งใจขยายให้คนที่ไม่ค่อยเขียน backend อ่านเข้าใจได้ง่าย

### 5.1 ภาพใหญ่ของ DB — ใครเชื่อมกับใคร

ลองนึกภาพดังนี้:

```
┌────────┐      enroll       ┌────────┐
│  User  │◄─────────────────►│ Course │
│(student│                   │        │
│ teacher)│                  │        │
└────────┘                   └────────┘
                                 │
                                 │ มี
                                 ▼
                            ┌─────────┐
                            │Schedule │  ← ตารางสอนรายสัปดาห์ "ทุกวันจันทร์ 9-12"
                            └─────────┘
                                 │
                                 │ generate
                                 ▼
                          ┌──────────────┐
                          │ ClassSession │  ← คาบเรียนจริงครั้งหนึ่ง "วันนี้ 9-12 พุธ 1 พ.ค."
                          │ (มี QR token)│
                          └──────────────┘
                              │       │
                  ┌───────────┘       └────────────┐
                  ▼                                ▼
           ┌────────────┐                  ┌─────────────┐
           │ Attendance │                  │ DemoCheckIn │
           │ (จริง)     │                  │ (demo lane) │
           └────────────┘                  └─────────────┘
```

**อ่านสรุปแบบประโยค:**

- `User` มีทั้งอาจารย์และนักศึกษา แยกด้วย field `role`
- อาจารย์สร้าง `Course` → `Course.teacherId` ชี้กลับมาที่อาจารย์
- นักศึกษาลงเรียนผ่าน `Enrollment` ซึ่งเก็บคู่ `(studentId, courseId)`
- อาจารย์เพิ่ม `Schedule` ให้รายวิชา = ตารางสอนรายสัปดาห์ (วัน + เวลา)
- เมื่ออาจารย์ "เปิดคาบ" → ระบบสร้าง `ClassSession` 1 row ผูกกับ `Schedule`
- ใน `ClassSession` นี้มี `qrToken` + `entryCode` ที่หมุนทุก 30 วินาที
- นักศึกษาที่ลงทะเบียน + login + สแกน QR ทัน → สร้าง `Attendance` 1 row
- คนทั่วไปที่สแกน demo QR → สร้าง `DemoCheckIn` แยกตาราง

### 5.2 Cheat sheet ศัพท์ DB ฉบับภาษาคน

| ศัพท์                 | ความหมาย                                                      | ตัวอย่างในโปรเจกต์นี้                                             |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Primary Key**       | "เลขประจำตัว" ของแต่ละ row ห้ามซ้ำในตาราง                     | ทุกตารางใช้ `id String @id @default(cuid())`                      |
| **Foreign Key**       | ลิงก์ไปอีกตาราง บอกว่า "row นี้เกี่ยวกับ row ไหนของตารางอื่น" | `Course.teacherId` ชี้ไปที่ `User.id`                             |
| **Unique constraint** | บอกว่า "ค่าตรงนี้ห้ามมีซ้ำในทั้งตาราง"                        | `User.email @unique` กันสมัครซ้ำ                                  |
| **Composite unique**  | unique หลาย field รวมกัน                                      | `Attendance @@unique([classSessionId, studentId])` กันเช็คชื่อซ้ำ |
| **Partial unique**    | unique เฉพาะแถวที่ตรงเงื่อนไข                                 | `ClassSession` หนึ่งวิชามี open ได้แค่ 1 ตัวต่อช่วงเวลา           |
| **Index**             | "สารบัญ" ของตาราง ช่วยค้นหาเร็วขึ้น (แต่เพิ่มพื้นที่นิดหน่อย) | `@@index([studentId])` ใช้เวลา query attendance ของนักศึกษา       |
| **Cascade delete**    | ลบพ่อแล้วลบลูกตามอัตโนมัติ                                    | ลบ `ClassSession` → ลบ `Attendance` ทั้งหมดของ session นั้น       |
| **Restrict delete**   | ลบพ่อไม่ได้ถ้ายังมีลูก                                        | ลบ `User` (teacher) ไม่ได้ถ้ายังมี Course ของอาจารย์คนนี้         |
| **`cuid()`**          | สุ่ม id แบบ short, sortable, ไม่ collide                      | ใช้แทน UUID เพราะสั้นกว่าและเหมาะกับ index                        |

### 5.3 ตารางทีละตัว

ไฟล์อ้างอิง: [`prisma/schema.prisma`](../../prisma/schema.prisma)

#### `User` — เก็บคนทั้งหมด (อาจารย์ + นักศึกษา)

| Field                  | ประเภท          | หน้าที่                                               |
| ---------------------- | --------------- | ----------------------------------------------------- |
| `id`                   | cuid            | เลขประจำตัว                                           |
| `email`                | unique          | อีเมลที่ใช้ login (`@dome.tu.ac.th` หรือ `@tu.ac.th`) |
| `name`                 | string          | ชื่อแสดงผล                                            |
| `studentId`            | nullable unique | รหัสนักศึกษา 10 หลัก (null สำหรับอาจารย์)             |
| `role`                 | enum            | `TEACHER` หรือ `STUDENT`                              |
| `accounts`, `sessions` | relation        | NextAuth standard models                              |
| `taughtCourses`        | relation        | คอร์สที่อาจารย์คนนี้สอน                               |
| `enrollments`          | relation        | คอร์สที่นักศึกษาคนนี้ลงเรียน                          |
| `attendances`          | relation        | ประวัติเช็คชื่อทั้งหมด                                |

**Index:** `@@index([role])`, `@@index([studentId])` — เพื่อ query เร็วเวลาดูเฉพาะ student

**ทำไม:** ตารางเดียวเก็บทั้ง 2 role ลด complexity เยอะมาก (ไม่ต้องมี `Teacher` กับ `Student` แยก) — แยกด้วย `role` พอ

#### `Course` — รายวิชา

| Field       | หน้าที่                                                  |
| ----------- | -------------------------------------------------------- |
| `code`      | เช่น `CS101 Sec650001` (ไม่ unique global เผื่อข้ามเทอม) |
| `name`      | ชื่อวิชาเต็ม                                             |
| `semester`  | เช่น `1/2026`                                            |
| `teacherId` | foreign key → `User.id` (เจ้าของวิชา)                    |

**Constraint:** `@@unique([code, semester, teacherId])` กันอาจารย์คนเดียวสร้างวิชาซ้ำในเทอมเดียว
**Cascade rule:** ถ้าลบ teacher จะ `Restrict` (ลบไม่ได้) — ป้องกันข้อมูลเสียหาย

#### `Enrollment` — ใครลงเรียนวิชาอะไร

| Field       | หน้าที่                   |
| ----------- | ------------------------- |
| `studentId` | foreign key → `User.id`   |
| `courseId`  | foreign key → `Course.id` |

**Constraint:** `@@unique([studentId, courseId])` กันลงทะเบียนซ้ำ
**Cascade rule:** ถ้าลบ Course → ลบ Enrollment ทิ้งหมด (`onDelete: Cascade`)

**ทำไมต้องมีตารางนี้:** ความสัมพันธ์ student-course เป็น many-to-many (นักศึกษาลงหลายวิชา + วิชามีหลายนักศึกษา) DB relational ทำ M:N ไม่ได้ตรง ๆ ต้องมีตาราง "เชื่อม" ตรงกลาง

#### `Schedule` — ตารางสอนรายสัปดาห์

| Field       | หน้าที่                                                           |
| ----------- | ----------------------------------------------------------------- |
| `courseId`  | foreign key → `Course`                                            |
| `dayOfWeek` | 0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์ (ตรงกับ `Date.getDay()` ของ JS) |
| `startTime` | string `"HH:MM"` 24h เช่น `"09:00"`                               |
| `endTime`   | string `"HH:MM"`                                                  |
| `room`      | optional ห้อง เช่น `"SC-3001"`                                    |

**ทำไมเก็บเวลาเป็น string ไม่ใช่ DateTime:** Schedule เป็น recurring pattern ที่ไม่ผูกกับวันใดวันหนึ่ง การเก็บเป็น `"09:00"` ตรงไปตรงมาและไม่ต้องสน timezone

#### `ClassSession` — คาบเรียนจริงครั้งหนึ่ง (ของวันใดวันหนึ่ง)

⚠️ ระวังสับสนกับ `Session` ของ NextAuth — เปลี่ยนชื่อเป็น `ClassSession` เพื่อกันชนกัน

| Field                                 | หน้าที่                                                |
| ------------------------------------- | ------------------------------------------------------ |
| `courseId`, `scheduleId`              | foreign key (required ทั้งคู่)                         |
| `startsAt`, `endsAt`                  | server time (UTC) ของคาบนี้                            |
| `lateAfter`                           | หลังเวลานี้ถือว่ามาสาย (default = startsAt + 15 นาที)  |
| `qrToken`                             | 32-byte random base64url ปัจจุบัน (`@unique`)          |
| `qrTokenExpiresAt`                    | หมดอายุเมื่อไหร่                                       |
| `qrRefreshedAt`                       | rotate ครั้งล่าสุดเมื่อไหร่                            |
| `qrPrevToken`, `qrPrevTokenExpiresAt` | token ของรอบก่อน + เวลาที่ยอมรับได้ (grace window 30s) |
| `entryCode`, `entryCodePrev`          | รหัส 6 หลัก fallback ถ้ากล้องมือถือเสีย                |
| `isOpen`                              | true = ยังรับ check-in, false = ปิดแล้ว                |
| `closedAt`                            | เวลาปิดจริง                                            |

**Special index (raw SQL):**

```sql
CREATE UNIQUE INDEX "ClassSession_one_open_per_course"
ON "ClassSession"("courseId") WHERE "isOpen" = true;
```

**ทำไม:** กันที่ระดับ DB ว่า "1 วิชาเปิดได้แค่ 1 session ในเวลาเดียวกัน" — แม้คนกดเปิดซ้ำเร็ว ๆ ก็ไม่เกิด session ซ้อน

#### `Attendance` — บันทึกการเช็คชื่อ "จริง"

| Field                    | หน้าที่                                              |
| ------------------------ | ---------------------------------------------------- |
| `classSessionId`         | foreign key → `ClassSession`                         |
| `studentId`              | foreign key → `User`                                 |
| `status`                 | `PRESENT` / `LATE` / `ABSENT`                        |
| `checkedInAt`            | server time (default `now()`) — **ห้ามเชื่อ client** |
| `ipAddress`, `userAgent` | optional forensics                                   |

**Constraint สำคัญที่สุด:** `@@unique([classSessionId, studentId])` — กัน 3 อย่างพร้อมกัน:

1. **Replay attack** — สแกน token เดิมซ้ำไม่ได้
2. **Race condition** — กดเร็ว ๆ 2 ครั้ง → DB จะ throw `P2002` ครั้งที่ 2 → server catch แล้วคืน "duplicate"
3. **เช็คชื่อ 2 รอบในคาบเดียวกัน** — DB block ตรง ๆ

#### `DemoCheckIn` — แยกตาราง สำหรับ public showcase

| Field                    | หน้าที่                               |
| ------------------------ | ------------------------------------- |
| `classSessionId`         | ผูกกับ session ที่เปิดอยู่            |
| `displayName`            | ชื่อที่ผู้สแกนพิมพ์เอง (max 80 chars) |
| `checkedInAt`            | server time                           |
| `ipAddress`, `userAgent` | optional                              |

**ทำไมแยกตาราง:** คนที่มาลองงานอาจไม่ใช่นักศึกษา TU จริง ไม่ควรสร้าง fake `User`/`Enrollment` แล้วก็ไม่ควรปนกับ `Attendance` จริง — แยกตารางทำให้ Phase 5 (report) แยกข้อมูลได้ง่าย

#### `Account`, `Session`, `VerificationToken` — มาตรฐาน NextAuth

ตาราง 3 ตัวนี้เป็น schema มาตรฐานของ NextAuth/Auth.js ใช้ตอนเปิด PrismaAdapter (ตอนนี้ยังใช้ JWT strategy แต่ schema เผื่อไว้)

### 5.4 Schema Decision สำคัญ

| เรื่อง            | ตัดสินใจ                                  | ทำไม                                                  |
| ----------------- | ----------------------------------------- | ----------------------------------------------------- |
| Primary key       | `cuid()`                                  | สั้นกว่า UUID, sortable, ไม่ collide                  |
| Session naming    | `ClassSession` แทน `Session`              | กันชนกับ NextAuth Session                             |
| NextAuth strategy | JWT (ไม่ใช้ PrismaAdapter)                | ลด moving parts สำหรับ Phase 2                        |
| Demo data         | ตาราง `DemoCheckIn` แยก                   | ไม่ปนกับ Attendance จริง                              |
| One open session  | partial unique index                      | กันที่ระดับ DB ไม่ใช่แค่ที่โค้ด                       |
| QR token          | random 32-byte ใน DB (opaque) ไม่ใช่ JWT  | revoke ได้ทันที, DB เป็น source of truth              |
| Previous token    | เก็บไว้ 1 รอบพร้อม `qrPrevTokenExpiresAt` | กรณีนักศึกษาสแกนตอน QR เพิ่ง rotate (window รวม ~60s) |

### 5.5 ตัวอย่างชีวิตจริง — เกิดอะไรใน DB ตอน check-in 1 ครั้ง

**สมมติ** อาจารย์ A เปิดคาบ CS101 วันนี้ 9:00 น. นักศึกษา B (รหัส 0000000001) สแกน QR ตอน 9:05 น.

1. **อาจารย์กด "เปิด session"** → server เรียก `openSession(scheduleId)`:
   - Insert `ClassSession` ใหม่: `{ courseId, scheduleId, startsAt: 09:00, endsAt: 12:00, lateAfter: 09:15, qrToken: "abc...", qrTokenExpiresAt: 09:00:30, isOpen: true, entryCode: "382947" }`
   - DB block ถ้ามี session อื่นของ course นี้ที่ `isOpen=true` (partial unique index)
2. **client polling ทุก 30s** → `GET /api/sessions/[id]/qr` → ถ้า `qrTokenExpiresAt < now` ก็ rotate
   - `update`: เก็บ token เดิมใน `qrPrevToken`, `qrPrevTokenExpiresAt = now + 30s`, สร้าง token ใหม่
3. **นักศึกษา B สแกน QR** → browser เปิด `/checkin?t=<token>`
4. **`checkInWithQrToken(token)`** ทำงาน:
   - `requireStudent()` → เช็ก JWT มี `role: STUDENT`
   - `verifyQrToken(token)` → query `ClassSession` หา `qrToken === token` (หรือ `qrPrevToken`)
   - check `Enrollment(studentId=B, courseId=CS101)` → ต้องมี
   - check `Attendance(classSessionId, studentId=B)` → ถ้ามีแล้ว return duplicate
   - คำนวณ `status = PRESENT` (ยังไม่เกิน `lateAfter` 09:15)
   - Insert `Attendance` row ใหม่: `{ classSessionId, studentId: B, status: PRESENT, checkedInAt: 09:05 (server time), ipAddress, userAgent }`
   - ถ้า race condition (กด 2 ครั้งพร้อมกัน) → ครั้งที่ 2 โดน `P2002` → catch แล้วคืน "duplicate" แทน error
5. **อาจารย์เห็นชื่อ B โผล่ใน sidebar** ภายใน 5 วินาที (`/api/sessions/[id]/checkins` polling)

---

## 6. Phase-by-Phase Breakdown

### Phase 0 — Project Setup ✅

**เป้าหมาย:** ตั้ง Next.js project + context architecture (PRP, STATE, INSTRUCTIONS)

**ทำอะไร:**

- สร้าง Next.js 16.2.4 → downgrade เป็น 15.5.15 เพื่อ stability
- Fix ESLint config สำหรับ Next 15 (ESM resolver)
- เขียนเอกสารข้อกำหนดโปรเจกต์, บันทึกสถานะ, และ [`docs/prps/`](../prps/) — เพื่อให้รอบพัฒนาถัดไปไม่หลงทาง
- เขียน PRP 01 เป็น blueprint สำหรับ DB schema

**ทำไม:** Final project ต้อง maintain ผ่านหลาย session — ต้องมี "หลักฐานความเข้าใจ" เป็นเอกสารกลาง

**ไฟล์สำคัญ:**

- เอกสารข้อกำหนดโปรเจกต์ — กฎเหล็กของโปรเจกต์
- บันทึกสถานะโปรเจกต์ — current status และ decision log

### Phase 1 — Database ✅

**เป้าหมาย:** schema แรกพร้อม seed

**ทำอะไร:**

- สร้าง Supabase project (region สิงคโปร์)
- ติดตั้ง Prisma 5.22 + `server-only`
- เขียน [`prisma/schema.prisma`](../../prisma/schema.prisma) ครบทุก model
- มี `.env` (Prisma) + `.env.local` (Next.js) — ทั้งคู่ gitignored
- รัน initial migration ขึ้น Supabase
- สร้าง [`src/lib/db.ts`](../../src/lib/db.ts) singleton กัน hot-reload connection leak
- เขียน seed script ([`prisma/seed.ts`](../../prisma/seed.ts)) สำหรับ teacher/student dev account

**ใช้อะไร:** Prisma 5.22, PostgreSQL บน Supabase

**ไฟล์สำคัญที่ควรเปิดดู:** [`prisma/schema.prisma`](../../prisma/schema.prisma), [`src/lib/db.ts`](../../src/lib/db.ts)

### Phase 2 — Auth via TU API ✅

**เป้าหมาย:** login จริงผ่าน TU REST API ผ่าน NextAuth v5 Custom Credentials provider

**ทำอะไร:**

- ติดตั้ง NextAuth v5 beta + Zod + lucide-react
- สร้าง [`src/lib/auth.ts`](../../src/lib/auth.ts):
  - `Credentials({ authorize })` ที่เรียก `https://restapi.tu.ac.th/api/v1/auth/Ad/verify`
  - Validate response ด้วย `tuAuthResponseSchema` (Zod)
  - Filter เฉพาะ `tu_status === "ปกติ"` สำหรับ student
  - Upsert user (สร้างใหม่หรือ update name) — **ห้าม update role** ของ user เดิม
  - มี **BYPASS mode** (`BYPASS_TU_AUTH=true`) สำหรับ dev: ไม่เรียก TU API, lookup จาก DB ตาม email อย่างเดียว
- สร้าง [`src/lib/auth-helpers.ts`](../../src/lib/auth-helpers.ts) — `requireAuth/Teacher/Student/CourseOwner`
- สร้าง [`src/middleware.ts`](../../src/middleware.ts) — optimistic auth gate (Layer 1)
- สร้างหน้า [`/login`](<../../src/app/(auth)/login/page.tsx>) (server shell + client form)

**Decision สำคัญ:**

- ใช้ JWT session strategy (ยังไม่ใช้ PrismaAdapter) — ลด moving parts
- Real TU login upsert user แต่ไม่ update role — กัน privilege drift
- ใช้ทั้ง `.env.local` และ `.env` — Next.js อ่าน `.env.local`, Prisma 5 CLI อ่าน `.env`

**ไฟล์สำคัญ:** [`src/lib/auth.ts`](../../src/lib/auth.ts), [`src/lib/auth-config.ts`](../../src/lib/auth-config.ts), [`src/lib/auth-helpers.ts`](../../src/lib/auth-helpers.ts), [`src/middleware.ts`](../../src/middleware.ts)

### Phase 3 — Teacher Courses + Roster Import ✅

**เป้าหมาย:** อาจารย์สร้างวิชา + import นักศึกษาด้วย CSV/XLSX ได้

**ทำอะไร:**

- ติดตั้ง `xlsx`, `papaparse`, `qrcode`
- เพิ่ม QRoll brand color + Sarabun font ใน Tailwind
- Root redirect ตาม role: teacher → `/teacher`, student → `/student` ([`src/app/page.tsx`](../../src/app/page.tsx))
- AppShell + Sidebar + UserCard ([`src/components/shell/`](../../src/components/shell/))
- Nav config role-aware ([`src/lib/nav-config.ts`](../../src/lib/nav-config.ts))
- หน้า `/teacher`, `/teacher/courses`, `/teacher/courses/[id]`, `/teacher/courses/new`, `/teacher/settings`
- Server Actions:
  - [`src/app/actions/course.ts`](../../src/app/actions/course.ts) — create/delete course
  - [`src/app/actions/roster.ts`](../../src/app/actions/roster.ts) — parse CSV/XLSX ฝั่ง server, validate ทุก row, upsert user, สร้าง enrollment
- เพิ่ม `requireCourseOwner(courseId)` ใน auth-helpers — ownership guard ที่เดียว

**Decision สำคัญ:**

- Roster parse ฝั่ง server เท่านั้น (`xlsx` + `papaparse`) — ลด client bundle, validate ฝั่ง server
- จำกัด file 1MB / 500 rows — กัน DoS
- Upsert user แต่ **ห้าม update role** — เคารพ Phase 2 decision
- Header normalization รับได้ทั้งภาษาไทย/อังกฤษ (`รหัสนักศึกษา` / `studentId` / `id`)

### Phase 3.5 — Schedule + ClassSession Lifecycle ✅

**เป้าหมาย:** อาจารย์เพิ่มตารางสอนรายสัปดาห์ + เปิด/ปิด ClassSession

**ทำอะไร:**

- เพิ่ม `Schedule` model + migration `phase35_schedule_session`
- เพิ่ม `ClassSession.scheduleId` (required) — กัน orphan session
- Partial unique index `WHERE isOpen=true` ที่ระดับ DB
- Zod schema ตรวจ time format `HH:MM`, dayOfWeek 0-6, startTime < endTime ([`src/lib/validations/schedule.ts`](../../src/lib/validations/schedule.ts))
- Server Actions:
  - [`src/app/actions/schedule.ts`](../../src/app/actions/schedule.ts) — create/delete schedule
  - [`src/app/actions/session.ts`](../../src/app/actions/session.ts) — open/close session, แปลง Bangkok time → UTC server-side
- [`src/lib/session-helpers.ts`](../../src/lib/session-helpers.ts) — `autoCloseIfExpired()` ลบ token ทิ้งและ set `isOpen=false` ถ้าเลย `endsAt + 30 นาที`
- Schedule tab ใน course detail (`?tab=schedule`)
- Today schedule ใน teacher dashboard (Bangkok timezone)

**Decision สำคัญ:**

- Schedule = recurring weekly (`dayOfWeek`, `startTime`, `endTime`) — ง่ายและพอสำหรับ MVP
- เปิด session ด้วย manual button เท่านั้น — ไม่ต้อง cron worker
- Auto-close แบบ lazy ที่ `endsAt + 30min` — ปลอดภัยกว่าเปิดค้างและไม่ต้องใช้ background worker
- Partial unique index ที่ DB — ป้องกัน double-open ระดับล่างสุด

### Phase 4 — Dynamic QR Display ✅

**เป้าหมาย:** สร้าง QR ที่หมุนทุก 30 วินาที + แสดง fullscreen + entry code fallback

**ทำอะไร:**

- เพิ่ม schema fields ใน `ClassSession`: `qrToken`, `qrTokenExpiresAt`, `qrRefreshedAt`, `qrPrevToken`, `qrPrevTokenExpiresAt`, `entryCode`, `entryCodePrev`, `lateAfter` + migration `phase4_dynamic_qr`
- `openSession` generate token แรก + entry code + คำนวณ `lateAfter` ([`src/app/actions/session.ts`](../../src/app/actions/session.ts))
- Cleanup token ทั้งหมดเมื่อปิดหรือ auto-close
- QR helpers:
  - [`src/lib/qr-config.ts`](../../src/lib/qr-config.ts) — constants
  - [`src/lib/qr-token.ts`](../../src/lib/qr-token.ts) — `generateQrToken()` + `generateEntryCode()`
  - [`src/lib/qr-rotate.ts`](../../src/lib/qr-rotate.ts) — `rotateIfExpired()` (atomic update)
  - [`src/lib/qr-verify.ts`](../../src/lib/qr-verify.ts) — `verifyQrToken()` + `verifyEntryCode()` (รองรับ current + previous)
- API: [`/api/sessions/[id]/qr`](../../src/app/api/sessions/[id]/qr/route.ts) — polling endpoint
- UI:
  - [`SessionView.tsx`](../../src/components/sessions/SessionView.tsx) — QR + countdown + polling
  - [`QrDisplay.tsx`](../../src/components/sessions/QrDisplay.tsx) — แสดง QR + animation
  - [`EntryCodeCard.tsx`](../../src/components/sessions/EntryCodeCard.tsx) — รหัส 6 หลัก
  - [`FullscreenButton.tsx`](../../src/components/sessions/FullscreenButton.tsx) — ขยาย full screen สำหรับฉาย
  - [`CheckedInSidebar.tsx`](../../src/components/sessions/CheckedInSidebar.tsx) — skeleton (Phase 4.5 implement จริง)

**Decision สำคัญ:**

- Client polling 30s → ดูแลง่าย, debug ง่าย, เข้ากับ Vercel serverless
- DB-backed opaque token 32-byte (ไม่ใช่ JWT) → revoke ได้ทันที, DB เป็น source of truth
- เก็บ previous token 1 รอบ → grace window 30s กันสแกนพลาดตอน rotate
- Entry code 6 หลัก fallback → ใช้ได้ตอนกล้องเสีย, หมดอายุพร้อม token
- ไม่มี Pause/Resume ใน v1 → ลด complexity, workaround = ปิด session แล้วเปิดใหม่

### Phase 4.5 — Student Check-in Flow ✅ (สถานะปัจจุบัน)

**เป้าหมาย:** ปิด loop "QR → สแกน → login → ยืนยัน → DB" + แยก demo lane

**ทำอะไร:**

- เพิ่ม `DemoCheckIn` model + migration `phase45_checkin_flow`
- Server Actions [`src/app/actions/checkin.ts`](../../src/app/actions/checkin.ts):
  - `checkInWithQrToken(token)` — real flow: validate token → require student → verify enrollment → handle duplicate → insert Attendance
  - `demoCheckInWithQrToken(token, displayName)` — demo flow: gate ด้วย `DEMO_CHECKIN_ENABLED` → validate → insert DemoCheckIn
- Lib: [`src/lib/checkin.ts`](../../src/lib/checkin.ts) — `getCheckInContext()` รวม validate + load session + auto-close
- Validation: [`src/lib/validations/checkin.ts`](../../src/lib/validations/checkin.ts) — `qrTokenSchema`, `demoCheckInSchema`
- หน้าใหม่:
  - [`/checkin?t=<token>`](../../src/app/checkin/page.tsx) — real student check-in (mobile)
  - [`/demo/checkin?t=<token>`](../../src/app/demo/checkin/page.tsx) — demo (public)
- Components: [`CheckInShell`](../../src/components/checkin/CheckInShell.tsx), [`SessionSummary`](../../src/components/checkin/SessionSummary.tsx), [`StudentCheckInForm`](../../src/components/checkin/StudentCheckInForm.tsx), [`DemoCheckInForm`](../../src/components/checkin/DemoCheckInForm.tsx), [`StatusPanel`](../../src/components/checkin/StatusPanel.tsx)
- แก้ middleware preserve `pathname + search` ตอน redirect ไป login → กลับมาที่ `/checkin?t=<token>` เดิมได้
- Allow `/demo/checkin` เป็น public route
- Wire teacher session live sidebar — แสดง real attendance + demo check-ins แยกกัน
- Polling endpoint: [`/api/sessions/[id]/checkins`](../../src/app/api/sessions/[id]/checkins/route.ts)
- หน้าฝั่ง student: `/student`, `/student/courses`, `/student/history`

**Decision สำคัญ:**

- Real check-in ใช้ login identity เท่านั้น ไม่ให้เลือกชื่อ — login = ตัวตน, QR = คาบ, enrollment = สิทธิ์
- Demo แยก URL + แยก table + แยก env flag — ไม่ปนข้อมูล
- Demo gate ด้วย `DEMO_CHECKIN_ENABLED` — เปิด showcase, ปิด production
- Server time เท่านั้น — ห้ามเชื่อเวลา client
- Open session ซ้ำ → redirect ไป session เดิม (ไม่ throw P2002 ขึ้นหน้า)

> **Phase 4.5 review ละเอียด** อยู่ใน [`phase-4.5-review.md`](phase-4.5-review.md) (ของเดิม รายละเอียด file-by-file)

---

## 7. แผนผังหน้า UI ทั้งหมด

### 7.1 Sitemap ภาพรวม (สถานะปัจจุบัน)

```
/                                  ← root redirect ตาม role
├── /login                         ← public, เข้าสู่ระบบ
│
├── (Teacher routes — role=TEACHER)
│   ├── /teacher                   ← 🌟 dashboard หลักของอาจารย์
│   ├── /teacher/courses           ← list รายวิชาที่สอน
│   │   ├── /teacher/courses/new   ← form สร้างวิชา
│   │   └── /teacher/courses/[id]  ← course detail (tab roster + schedule)
│   ├── /teacher/sessions/[id]     ← 🌟🌟 Dynamic QR Display (พระเอก)
│   └── /teacher/settings          ← ดูข้อมูลผู้ใช้
│
├── (Student routes — role=STUDENT)
│   ├── /student                   ← dashboard นักศึกษา
│   ├── /student/courses           ← วิชาที่ลงเรียน
│   └── /student/history           ← ประวัติเช็คชื่อ
│
├── /checkin?t=<token>             ← 🌟🌟 Student check-in (พระเอก)
└── /demo/checkin?t=<token>        ← public demo (ต้องเปิด env)
```

### 7.2 หน้าที่มีตอนนี้แล้ว (15 หน้า)

> สัญลักษณ์: 🌟🌟 = พระเอกหลัก ใช้ทุกคาบ | 🌟 = ใช้ประจำ | ⭐ = ใช้บางครั้ง | ◽ = ใช้นาน ๆ ครั้ง

| #   | URL                               | ไฟล์                                                             | ใครใช้            | ความถี่                 | หน้าที่                                                         |
| --- | --------------------------------- | ---------------------------------------------------------------- | ----------------- | ----------------------- | --------------------------------------------------------------- |
| 1   | `/`                               | [page.tsx](../../src/app/page.tsx)                               | ทุกคน             | ทุกครั้งที่เปิดเว็บ     | redirect ตาม role/login                                         |
| 2   | `/login`                          | [page.tsx](<../../src/app/(auth)/login/page.tsx>)                | ทุกคน             | ครั้งแรก/หมด session    | กรอก username/password (TU API หรือ bypass dev)                 |
| 3   | `/teacher`                        | [page.tsx](<../../src/app/(app)/teacher/page.tsx>)               | 🌟 อาจารย์        | เปิดทุกครั้งที่ login   | dashboard: สถิติ + ตารางสอนวันนี้ + ปุ่มเปิด session            |
| 4   | `/teacher/courses`                | [page.tsx](<../../src/app/(app)/teacher/courses/page.tsx>)       | ⭐ อาจารย์        | เริ่มเทอม + check จำนวน | list วิชาทั้งหมด + ปุ่มสร้าง                                    |
| 5   | `/teacher/courses/new`            | [page.tsx](<../../src/app/(app)/teacher/courses/new/page.tsx>)   | ◽ อาจารย์        | เริ่มเทอม               | form สร้างวิชา (code, name, semester)                           |
| 6   | `/teacher/courses/[id]`           | [page.tsx](<../../src/app/(app)/teacher/courses/[id]/page.tsx>)  | ⭐ อาจารย์        | จัดการวิชา              | tabs: roster (import นักศึกษา) + schedule (เพิ่มตารางสอน)       |
| 7   | `/teacher/sessions/[id]`          | [page.tsx](<../../src/app/(app)/teacher/sessions/[id]/page.tsx>) | **🌟🌟 อาจารย์**  | **ทุกคาบที่สอน**        | **Dynamic QR Display** + countdown + entry code + live sidebar  |
| 8   | `/teacher/settings`               | [page.tsx](<../../src/app/(app)/teacher/settings/page.tsx>)      | ◽ อาจารย์        | นาน ๆ ครั้ง             | ดูข้อมูลผู้ใช้ (placeholder)                                    |
| 9   | `/student`                        | [page.tsx](<../../src/app/(app)/student/page.tsx>)               | 🌟 นักศึกษา       | เปิดทุกครั้งที่ login   | dashboard: จำนวนวิชา + ประวัติล่าสุด                            |
| 10  | `/student/courses`                | [page.tsx](<../../src/app/(app)/student/courses/page.tsx>)       | ◽ นักศึกษา       | นาน ๆ ครั้ง             | list วิชาที่ลงเรียน                                             |
| 11  | `/student/history`                | [page.tsx](<../../src/app/(app)/student/history/page.tsx>)       | ⭐ นักศึกษา       | check ตัวเองว่ามาครบไหม | ประวัติ check-in ทั้งหมด                                        |
| 12  | `/checkin?t=<token>`              | [page.tsx](../../src/app/checkin/page.tsx)                       | **🌟🌟 นักศึกษา** | **ทุกคาบที่เรียน**      | **Real check-in mobile page** — แสดง session, ตัวตน, ปุ่มยืนยัน |
| 13  | `/demo/checkin?t=<token>`         | [page.tsx](../../src/app/demo/checkin/page.tsx)                  | สาธารณะ           | วันนำเสนอ               | demo check-in (พิมพ์ชื่อ)                                       |
| 14  | API `/api/sessions/[id]/qr`       | [route.ts](../../src/app/api/sessions/[id]/qr/route.ts)          | (internal)        | polling 30s             | คืน QR token ปัจจุบัน + rotate                                  |
| 15  | API `/api/sessions/[id]/checkins` | [route.ts](../../src/app/api/sessions/[id]/checkins/route.ts)    | (internal)        | polling 5s              | คืนรายชื่อ check-in ล่าสุด                                      |

#### พระเอก 3 ตัวที่ต้องเน้นทดสอบและขัดเกลา UX มากที่สุด

1. **🌟🌟 [`/teacher/sessions/[id]`](../../src/components/sessions/SessionView.tsx)** — Dynamic QR Display
   - อาจารย์เปิดทุกคาบ ใช้ฉายขึ้นจอใหญ่หน้าห้อง
   - มี QR ใหญ่กลางจอ + countdown + entry code + sidebar live names
   - มี fullscreen mode สำหรับ projector
   - **ถ้าหน้านี้พัง = สอนไม่ได้**

2. **🌟🌟 [`/checkin?t=<token>`](../../src/app/checkin/page.tsx)** — Student Check-in
   - นักศึกษาทุกคนใช้ทุกคาบ
   - mobile-first
   - state ครบ: missing token, invalid, expired, closed, wrong role, ready, success, late, duplicate, not enrolled
   - **ถ้าหน้านี้พัง = นักศึกษาเช็คชื่อไม่ได้**

3. **🌟 [`/teacher`](<../../src/app/(app)/teacher/page.tsx>)** — Teacher Dashboard
   - อาจารย์เห็นทุกครั้งที่ login
   - แสดงตารางสอนวันนี้ + ปุ่ม "เปิด session" ตรงนั้นเลย
   - ลด click จาก dashboard → courses → schedule → open ให้เหลือ click เดียว

### 7.3 หน้าที่ยังไม่มี + วางแผนทำต่อ

#### Phase 5 — Teacher Dashboard + Reports

| URL ที่จะเพิ่ม                                    | ทำอะไร                                                         | เหตุผล                     |
| ------------------------------------------------- | -------------------------------------------------------------- | -------------------------- |
| `/teacher/sessions/[id]/report`                   | สรุปคาบเรียนหลังปิด: present/late/absent count, รายชื่อ        | อาจารย์ต้อง review หลังคาบ |
| `/teacher/courses/[id]/dashboard` (หรือ tab ใหม่) | dashboard รายวิชา: %เข้าเรียนเฉลี่ย, นักศึกษาที่ขาดบ่อย, trend | สรุปทั้งเทอม               |
| tab ใหม่ใน `/teacher/courses/[id]?tab=attendance` | matrix ของแต่ละ session × นักศึกษา                             | ดูแบบ spreadsheet          |
| ปรับ `/teacher` dashboard                         | ใส่ "อัตราเข้าเรียนเฉลี่ย" จริง (ตอนนี้ placeholder `—`)       | KPI หลัก                   |

#### Phase 6 — Geofence + Manual Edit + Export

| URL/Feature ที่จะเพิ่ม                   | ทำอะไร                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Geofence settings ใน Schedule form       | ใส่ `lat`, `lng`, `radiusMeters` → check Haversine ตอน check-in                    |
| Manual edit modal ใน report page         | อาจารย์แก้ status (PRESENT ↔ LATE ↔ ABSENT) ของนักศึกษาคนใดคนหนึ่ง พร้อม audit log |
| Export modal                             | เลือกช่วงเทอม/วิชา → ดาวน์โหลด CSV/PDF                                             |
| /teacher/courses/[id]/exports (optional) | history ของ export ที่เคยทำ                                                        |

#### Phase 7 — Face Scan + Email + Settings

| URL/Feature ที่จะเพิ่ม                                             | ทำอะไร                                              |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| `/checkin/face` หรือ step ต่อจาก QR                                | Face scan ผ่าน face-api.js — เพิ่ม layer 2nd-factor |
| Notification settings ใน `/teacher/settings` + `/student/settings` | toggle email แจ้งเตือนตอนขาดเรียน                   |
| Email service integration                                          | ส่งเมลสรุปสัปดาห์/เดือน                             |
| Mobile-optimized polish ทุกหน้า student                            | hamburger nav, bottom sheet form, touch target      |

### 7.4 ตารางสรุปเปรียบเทียบ

| หมวด             | จำนวนหน้า ตอนนี้ | หน้าที่ต้องเพิ่ม                                                                            | priority |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------------- | -------- |
| Auth             | 1 (`/login`)     | (อาจเพิ่ม `/forgot-password` ถ้ามี local account)                                           | low      |
| Teacher core     | 6 หน้า           | report (Phase 5), dashboard course-level (Phase 5), manual edit (Phase 6), export (Phase 6) | **high** |
| Teacher session  | 1 หน้า (พระเอก)  | (อาจเพิ่ม session report แยกหน้า)                                                           | high     |
| Student core     | 3 หน้า           | settings (Phase 7)                                                                          | medium   |
| Student check-in | 1 หน้า (พระเอก)  | face scan step (Phase 7)                                                                    | medium   |
| Demo             | 1 หน้า           | (พอ — ไม่ขยาย)                                                                              | done     |
| Internal API     | 2 routes         | report API (Phase 5), export API (Phase 6)                                                  | high     |

---

## 8. Security Model — 8 ช่องโหว่ที่ต้องอุด

| #   | ช่องโหว่                       | วิธีกัน                                                                     | ที่ implement                                                                                                      |
| --- | ------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Replay attack (ใช้ token ซ้ำ)  | One-time token + `@@unique([classSessionId, studentId])`                    | [`schema.prisma`](../../prisma/schema.prisma), [`actions/checkin.ts`](../../src/app/actions/checkin.ts)            |
| 2   | QR screenshot ส่งต่อ           | Dynamic QR rotate 30s + `qrTokenExpiresAt` ใน DB                            | [`qr-rotate.ts`](../../src/lib/qr-rotate.ts)                                                                       |
| 3   | Login bypass                   | middleware ครอบทุก route ยกเว้น `/login`, `/api/auth`, `/demo/checkin`, `/` | [`middleware.ts`](../../src/middleware.ts)                                                                         |
| 4   | Email อื่นเข้าได้              | `signIn` callback validate `@dome.tu.ac.th` หรือ `@tu.ac.th`                | [`auth-config.ts`](../../src/lib/auth-config.ts)                                                                   |
| 5   | CSRF บน mutation               | NextAuth จัดการ CSRF token + Server Actions มี origin check default         | (built-in)                                                                                                         |
| 6   | เช็คอินวิชาที่ไม่ได้ลง         | JOIN `Enrollment` ก่อนเขียน `Attendance`                                    | [`actions/checkin.ts`](../../src/app/actions/checkin.ts) line 82-92                                                |
| 7   | Time skew (client เปลี่ยนเวลา) | ใช้ `new Date()` ฝั่ง server เท่านั้น, ห้ามรับ timestamp จาก client         | [`actions/session.ts`](../../src/app/actions/session.ts), [`actions/checkin.ts`](../../src/app/actions/checkin.ts) |
| 8   | Race condition (กดเร็ว ๆ)      | DB unique constraint + catch `P2002` → return duplicate ไม่ throw           | [`actions/checkin.ts`](../../src/app/actions/checkin.ts) line 137-159                                              |

> รายละเอียดเชิงลึก (attack scenario) ดูใน [`docs/prps/00-security-model.md`](../prps/00-security-model.md)

---

## 9. Flow ที่สำคัญ end-to-end

### 9.1 Teacher Flow — เริ่มเทอม → สอน → เช็คชื่อ

```
1. Login (/login)
   └─ TU API verify หรือ bypass mode
2. Redirect → /teacher (dashboard)
3. ครั้งแรก: คลิก "สร้างวิชาใหม่" → /teacher/courses/new
   └─ กรอก code, name, semester → Server Action createCourse
4. เข้า /teacher/courses/[id] → tab Roster
   └─ Upload CSV/XLSX → importRoster → upsert User + Enrollment
5. tab Schedule → เพิ่มตารางสอน (วัน, เวลา, ห้อง)
6. ในวันที่จะสอน:
   /teacher dashboard เห็น "ตารางสอนวันนี้"
   └─ คลิก "เปิด session" → openSession → redirect /teacher/sessions/[id]
7. หน้า session:
   - QR แสดงใหญ่กลางจอ + ฉาย fullscreen
   - QR หมุนทุก 30s (polling /api/sessions/[id]/qr)
   - Sidebar แสดงรายชื่อนักศึกษา check-in (polling 5s)
   - Demo QR (ถ้า DEMO_CHECKIN_ENABLED) ใน sidebar
8. หมดคาบ: คลิก "ปิด session" → closeSession → token ถูกล้าง, isOpen=false
   └─ หรือรอ auto-close ที่ endsAt + 30 นาที
```

### 9.2 Student Flow — สแกน → เช็คชื่อ

```
1. นักศึกษาเปิดมือถือ + กล้อง
2. สแกน QR บนจออาจารย์ → browser เปิด /checkin?t=<token>
3. Middleware เช็ค session
   ├─ ยังไม่ login: redirect → /login?from=/checkin?t=<token>
   │   └─ Login เสร็จ → กลับมา /checkin?t=<token>
   └─ login แล้ว: render หน้า check-in
4. หน้า /checkin แสดง:
   - course code/name/semester
   - เวลา session, ห้อง
   - ชื่อ + email + รหัสนักศึกษาจาก login
   - ปุ่ม "ยืนยันเข้าเรียน"
5. กดปุ่ม → checkInWithQrToken Server Action
   ├─ requireStudent (Layer 3)
   ├─ verifyQrToken (current หรือ previous within grace)
   ├─ check Enrollment
   ├─ check duplicate Attendance
   ├─ คำนวณ status (PRESENT/LATE) จาก server time vs lateAfter
   └─ insert Attendance (ถ้า P2002 → return duplicate)
6. UI แสดงผล: success / late / duplicate / invalid / expired / closed / not_enrolled / wrong_role
```

### 9.3 Demo Flow — public showcase

```
1. คนทั่วไปสแกน Demo QR (สีแดงใน sidebar) → /demo/checkin?t=<token>
2. หน้า public (ไม่ต้อง login)
3. แสดง session context + input ให้พิมพ์ชื่อ
4. กด "Check in demo" → demoCheckInWithQrToken
   ├─ check DEMO_CHECKIN_ENABLED
   ├─ validate token + displayName (Zod)
   ├─ getCheckInContext (verify token + auto-close)
   └─ insert DemoCheckIn (ตารางแยก)
5. UI แสดง success → input clear ให้คนถัดไปลอง
6. Sidebar ฝั่งอาจารย์โผล่ชื่อใต้หัวข้อ "Demo check-ins" (แยกจาก real)
```

### 9.4 QR Rotation — กลไกหมุน token

```
ทุก ๆ 30 วินาที (client polling):
1. fetch /api/sessions/[id]/qr
2. server: autoCloseIfExpired (lazy auto-close ถ้าเลย endsAt + 30 นาที)
3. server: rotateIfExpired
   ├─ ถ้า qrTokenExpiresAt > now → ไม่ rotate, return ของเดิม
   └─ ถ้าหมดอายุ → updateMany atomic:
       - qrPrevToken = qrToken เดิม
       - qrPrevTokenExpiresAt = now + 30s (grace window)
       - qrToken = generateQrToken() (32-byte random)
       - qrTokenExpiresAt = now + 30s
       - entryCodePrev = entryCode เดิม
       - entryCode = generateEntryCode() (6-digit)
4. Return JSON { token, expiresAt, entryCode, refreshIntervalMs }
5. Client render QR ใหม่ + reset countdown

นักศึกษาที่สแกนตอน rotate พอดี:
- token จะเป็น qrPrevToken
- verifyQrToken จะหา qrToken ก่อน → ไม่เจอ → ลอง qrPrevToken → ใช้ได้ถ้า qrPrevTokenExpiresAt > now
- จึง grace window รวม ~60 วินาที
```

---

## 10. Routes & Files Map

### 10.1 Server Actions

| ไฟล์                                                               | export                                         | ใช้ที่                                          |
| ------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------- |
| [`src/app/actions/course.ts`](../../src/app/actions/course.ts)     | `createCourse`, `deleteCourse`                 | `/teacher/courses/new`, `/teacher/courses/[id]` |
| [`src/app/actions/roster.ts`](../../src/app/actions/roster.ts)     | `importRoster`                                 | RosterImport modal                              |
| [`src/app/actions/schedule.ts`](../../src/app/actions/schedule.ts) | `createSchedule`, `deleteSchedule`             | ScheduleForm, ScheduleDeleteButton              |
| [`src/app/actions/session.ts`](../../src/app/actions/session.ts)   | `openSession`, `closeSession`                  | OpenSessionButton, CloseSessionButton           |
| [`src/app/actions/checkin.ts`](../../src/app/actions/checkin.ts)   | `checkInWithQrToken`, `demoCheckInWithQrToken` | StudentCheckInForm, DemoCheckInForm             |

### 10.2 API Routes

| Path                          | Method   | Auth               | หน้าที่            |
| ----------------------------- | -------- | ------------------ | ------------------ |
| `/api/auth/[...nextauth]`     | GET/POST | (built-in)         | NextAuth handlers  |
| `/api/sessions/[id]/qr`       | GET      | requireCourseOwner | QR token + rotate  |
| `/api/sessions/[id]/checkins` | GET      | requireCourseOwner | Live check-in list |

### 10.3 Lib Helpers (server-only)

| ไฟล์                                                               | export หลัก                                                                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [`db.ts`](../../src/lib/db.ts)                                     | `db` (Prisma singleton)                                                                                                     |
| [`auth.ts`](../../src/lib/auth.ts)                                 | `auth`, `signIn`, `signOut`, `handlers`                                                                                     |
| [`auth-config.ts`](../../src/lib/auth-config.ts)                   | `authConfig`, `isAllowedEmail`, `normalizeEmail`                                                                            |
| [`auth-helpers.ts`](../../src/lib/auth-helpers.ts)                 | `requireAuth/Teacher/Student/CourseOwner`, `AuthError`                                                                      |
| [`qr-config.ts`](../../src/lib/qr-config.ts)                       | `QR_REFRESH_INTERVAL_MS=30000`, `QR_GRACE_WINDOW_MS=30000`, `QR_TOKEN_BYTES=32`, `ENTRY_CODE_LENGTH=6`, `LATE_AFTER_MIN=15` |
| [`qr-token.ts`](../../src/lib/qr-token.ts)                         | `generateQrToken`, `generateEntryCode`                                                                                      |
| [`qr-rotate.ts`](../../src/lib/qr-rotate.ts)                       | `rotateIfExpired`                                                                                                           |
| [`qr-verify.ts`](../../src/lib/qr-verify.ts)                       | `verifyQrToken`, `verifyEntryCode`                                                                                          |
| [`session-helpers.ts`](../../src/lib/session-helpers.ts)           | `autoCloseIfExpired`                                                                                                        |
| [`checkin.ts`](../../src/lib/checkin.ts)                           | `getCheckInContext`, `isDemoCheckInEnabled`, `getAttendanceStatus`                                                          |
| [`nav-config.ts`](../../src/lib/nav-config.ts)                     | `TEACHER_NAV`, `STUDENT_NAV`                                                                                                |
| [`validations/checkin.ts`](../../src/lib/validations/checkin.ts)   | `qrTokenSchema`, `demoCheckInSchema`                                                                                        |
| [`validations/schedule.ts`](../../src/lib/validations/schedule.ts) | `createScheduleSchema`, `TIME_HHMM`                                                                                         |

### 10.4 Components (UI)

```
src/components/
├── shell/                ← layout หลักของ /teacher และ /student
│   ├── AppShell.tsx
│   ├── Sidebar.tsx
│   └── UserCard.tsx
├── sessions/             ← Phase 4 — QR display
│   ├── SessionView.tsx       ← พระเอกของฝั่งอาจารย์
│   ├── QrDisplay.tsx
│   ├── EntryCodeCard.tsx
│   ├── FullscreenButton.tsx
│   └── CheckedInSidebar.tsx
├── checkin/              ← Phase 4.5 — student/demo check-in
│   ├── CheckInShell.tsx
│   ├── SessionSummary.tsx
│   ├── StudentCheckInForm.tsx    ← พระเอกของฝั่งนักศึกษา
│   ├── DemoCheckInForm.tsx
│   └── StatusPanel.tsx
├── courses/              ← form/button ฝั่งอาจารย์
│   ├── ScheduleForm.tsx
│   ├── ScheduleDeleteButton.tsx
│   ├── OpenSessionButton.tsx
│   └── CloseSessionButton.tsx
└── import/               ← Phase 3 — roster import modal
    └── RosterImport.tsx
```

---

## 11. Environment Variables

### 11.1 Local development (`.env.local`)

```env
# Database
DATABASE_URL=postgres://...pooler.supabase.com:6543/postgres
DIRECT_URL=postgres://...supabase.com:5432/postgres

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random 32+ chars>

# TU API (จริง)
TU_API_URL=https://restapi.tu.ac.th/api/v1/auth/Ad/verify
TU_API_KEY=<key จาก TU>

# Dev switches
BYPASS_TU_AUTH=true            # dev: ข้าม TU API ใช้ DB lookup
DEMO_CHECKIN_ENABLED=true      # local: เปิด demo lane เพื่อทดสอบ
```

### 11.2 Production / Showcase (Vercel Environment Variables)

```env
DATABASE_URL=...
DIRECT_URL=...
NEXTAUTH_URL=https://<your-vercel-domain>     # ❗ ต้องเป็น URL จริง
NEXTAUTH_SECRET=...
TU_API_URL=https://restapi.tu.ac.th/api/v1/auth/Ad/verify
TU_API_KEY=...
BYPASS_TU_AUTH=true            # showcase: bypass ก่อน Phase 7 face scan
DEMO_CHECKIN_ENABLED=true      # showcase: เปิด demo lane
```

**ข้อควรระวัง:**

- ถ้าเปิด session จาก localhost → QR เป็น localhost → มือถือคนอื่นเปิดไม่ได้
- วันโชว์ต้องเปิด session จาก Vercel URL จริง
- ห้าม commit `.env*` ขึ้น git
- ใน production จริง (ส่งอาจารย์จบ) ควรปิด `BYPASS_TU_AUTH` และ `DEMO_CHECKIN_ENABLED`

### 11.3 ไฟล์ env 2 ตัว — ทำไม

- **`.env.local`** — Next.js อ่าน, override ค่าจาก `.env`
- **`.env`** — Prisma 5 CLI อ่านเป็นหลัก (ถ้าไม่มีจะเอ๋อตอน `prisma migrate dev`)

ทั้งสองตัวควร gitignored

---

## 12. สิ่งที่กำลังจะทำต่อ (Phase 5–7)

### Phase 5 — Teacher Dashboard + Reports ⏳

**เป้าหมาย:** อาจารย์ดูสรุปการเข้าเรียนได้ครบ (live + historical)

**Tasks:**

1. เขียน PRP `06-teacher-dashboard.md` — vector dashboard, exclude DemoCheckIn
2. หน้าสรุปคาบเรียน `/teacher/sessions/[id]/report`:
   - count present/late/absent
   - รายชื่อแยก 3 กลุ่ม
   - export CSV ของคาบนี้
3. หน้า dashboard รายวิชา `/teacher/courses/[id]?tab=dashboard`:
   - %เข้าเรียนเฉลี่ยทั้งเทอม
   - นักศึกษาที่ขาดบ่อย (จัด ranking)
   - กราฟ trend ราย session
4. tab attendance matrix `/teacher/courses/[id]?tab=attendance`:
   - row = นักศึกษา, column = session, cell = สถานะ
5. แก้ teacher dashboard `/teacher`:
   - placeholder "อัตราเข้าเรียนเฉลี่ย —" → คำนวณจริง
6. **ABSENT generator** — ตอนปิด session: row นักศึกษา enrolled ที่ไม่มี Attendance → insert ABSENT auto
7. แยก DemoCheckIn ออกจาก metric จริง — query `db.attendance.*` ไม่ใช่ `demoCheckIn`

**Dependency:** ต้องใช้ Attendance + DemoCheckIn ที่มีอยู่แล้ว (ไม่ต้องเพิ่ม schema)

### Phase 6 — Geofence + Manual Edit + Export ⏳

**Tasks:**

1. **Geofence:**
   - เพิ่ม `Schedule.lat`, `Schedule.lng`, `Schedule.radiusMeters` (optional)
   - ถ้ามีค่า → student check-in ต้องส่ง location → server เช็ค Haversine
   - UI ให้อาจารย์เลือก lat/lng จากแผนที่
2. **Manual edit:**
   - Server Action `updateAttendance(attendanceId, status, reason)`
   - UI modal ใน report page
   - บันทึก audit log (table ใหม่ `AttendanceAudit`)
3. **Export:**
   - Endpoint `/api/courses/[id]/export?format=csv|pdf`
   - CSV: row นักศึกษา × column session
   - PDF: ใช้ library เช่น `pdfkit` หรือ `puppeteer`
   - exclude DemoCheckIn

**Dependency:** Phase 5 report ต้องเสร็จก่อน

### Phase 7 — Face Scan + Email Notification ⏳

**Tasks:**

1. **Face scan:**
   - ติดตั้ง `face-api.js` หรือ alternative
   - หน้าใหม่: หลัง check-in สำเร็จ → step ถัดไป face scan (ตัวเลือก)
   - เก็บ face descriptor ใน User (encrypted)
   - compare descriptor ตอน check-in รอบถัดไป
2. **Email notification:**
   - integrate email service (Resend หรือ SendGrid)
   - settings page ให้ student/teacher toggle
   - cron/edge function ส่งสรุปสัปดาห์
3. **Mobile UX polish:**
   - hamburger nav สำหรับมือถือ
   - bottom sheet แทน modal

**Dependency:** Phase 5/6 ควรเสร็จก่อน (face scan = layer เสริม ไม่ใช่หลัก)

---

## 13. เกณฑ์ "เสร็จ 100%"

> อ้างอิง phase roadmap ของโปรเจกต์

### Milestone A — Core MVP (ต้องเสร็จเป็นอย่างน้อย)

- [x] Setup Next.js + TypeScript + Tailwind
- [x] Setup Prisma + Supabase
- [x] Database schema + migration
- [x] Auth via TU API
- [x] Teacher: สร้างวิชา, import นักศึกษา (CSV)
- [x] Teacher: สร้าง session + Dynamic QR (refresh ทุก 30s)
- [x] Student: สแกน QR → login → บันทึก attendance
- [ ] **Teacher Dashboard: ดูสรุปการเข้าเรียน** ← Phase 5

**สถานะ Milestone A:** 7/8 — เหลือแค่ Phase 5

### Milestone B — Smart Features (ภายหลัง)

- [ ] Geofencing (Haversine, 50–100m)
- [ ] Manual attendance edit
- [ ] Export reports (CSV/PDF)

→ Phase 6 ครอบคลุม

### Milestone C — Advanced (ถ้ามีเวลา)

- [ ] Face Scan ด้วย face-api.js
- [ ] Email notification
- [ ] Mobile-optimized UI

→ Phase 7 ครอบคลุม

### "เสร็จ 100% สำหรับโปรเจกต์จบ" =

อย่างต่ำ Milestone A ครบ + ส่วนหนึ่งของ Milestone B (อย่างน้อย export CSV) + presentation slides + manual test report

ถ้ามีเวลาเหลือ Milestone C จะเป็น "เพิ่มมูลค่า" สำหรับการนำเสนอ

---

## 14. Quick Reference

### คำสั่งที่ใช้บ่อย

```bash
# Dev
npm run dev

# Database
npx prisma migrate dev --name <ชื่อ>
npx prisma studio             # เปิด GUI ดู DB
npx prisma generate           # generate Prisma client หลัง schema เปลี่ยน

# Build
npm run build                 # = prisma generate && next build
npm run start

# Lint
npm run lint
```

### Dev Login (BYPASS mode)

```
Teacher:  teacher@tu.ac.th
Student:  test.student@dome.tu.ac.th
Student ID: 0000000001
```

password ใส่อะไรก็ได้ถ้า `BYPASS_TU_AUTH=true`

### Workflow ทุก session

1. อ่านเอกสารข้อกำหนดโปรเจกต์ → บันทึกสถานะโปรเจกต์ → PRP ของฟีเจอร์ที่ทำ
2. สรุปสิ่งที่ทำเสร็จแล้วและสิ่งที่จะทำต่อ
3. ทำงาน
4. อัปเดตบันทึกสถานะโปรเจกต์ (mark done, update next step, add Decision Log entry ถ้ามี)

### ไฟล์ที่ควรเปิดอ่านก่อนใคร (ถ้าเพิ่งเข้ามาในโปรเจกต์)

1. เอกสารข้อกำหนดโปรเจกต์ — กฎเหล็ก
2. บันทึกสถานะโปรเจกต์ — สถานะปัจจุบัน + decision log
3. [`prisma/schema.prisma`](../../prisma/schema.prisma) — DB เป็นหัวใจของระบบ
4. [`src/lib/auth-helpers.ts`](../../src/lib/auth-helpers.ts) — pattern ของ auth
5. [`src/app/actions/checkin.ts`](../../src/app/actions/checkin.ts) — pattern ของ Server Action ที่ครบ flow
6. [`src/components/sessions/SessionView.tsx`](../../src/components/sessions/SessionView.tsx) — pattern ของ Client Component + polling

---

## ปิดท้าย

โปรเจกต์ Qroll ตอนนี้:

- ✅ Backend infrastructure พร้อม (DB, Auth, Server Actions, Route Handlers)
- ✅ Core flow ทำงานครบ (เปิดคาบ → สแกน → บันทึก)
- ✅ Demo lane แยกออกจากข้อมูลจริง พร้อมโชว์งาน
- ⏳ Dashboard/report ยังไม่มี — Phase 5
- ⏳ Geofence/export ยัง — Phase 6
- ⏳ Face scan/email ยัง — Phase 7

ถ้าจะส่งโปรเจกต์จบ ขั้นต่ำคือทำ Phase 5 ให้จบ + บางส่วนของ Phase 6 (export CSV) — ทั้งสองอย่างไม่ต้องแก้ schema เลย แค่เพิ่ม UI + query

> "การออกแบบที่ดีต้องอธิบายได้ว่าทำไม" — ทุก Decision Log และทุก reason ในเอกสารนี้คือสิ่งที่จะใช้ตอบอาจารย์ตอน defense
