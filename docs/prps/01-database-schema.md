# PRP 01 — Database Schema (Prisma + PostgreSQL)

> **Implementation update (Phase 4.6 / PRP 06):** schema blueprint ด้านล่างเป็นประวัติการออกแบบ Phase 1 แต่ schema จริงปัจจุบันให้ยึด `prisma/schema.prisma` และ migration `roster_overhaul` เป็นหลัก
>
> - `User.email` เป็น nullable (`String? @unique`) เพื่อรองรับ student ที่ pre-import จาก roster โดยยังไม่เคย login
> - `User.studentId` เป็น identity หลักของนักศึกษา และใช้ link TU login ครั้งแรกกลับไปหา user ที่ import ไว้
> - `ClassSession` ใช้ static `qrToken` + static `entryCode` ต่อหนึ่ง open session; ไม่มี `qrTokenExpiresAt`, `qrRefreshedAt`, `qrPrevToken`, `entryCodePrev`
> - มี `Schedule`, `ClassSession.scheduleId`, `ClassSession.closedAt`, และ `DemoCheckIn` ใน schema จริงหลัง phase ต่อ ๆ มา
> - ถ้าข้อความใน PRP นี้ขัดกับ PRP 06 หรือ `prisma/schema.prisma` ให้ถือว่า PRP นี้เป็น historical context ไม่ใช่ source of truth ล่าสุด

> **PRP = Plan-Research-Pattern** — เอกสารเชิงลึกสำหรับ feature นี้
> อ่านก่อน implement ทุกครั้ง

**Status:** Ready to implement
**Owner:** Phase 1
**Prerequisites:** [INSTRUCTIONS.md](../../INSTRUCTIONS.md) §3 (Coding Rules + Security), §5 (DB overview)

---

## 1. Context & Goals

ระบบ Qroll ต้องเก็บ 3 ประเภทข้อมูลหลัก:

1. **Identity** — ใครคือใคร (TEACHER, STUDENT)
2. **Course Structure** — วิชา + ใครลงทะเบียน
3. **Attendance Event** — ใครเช็คอินคาบไหนเมื่อไหร่ + กันโกง

Schema ต้องตอบโจทย์ Security Checklist 8 ข้อ จาก [INSTRUCTIONS.md §3](../../INSTRUCTIONS.md):

- ❗ #1 Replay attack — DB unique constraint กันบันทึกซ้ำ
- ❗ #2 QR screenshot — Token + expiresAt ใน DB
- ❗ #4 Domain whitelist — Email constraint
- ❗ #6 เช็คอินวิชาที่ไม่ได้ลง — Foreign key chain ผ่าน Enrollment
- ❗ #8 Race condition — `@@unique([sessionId, studentId])`

---

## 2. ⚠️ Naming Conflict Decision

[INSTRUCTIONS.md §5](../../INSTRUCTIONS.md) ระบุ table ชื่อ **"Session"** แต่ **NextAuth.js v5 adapter ใช้ชื่อ `Session` เป็นมาตรฐาน** (database session strategy) → จะชนกัน

**ตัดสินใจใน PRP นี้:**

- Class session ของเรา = `ClassSession` (เปลี่ยนชื่อชัดเจน)
- ปล่อย `Session` ให้ NextAuth ใช้ (ถ้า config ใช้ database strategy)
- หรือถ้าใช้ JWT strategy ก็ไม่มี `Session` table แต่เราใช้ชื่อ `ClassSession` อยู่ดีเพื่อ clarity

→ ต้องอัปเดต [INSTRUCTIONS.md §5](../../INSTRUCTIONS.md) ตอน Phase 2 (auth) ให้ระบุ `ClassSession`

---

## 3. Prisma Schema Blueprint

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooled connection (transaction mode)
  directUrl = env("DIRECT_URL")          // direct connection สำหรับ migration
}

// ============================================
// ENUMS
// ============================================

