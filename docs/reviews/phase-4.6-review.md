# QRoll — Phase 4.6 Review: Roster + Session Overhaul

> **Status:** Implemented  
> **Date:** 2026-05-05  
> **Related PRP:** [PRP 06 — Roster + Session Overhaul](../prps/06-roster-and-session-overhaul.md)  
> **Purpose:** เอกสารนี้สรุปแบบละเอียดว่า Phase 4.6 เปลี่ยนอะไรจากระบบเดิมหลัง Phase 4.5, ทำไมถึงเปลี่ยน, แก้ไฟล์ไหน, และสิ่งที่ควรจำไว้เวลาอธิบายโปรเจกต์

---

## 1. สรุปสั้นที่สุด

Phase 4.6 คือรอบที่ปรับระบบให้ตรงกับข้อมูลจริงและ workflow จริงมากขึ้น หลังจาก Phase 4.5 ทำ check-in end-to-end ได้แล้ว แต่พอลองกับไฟล์รายชื่อนักศึกษาจริงและ TU API จริง พบว่า design เดิมบางอย่างไม่เหมาะ:

- roster เดิมบังคับใช้ email แต่ไฟล์จริงมีแค่เลขทะเบียนกับชื่อ
- auth เดิมยังอธิบายเหมือนใช้ email/domain แยก role ทั้งที่ TU API มี `type` อยู่แล้ว
- QR rotation ทุก 30 วินาทีเพิ่ม complexity แต่กัน screenshot sharing ไม่ได้จริง
- หน้าจออาจารย์มี countdown ที่เดิมสื่อถึงรอบ QR rotation แต่หลังลบ rotation ต้องเปลี่ยนความหมายใหม่
- ยังไม่มีทางเพิ่มนักศึกษาทีละคนแบบเร็ว ๆ

ผลลัพธ์หลัง Phase 4.6:

- นักศึกษาถูก identify ด้วย `studentId` เป็นหลัก
- `User.email` nullable เพื่อรองรับ student ที่ import มาก่อน login
- import roster ใช้ `studentId`, ไม่ overwrite user เดิม
- เพิ่ม dialog “เพิ่มทีละคน”
- TU login link กลับไปหา pre-imported student ด้วย `studentId`
- role ใช้ TU API `type` เป็น source of truth
- ชื่อจาก TU API ใช้ `displayname_th` ก่อน `displayname_en`
- QR token และ entry code เป็น static ต่อหนึ่ง open session
- session auto-close แบบ lazy หลัง `endsAt + 30 นาที`
- countdown ring เปลี่ยนเป็นเวลาเหลือจนคาบจบ และย้ายวงไปครอบ QR
- fullscreen presenter mode เน้น QR ใหญ่และข้อมูลจำเป็นเท่านั้น
- เอกสาร PRP/INSTRUCTIONS/STATE ถูก sync ให้ตรงกับ decision ล่าสุด

---

## 2. ปัญหาที่เจอก่อนเริ่ม Phase 4.6

### 2.1 Roster import ยังไม่ตรงกับไฟล์จริง

ระบบเดิมออกแบบ roster import โดยมี email เป็นข้อมูลสำคัญ เพราะช่วงแรกคิดว่า student account จะผูกกับ `@dome.tu.ac.th` ตั้งแต่ตอน import แต่พอลองดูไฟล์รายชื่อนักศึกษาจริงของ ม.ธรรมศาสตร์ พบว่าข้อมูลหลักมีแค่:

- เลขทะเบียน / รหัสนักศึกษา
- ชื่อ-นามสกุล

ไม่มี email ในไฟล์ ดังนั้นถ้ายังบังคับ email ระบบจะใช้ไฟล์จริงไม่ได้ หรือผู้ใช้ต้องเติม email เอง ซึ่งไม่เหมาะกับ workflow จริงของอาจารย์

### 2.2 Email ไม่ควรเป็น identity หลักของ roster

email ยังมีประโยชน์ แต่ไม่ควรเป็น key หลักสำหรับรายชื่อนักศึกษา เพราะ:

- ไฟล์ roster จริงไม่มี email
- นักศึกษาอาจยังไม่เคย login ทำให้ระบบยังไม่รู้ email
- รหัสนักศึกษาเป็น identifier ที่เสถียรกว่าในบริบทมหาวิทยาลัย
- ถ้าใช้ email เป็น key ตั้งแต่ import จะบังคับข้อมูลที่อาจารย์ไม่มี

สรุปคือ `studentId` ควรเป็น identity หลักของนักศึกษาในระบบเรียน ส่วน email เป็นข้อมูลที่มาเติมภายหลังจาก TU login

### 2.3 Auth role mapping ควรใช้ TU API `type`

ช่วงแรกระบบใช้ email domain เป็นตัวช่วยแยก student/teacher:

- student → `@dome.tu.ac.th`
- employee/teacher → `@tu.ac.th`

แต่จาก TU API response จริง มี field `type` อยู่แล้ว เช่น:

```json
{
  "type": "student",
  "username": "6509650351",
  "displayname_th": "ณรัฐพัฒน์ แสนศิริทวีสุข",
  "displayname_en": "naratthaphat sansiritawisuk",
  "email": "naratthaphat.sans@dome.tu.ac.th"
}
```

