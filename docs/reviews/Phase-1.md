## Phase 1 ทำอะไรไปบ้าง — อธิบายละเอียด

---

### 🧩 ภาพรวม: ทำไมต้องทำ Phase นี้?

แอป Qroll ต้องเก็บข้อมูลลงฐานข้อมูล — ก่อนจะเขียน feature อะไรได้ ต้องวางโครงสร้าง DB ก่อน เหมือนสร้างโครงบ้านก่อนก่ออิฐ

---

### 1. ติดตั้ง Prisma (ORM)

**Prisma คืออะไร?**
ORM = Object-Relational Mapper — แทนที่จะเขียน SQL ตรงๆ เราเขียน TypeScript แล้ว Prisma แปลงเป็น SQL ให้อัตโนมัติ พร้อม type-safety เต็มรูปแบบ

```bash
npm install @prisma/client    # runtime library (ใช้ใน Next.js)
npm install -D prisma         # CLI tool (migrate, generate, studio)
npm install -D ts-node        # รัน TypeScript โดยตรงได้ (ใช้กับ seed)
npm install server-only       # กัน import ผิดที่ (อธิบายด้านล่าง)
```

**ทำไม downgrade จาก Prisma 7 → 5?**
npm ติด Prisma 7 มาให้ แต่ Prisma 7 เพิ่งออกใหม่มากและเปลี่ยน architecture ใหญ่ — ย้าย config ออกจาก schema ไปเป็น TypeScript file ใหม่ชื่อ `prisma.config.ts` ทำให้ไม่เข้ากับ Supabase และไม่มี tutorial รองรับพอ เราจึงใช้ Prisma 5 ซึ่งเป็น stable version ที่ทุก Supabase tutorial ใช้

---

### 2. สร้าง Schema (`prisma/schema.prisma`)

**Schema คืออะไร?**
ไฟล์ที่บอกว่าฐานข้อมูลมีโครงสร้างยังไง — มี table อะไร แต่ละ table มี column อะไร ความสัมพันธ์ระหว่าง table เป็นยังไง

**เราสร้าง 8 tables:**

```
User          ← อาจารย์ + นักศึกษา (แยกด้วย role: TEACHER/STUDENT)
Course        ← รายวิชาที่อาจารย์สร้าง
Enrollment    ← ใครลงทะเบียนวิชาไหน (ตาราง M:N เชื่อม User กับ Course)
ClassSession  ← คาบเรียนแต่ละครั้ง + QR token
Attendance    ← บันทึกว่าใครเช็คอินคาบไหน
──────────── (5 tables ข้างบนคือระบบของเรา) ────────────
Account       ← NextAuth (เก็บ OAuth account)
Session       ← NextAuth (เก็บ session token)
VerificationToken ← NextAuth (เก็บ email verification)
```

> 3 tables ล่างเป็นมาตรฐานของ NextAuth — ใส่ไว้ตอนนี้เลยเพื่อไม่ต้อง migrate ซ้อนตอน Phase 2

**ทำไมต้องมี Unique Constraints?**
ใน schema เราใส่ `@@unique` หลายจุด เพื่อกันโกงและ bug:

| Constraint | กันอะไร |
|---|---|
| `Attendance(classSessionId, studentId)` | นักศึกษาคนเดียวกันเช็คอินคาบเดียวกันซ้ำไม่ได้ — กัน race condition และ replay attack |
| `Enrollment(studentId, courseId)` | ลงทะเบียนวิชาเดิมซ้ำไม่ได้ |
| `ClassSession.qrToken` | QR token ไม่ซ้ำกัน — ถ้าซ้ำ system จะเจอหลาย session ตอน lookup |
| `User.email` | email ซ้ำไม่ได้ |

**`onDelete` คืออะไร?**
กำหนดว่าถ้าลบ record หลัก จะทำอะไรกับ record ย่อย:

- `Cascade` = ลบตาม เช่น ลบวิชา → enrollment + คาบเรียนถูกลบตาม (สมเหตุสมผล)
- `Restrict` = ลบไม่ได้ถ้ายังมีลูก เช่น ลบนักศึกษาไม่ได้ถ้ายังมี attendance (กันประวัติเข้าเรียนหาย)