enum Role {
  TEACHER
  STUDENT
}

enum AttendanceStatus {
  PRESENT       // เช็คอินทันเวลา
  LATE          // เช็คอินสายตามเกณฑ์ที่อาจารย์กำหนด
  ABSENT        // ไม่ได้เช็คอินจนคาบเรียนปิด (สร้างโดย system job)
}

// ============================================
// USER (Teacher + Student)
// ============================================

model User {
  id        String   @id @default(cuid())
  email     String   @unique                    // ❗ STUDENT = @dome.tu.ac.th, TEACHER = @tu.ac.th — validate ที่ signIn callback
  name      String
  studentId String?  @unique                    // null สำหรับ TEACHER, unique สำหรับ STUDENT
  role      Role
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // NextAuth relations (ถ้าใช้ database adapter)
  accounts Account[]
  sessions Session[]                            // NextAuth Session — ไม่ใช่ ClassSession ของเรา

  // Domain relations
  taughtCourses Course[]      @relation("CourseTeacher")
  enrollments   Enrollment[]
  attendances   Attendance[]

  @@index([role])
  @@index([studentId])
}

// ============================================
// COURSE
// ============================================

model Course {
  id        String   @id @default(cuid())
  code      String                                // เช่น "CS101 Sec1" — ไม่ unique global เผื่อข้ามเทอม
  name      String
  semester  String                                // เช่น "1/2026"
  teacherId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  teacher        User           @relation("CourseTeacher", fields: [teacherId], references: [id], onDelete: Restrict)
  enrollments    Enrollment[]
  classSessions  ClassSession[]

  @@unique([code, semester, teacherId])           // กันสร้างวิชาซ้ำต่อเทอมต่ออาจารย์
  @@index([teacherId])
  @@index([semester])
}

// ============================================
// ENROLLMENT (M:N User<->Course)
// ============================================

model Enrollment {
  id        String   @id @default(cuid())
  studentId String
  courseId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  student User   @relation(fields: [studentId], references: [id], onDelete: Restrict)
  course  Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([studentId, courseId])                 // ❗ กันลงทะเบียนซ้ำ
  @@index([courseId])
  @@index([studentId])
}

// ============================================
// CLASS SESSION (คาบเรียน — เปลี่ยนชื่อจาก "Session")
// ============================================

model ClassSession {
  id          String   @id @default(cuid())
  courseId    String
  startsAt    DateTime                            // เวลาเริ่มคาบ (server time)
  endsAt      DateTime                            // เวลาจบคาบ
  lateAfter   DateTime?                           // หลังเวลานี้ถือว่ามาสาย (optional)

  // ❗ Dynamic QR fields — refresh ทุก 30s
  qrToken          String?  @unique               // ค่าที่ encode ลง QR (regenerate ทุก 30s)
  qrTokenExpiresAt DateTime?                      // หมดอายุ QR ปัจจุบัน
  qrRefreshedAt    DateTime?                      // เวลา teacher (หรือ system job) สร้าง token ล่าสุด

  isOpen      Boolean  @default(true)             // false = ปิดคาบ ไม่รับ check-in อีก

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  course      Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  attendances Attendance[]

  @@index([courseId])
  @@index([startsAt])
  @@index([qrToken])                               // lookup เร็วตอน student ส่ง token มา verify
}

// ============================================
// ATTENDANCE (การเช็คอิน)
// ============================================

model Attendance {
  id             String           @id @default(cuid())
  classSessionId String
  studentId      String
  status         AttendanceStatus @default(PRESENT)
  checkedInAt    DateTime         @default(now())  // server time — ห้ามเชื่อ client
  ipAddress      String?                            // forensics (optional)
  userAgent      String?                            // forensics (optional)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  classSession ClassSession @relation(fields: [classSessionId], references: [id], onDelete: Cascade)
  student      User         @relation(fields: [studentId], references: [id], onDelete: Restrict)

  @@unique([classSessionId, studentId])             // ❗❗❗ กัน race condition + replay attack
  @@index([studentId])                              // query history นักศึกษา
  @@index([classSessionId])                         // query รายชื่อในคาบ
}