ดังนั้น role ควรมาจาก `type` โดยตรง ไม่ใช่ infer จาก email domain เป็นหลัก

### 2.4 QR rotation ไม่คุ้ม complexity

PRP 04 เดิมออกแบบ dynamic QR rotation ทุก 30 วินาทีเพื่อกันการส่งรูป QR ให้เพื่อน แต่หลังคุยและคิด tradeoff ใหม่ พบว่า:

- ถ้าเพื่อนส่งรูปกันแบบ realtime เพื่อนก็ยังสแกนทันใน 30 วินาที
- rotation ทำให้ logic ซับซ้อนขึ้นมาก เช่น current token, previous token, expiry, grace window, polling, race ตอน rotate
- ฝั่ง teacher UI ดูเหมือนปิด session ช้า เพราะยังผูกกับ polling/refresh logic
- ปัญหา screenshot sharing ควรแก้ด้วย location-based check หรือ defense อื่นใน Phase ถัดไปมากกว่า

จึงตัดสินใจลบ rotation และใช้ QR static ต่อ open session แทน

---

## 3. Decision ที่ตกลงกันก่อน implement

### 3.1 Migration

ตัดสินใจทำ migration รวมครั้งเดียวชื่อ `roster_overhaul`

สิ่งที่รวมใน migration:

- ทำ `User.email` ให้ nullable
- ลบ QR rotation fields ใน `ClassSession`

เหตุผล:

- ทั้งสองเรื่องเป็น schema refactor ที่เกี่ยวกันกับ Phase 4.6
- DB ตอนนั้นมีแต่ test data ไม่ต้องทำ backup/rollback flow ซับซ้อน
- รวมเป็น migration เดียวทำให้ประวัติ schema อ่านง่ายว่าเป็น overhaul รอบเดียว

### 3.2 Existing data

ผู้ใช้ยืนยันว่า DB มีแค่ test data จึง migrate ได้เลย

ผลต่อการตัดสินใจ:

- ไม่ต้องเขียน data migration ซับซ้อนเพื่อ preserve production data
- ไม่ต้องแยก migration ย่อยหลายอัน
- ถ้ามี test data ที่ไม่ตรง schema ใหม่ สามารถแก้/seed ใหม่ได้

### 3.3 Manual add button

ตำแหน่งปุ่ม “เพิ่มทีละคน” อยู่ข้างปุ่ม Import บน roster tab

เหตุผล:

- เป็น action ระดับ roster เหมือน import
- ไม่ควรซ่อนอยู่เฉพาะ empty state เพราะบางวิชามี roster แล้วแต่อาจารย์ยังอยากเพิ่มคนตกหล่น
- ไม่ใช่ inline row add ในตาราง เพราะเพิ่ม complexity ของ table editing โดยยังไม่จำเป็น

### 3.4 Countdown color

เดิม PRP เสนอ palette ที่มีสีน้ำเงิน แต่ผู้ใช้กังวลว่าไม่เข้ากับ brand QRoll red จึงปรับมาเป็นแนว brand red

แนวคิดที่ตัดสินใจ:

- ใช้ QRoll red `#cc0000` เป็นสีหลักให้เด่น
- ก่อนหน้านี้เคยคุย threshold slate → yellow at 5min → red after time
- หลังปรับ UI รอบสุดท้าย ผู้ใช้ขอให้แดงตลอดเพื่อให้เด่นกว่า

ผลลัพธ์ UI ล่าสุด:

- วง countdown รอบ QR ใช้ QRoll red เป็นหลัก
- ไม่ใช้วงเล็กด้านล่างแล้ว
- QR เป็นพระเอกของหน้าจอ

---

## 4. Database schema ที่เปลี่ยน

### 4.1 `User.email` จาก required เป็น nullable

ก่อน Phase 4.6:

```prisma
email String @unique
```

หลัง Phase 4.6:

```prisma
email String? @unique
```

เหตุผล:

- student ที่ import จาก roster ยังไม่จำเป็นต้องมี email
- email จะถูกเติมตอน student login TU ครั้งแรก
- PostgreSQL unique constraint อนุญาตให้มี `NULL` หลายแถวได้ จึงรองรับนักศึกษาหลายคนที่ยังไม่มี email

ผลต่อระบบ:

- import roster จากไฟล์จริงได้
- user student pre-import จะมี `email = null`
- bypass login dev mode ยังต้องใช้ seed user ที่มี email เพราะ bypass lookup ด้วย email เพื่อความสะดวก local

### 4.2 ใช้ `studentId` เป็น identity หลักของ student

`studentId` กลายเป็น key สำคัญสำหรับ:

- import roster
- manual add
- link TU login ครั้งแรกกับ user ที่ pre-import ไว้
- enrollment
- check-in uniqueness ผ่าน `Attendance`

เหตุผล:

- studentId คือรหัสที่อยู่ในไฟล์จริง
- studentId เป็นข้อมูลมหาวิทยาลัยที่อาจารย์เข้าใจและตรวจสอบได้
- ลด dependency ต่อ email ที่อาจยังไม่มี

