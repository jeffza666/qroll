# PRP 06 — Roster + Session Overhaul

> **Status:** Implemented (updated after build, 2026-05-05)  
> **Depends on:** PRP 01 (schema), PRP 02 (auth), PRP 04 (dynamic QR), PRP 05 (check-in flow)  
> **Supersedes parts of:** PRP 04 dynamic QR rotation

PRP นี้เป็น implemented spec ของ Phase 4.6 หลังทดลอง workflow จริงแล้วพบว่า roster import, auth linking, และ session QR ต้องปรับพร้อมกันเพื่อให้ตรงกับข้อมูลจริงของ ม.ธรรมศาสตร์ และลด complexity ที่ไม่ให้ value จริงกับระบบเช็คชื่อ

---

## Problem

หลังทดสอบระบบกับ workflow จริง พบประเด็นหลัก:

1. ไฟล์รายชื่อนักศึกษาจริงมีแค่ `เลขทะเบียน` และ `ชื่อ` ไม่มี email
2. ระบบ import เดิมใช้ email เป็น key ทำให้ใช้ไฟล์จริงไม่ได้
3. QR rotation ทุก 30 วินาทีป้องกัน screenshot sharing ไม่ได้จริง เพราะเพื่อนยังสแกนทันใน window นั้น
4. QR rotation ทำให้จออาจารย์ดูเหมือนปิด session ช้า เพราะ polling/refresh logic ซับซ้อนเกินจำเป็น
5. ยังไม่มีวิธีเพิ่มนักศึกษาทีละคน
6. ต้องรักษา shared `User` table ไว้ แต่ป้องกันการ overwrite ข้อมูลข้ามวิชา

---

## Final Decisions

### 1. User identity

- ใช้ `studentId` เป็น identity หลักของนักศึกษา
- `User.email` เปลี่ยนเป็น nullable (`String? @unique`)
- นักศึกษาที่ pre-import จาก roster จะมี `email=null` จนกว่าจะ login TU ครั้งแรก
- email ยังเก็บไว้ใน DB เพื่อผูกบัญชี, auth, audit/debug, และ feature อนาคต เช่น notification
- หน้า roster ไม่โชว์ email เป็น column หลัก เพราะไม่ใช่ข้อมูลที่อาจารย์ใช้เช็ค roster จริง

**Why:** ไฟล์จริงไม่มี email และรหัสนักศึกษาเป็น identifier ที่เสถียรกว่าในบริบทมหาวิทยาลัย

### 2. Roster import

- Import match user ด้วย `studentId`
- ถ้าเจอ user เดิม: enroll เข้า course เท่านั้น ไม่ update name/email/role
- ถ้าไม่เจอ user: create `User` ใหม่ด้วย `studentId`, `name`, `email=null`, `role=STUDENT`
  - `email=null` เป็นสถานะชั่วคราวสำหรับ pre-imported student เพราะ roster ไม่มี email
  - เมื่อ student login TU ครั้งแรก ระบบจะเติม email จาก TU API กลับเข้า user เดิมผ่าน fallback by `studentId`
- รองรับ metadata rows ก่อนตารางจริง โดยหา header row จาก column variants
- รองรับ column variants เช่น `เลขทะเบียน`, `รหัสนักศึกษา`, `studentId`, `ชื่อ`, `ชื่อ-นามสกุล`, `name`
- Import summary แสดง `สร้างใหม่`, `ลงทะเบียน`, `ข้าม`, `ผิดพลาด`

**Why:** ถ้า studentId ในไฟล์วิชาหนึ่งพิมพ์ผิด ระบบจะไม่ corrupt user เดิมของวิชาอื่น การแก้ข้อมูลผิดให้ลบ orphan user/แก้ roster แทน

### 3. Manual add