// ============================================
// NEXTAUTH ADAPTER MODELS (Auth.js v5 standard)
// ============================================
// อ้างอิง: https://authjs.dev/getting-started/adapters/prisma
// ใส่ไว้ตอนนี้เลยเพื่อให้ Phase 2 (auth) ทำต่อได้ทันที

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  // ⚠️ NextAuth Session — อย่าสับสนกับ ClassSession ของเรา
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

---

## 4. Implementation Tasks (รันคำสั่งตามนี้ทีละ step)

### Step 1 — Prerequisite: เปิด Supabase project

- ไปที่ https://supabase.com/ → New project
- เลือก region ใกล้สุด (Singapore)
- จด password ของ database
- ที่ Settings → Database → Connection string:
  - **Pooled (`DATABASE_URL`)** — port 6543 — สำหรับ runtime
  - **Direct (`DIRECT_URL`)** — port 5432 — สำหรับ migration

### Step 2 — Install Prisma

```bash
cd qroll
npm install @prisma/client
npm install -D prisma
```

### Step 3 — Init Prisma

```bash
npx prisma init --datasource-provider postgresql
```

จะสร้าง `prisma/schema.prisma` (default) + `.env`

### Step 4 — ใส่ env vars

แก้ `.env`:

```
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...:5432/postgres"
TU_API_KEY="your-tu-api-application-key"
BYPASS_TU_AUTH=false
```

แล้ว copy เป็น `.env.example` (ลบ secret จริงออก) สำหรับ commit:

```
DATABASE_URL=
DIRECT_URL=
TU_API_KEY=
BYPASS_TU_AUTH=false
```

### Step 5 — แทนที่ `prisma/schema.prisma`

Copy schema จาก §3 ของ PRP นี้ลงไปทั้งหมด

### Step 6 — Run migration

```bash
npx prisma migrate dev --name init
```

- จะสร้าง `prisma/migrations/<timestamp>_init/migration.sql`
- จะรัน migration บน Supabase
- จะ generate Prisma Client อัตโนมัติ

### Step 7.5 — สร้าง Seed Script สำหรับ Dev/Test

สร้างไฟล์ `prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const teacher = await db.user.upsert({
    where: { email: "teacher@tu.ac.th" },
    update: {},
    create: { email: "teacher@tu.ac.th", name: "Test Teacher", role: "TEACHER" },
  });

  const student = await db.user.upsert({
    where: { email: "test.student@dome.tu.ac.th" },
    update: {},
    create: {
      email: "test.student@dome.tu.ac.th",
      name: "Test Student",
      // ❗ ใช้ 000... เพื่อไม่ให้ซ้ำกับ studentId จริง (@unique constraint)
      studentId: "0000000001",
      role: "STUDENT",
    },
  });

  console.log("Seeded:", { teacher, student });
}

main().catch(console.error).finally(() => db.$disconnect());
```

เพิ่มใน `package.json`:

```json
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
```

รันด้วย:

```bash
npm install -D ts-node
npx prisma db seed
```

> **Dev login:** username = `0000000001`, password = อะไรก็ได้ (ถูกละเว้นเมื่อ `BYPASS_TU_AUTH=true`)

---

### Step 7 — สร้าง Prisma client singleton

สร้างไฟล์ `src/lib/db.ts`:

```ts
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

อย่าลืม `npm install server-only`

### Step 8 — Verify

```bash
npx prisma studio
```

เปิด GUI ดู table ครบ 8 ตัว: User, Course, Enrollment, ClassSession, Attendance, Account, Session, VerificationToken

### Step 9 — Update STATE.md

เปลี่ยน Phase 1 status เป็น ✅ Done, set Next Step → Phase 2 (Auth via TU API), เริ่มเขียน `docs/prps/02-auth-tu-api.md`

---

## 5. Validation & Anti-Patterns

### ✅ ต้องตรวจให้แน่ใจ

| #   | Check                                                                                           | วิธีเช็ค                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `@@unique([classSessionId, studentId])` ใน Attendance                                           | เปิด `prisma/migrations/.../migration.sql` หา `CREATE UNIQUE INDEX` — ถ้าไม่มี = race condition vulnerability! |
| 2   | `@@unique([studentId, courseId])` ใน Enrollment                                                 | กันลงทะเบียนซ้ำ                                                                                                |
| 3   | `qrToken @unique` ใน ClassSession                                                               | ถ้าไม่ unique ตอน lookup จะเจอหลาย session = chaos                                                             |
| 4   | `studentId` ใน User เป็น `String? @unique`                                                      | nullable + unique → PostgreSQL อนุญาต null ซ้ำได้ (สำหรับ teacher)                                             |
| 5   | ทุก model มี `id, createdAt, updatedAt`                                                         | ตรงตามกฎใน [INSTRUCTIONS.md §3](../../INSTRUCTIONS.md)                                                         |
| 6   | ใช้ `cuid()` ไม่ใช่ `uuid()` หรือ autoincrement                                                 | ตรงตามกฎ                                                                                                       |
| 7   | `onDelete` ที่ใช้ `Restrict` กับ historical data (Attendance.student, Course.teacher)           | ลบ user ไม่ได้ถ้ายังมี attendance/course → กันข้อมูลย้อนหลังหาย                                                |
| 8   | `onDelete: Cascade` เฉพาะ child ที่ตายไปกับ parent (Enrollment.course, Attendance.classSession) | ลบวิชา → enrollment + session ทั้งสายตายตาม สมเหตุสมผล                                                         |

### ❌ Anti-Patterns ที่ห้ามทำเด็ดขาด

| #   | Don't                                                                | Why                                                                                               |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | ห้ามใช้ `Int @default(autoincrement())` เป็น primary key             | INSTRUCTIONS.md กำหนด `cuid()` + ทำให้ enumeration attack ง่าย                                    |
| 2   | ห้ามตั้งชื่อ table ของเราว่า `Session`                               | ชนกับ NextAuth → ใช้ `ClassSession`                                                               |
| 3   | ห้ามใช้ `String` แทน `DateTime`                                      | ทำให้เปรียบเทียบเวลา/index ห่วย + timezone bug                                                    |
| 4   | ห้ามเก็บ `qrToken` แบบ plain text predictable (เช่น sequence number) | ต้อง random secure (`crypto.randomBytes(32).toString('hex')` ตอน generate) — ดู PRP 03            |
| 5   | ห้ามใช้ `onDelete: Cascade` กับ User → Attendance                    | ลบนักศึกษา 1 คน → ประวัติเข้าเรียนทั้งเทอมหาย → ใช้ `Restrict`                                    |
| 6   | ห้ามลืม index `qrToken` ใน ClassSession                              | ทุก check-in ต้อง lookup token → ไม่มี index = full table scan                                    |
| 7   | ห้ามเชื่อ `checkedInAt` จาก client                                   | ใช้ `@default(now())` server-side เท่านั้น                                                        |
| 8   | ห้ามเปิดให้ `studentId` ใน User เป็น `String` (non-null)             | จะใส่ค่ายังไงสำหรับ TEACHER → ต้อง `String?` (optional)                                           |
| 9   | ห้าม validate `email` domain แค่ใน DB constraint                     | PostgreSQL CHECK constraint ใช้ได้ แต่ NextAuth `signIn` callback ต้องเช็คก่อน — defense in depth |
| 10  | ห้ามรัน `npx prisma db push` ใน production                           | `db push` ไม่สร้าง migration history → ใช้ `migrate dev` หรือ `migrate deploy`                    |
| 11  | ห้าม commit `.env` ที่มี password จริง                               | ใช้ `.env.example` สำหรับ commit (ไม่มี secret)                                                   |
| 12  | ห้ามลืม `import 'server-only'` ใน `lib/db.ts`                        | กัน Prisma client โดน bundle ไปฝั่ง browser → expose connection string                            |

### 🧪 Smoke Test หลัง migrate

```ts
// ลอง insert + duplicate check (Race condition test)
import { db } from "@/lib/db";