### 4.3 ลบ QR rotation fields

fields ที่ถูกลบออกจาก `ClassSession`:

- `qrTokenExpiresAt`
- `qrRefreshedAt`
- `qrPrevToken`
- `qrPrevTokenExpiresAt`
- `entryCodePrev`

เหลือแนวคิดใหม่:

- `qrToken` ชุดเดียวต่อ open session
- `entryCode` ชุดเดียวต่อ open session
- เมื่อ close session ให้ clear token/code

เหตุผล:

- ไม่ต้อง track current/previous/expiry/grace window
- ลด race condition จาก rotation
- ทำให้ QR/entry code behavior อธิบายง่ายขึ้น
- security ที่สำคัญยังอยู่ที่ server verify session open, auth, enrollment, duplicate attendance

### 4.4 Migration ที่ใช้จริง

Migration:

```text
prisma/migrations/20260505000000_roster_overhaul/migration.sql
```

คำสั่งที่ใช้:

```bash
npx prisma migrate deploy
npx prisma migrate status
npx prisma generate
```

---

## 5. Roster import ที่เปลี่ยน

### 5.1 จาก email-based เป็น studentId-based

ก่อน Phase 4.6:

- import ต้องมี email
- match user ด้วย email
- มีโอกาส update name จาก import

หลัง Phase 4.6:

- import ใช้ `studentId`
- email optional หรือไม่มีเลยก็ได้
- ถ้าเจอ user เดิมด้วย `studentId` จะ enroll อย่างเดียว
- ถ้าไม่เจอ user จะ create student ใหม่ด้วย `email = null`

### 5.2 ไม่ overwrite user เดิม

หลักสำคัญใหม่:

ถ้า import เจอ `studentId` ที่มีอยู่แล้ว ระบบไม่แก้ `name`, `email`, หรือ `role`

เหตุผล:

- ป้องกันข้อมูลข้ามวิชาเสียหาย
- ถ้าไฟล์วิชา A พิมพ์ชื่อนักศึกษาผิด จะไม่ไปแก้ user ที่วิชา B ใช้อยู่
- ถ้า student login TU แล้วมีชื่อ/email จริงในระบบแล้ว import รอบหลังไม่ควรทับข้อมูลจาก TU API

แนวคิดในการแก้ข้อมูลผิด:

- ถ้า import ผิดจริง ให้แก้ roster/source file แล้ว import ใหม่
- ถ้าเกิด orphan user จาก studentId ผิด ให้ลบ/จัดการ record นั้นภายหลัง
- ไม่ใช้ import เป็นเครื่องมือแก้ข้อมูล identity กลาง

### 5.3 รองรับไฟล์ที่มี metadata rows

ไฟล์ Excel จริงมักไม่ได้เริ่มด้วย header row ทันที อาจมีบรรทัดชื่อวิชา เทอม หรือข้อมูลอื่นก่อนตารางจริง

ระบบจึงปรับให้:

- scan หา header row จาก column variants
- ข้าม metadata rows ก่อน header
- รองรับชื่อ column หลายแบบ เช่น:
  - `เลขทะเบียน`
  - `รหัสนักศึกษา`
  - `studentId`
  - `ชื่อ`
  - `ชื่อ-นามสกุล`
  - `name`

เหตุผล:

- ผู้ใช้ไม่ต้องปรับ Excel ให้ตรง format ระบบทุกครั้ง
- ระบบยืดหยุ่นกับไฟล์จริงมากขึ้น

### 5.4 Import summary

หลัง import ระบบสรุปผลเป็นกลุ่ม เช่น:

- สร้างใหม่
- ลงทะเบียน
- ข้าม
- ผิดพลาด

เหตุผล:

- อาจารย์เห็นว่าระบบทำอะไรกับไฟล์บ้าง
- debug ง่ายขึ้นถ้า row บางแถวผิด
- สอดคล้องกับแนวคิด “ไม่ silent fail”

---

## 6. Manual one-student add

### 6.1 สิ่งที่เพิ่ม

เพิ่ม flow สำหรับเพิ่มนักศึกษาทีละคน:

- component `AddStudentDialog`
- server action `addStudentManually`
- ปุ่มบน roster tab ข้างปุ่ม Import

Form รับข้อมูล:

- รหัสนักศึกษา 10 หลัก
- ชื่อ-นามสกุล

### 6.2 Behavior

ใช้หลักเดียวกับ import:

- validate studentId
- match ด้วย studentId
- ถ้า user มีอยู่แล้ว enroll อย่างเดียว
- ถ้าไม่มี create user ใหม่ด้วย `email = null`, `role = STUDENT`
- ไม่ overwrite user เดิม

### 6.3 เหตุผล

Manual add เป็น feature เล็กแต่สำคัญกับ workflow จริง เพราะ:

- บางครั้งมีนักศึกษาตกหล่นจากไฟล์
- บางวิชาเพิ่มนักศึกษาระหว่างเทอม
- ไม่คุ้มที่จะให้ผู้ใช้สร้างไฟล์ Excel ใหม่เพื่อเพิ่มคนเดียว

---

## 7. Auth และ TU login ที่เปลี่ยน

### 7.1 Login จริงใช้ TU username/password

