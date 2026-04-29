# Phase 4.5 Review - Student Check-in Flow

**วันที่:** 2026-04-29  
**สถานะ:** ใช้งานได้แล้ว  
**Build:** `npm.cmd run build` ผ่าน  
**Migration:** `phase45_checkin_flow` apply กับ Supabase แล้ว

---

## ภาพรวมสั้น ๆ

Phase 4.5 ทำให้ระบบ QRoll เช็คชื่อจาก QR ได้จริงครบ flow แรก:

1. อาจารย์เปิด session และแสดง Dynamic QR
2. นักศึกษาสแกน QR ด้วยมือถือ
3. ถ้ายังไม่ login ระบบพาไป login แล้วกลับมาที่ลิงก์เดิม
4. นักศึกษาเห็นข้อมูลตัวเองจากบัญชี login
5. กด “ยืนยันเข้าเรียน”
6. ระบบเช็กว่าอยู่ในรายชื่อ `Enrollment`
7. ระบบบันทึก `Attendance` ลง Supabase ด้วยเวลาฝั่ง server
8. หน้า session ของอาจารย์เห็นรายชื่อที่เช็คชื่อแล้ว

นอกจากนี้ยังเพิ่ม **Demo check-in** สำหรับวันนำเสนอ:

- คนทั่วไปสแกน `/demo/checkin?t=<token>`
- พิมพ์ชื่อเอง
- กด check-in
- ข้อมูลถูกบันทึกลงตาราง `DemoCheckIn`
- ไม่ปนกับ `Attendance`, `User`, หรือ `Enrollment` จริง

แนวคิดสำคัญของ Phase นี้:

> ระบบจริงต้องพิสูจน์ตัวตนด้วย login ส่วน demo มีไว้โชว์ประสบการณ์ใช้งาน จึงต้องเก็บแยกจากข้อมูลจริง

---

## Flow จริงของนักศึกษา

```text
นักศึกษาสแกน QR
  -> /checkin?t=<token>
  -> ถ้ายังไม่ login: ไป /login?from=/checkin?t=<token>
  -> login สำเร็จแล้วกลับมาที่ /checkin?t=<token>
  -> ระบบแสดงรายวิชา + ข้อมูลนักศึกษาจาก session
  -> นักศึกษากด "ยืนยันเข้าเรียน"
  -> Server Action เช็ก token + enrollment
  -> บันทึก Attendance
  -> แสดงผล success / late / duplicate / expired / not enrolled
```

ทำไมไม่ให้เลือกชื่อเองในระบบจริง:

- ถ้าเลือกชื่อเอง นักศึกษาสามารถเลือกชื่อเพื่อนแทนได้
- login เป็นตัวพิสูจน์ว่า “คนนี้คือใคร”
- `Enrollment` เป็นตัวพิสูจน์ว่า “คนนี้มีสิทธิ์เช็คชื่อวิชานี้ไหม”
- อธิบายกับอาจารย์ได้ง่ายว่า QR = คาบเรียน, login = ตัวตน, enrollment = สิทธิ์เข้าเรียน

---

## Flow Demo สำหรับวันโชว์

```text
คนทั่วไปสแกน Demo QR
  -> /demo/checkin?t=<token>
  -> พิมพ์ชื่อ
  -> กด Check in demo
  -> ระบบบันทึก DemoCheckIn
  -> ชื่อขึ้นใน sidebar ฝั่งอาจารย์ใต้ "Demo check-ins"
```

ทำไมต้องแยก demo:

- คนที่มาลองงานอาจไม่ใช่นักศึกษา TU
- ไม่ควรสร้าง fake `User`
- ไม่ควรสร้าง fake `Enrollment`
- ไม่ควรเขียนลง `Attendance` เพราะ `Attendance` คือข้อมูลจริงของระบบ
- แยกตารางแล้วอธิบายได้ว่า demo เป็น data lane คนละชุดกับระบบจริง

---

## Decision สำคัญ

