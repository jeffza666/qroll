# Code Review — Phase 3.5: Schedule + ClassSession Lifecycle

**วันที่:** 2026-04-29
**ผู้ review:** Project review pass
**Build status:** ✅ ผ่าน — TypeScript + ESLint clean
**Migration status:** ✅ Applied to Supabase production DB

---

## ภาพรวม (Overview)

Phase 3.5 เพิ่ม 2 feature หลัก:

1. **ตารางสอนรายสัปดาห์ (Schedule)** — อาจารย์กำหนดว่าสอนวันไหน เวลาใด ห้องไหน
2. **วงจรชีวิตคาบเรียน (ClassSession lifecycle)** — เปิด/ปิดคาบเรียนที่ผูกกับตารางสอน พร้อมกัน double-open ระดับ DB

---

## แผนที่ไฟล์ทั้งหมด (File Map)

```
Phase 3.5 สร้าง/แก้ไขไฟล์เหล่านี้:

prisma/
  schema.prisma                          ← แก้ไข: เพิ่ม Schedule model + ClassSession.scheduleId
  migrations/
    20260429050626_phase35_.../
      migration.sql                      ← ใหม่: SQL + partial unique index

src/
  lib/
    validations/
      schedule.ts                        ← ใหม่: Zod ตรวจ input ตารางสอน
    session-helpers.ts                   ← ใหม่: lazy auto-close helper

  app/
    actions/
      schedule.ts                        ← ใหม่: createSchedule, deleteSchedule
      session.ts                         ← ใหม่: openSession, closeSession

    (app)/teacher/
      page.tsx                           ← แก้ไข: เพิ่ม "ตารางสอนวันนี้" จาก DB จริง
      courses/[id]/page.tsx              ← แก้ไข: เพิ่ม tab "ตารางสอน"
      sessions/[id]/page.tsx             ← ใหม่: skeleton session page

  components/courses/
    ScheduleForm.tsx                     ← ใหม่: form เพิ่มตาราง (client)
    ScheduleDeleteButton.tsx             ← ใหม่: ปุ่มลบตาราง (client)
    OpenSessionButton.tsx                ← ใหม่: ปุ่มเปิด session (client)
    CloseSessionButton.tsx               ← ใหม่: ปุ่มปิด session (client)
```

---

## อธิบายแต่ละไฟล์

---

### 1. `prisma/schema.prisma` — Database Schema

**ทำอะไร:** กำหนดโครงสร้าง database ว่ามีตารางอะไรบ้าง field อะไรบ้าง

**สิ่งที่เพิ่มใน Phase 3.5:**

```
Schedule (ตารางใหม่)
├── id           — primary key
├── courseId     — FK → Course (สังกัดวิชาไหน)
├── dayOfWeek    — วันสอน: 0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์
├── startTime    — เวลาเริ่ม "HH:MM" เช่น "09:00"
├── endTime      — เวลาจบ "HH:MM" เช่น "12:00"
└── room         — ห้องเรียน (optional)

ClassSession (แก้ไขตารางเดิม)
├── scheduleId   — FK → Schedule (ผูกกับ slot ไหน) ← ใหม่
└── closedAt     — เวลาปิดจริง                    ← ใหม่
```

**ทำไม `dayOfWeek` เป็นตัวเลข 0-6:**
ตรงกับ `new Date().getDay()` ของ JavaScript โดยตรง ลด bug จากการแปลง

**ทำไม `startTime`/`endTime` เป็น String "HH:MM":**
เก็บ "เวลาในวัน" ไม่ใช่ timestamp — เปรียบเทียบ string "09:00" < "12:00" ได้ถูกต้อง ไม่มี timezone ยุ่งเหยิง

---

### 2. `migration.sql` — Database Migration

**ทำอะไร:** SQL ที่รันกับ database จริงเพื่อสร้าง/แก้ไข table

**จุดสำคัญที่สุดของ Phase 3.5:**

```sql
-- บรรทัดนี้คือหัวใจของ Phase 3.5
CREATE UNIQUE INDEX "ClassSession_one_open_per_course"
  ON "ClassSession" ("courseId")
  WHERE "isOpen" = true;
```