สิ่งสำคัญที่ต้องจำ:

ผู้ใช้ไม่ได้ login ด้วย email เป็นหลัก แต่ login ด้วย credential ที่ส่งเข้า TU API:

```json
{
  "UserName": "6509650351",
  "PassWord": "..."
}
```

สำหรับ student, `username` ที่ TU API ส่งกลับมาคือ studentId

### 7.2 Role มาจาก TU API `type`

mapping ใหม่:

| TU API `type` | QRoll role |
| --- | --- |
| `student` | `STUDENT` |
| `employee` | `TEACHER` |

email domain ยังตรวจอยู่ แต่เป็น defense-in-depth:

- student ควรเป็น `@dome.tu.ac.th`
- employee ควรเป็น `@tu.ac.th`

เหตุผล:

- TU API บอก account type มาให้ตรง ๆ
- domain เป็น sanity check เสริม ไม่ควรเป็น source หลักของ role
- อธิบายง่ายกว่าและตรงกับ API จริง

### 7.3 Auth linking ด้วย studentId

กรณีสำคัญ:

1. อาจารย์ import นักศึกษาเข้าระบบก่อน
2. student user ถูกสร้างด้วย `studentId`, `name`, `email = null`
3. นักศึกษาคนนั้น login TU ครั้งแรก
4. ระบบหา user ด้วย email ก่อน
5. ถ้าไม่เจอ และเป็น student ที่มี `studentId`
6. ระบบหา user ด้วย `studentId`
7. ถ้าเจอ pre-imported user จะ update email และ name จาก TU API เข้า user เดิม

ผลลัพธ์:

- ไม่เกิด user ซ้ำ
- enrollment ที่ import ไว้ยังผูกกับ user เดิม
- หลัง login user record มี email จริงจาก TU API

### 7.4 ชื่อภาษาไทยมาก่อน

หลังทดสอบ TU API พบว่ามีทั้ง:

- `displayname_th`
- `displayname_en`

จึงเปลี่ยน priority เป็น:

1. `displayname_th`
2. `displayname_en`
3. email

เหตุผล:

- UI ของโปรเจกต์เป็นภาษาไทย
- รายชื่อในห้องเรียนควรแสดงชื่อไทย
- ตรงกับ expectation ของผู้ใช้และอาจารย์

### 7.5 BYPASS_TU_AUTH ยังเหมาะกับ dev

ระบบยังมี bypass mode สำหรับ local development:

- ใช้ seed user
- lookup ด้วย email
- ไม่ยิง TU API จริง

เหตุผลที่ยังใช้แบบ toggle ไม่แยกเว็บ login จริง/demo:

- จัดการง่ายกว่า
- flow เดียวกัน ทดสอบ auth/session/middleware ได้
- เปิดปิดด้วย env โดยไม่ต้อง maintain route/login สองชุด
- ลดโอกาสที่ demo path จะ diverge จาก production auth behavior

ข้อควรจำ:

- bypass ใช้เฉพาะ local/dev
- production ต้องใช้ TU API จริง

---

## 8. QR และ session behavior ที่เปลี่ยน

### 8.1 จาก dynamic QR เป็น static QR ต่อ session

ก่อน Phase 4.6:

- QR rotate ทุก 30 วินาที
- entry code rotate พร้อม QR
- มี generation/countdown ของรอบ QR
- มี previous token/code สำหรับ grace window

หลัง Phase 4.6:

- open session หนึ่งครั้ง สร้าง `qrToken` หนึ่งชุด
- สร้าง `entryCode` 6 หลักหนึ่งชุด
- QR และ entry code ไม่เปลี่ยนจนกว่าจะปิด session
- ตอนปิด session server clear `qrToken` และ `entryCode`

### 8.2 ตอนเลยเวลา QR ไม่เปลี่ยน

ผู้ใช้ถามชัดเจนว่าเมื่อ UI เปลี่ยนเป็น “เลยเวลา” QR กับรหัส 6 หลักเปลี่ยนไหม

คำตอบของ behavior ปัจจุบัน:

- ไม่เปลี่ยน
- QR token เดิมยังเป็นชุดเดิม
- entry code เดิมยังเป็นชุดเดิม
- สิ่งที่เปลี่ยนคือสถานะเวลาและการ auto-close หลัง grace period

เหตุผล:

- ไม่มี rotation แล้ว
- เลยเวลาไม่ได้แปลว่า regenerate token
- server ยังเป็นคนตัดสินว่า session เปิด/ปิดและรับ check-in ได้หรือไม่

### 8.3 Auto-close หลัง endsAt + 30 นาที

Behavior ใหม่:

- ถึง `endsAt` แล้ว UI แสดง “เลยเวลา”
- ระบบยังให้ session เปิดต่อได้ช่วงหนึ่ง เผื่ออาจารย์ลืมปิดหรือคาบเลท
- ถ้าเกิน `endsAt + 30 นาที` แล้ว session จะถูกปิดแบบ lazy auto-close

คำว่า lazy หมายถึง:

- ไม่มี background worker/cron คอยปิดทุกวินาที
- ระบบปิดตอนมี request/read/check status เข้ามา
- ฝั่ง teacher page เรียกเช็กทันทีเมื่อ local countdown ถึง `+30:00`