| เรื่อง | ตัดสินใจ | เหตุผล |
| ------ | -------- | ------ |
| ตัวตนนักศึกษาจริง | ใช้ข้อมูลจาก login เท่านั้น | ป้องกันเช็คชื่อแทนกัน |
| หน้าเช็คชื่อจริง | `/checkin?t=<token>` | ตรงกับ QR payload จาก Phase 4 |
| หน้า demo | `/demo/checkin?t=<token>` | แยก public demo ออกจากระบบจริง |
| ตาราง demo | `DemoCheckIn` | ไม่ให้ข้อมูลโชว์งานปนกับ attendance จริง |
| เปิด/ปิด demo | `DEMO_CHECKIN_ENABLED` | เปิดตอนโชว์ ปิดตอน production ได้ |
| เวลาเช็คชื่อ | ใช้ server time | ไม่เชื่อเวลาจากมือถือผู้ใช้ |
| duplicate | ใช้ unique constraint เดิม + handle `P2002` | กันกดซ้ำและ race condition |
| session เปิดซ้ำ | redirect ไป session ที่เปิดอยู่ | กัน runtime error จาก unique courseId |

---

## ไฟล์ที่สร้างหรือแก้

### 1. `docs/prps/05-checkin-flow.md`

**หน้าที่:** เอกสารวางแผน Phase 4.5

ในไฟล์นี้อธิบาย:

- real student check-in flow
- demo check-in flow
- ทำไม demo ต้องแยกจาก attendance จริง
- schema `DemoCheckIn`
- security checklist
- test strategy
- definition of done

ไฟล์นี้มีไว้ให้คนอ่านต่อเข้าใจว่า Phase 4.5 จะทำอะไรและตัดสินใจอะไรไว้บ้าง

---

### 2. `prisma/schema.prisma`

**หน้าที่:** เพิ่ม schema สำหรับ demo check-in

เพิ่ม relation ใน `ClassSession`:

```prisma
demoCheckIns DemoCheckIn[]
```

เพิ่ม model ใหม่:

```prisma
model DemoCheckIn {
  id             String   @id @default(cuid())
  classSessionId String
  displayName    String
  checkedInAt    DateTime @default(now())
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  classSession ClassSession @relation(fields: [classSessionId], references: [id], onDelete: Cascade)

  @@index([classSessionId])
  @@index([checkedInAt])
}
```

เหตุผล:

- ให้ demo write ลง Supabase จริง
- แต่ไม่ปนกับ `Attendance`
- ถ้าลบ session demo records จะถูกลบตามผ่าน cascade

---

### 3. `prisma/migrations/20260429072441_phase45_checkin_flow/migration.sql`

**หน้าที่:** SQL migration สำหรับสร้างตาราง `DemoCheckIn` ใน Supabase

สิ่งที่ migration ทำ:

- สร้าง table `DemoCheckIn`
- สร้าง index ที่ `classSessionId`
- สร้าง index ที่ `checkedInAt`
- สร้าง foreign key ไป `ClassSession`

Migration นี้ apply ไปที่ Supabase แล้ว

---

### 4. `.env.example`

**หน้าที่:** เพิ่ม env ตัวอย่างสำหรับเปิด/ปิด demo mode

เพิ่ม:

```env
DEMO_CHECKIN_ENABLED=false
```

ใช้แบบนี้:

- local/showcase: ตั้งเป็น `true`
- production จริง: ตั้งเป็น `false`

เหตุผลคือไม่อยากให้ public demo เปิดอยู่ตลอดเวลาในระบบจริง

---

### 5. `.env.local`

**หน้าที่:** เปิด demo mode เฉพาะเครื่อง local เพื่อทดสอบ

เพิ่ม:

```env
DEMO_CHECKIN_ENABLED=true
```

หมายเหตุ:

- `.env.local` ไม่ควรถูก commit
- ใช้เฉพาะเครื่อง dev ตอนลอง demo

---

### 6. `src/middleware.ts`

**หน้าที่:** ปรับ auth redirect ให้กลับมาที่ QR token เดิมได้

ก่อนแก้:

```text
/checkin?t=abc -> /login?from=/checkin
```

ปัญหาคือ token หาย

หลังแก้:

```text
/checkin?t=abc -> /login?from=/checkin?t=abc
```

สิ่งที่เพิ่ม:

- preserve `pathname + search`
- allow public route `/demo/checkin`

เหตุผล:

- นักศึกษาสแกน QR แล้ว login ต้องกลับมาเช็คชื่อด้วย token เดิมได้
- demo route ไม่ต้อง login

---

### 7. `src/lib/checkin.ts`

**หน้าที่:** รวม helper ฝั่ง server สำหรับ check-in

ฟังก์ชันหลัก:

- `isDemoCheckInEnabled()`
- `getAttendanceStatus(now, lateAfter)`
- `getCheckInContext(token)`

`getCheckInContext(token)` ทำหน้าที่:

1. เช็กว่ามี token ไหม
2. เรียก `verifyQrToken(token)`
3. โหลด `ClassSession` พร้อม course/schedule
4. เรียก `autoCloseIfExpired`
5. คืน context ที่หน้า `/checkin` และ `/demo/checkin` ใช้ร่วมกัน

เหตุผลที่แยกไฟล์:

- ลดการเขียน logic verify ซ้ำ
- real และ demo ใช้ context ของ session เดียวกัน แต่เขียนลงคนละ table

---

### 8. `src/lib/validations/checkin.ts`

**หน้าที่:** Zod validation สำหรับ check-in

มี schema:

- `qrTokenSchema`
- `demoCheckInSchema`

`demoCheckInSchema` เช็ก:

- token ต้องไม่ว่าง
- displayName ต้องไม่ว่าง
- displayName ยาวไม่เกิน 80 ตัวอักษร

เหตุผล:

- public demo รับ input จากคนทั่วไป จึงต้อง validate ก่อนเขียน DB

---

### 9. `src/app/actions/checkin.ts`

**หน้าที่:** Server Actions สำหรับบันทึก real attendance และ demo check-in

ฟังก์ชันหลัก:

#### `checkInWithQrToken(token)`

ใช้กับระบบจริง

ทำงานแบบนี้:

1. validate token
2. `requireStudent()`
3. `getCheckInContext(token)`
4. เช็ก `Enrollment`
5. เช็ก duplicate `Attendance`
6. คำนวณ `PRESENT` หรือ `LATE`
7. บันทึก `Attendance` ด้วย server time
8. เก็บ `ipAddress` และ `userAgent` ถ้ามี
9. คืนผลให้ UI แสดง success/late/duplicate/error

#### `demoCheckInWithQrToken(token, displayName)`

ใช้กับ demo

ทำงานแบบนี้:

1. เช็ก `DEMO_CHECKIN_ENABLED`
2. validate token และ displayName
3. `getCheckInContext(token)`
4. บันทึก `DemoCheckIn`
5. คืนชื่อและเวลาที่บันทึก

เหตุผล:

- Server Action เหมาะกับ mutation จาก UI ภายใน app
- ทุกอย่างที่เป็น security decision อยู่ฝั่ง server

---

### 10. `src/app/checkin/page.tsx`

**หน้าที่:** หน้าเช็คชื่อจริงสำหรับนักศึกษา

URL:

```text
/checkin?t=<token>
```

สิ่งที่หน้าแสดง:

- course code
- course name
- semester
- time
- room
- ชื่อ/email/student ID จาก login
- ปุ่ม “ยืนยันเข้าเรียน”
- ผลลัพธ์หลัง submit

state ที่รองรับ:

- missing token
- invalid QR
- expired QR
- closed session
- wrong role
- ready to check in

หมายเหตุ:

- ไม่ให้เลือกชื่อเอง
- ถ้าไม่ได้ login middleware จะพาไป login ก่อน

---

### 11. `src/app/demo/checkin/page.tsx`

**หน้าที่:** หน้า demo check-in สำหรับคนทั่วไป

URL:

```text
/demo/checkin?t=<token>
```

สิ่งที่หน้าแสดง:

- course/session context
- input ให้พิมพ์ชื่อ
- ปุ่ม `Check in demo`
- result ว่าบันทึกสำเร็จหรือไม่