**ทำไมถึงสำคัญ:**
- นี่คือ **Partial Unique Index** — DB อนุญาตให้มี session ได้มากกว่า 1 ต่อ course แต่ **เปิดพร้อมกันได้แค่ 1**
- ถ้าครูกดปุ่มเปิดซ้ำหรือมีการโจมตีแบบ race condition → DB จะ reject ทันที ไม่ต้องรอ application
- Prisma 5 DSL ไม่รองรับ `WHERE` ใน `@@unique` จึงต้องเขียน raw SQL ตรงนี้

---

### 3. `src/lib/validations/schedule.ts` — Zod Validation

**ทำอะไร:** กำหนดกฎตรวจสอบข้อมูลก่อนส่งเข้า database

```
ตรวจ:
├── courseId    — ต้องเป็น CUID format (ไม่ใช่ ID ปลอม)
├── dayOfWeek   — ต้องเป็นเลข 0-6
├── startTime   — ต้อง format HH:MM 24h (regex)
├── endTime     — ต้อง format HH:MM 24h (regex)
├── room        — ≤ 50 ตัวอักษร, optional
└── cross-field — startTime ต้องน้อยกว่า endTime
```

**ทำไมต้องมีไฟล์นี้:**
Server Action รับ FormData ดิบจาก browser — ใครก็ส่งอะไรมาก็ได้ Zod คือ "ประตูกรอง" ก่อนถึง database

---

### 4. `src/app/actions/schedule.ts` — Schedule Server Actions

**ทำอะไร:** logic ฝั่ง server สำหรับจัดการตารางสอน

#### `createSchedule(formData)`
```
Flow:
1. รับ FormData จาก ScheduleForm
2. Zod validate ทุก field
3. requireCourseOwner() — เช็คว่าครู login แล้วและเป็นเจ้าของวิชานี้จริง
4. INSERT ลง Schedule table
5. revalidatePath — บอก Next.js ให้ refresh หน้า course detail
```

#### `deleteSchedule(scheduleId)`
```
Flow:
1. โหลด schedule เพื่อได้ courseId
2. requireCourseOwner() — กัน IDOR (ครู A ลบตารางของครู B ไม่ได้)
3. try DELETE → ถ้า FK constraint fail (มี session อยู่) → return error message
4. throw ถ้าเป็น error อื่นที่ไม่รู้จัก
```

**ความปลอดภัย:** `requireCourseOwner` อยู่ **หลัง** validate ไม่ใช่ก่อน — เพราะถ้าใส่ก่อน attacker ที่ไม่ได้ login จะรู้ว่า courseId นั้นมีอยู่จริงหรือเปล่า (information leak)

---

### 5. `src/app/actions/session.ts` — Session Server Actions

**ทำอะไร:** logic เปิด/ปิดคาบเรียน

#### `openSession(scheduleId)`
```
Flow:
1. โหลด Schedule → ได้ courseId + startTime + endTime
2. requireCourseOwner()
3. คำนวณ startsAt/endsAt จาก Bangkok timezone (server-side เท่านั้น!)
4. INSERT ClassSession → isOpen=true
   └── ถ้า P2002 (unique constraint) = มี session เปิดอยู่แล้ว → error message
5. redirect ไป /teacher/sessions/[id]
```

**จุดสำคัญ — ทำไม server คำนวณเวลาเอง:**
```
❌ อย่าทำ: รับ startsAt จาก client
✅ ทำถูก: server ดู Schedule.startTime + วันนี้ (Bangkok) แล้วคำนวณเอง
```
ถ้ารับจาก client ครูสามารถส่ง startsAt ในอดีตเพื่อโกงว่า session เริ่มตั้งนานแล้ว

**Bangkok timezone:**
```typescript
// "sv-SE" locale = ISO date format "YYYY-MM-DD" ในภาษา Swedish
// ใช้ trick นี้เพราะ Node.js ไม่มี built-in "get today in timezone X" API
const bangkokDateStr = new Date().toLocaleDateString("sv-SE", {
  timeZone: "Asia/Bangkok",
}); // → "2026-04-29"
```