- เพิ่ม server action `addStudentManually(courseId, { studentId, name })`
- เพิ่ม dialog `AddStudentDialog`
- ปุ่มจริงใน UI คือ `เพิ่มทีละคน`
- ตำแหน่งปุ่มอยู่ข้าง `Import รายชื่อ` บน roster tab
- Form มีแค่รหัสนักศึกษา 10 หลัก + ชื่อ-นามสกุล

**Why:** เป็น action ระดับ roster เหมือน import แต่ใช้เมื่ออาจารย์ต้องเพิ่มคนจำนวนน้อย ไม่ควรซ่อนอยู่เฉพาะ empty state

### 4. Auth fallback

- TU login ใช้ `username/password` ผ่าน TU Authentication API ไม่ได้ใช้ email เป็น username หลัก
- Role มาจาก field `type` ที่ TU API ส่งกลับมา:
  - `type === "student"` → `Role.STUDENT`
  - `type === "employee"` → `Role.TEACHER`
- email ที่ TU API ส่งกลับมาเป็นข้อมูลประกอบหลัง auth สำเร็จ ไม่ใช่ source หลักในการแยก role
- email domain check (`@dome.tu.ac.th`, `@tu.ac.th`) ใช้เป็น sanity check / defense-in-depth เท่านั้น
- ถ้า login แล้วหา user ด้วย email ไม่เจอ และเป็น student ที่มี `studentId`:
  - หา user ด้วย `studentId`
  - ถ้าเจอ pre-imported user ให้ update `email` เข้า record เดิม
  - update `name` จาก TU API ด้วย โดยเลือก `displayname_th` ก่อน `displayname_en`
- ถ้าไม่เจอทั้ง email และ studentId จึง create user ใหม่

**Why:** TU API มี `type` ระบุ student/employee อยู่แล้ว จึงควรใช้ `type` เป็น source of truth สำหรับ role ส่วน email ยังมีประโยชน์สำหรับผูกบัญชี, ตรวจ domain เสริม, notification และ audit/debug ภายหลัง

### 5. QR/session behavior

- ลบ QR rotation ออก
- แต่ละ open session มี QR token เดียวและ entry code 6 หลักเดียวตลอด session
- QR token และ entry code ไม่เปลี่ยนตอน UI เข้าสถานะ `เลยเวลา`
- ปิด session แล้ว server ล้าง `qrToken` และ `entryCode`
- Student page ไม่ poll QR และไม่เห็น QR อยู่แล้ว การ reject หลังปิด session อยู่ที่ server action

**Why:** rotation เพิ่ม complexity แต่กัน screenshot sharing ไม่ได้จริง Phase ถัดไปจะใช้ location-based check เป็น primary defense แทน

### 6. Countdown / projector UI

- Countdown เปลี่ยนจาก “รอบ QR rotation” เป็น “เวลาเหลือก่อนคาบจบ” จาก `endsAt`
- ถ้าเลย `endsAt` แล้ว แสดง `เลยเวลา +MM:SS`
- ถ้าเลย `endsAt + 30 นาที` แล้ว server auto-close session
- ฝั่ง teacher page เรียกเช็คสถานะทันทีเมื่อถึง `เลยเวลา +30:00` เพื่อให้จอเปลี่ยนเป็นปิด session ชัดเจน
- สี countdown ใช้ QRoll red (`#cc0000`) เป็นหลักตลอด เพื่อให้เด่นและเข้ากับ brand
- UI ล่าสุดใช้วง countdown ใหญ่รอบ QR code ไม่ใช่วงเล็กด้านล่าง
- Fullscreen presenter mode เน้น QR ใหญ่เป็นหลัก และเหลือแค่ข้อมูลจำเป็น:
  - course code/name
  - QR code
  - เวลาเหลือ/เลยเวลา
  - entry code 6 หลัก
  - ปุ่มออก fullscreen

**Why:** จอ projector ต้องอ่านง่าย QR ต้องเป็นพระเอก รายละเอียดอื่นเช่น sidebar/live list ทำให้รกตอนฉาย

### 7. Migration

Migration จริง:

```bash
npx prisma migrate deploy
```

Applied migration:

```text
prisma/migrations/20260505000000_roster_overhaul/migration.sql
```

Migration นี้รวม:

- `User.email` nullable
- drop QR rotation fields:
  - `qrTokenExpiresAt`
  - `qrRefreshedAt`
  - `qrPrevToken`
  - `qrPrevTokenExpiresAt`
  - `entryCodePrev`

**Why:** user ยืนยันว่า DB ตอนนั้นมีแต่ test data จึงไม่ต้อง backup และ schema changes เป็น refactor ชุดเดียวกัน

---

## Implemented Files

- `prisma/schema.prisma`
- `prisma/migrations/20260505000000_roster_overhaul/migration.sql`
- `src/app/actions/roster.ts`
- `src/components/import/RosterImport.tsx`
- `src/components/import/AddStudentDialog.tsx`
- `src/app/(app)/teacher/courses/[id]/page.tsx`
- `src/lib/auth.ts`
- `src/app/actions/session.ts`
- `src/app/api/sessions/[id]/qr/route.ts`
- `src/lib/qr-verify.ts`
- `src/lib/session-helpers.ts`
- `src/components/sessions/SessionView.tsx`
- `src/components/sessions/QrDisplay.tsx`
- `src/components/courses/CloseSessionButton.tsx`

Removed:

- `src/lib/qr-rotate.ts`

---

## Current Verification

Completed:

```bash
npx prisma migrate deploy
npx prisma migrate status
npx prisma generate
npm run build
```

Later UI-only changes were checked with:

```bash
npx tsc --noEmit
```

Manual checks to do before presentation:

1. Import Excel/CSV ที่มี metadata rows ก่อน header จริง
2. Import file ที่มีแค่ `เลขทะเบียน` + `ชื่อ`
3. Re-import studentId เดิมแต่ชื่อเปลี่ยน แล้ว confirm ว่า DB ไม่ overwrite name จาก import
4. เพิ่มนักศึกษาทีละคนจาก dialog
5. Login ด้วย studentId ที่ pre-import ไว้ แล้ว confirm ว่า email ถูก link เข้า user เดิม
6. Confirm ชื่อจาก TU API ใช้ `displayname_th`
7. เปิด session แล้ว confirm QR + entry code ไม่เปลี่ยนระหว่าง `เวลาเหลือ` และ `เลยเวลา`
8. Confirm session auto-close หลัง `endsAt + 30 นาที`
9. Test fullscreen presenter mode บน projector/จอใหญ่

---

## Out of Scope

- Export CSV/Excel ย้ายไป Phase 6
- Location-based check-in defense ย้ายไป Phase 5/6 เป็น primary defense แทน QR rotation
- Attendance health เช่น `เข้าเรียนเกิน 80%`/`ควรติดตาม` ย้ายไป Phase 5 dashboard/report เพราะต้องนิยาม session ที่นับได้, late policy, absent logic, และ demo exclusion ให้ชัดก่อน
- Per-course duplicated user ไม่ทำ ใช้ shared `User` + `studentId` matching ต่อไป

---

## Explanation For Advisor

สรุปเหตุผลที่อธิบายได้:

> ผมปรับระบบจาก email-based roster เป็น studentId-based roster เพราะไฟล์รายชื่อนักศึกษาจริงไม่มี email และ studentId เป็น identity หลักของนักศึกษา ส่วนการแยก role ใช้ `type` จาก TU Authentication API โดยตรง (`student`/`employee`) ไม่ได้แยกจาก email domain ส่วน email ยังเก็บไว้เพื่อผูกบัญชีหลัง login, ตรวจ domain เป็น defense เสริม, และใช้กับ notification/audit ในอนาคต ผมลบ QR rotation เพราะกัน screenshot sharing ไม่ได้จริงและเพิ่ม complexity โดยไม่คุ้มค่า จึงเลือก static QR ตลอด session แล้วเตรียมใช้ location-based check เป็น defense หลักใน phase ถัดไปแทน