เหตุผล:

- ไม่ต้องเพิ่ม infra เช่น cron job
- เหมาะกับ Vercel/serverless
- ป้องกัน session ค้างเปิดข้ามวัน
- ยังยืดหยุ่นพอสำหรับคาบที่เลทเล็กน้อย

### 8.4 Security หลังลบ rotation

การลบ rotation ไม่ได้แปลว่าไม่มี security

server ยังตรวจ:

- user ต้อง login
- user role ต้องถูกต้อง
- student ต้อง enrolled ใน course
- session ต้องยัง open
- token/code ต้อง match session ที่เปิดอยู่
- attendance ต้องไม่ซ้ำใน session เดียวกัน
- timestamp ใช้ server time

สิ่งที่ยอมรับเป็น limitation:

- static QR กัน screenshot sharing ไม่ได้
- dynamic QR 30s ก็กันไม่ได้จริงพอ
- defense หลักเรื่อง “อยู่ในห้องจริงไหม” จะย้ายไป location-based check-in หรือกลไกอื่นใน Phase ถัดไป

---

## 9. Teacher session UI ที่เปลี่ยน

### 9.1 Countdown เปลี่ยนความหมาย

ก่อน Phase 4.6:

- countdown หมายถึงเวลาที่เหลือก่อน QR rotate รอบถัดไป

หลัง Phase 4.6:

- countdown หมายถึงเวลาที่เหลือก่อน `endsAt`
- ถ้าเลยเวลา แสดง overtime
- ถ้าเกิน overtime 30 นาที trigger auto-close check

เหตุผล:

- เมื่อไม่มี QR rotation แล้ว countdown เดิมไม่มีความหมาย
- เวลาเหลือของคาบเรียนมีประโยชน์กับอาจารย์จริงกว่า
- UI เดิมที่มีวง countdown ยังสวยและควรเก็บไว้ แต่เปลี่ยน semantic ให้ถูก

### 9.2 วง countdown ย้ายไปครอบ QR

ผ่านการลองหลายรอบ:

1. เริ่มจากวงเล็กแยกด้านล่าง/ด้านข้าง
2. ลองทำเป็นกรอบสี่เหลี่ยมรอบ QR
3. ผู้ใช้เห็นว่าวงกลมรอบ QR สวยกว่า
4. ปรับให้วงใหญ่กว่า QR เพื่อไม่ทับ QR

ผลล่าสุด:

- QR อยู่กลาง
- วง countdown อยู่รอบ QR
- วงใหญ่กว่า QR
- QR ยังอ่านง่าย
- ใช้สี QRoll red ให้เด่น

เหตุผล:

- projector ต้องเน้น QR ก่อน
- วงรอบ QR ทำให้เวลามี context โดยไม่แย่งพื้นที่
- สวยกว่าและสื่อสถานะได้ดี

### 9.3 Fullscreen presenter mode

ผู้ใช้ขอให้ตอนกดขยาย:

- โชว์ QR ใหญ่ ๆ
- มีเฉพาะสิ่งจำเป็น
- ไม่รก
- เน้น QR

ผลที่ทำ:

- fullscreen target เป็น session section
- QrDisplay รับ `presenterMode`
- QR ใหญ่ขึ้นมากใน presenter mode
- ซ่อนรายละเอียดที่ไม่จำเป็น
- เหลือข้อมูลหลัก:
  - course code/name
  - QR
  - เวลาเหลือ/เลยเวลา
  - entry code 6 หลัก
  - ปุ่มออก fullscreen

เหตุผล:

- เวลาเอาขึ้น projector นักศึกษาไม่ได้ต้องดู sidebar หรือรายละเอียดระบบ
- QR ต้องใหญ่และชัด
- entry code ยังควรเห็นเป็น fallback ถ้ากล้องสแกนไม่ได้

### 9.4 ภาษาไทยใน UI

ช่วงทดสอบพบ dialog/manual add ยังมีข้อความอังกฤษ เช่น:

- Add one student
- Student ID
- Name
- Add student

จึงปรับให้เป็นภาษาไทยทั้งภายใน dialog และปุ่มภายนอก

เหตุผล:

- project target เป็นอาจารย์/นักศึกษาไทย
- UI หลักควร consistent
- ลดความรู้สึกเหมือน prototype ที่ยังไม่ polish

---

## 10. Roster table UI ที่เปลี่ยน

### 10.1 เอา email ออกจาก column หลัก

ผู้ใช้ถามว่า email ในตารางนักศึกษายังจำเป็นไหม เพราะดูไม่ค่อยมีประโยชน์กับอาจารย์

ข้อสรุป:

- email ยังเก็บใน DB
- แต่ไม่ควรเป็น column หลักบน roster table

เหตุผล:

- roster จริงใช้ studentId + ชื่อเป็นหลัก
- email ไม่ใช่ข้อมูลที่อาจารย์ต้อง scan บ่อย
- student pre-import หลายคนยังไม่มี email
- ถ้าแสดง email จะมีช่องว่างเยอะและดูไม่จำเป็น