#### `closeSession(sessionId)`
```
Flow:
1. requireCourseOwner via session → courseId
2. updateMany WHERE id=... AND isOpen=true → isOpen=false, closedAt=now
   └── "many" ทำให้ idempotent: ถ้าปิดแล้วก็ไม่ error แค่ update 0 rows
3. revalidatePath 3 หน้า
```

---

### 6. `src/lib/session-helpers.ts` — Auto-close Helper

**ทำอะไร:** ตรวจว่า session ที่ยัง `isOpen=true` แต่เลยเวลาแล้วหรือเปล่า ถ้าใช่ → ปิดอัตโนมัติ

```typescript
// ถ้า session ยังเปิดอยู่ แต่เลย endsAt + 30 นาทีแล้ว
→ UPDATE isOpen=false, closedAt=expiresAt
```

**ทำไมใช้ "Lazy close" แทน cron job:**

| วิธี | ข้อดี | ข้อเสีย |
|------|-------|---------|
| **Lazy (เราใช้)** | ไม่ต้อง infra เพิ่ม, ง่าย | session ค้างใน DB ถ้าไม่มีใคร read |
| Cron job | ปิดแน่นอนตามเวลา | ต้องมี Vercel Cron / background worker เพิ่ม |

MVP ระดับ final project → lazy พอ Phase 6 ค่อยเพิ่ม cron

---

### 7. `src/components/courses/ScheduleForm.tsx` — UI Form เพิ่มตาราง

**ทำอะไร:** form ที่อาจารย์กรอกเพื่อเพิ่มตารางสอน (Client Component)

```
State:
├── open (boolean)     — แสดง/ซ่อน form
├── error (string)     — error message จาก server
└── isPending          — ปุ่มกด disabled ระหว่างส่ง

Flow:
1. กด "เพิ่มตาราง" → open=true → แสดง form
2. กรอก form → submit → handleSubmit()
3. handleSubmit → startTransition → createSchedule(formData)
4. ถ้า error → แสดง error message
5. ถ้า success → reset form + close
```

**ทำไม `useTransition` ไม่ใช่ `useState(loading)`:**
`useTransition` บอก React ว่า action นี้เป็น "non-urgent" → UI ยังตอบสนองได้ระหว่างรอ ปุ่ม disabled อัตโนมัติ

---

### 8. `src/components/courses/ScheduleDeleteButton.tsx`

**ทำอะไร:** ปุ่มลบตารางสอน — มี confirm dialog ก่อนลบจริง

---

### 9. `src/components/courses/OpenSessionButton.tsx`

**ทำอะไร:** ปุ่มเปิดคาบเรียน — กดแล้ว call `openSession()` → ถ้า success จะ redirect อัตโนมัติ (จัดการโดย server action) ถ้า error แสดง alert

---

### 10. `src/components/courses/CloseSessionButton.tsx`

**ทำอะไร:** ปุ่มปิดคาบเรียน — มี confirm dialog ก่อนปิด

---

### 11. `src/app/(app)/teacher/courses/[id]/page.tsx` — แก้ไข

**ทำอะไร:** Course detail page — เพิ่ม tab system

**ก่อน Phase 3.5:** หน้าเดียว แสดงแค่ roster

**หลัง Phase 3.5:** มี 2 tabs ผ่าน URL param `?tab=roster` / `?tab=schedule`

```
URL: /teacher/courses/[id]?tab=roster   → แสดง Roster (default)
URL: /teacher/courses/[id]?tab=schedule → แสดง ตารางสอน
```

**ทำไมใช้ URL param แทน client-side state:**
Server Component อ่าน URL param ได้โดยตรง ไม่ต้องทำ client component ทั้งหน้า ✓

---

### 12. `src/app/(app)/teacher/page.tsx` — แก้ไข Dashboard

**ทำอะไร:** Teacher dashboard — แก้ section "ตารางสอนวันนี้" ให้ใช้ข้อมูลจาก DB จริง