state ที่รองรับ:

- demo mode disabled
- missing token
- invalid QR
- expired QR
- closed session
- ready
- success

เหตุผลที่แยก route:

- public demo ไม่ต้อง login
- real check-in ต้อง login
- แยก URL ทำให้แยก mental model ง่ายมาก

---

### 12. `src/components/checkin/CheckInShell.tsx`

**หน้าที่:** layout กลางสำหรับหน้า check-in บนมือถือ

ใช้ร่วมกันโดย:

- `/checkin`
- `/demo/checkin`

หน้าตา:

- QRoll logo
- badge มุมขวา เช่น Student/Demo
- card กลาง
- title/subtitle
- content children

เหตุผล:

- ให้ real/demo page หน้าตาไปทางเดียวกัน
- ไม่หลุด theme จากหน้า login และ teacher dashboard

---

### 13. `src/components/checkin/SessionSummary.tsx`

**หน้าที่:** card สรุปรายวิชาและเวลา session

แสดง:

- course code
- course name
- semester
- session time
- room

ใช้ใน:

- `/checkin`
- `/demo/checkin`

---

### 14. `src/components/checkin/StudentCheckInForm.tsx`

**หน้าที่:** client component สำหรับกดยืนยันเข้าเรียนจริง

ทำงาน:

- แสดงข้อมูลนักศึกษาจาก session
- กดปุ่มแล้วเรียก `checkInWithQrToken(token)`
- แสดงผล:
  - success
  - late
  - duplicate
  - invalid
  - expired
  - closed
  - not enrolled
  - wrong role

เหตุผลที่เป็น client component:

- ต้องมี loading state
- ต้องเปลี่ยน result หลังผู้ใช้กดปุ่มโดยไม่ reload หน้า

---

### 15. `src/components/checkin/DemoCheckInForm.tsx`

**หน้าที่:** client component สำหรับ demo check-in

ทำงาน:

- input ชื่อ
- กด submit แล้วเรียก `demoCheckInWithQrToken(token, displayName)`
- ถ้าสำเร็จ clear input เพื่อให้ลองชื่ออื่นได้
- แสดง success/error state

เหตุผล:

- รองรับการลองหลายคนในงาน demo
- ทำให้คนทั่วไปเห็นผลทันที

---

### 16. `src/components/checkin/StatusPanel.tsx`

**หน้าที่:** component กลางสำหรับแสดงผลลัพธ์

รองรับ tone:

- success
- danger
- warning
- neutral

ใช้ใน:

- real check-in
- demo check-in
- invalid/expired/closed states

---

### 17. `src/components/sessions/SessionView.tsx`

**หน้าที่:** เพิ่ม demo QR ให้ teacher session page

ของเดิม:

- fetch QR token
- generate QR จริงไป `/checkin?t=<token>`

ของใหม่:

- ถ้า `DEMO_CHECKIN_ENABLED=true`
- generate demo QR แยกไป `/demo/checkin?t=<token>`
- ส่ง `demoQrDataUrl` และ `demoUrl` ให้ sidebar

เหตุผล:

- QR หลักยังเป็นระบบจริง
- Demo QR แยกอยู่ใน sidebar
- คนทั่วไปสแกน demo ได้โดยไม่ปนกับ student check-in

---

### 18. `src/components/sessions/CheckedInSidebar.tsx`

**หน้าที่:** sidebar แสดงรายชื่อ check-in แบบ live-ish

ของเดิม:

- เป็น skeleton placeholder

ของใหม่:

- แสดงจำนวน real attendance
- แสดงรายชื่อนักศึกษาล่าสุด
- แสดง status `ทันเวลา` / `สาย` / `ขาด`
- แสดง Demo QR
- แสดงจำนวน demo check-ins
- แสดงรายชื่อ demo ล่าสุด
- polling `/api/sessions/[id]/checkins` ทุก 5 วินาที

เหตุผล:

- อาจารย์เห็นผลตอนนักศึกษา/คน demo check-in
- แยก real กับ demo ชัดเจน
- ไม่ต้องใช้ WebSocket สำหรับ MVP