### 10.2 สถานะบัญชีไม่ใช่ metric ที่ดีที่สุด

เดิมคิดว่าจะเปลี่ยน column email เป็น:

- เชื่อมบัญชีแล้ว
- ยังไม่เข้าสู่ระบบ

ผู้ใช้เสนอว่าอาจเปลี่ยนเป็นสถานะเข้าเรียนเกิน 80% / เตือนน้อยกว่า 80%

ข้อสรุป:

- ยังไม่ทำ attendance health ใน Phase 4.6
- ย้ายไป Phase 5 dashboard/report

เหตุผล:

- ต้องนิยามก่อนว่า denominator คืออะไร
- ต้องรู้ว่าคาบไหนนับ attendance แล้ว
- ต้องแยก late/present/absent ให้ชัด
- ต้อง exclude demo check-in
- Phase 4.6 โฟกัส roster/session overhaul ก่อน

### 10.3 สถานะบัญชีที่แสดงไม่ตรง

มีช่วงที่ UI ยังแสดง “เชื่อมบัญชีแล้ว” ทั้งที่ logic/ความต้องการเปลี่ยนไป ทำให้ดูไม่ตรง

แนวทางหลังคุย:

- ไม่ใช้สถานะบัญชีเป็น metric หลักใน roster
- ถ้าจะทำ attendance health ให้ทำใน Phase 5 อย่างถูกต้อง

---

## 11. Error ที่เจอและแก้

### 11.1 `"use server" file can only export async functions, found object`

ตอนกดเพิ่มนักศึกษา เจอ error:

```text
A "use server" file can only export async functions, found object.
```

สาเหตุโดยหลัก:

- ไฟล์ที่มี `"use server"` export ได้เฉพาะ async functions
- ถ้า export object/schema/constant ที่ไม่ใช่ async function จากไฟล์นั้น Next.js จะ error

แนวคิดการแก้:

- ย้าย object/constant/schema ออกจากไฟล์ server action หรือทำให้ไม่ถูก export จาก `"use server"` file
- ให้ server action file export เฉพาะ async action functions

เหตุผลที่ควรจำ:

- Next.js Server Actions มีข้อจำกัด strict
- ไฟล์ action ไม่ควรเป็นที่รวม helper export ทุกอย่าง
- helper/shared constants ควรอยู่ใน lib แยก

### 11.2 Dev server port

ตอนรัน dev server มีข้อความ:

```text
Port 3000 is in use by process 25756, using available port 3001 instead.
```

ความหมาย:

- มี process ใช้ port 3000 อยู่แล้ว
- Next.js จึงเปิดที่ 3001 แทน
- ไม่ได้แปลว่าต้องผิดเสมอ แค่ต้องเปิด URL ให้ถูก เช่น `http://localhost:3001`

### 11.3 ต้อง restart `npm run dev` ทุกครั้งไหม

คำตอบที่สรุป:

- แก้ React component, CSS, server action ส่วนใหญ่ไม่ต้อง restart เพราะ Next dev hot reload ได้
- ต้อง restart เมื่อแก้ env เช่น `.env.local`
- บางครั้งต้อง restart ถ้าแก้ Prisma schema/generate/migration แล้ว dev server ยังใช้ client เก่า
- ถ้าเจอ error ค้างแปลก ๆ จาก module cache ให้ restart ช่วยได้

---

## 12. ไฟล์ที่แก้ใน Phase 4.6

### 12.1 Database / migration

- `prisma/schema.prisma`
- `prisma/migrations/20260505000000_roster_overhaul/migration.sql`
- `prisma/seed.ts`

สิ่งที่เกี่ยวข้อง:

- email nullable
- remove QR rotation fields
- seed/test data ปรับให้ตรง schema ใหม่

### 12.2 Roster import / manual add

- `src/app/actions/roster.ts`
- `src/components/import/RosterImport.tsx`
- `src/components/import/AddStudentDialog.tsx`
- `src/app/(app)/teacher/courses/[id]/page.tsx`

สิ่งที่เกี่ยวข้อง:

- parse roster จาก studentId/name
- support metadata/header variants
- never overwrite existing user
- manual add dialog
- UI ภาษาไทย
- roster table ปรับ column ให้เหมาะกับ workflow จริง

### 12.3 Auth

- `src/lib/auth.ts`

สิ่งที่เกี่ยวข้อง:

- role จาก TU API `type`
- email domain เป็น sanity check
- fallback link ด้วย studentId
- update email/name จาก TU login ครั้งแรก
- displayname_th มาก่อน displayname_en
- bypass mode ยังใช้ email seed สำหรับ dev

### 12.4 Session / QR / check-in helpers

- `src/app/actions/session.ts`
- `src/app/api/sessions/[id]/qr/route.ts`
- `src/lib/qr-config.ts`
- `src/lib/qr-token.ts`
- `src/lib/qr-verify.ts`
- `src/lib/session-helpers.ts`
- removed `src/lib/qr-rotate.ts`

สิ่งที่เกี่ยวข้อง:

- static QR token
- static entry code
- remove rotation
- verify token/code กับ open session
- auto-close helper หลัง `endsAt + 30 นาที`

### 12.5 Teacher session UI