**Query logic:**
```typescript
// 1. หาวันปัจจุบันในไทย (Bangkok timezone)
const todayDow = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
).getDay();  // → 0-6

// 2. ดึง schedule ของวันนี้ พร้อม active session (ถ้ามี)
db.schedule.findMany({
  where: { dayOfWeek: todayDow, course: { teacherId: user.id } },
  include: {
    classSessions: { where: { isOpen: true }, take: 1 }
  }
})
```

**UI logic:**
- มี active session → แสดง badge "เปิดอยู่" + ปุ่ม "ดู session"
- ไม่มี → ปุ่ม "เปิด session"

---

### 13. `src/app/(app)/teacher/sessions/[id]/page.tsx` — ใหม่

**ทำอะไร:** หน้า session detail — แสดงสถานะคาบเรียน + placeholder QR

```
Flow:
1. โหลด session (include course + schedule + _count)
2. requireCourseOwner → กัน IDOR
3. autoCloseIfExpired → lazy close ถ้าเลยเวลา
4. Render:
   ├── Status badge (เปิดอยู่ / ปิดแล้ว)
   ├── ข้อมูล: วัน เวลา ห้อง เปิดเมื่อ ปิดเมื่อ จำนวนเช็คอิน
   ├── ปุ่ม "ปิด session" (แสดงเฉพาะตอน isOpen=true)
   └── [Phase 4] QR Code placeholder
```

---

## สรุปจุด Security ที่ดี

| จุด | ไฟล์ | ทำยังไง |
|-----|------|---------|
| กัน double-open | migration.sql | Partial unique index ระดับ DB |
| กัน IDOR | ทุก action | `requireCourseOwner()` ก่อนทุก mutation |
| กัน time tampering | session.ts | server คำนวณ `startsAt`/`endsAt` เอง |
| กัน invalid input | schedule.ts | Zod validate ทุก field รวม cross-field |
| idempotent close | session.ts | `updateMany WHERE isOpen=true` |
| lazy auto-close | session-helpers.ts | เช็คทุกครั้งที่ render หน้า session |

---

## จุดที่ควรระวังในอนาคต

### 1. `openSession` — redirect อยู่ใน try block
```typescript
// ปัจจุบัน redirect อยู่นอก try ✅ ถูกต้องแล้ว
// Next.js redirect() throw error ภายใน — ห้ามอยู่ใน try/catch
let sessionId: string;
try {
  // ... create session
} catch (err) { ... }
redirect(`/teacher/sessions/${sessionId}`); // ← นอก try ✅
```

### 2. Bangkok timezone dependency
ถ้า deploy บน server ที่ไม่ใช่ `Asia/Bangkok` (เช่น Vercel default = UTC) — `sv-SE` locale trick ยังทำงานได้ถูกต้องเพราะส่ง `timeZone` option ไปด้วย แต่ควรเขียน test ยืนยันไว้

### 3. `deleteSchedule` error detection
```typescript
// ปัจจุบัน:
if (msg.includes("P2003") || msg.includes("Foreign key constraint"))
// ✅ ใช้ได้ แต่ brittle — ถ้า Prisma เปลี่ยน error format อาจพัง
// Phase 6: เปลี่ยนเป็น import { Prisma } from "@prisma/client" แล้วเช็ค instanceof
```

### 4. Lazy auto-close: session ค้างใน DB
Sessions ที่ไม่มีใครเข้าดูจะยังเป็น `isOpen=true` ใน DB จนกว่าจะมี read
- ไม่กระทบ business logic (นักศึกษาเช็คอินผ่าน `autoCloseIfExpired` ก่อน)
- Phase 6: เพิ่ม Vercel Cron `closeExpiredSessions()` รายวัน

---

## Verdict

**Approve ✅** — โค้ดสะอาด, security ครอบคลุมจุดสำคัญ, build ผ่าน 100%

สิ่งที่ดีที่สุดของ Phase 3.5 คือ **partial unique index** ที่ enforce "1 open session per course" ที่ระดับ DB แทนที่จะเป็น application check — ถูกต้องตามหลัก "defense in depth" และกัน race condition ได้จริง