const student = await db.user.create({
  data: {
    email: "test@dome.tu.ac.th",
    name: "Test",
    studentId: "6500000",
    role: "STUDENT",
  },
});

const session = await db.classSession.create({
  data: {
    courseId: "...",
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 3600000),
  },
});

// ครั้งที่ 1 — ต้องผ่าน
await db.attendance.create({
  data: { classSessionId: session.id, studentId: student.id },
});

// ครั้งที่ 2 (race condition) — ต้อง throw P2002 (Unique constraint failed)
await db.attendance.create({
  data: { classSessionId: session.id, studentId: student.id },
}); // ❌ ต้องเด้ง error
```

ถ้า test ที่ 2 ไม่เด้ง error → schema ผิด ต้องเช็ค `@@unique` constraint

---

## 6. Open Questions (ก่อนเริ่ม implement ต้องตอบ)

1. **Soft delete** หรือ **Hard delete** สำหรับ Course/User?
   - แนะนำ: เพิ่ม `deletedAt DateTime?` ในอนาคตถ้าต้องการ soft delete (Phase 2+)
   - ตอนนี้ Phase 1 ใช้ hard delete + `onDelete: Restrict` ป้องกัน accidental loss

2. **Geofencing fields** (lat/lng/radius) ใน ClassSession?
   - Phase 2 feature — ยังไม่ใส่ใน schema นี้
   - เพิ่มทีหลังเป็น `latitude Float?`, `longitude Float?`, `radiusMeters Int?`

3. **CSV import nullable studentId?**
   - ถ้านักศึกษาไม่มี studentId ตอน import (เช่น auditor) — ต้อง decide
   - แนะนำ: บังคับมี studentId ตอน import (validate at app layer)

4. **ตัด `Account`/`Session` NextAuth ออกตอนนี้ดีไหม?**
   - ตัดสินใจ: **ใส่ไว้เลย** — ป้องกัน migration ซ้อนตอน Phase 2 + ตรงตาม Auth.js doc
   - หมายเหตุ: ใช้ CredentialsProvider + JWT strategy → สองตารางนี้จะว่าง แต่ไม่มีผลเสีย

5. **TU API Auth flow (Phase 2 ต้องรู้):**
   - `POST https://restapi.tu.ac.th/api/v1/auth/Ad/verify` พร้อม `Application-Key: TU_API_KEY`
   - Response: `type` ("student"/"employee"), `username` (= studentId 10 หลักสำหรับ student), `email`, `tu_status`
   - signIn callback ต้องเช็ค: `tu_status === "ปกติ"` เท่านั้น (reject พัก/ลาออก/สำเร็จการศึกษา)
   - Email domain ตาม type: student → `@dome.tu.ac.th`, employee → `@tu.ac.th`
   - **ไม่มี password เก็บใน DB เลย** — TU API จัดการ authentication ทั้งหมด
   - Dev testing: `BYPASS_TU_AUTH=true` ใน `.env.local` → ข้าม TU API, login ด้วย seed user โดยตรง

---

## 7. References

- [INSTRUCTIONS.md §3](../../INSTRUCTIONS.md) — Coding Rules (cuid, indexes, security)
- [INSTRUCTIONS.md §5](../../INSTRUCTIONS.md) — Database Schema overview
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)
- [Auth.js Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma)
- [Supabase + Prisma guide](https://supabase.com/partners/integrations/prisma)