- `src/components/sessions/SessionView.tsx`
- `src/components/sessions/QrDisplay.tsx`
- `src/components/sessions/FullscreenButton.tsx`
- `src/components/courses/CloseSessionButton.tsx`
- `src/app/(app)/teacher/sessions/[id]/page.tsx`

สิ่งที่เกี่ยวข้อง:

- countdown จาก `endsAt`
- overtime display
- auto-close check ตอน overtime ถึง 30 นาที
- ring รอบ QR
- presenter mode
- hide clutter in fullscreen
- close session optimistic/fade behavior

### 12.6 Documentation

- เอกสารข้อกำหนดโปรเจกต์
- บันทึกสถานะโปรเจกต์
- `docs/prps/00-security-model.md`
- `docs/prps/01-database-schema.md`
- `docs/prps/02-auth-tu-api.md`
- `docs/prps/03-teacher-courses.md`
- `docs/prps/03.5-schedule-session.md`
- `docs/prps/04-dynamic-qr.md`
- `docs/prps/05-checkin-flow.md`
- `docs/prps/06-roster-and-session-overhaul.md`
- `docs/reviews/project-overview-phase-0-to-4.5.md`
- `docs/reviews/phase-4.6-review.md`

สิ่งที่เกี่ยวข้อง:

- sync docs กับโค้ดจริง
- mark PRP เก่าเป็น historical/superseded บางส่วน
- update INSTRUCTIONS folder tree
- update STATE current status/decision log
- เพิ่ม review 4.6 แยก

---

## 13. เอกสารที่เปลี่ยนสถานะหลัง Phase 4.6

### 13.1 PRP 00-05

ไม่ได้ rewrite history ทิ้ง แต่เพิ่ม implementation update/superseded note

เหตุผล:

- PRP เก่ายังมีประโยชน์เป็นประวัติการคิด
- แต่คนอ่านต้องรู้ว่าบางส่วนไม่ใช่ source of truth ล่าสุด
- วิธีนี้ดูเป็นกระบวนการตัดสินใจมากกว่าการลบอดีตให้เหมือนถูกตั้งแต่แรก

### 13.2 PRP 06

กลายเป็น source of truth ของ Phase 4.6

ครอบคลุม:

- roster import จริง
- nullable email
- manual add
- auth fallback
- static QR
- countdown/session behavior
- out-of-scope ที่ย้ายไป Phase ถัดไป

### 13.3 Project Requirements Notes

ปรับให้กฎหลักของรอบพัฒนาถัดไปไม่พาเข้าใจผิด:

- auth identity/email ใหม่
- role จาก TU API `type`
- email nullable
- QR static/deprecate rotation
- folder tree ตรง repo จริง
- PRP index ใน tree ตรงไฟล์จริง
- QR helper path ตรงไฟล์จริง

### 13.4 Project Status Notes

อัปเดต:

- current status เป็น Phase 4.6 implemented
- next เป็น Phase 5 dashboard/report
- decision log ของ Phase 4.6
- decision log ของ PRP docs sync
- important files ของ Phase 4.6

---

## 14. สิ่งที่ไม่ได้ทำใน Phase 4.6

### 14.1 Attendance health 80%

ผู้ใช้เสนอ idea:

- เข้าเรียนเกิน 80% = ปกติ
- น้อยกว่า 80% = เตือน

ตัดสินใจยังไม่ทำใน Phase 4.6

เหตุผล:

- ต้องนิยามจำนวนคาบทั้งหมดที่ควรนับ
- ต้องมี absent logic
- ต้องตัด demo check-in ออกจาก report
- ต้องนิยาม late นับเต็ม/ครึ่ง/ไม่เต็ม
- เหมาะกับ Phase 5 dashboard/report มากกว่า roster overhaul

### 14.2 Location-based check

ยังไม่ทำใน Phase 4.6

เหตุผล:

- เป็น defense หลักที่มาแทน QR rotation
- ต้องออกแบบ permission/location UX
- ต้องมี radius, room coordinate, privacy, spoofing consideration
- ควรทำเป็น phase แยก

### 14.3 Export CSV/Excel

ย้ายไป Phase 6

เหตุผล:

- Phase 4.6 scope ใหญ่แล้ว
- export ควรออกแบบพร้อม report/dashboard
- อาจต้อง export เป็น Excel format ที่เหมาะกับ ม.ธรรมศาสตร์ ไม่ใช่ CSV ง่าย ๆ อย่างเดียว

### 14.4 Per-course duplicated user

ไม่ทำ

เหตุผล:

- shared `User` + `studentId` matching แก้ปัญหาหลักได้แล้ว
- duplicate user per course จะทำให้ login/history/report ซับซ้อนขึ้น
- ข้อมูลตัวตนนักศึกษาควรเป็น record กลาง

---

## 15. Verification

คำสั่งที่เคย verify ในรอบ Phase 4.6:

```bash
npx prisma migrate deploy
npx prisma migrate status
npx prisma generate
npm run build
npx tsc --noEmit
```

หมายเหตุ:

- `npm run build` เคยผ่านหลัง migration/generate
- รอบ UI/docs หลังสุดใช้ `npx tsc --noEmit` สำหรับเช็ก TypeScript
- บางครั้ง build อาจติด Prisma engine lock ถ้า dev server เปิดอยู่ ต้องปิด dev server ก่อน build ถ้าจำเป็น
- docs-only changes ไม่จำเป็นต้อง build ทุกครั้ง

Manual checks ที่ควรทำก่อน demo:

1. Import ไฟล์จริงที่มี metadata rows ก่อน header
2. Import ไฟล์ที่มีแค่เลขทะเบียนกับชื่อ
3. Re-import studentId เดิมแต่ชื่อเปลี่ยน แล้วตรวจว่า user เดิมไม่ถูก overwrite
4. เพิ่มนักศึกษาทีละคนผ่าน dialog
5. Login TU ด้วย student ที่ pre-import แล้วตรวจว่า email ถูก link เข้า user เดิม
6. ตรวจว่าชื่อแสดงเป็น `displayname_th`
7. เปิด session แล้วดูว่า QR/entry code ไม่เปลี่ยนเอง
8. ปล่อยให้เลยเวลา แล้วตรวจว่า QR/entry code ยังไม่เปลี่ยน
9. ตรวจ auto-close หลัง `endsAt + 30 นาที`
10. เปิด fullscreen presenter mode แล้วดูว่า QR ใหญ่ อ่านง่าย และไม่รก

---

## 16. คำอธิบายสำหรับอาจารย์

เวอร์ชันสั้น:

> ใน Phase 4.6 ผมปรับระบบจาก design ที่คิดจากข้อมูลสมมติให้ตรงกับข้อมูลจริงของมหาวิทยาลัยมากขึ้น โดยเปลี่ยน roster import จาก email-based เป็น studentId-based เพราะไฟล์รายชื่อนักศึกษาจริงไม่มี email และ studentId เป็น identifier ที่เสถียรกว่า ส่วน email ยังเก็บไว้หลังนักศึกษา login ผ่าน TU API เพื่อผูกบัญชีและใช้กับ audit/notification ในอนาคต

เวอร์ชันขยาย:

> ผมตัดสินใจให้ role มาจาก field `type` ของ TU Authentication API โดยตรง เพราะ API ระบุอยู่แล้วว่า account เป็น `student` หรือ `employee` จึงไม่ควรใช้ email domain เป็นตัวแยก role หลัก ส่วน domain check ยังเก็บไว้เป็น sanity check เสริม ผมยังปรับ auth ให้ถ้านักศึกษาถูก import ไว้ก่อนด้วย studentId และ email ยังเป็น null เมื่อ login TU ครั้งแรก ระบบจะ link กลับเข้า user เดิมด้วย studentId แทนการสร้าง user ซ้ำ

เวอร์ชันเรื่อง QR:

> เดิมระบบมี dynamic QR rotation ทุก 30 วินาที แต่หลังวิเคราะห์แล้วพบว่ามันกัน screenshot sharing ไม่ได้จริง เพราะถ้าส่งกันแบบ realtime เพื่อนก็ยังสแกนทันใน window นั้น และ rotation เพิ่มความซับซ้อนของ token expiry, previous token, polling และ race condition โดยไม่คุ้มค่า ผมจึงเปลี่ยนเป็น static QR ต่อ session แล้วให้ server enforce auth, enrollment, session open/closed และ duplicate attendance ส่วนการกันคนอยู่นอกห้องจริง ๆ จะย้ายไปใช้ location-based check ใน phase ถัดไป

เวอร์ชันเรื่อง UI:

> เมื่อไม่มี QR rotation แล้ว countdown เดิมไม่มีความหมาย ผมจึงเปลี่ยน countdown ให้เป็นเวลาเหลือก่อนคาบจบจาก `endsAt` และถ้าเลยเวลาเกิน 30 นาทีระบบจะ auto-close session แบบ lazy เพื่อกัน session ค้างเปิด ส่วนหน้าจอ projector ปรับให้ QR ใหญ่ที่สุด มีวง countdown รอบ QR และ fullscreen mode เหลือเฉพาะข้อมูลจำเป็น เช่น QR, entry code และเวลา เพื่อให้ใช้จริงในห้องเรียนได้ง่าย

---

## 17. สิ่งที่ควรจำเวลาอ่านโค้ดต่อ

- ถ้าเกี่ยวกับนักศึกษา ให้คิด `studentId` ก่อน email
- email nullable เป็น intentional design ไม่ใช่ bug
- import roster ห้าม overwrite user เดิม
- role ใช้ TU API `type` เป็น source of truth
- email domain เป็น defense-in-depth
- ชื่อจาก TU API ใช้ไทยก่อนอังกฤษ
- QR ไม่ rotate แล้ว
- entry code ไม่ rotate แล้ว
- ตอนเลยเวลา QR/code ไม่เปลี่ยน
- session ปิดเองหลัง `endsAt + 30 นาที` แบบ lazy
- screenshot sharing ยังเป็น known limitation ที่จะไปแก้ด้วย location-based check
- PRP 04 dynamic QR เป็น historical design แล้ว
- PRP 06 + `prisma/schema.prisma` คือ source of truth ล่าสุดสำหรับ Phase 4.6