---

### 19. `src/app/api/sessions/[id]/checkins/route.ts`

**หน้าที่:** API สำหรับ sidebar ดึงรายชื่อ check-in ล่าสุด

Endpoint:

```text
GET /api/sessions/[id]/checkins
```

ทำงาน:

1. เช็ก session exists
2. เช็ก teacher เป็นเจ้าของ course ด้วย `requireCourseOwner`
3. count real attendance
4. count demo check-ins
5. ดึงรายการล่าสุดของทั้งสองชุด
6. ส่ง JSON กลับแบบ `no-store`

เหตุผล:

- sidebar เป็น client component และต้อง polling
- route นี้เป็น read endpoint สำหรับข้อมูลสดบนหน้า teacher

---

### 20. `src/app/(app)/teacher/sessions/[id]/page.tsx`

**หน้าที่:** เพิ่มข้อมูลเริ่มต้นให้ teacher session page

ของใหม่:

- include `attendances`
- include `demoCheckIns`
- `_count` ทั้งสองชุด
- ส่งข้อมูลให้ `SessionView`
- ส่ง `demoEnabled={isDemoCheckInEnabled()}`

เหตุผล:

- เปิดหน้าแล้วเห็นข้อมูลทันที ไม่ต้องรอ polling รอบแรก
- sidebar รู้ว่าควรแสดง demo section ไหม

---

### 21. `src/app/actions/session.ts`

**หน้าที่:** แก้เปิด session ซ้ำให้ UX ดีขึ้น

ปัญหาที่เจอ:

- ถ้ามี session ของ course นี้เปิดอยู่แล้ว
- DB unique index กันไว้ที่ `courseId WHERE isOpen=true`
- Prisma โยน `P2002`
- ก่อนแก้ error หลุดเป็น runtime page

ของใหม่:

- ก่อน create session เช็กก่อนว่ามี open session อยู่ไหม
- ถ้ามี redirect ไป session เดิม
- ถ้า race condition ยังเกิด `P2002` ก็จับและ redirect ไป session เดิม

เหตุผล:

- DB constraint ยังทำหน้าที่ป้องกันข้อมูล
- UX ไม่พังเมื่อผู้ใช้กดเปิดซ้ำ

---

### 22. `src/app/(app)/student/page.tsx`

**หน้าที่:** dashboard พื้นฐานของนักศึกษา

แสดง:

- จำนวนวิชาที่ลงเรียน
- ข้อความบอกให้สแกน QR เพื่อเช็คชื่อ
- ประวัติเช็คชื่อล่าสุด

เหตุผล:

- หลัง login เป็น student แล้ว redirect ไป `/student` ได้จริง
- nav ฝั่ง student ไม่เป็นหน้าเปล่า

---

### 23. `src/app/(app)/student/courses/page.tsx`

**หน้าที่:** หน้าวิชาที่นักศึกษาลงเรียน

แสดง:

- course code
- course name
- semester
- จำนวนนักศึกษาใน course

เหตุผล:

- รองรับ student nav ที่มีอยู่แล้ว

---

### 24. `src/app/(app)/student/history/page.tsx`

**หน้าที่:** หน้าประวัติเข้าเรียนของนักศึกษา

แสดง:

- รายวิชา
- สถานะ present/late/absent
- เวลาเช็คชื่อ

เหตุผล:

- นักศึกษาดูผล check-in ของตัวเองย้อนหลังได้เบื้องต้น

---

## สิ่งที่ต้องตั้งค่าก่อน demo บน Vercel

ใน Vercel Environment Variables:

```env
DATABASE_URL=...
DIRECT_URL=...
NEXTAUTH_URL=https://<your-vercel-domain>
NEXTAUTH_SECRET=...
BYPASS_TU_AUTH=true
DEMO_CHECKIN_ENABLED=true
TU_API_URL=https://restapi.tu.ac.th/api/v1/auth/Ad/verify
TU_API_KEY=
```

สำคัญ:

- `NEXTAUTH_URL` ต้องเป็น Vercel URL จริง ไม่ใช่ localhost
- ถ้าเปิด teacher session จาก localhost QR จะเป็น localhost
- ถ้าต้องการให้มือถือคนอื่นสแกนได้ ต้องเปิด teacher session จาก Vercel URL
- ถ้าจะใช้ demo mode ในงานโชว์ ให้ตั้ง `DEMO_CHECKIN_ENABLED=true`

---

## วิธีทดสอบแบบ manual

### A. Real student check-in

1. เปิด dev server:

```bash
npm run dev
```

2. Login teacher:

```text
teacher@tu.ac.th
```

password ใส่อะไรก็ได้ถ้า `BYPASS_TU_AUTH=true`

3. เปิด session จากตารางสอน
4. Login อีก session/browser เป็น student:

```text
test.student@dome.tu.ac.th
```

5. เปิด `/checkin?t=<token>`
6. กด “ยืนยันเข้าเรียน”
7. เช็กว่า `Attendance` มี row ใหม่ใน Supabase
8. เช็กว่า teacher sidebar มีชื่อนักศึกษา

ถ้า student ไม่ได้ enroll ใน course นั้น ระบบควรขึ้น `not enrolled`

### B. Demo check-in

1. ตั้ง:

```env
DEMO_CHECKIN_ENABLED=true
```

2. เปิด teacher session
3. สแกน Demo QR ใน sidebar
4. พิมพ์ชื่อ
5. กด check-in
6. เช็กว่า `DemoCheckIn` มี row ใหม่ใน Supabase
7. เช็กว่า `Attendance`, `User`, `Enrollment` ไม่ถูกสร้างเพิ่มสำหรับคน demo

---

## Verification ที่ทำแล้ว

รันผ่านแล้ว:

```bash
npx.cmd prisma migrate dev --name phase45_checkin_flow
npx.cmd prisma generate
npm.cmd run build
```

หมายเหตุ:

- ตอน generate/build บน Windows ถ้า dev server เปิดอยู่ อาจล็อก Prisma/Next files ได้
- วิธีแก้คือปิด dev server ชั่วคราว แล้วรัน generate/build ใหม่

---

## ข้อควรระวัง

### 1. อย่า commit `.env.local`

ไฟล์นี้มีค่า local เช่น:

```env
BYPASS_TU_AUTH=true
DEMO_CHECKIN_ENABLED=true
```

ควรอยู่ในเครื่องเท่านั้น ไม่ควรขึ้น Git

### 2. Demo data ห้ามเอาไปรวมกับ report จริง

Phase 5/6 ถ้าทำ dashboard/report/export:

- ใช้ `Attendance` สำหรับข้อมูลจริง
- ใช้ `DemoCheckIn` สำหรับโชว์/ทดสอบเท่านั้น

### 3. QR local ใช้กับมือถือคนอื่นไม่ได้

ถ้า teacher เปิดจาก:

```text
http://localhost:3000
```

QR จะเป็น localhost ด้วย มือถือคนอื่นจะเปิดไม่ได้

ถ้าจะโชว์จริง ต้องเปิด teacher session จาก:

```text
https://<your-vercel-domain>
```

### 4. Dynamic QR ปริ้นล่วงหน้าไม่ได้

QR หมุนทุก 30 วินาที จึงต้องเปิดหน้า session สดจากเว็บตอน demo

---

## สรุป

Phase 4.5 ทำให้ QRoll มี check-in flow ที่ใช้งานได้จริงแล้ว:

- ระบบจริงใช้ login + enrollment + server time
- demo mode ให้คนทั่วไปลองได้โดยไม่ปนข้อมูลจริง
- teacher session page เห็น real attendance และ demo check-ins แยกกัน
- student pages พื้นฐานพร้อมใช้งาน
- build ผ่าน
- migration ขึ้น Supabase แล้ว

จุดถัดไปที่เหมาะสมคือ Phase 5: ทำ dashboard/report ฝั่งอาจารย์ให้ดูสรุป attendance ได้ชัดขึ้น และต้องระวังไม่เอา `DemoCheckIn` ไปรวมกับ metric จริง