---

### 3. จัดการ Environment Variables (`.env` files)

**ทำไมต้อง 2 ไฟล์?**

| ไฟล์ | ใครอ่าน | มีอะไร |
|---|---|---|
| `.env.local` | Next.js runtime (ตอน `npm run dev`) | DATABASE_URL + DIRECT_URL |
| `.env` | Prisma CLI (`npx prisma migrate`) | DATABASE_URL + DIRECT_URL (เหมือนกัน) |

Prisma CLI อ่านแค่ `.env` ตาม dotenv standard — Next.js อ่านได้ทั้งสอง ทั้งคู่ถูก gitignore อยู่แล้ว

**DATABASE_URL vs DIRECT_URL ต่างกันยังไง?**

```
DATABASE_URL  = port 6543 (Pooled/PgBouncer) → ใช้ตอน app ทำงาน
                มี connection pool จัดการ → รองรับ concurrent users เยอะ

DIRECT_URL    = port 5432 (Direct)           → ใช้ตอนรัน migrate
                ต่อตรงกับ PostgreSQL → รองรับ prepared statements ที่ migrate ต้องการ
```

Prisma ใช้ `directUrl` อัตโนมัติตอน `prisma migrate dev` แล้วสลับกลับเป็น `url` ตอน runtime

---

### 4. รัน Migration

```bash
npx prisma migrate dev --name init
```

**Migration ทำอะไร?**
1. อ่าน `schema.prisma` → แปลงเป็น SQL
2. เชื่อมต่อ Supabase ผ่าน DIRECT_URL (port 5432)
3. สร้าง tables ใน PostgreSQL จริงๆ
4. บันทึก SQL ไว้ใน `prisma/migrations/20260428_init/migration.sql` (เป็น version history)
5. Generate Prisma Client (TypeScript types) อัตโนมัติ

**ทำไมต้องเก็บ migration file?**
ถ้าทีมมีหลายคน หรือ deploy ขึ้น production — Prisma รู้ว่า DB ตอนนี้อยู่ version ไหน และจะ apply แค่ migration ที่ยังไม่ได้รัน

---

### 5. สร้าง `src/lib/db.ts` (Prisma Client Singleton)

```typescript
import "server-only";         // บรรทัดนี้สำคัญมาก
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ ... });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

**ทำไมต้องเป็น Singleton?**
Next.js dev mode ใช้ Hot Reload — ทุกครั้งที่แก้ code ไฟล์จะถูก re-import ถ้า `new PrismaClient()` ทุกครั้ง จะสร้าง connection ใหม่เรื่อยๆ → connection leak → Supabase เต็ม Singleton แก้ปัญหานี้โดยเก็บ instance เดิมไว้ใน `globalThis`

**`import "server-only"` คืออะไร?**
กัน file นี้ถูก import จาก Client Component (React ฝั่ง browser) โดยไม่ตั้งใจ — ถ้าทำ Prisma Client จะถูก bundle ไปใน JavaScript ของ browser → CONNECTION_STRING หลุดออกไปให้ user เห็น

---

### 6. Seed Script (`prisma/seed.ts`)

สร้าง test user 2 คนไว้ใน DB:
- **teacher@tu.ac.th** (role: TEACHER)
- **test.student@dome.tu.ac.th** (role: STUDENT, studentId: 0000000001)

**ทำไมต้องมี?**
Phase 2 จะทำ Auth — ตอน dev เราจะใช้ `BYPASS_TU_AUTH=true` เพื่อ login โดยไม่ต้องผ่าน TU API จริง (เพราะ TU API ต้องใช้ account ธรรมศาสตร์จริง) Seed user พวกนี้คือ account ที่ใช้ทดสอบ

---

### สรุปผลลัพธ์ที่ได้

ตอนนี้ Supabase มี 8 tables พร้อมใช้งาน, TypeScript รู้จัก type ทุก table แล้ว, และ `db` object ที่ import ไปใช้ใน server code ได้เลยตอน Phase ถัดๆ ไป:

```typescript
import { db } from "@/lib/db";

const users = await db.user.findMany();  // TypeScript รู้ว่า users มี field อะไร
```