# QRoll — Phase 5 Review: Teacher Dashboard + Reports

> **Status:** Implemented and pushed  
> **Date:** 2026-05-14  
> **Related PRP:** [PRP 07 — Teacher Dashboard + Reports](../prps/07-teacher-dashboard.md)  
> **Purpose:** เอกสารนี้สรุปว่า Phase 5 ทำอะไร ทำไมถึงออกแบบแบบนี้ แก้ไฟล์ส่วนไหน และเตรียมคำตอบสำหรับอธิบายอาจารย์

---

## 1. สรุปสั้นที่สุด

Phase 5 เปลี่ยน QRoll จากระบบที่ “เปิด QR แล้วเช็คชื่อแบบ live” ให้กลายเป็นระบบที่อาจารย์ใช้ดูผลย้อนหลังและจัดการข้อมูลรายวิชาได้จริง

ก่อนหน้านี้ระบบมี workflow หลักคือ login, import roster, เปิด session, ให้นักศึกษาเช็คชื่อ และดูรายชื่อคนที่เช็คชื่อเข้ามาในคาบนั้น แต่ยังตอบคำถามหลังจบคาบหรือหลังผ่านไปหลายสัปดาห์ได้ไม่ดี เช่น:

- นักศึกษาคนไหนเข้าเรียนสม่ำเสมอหรือเริ่มเสี่ยง
- คาบนี้ใครมา สาย ขาด หรือลา
- ถ้ารายวิชาจบแล้วจะเก็บประวัติไว้อย่างไร
- ถ้านักศึกษาถอนรายวิชาจะเอาออกจากรายชื่อปัจจุบันโดยไม่ทำลายประวัติได้อย่างไร
- ถ้าแก้ schedule หรือห้องเรียนภายหลัง รายงานเก่าจะยังถูกต้องไหม

ผลลัพธ์ของ Phase 5 คือระบบเริ่มมี “academic history” ที่อธิบายได้:

- Teacher Dashboard ใช้ข้อมูล attendance จริง
- Course Report ดูภาพรวมการเข้าเรียนทั้งรายวิชา
- Session Report ดูผลเช็คชื่อของคาบที่ปิดแล้ว
- อาจารย์แก้สถานะย้อนหลังได้ รวมถึง `EXCUSED`
- Roster แยก active students กับ dropped students
- Course มี archive/unarchive และ delete rule ที่ปลอดภัยขึ้น
- Session เก็บ `roomSnapshot` และรองรับการไม่ผูกกับ schedule ตลอดชีวิต

---

## 2. ปัญหาก่อน Phase 5

### 2.1 Dashboard ยังไม่ใช่ภาพรวมการสอนจริง

ก่อน Phase 5 หน้า teacher dashboard ยังเน้นเป็นทางเข้าไปยังรายวิชา/session มากกว่าเป็นหน้าสรุปสถานการณ์จริงของอาจารย์ ข้อมูลบางส่วนยังไม่ตอบโจทย์ว่า “วันนี้เกิดอะไรขึ้น” หรือ “รายวิชาปัจจุบันมี attendance เป็นอย่างไร”

Phase 5 จึงทำให้ dashboard ดึงจาก `Attendance` และ active courses จริง เช่น จำนวนรายวิชาที่ active, sessions วันนี้, attendance เฉลี่ย และ active/off-schedule session

### 2.2 ไม่มี report หลังจบคาบ

เดิม session page เน้นแสดง QR และรายชื่อ live check-in แต่เมื่อ session ปิดแล้ว อาจารย์ควรเห็น report แทน QR เพราะ QR ไม่มีประโยชน์หลังปิดคาบ

Phase 5 จึงให้ `/teacher/sessions/[id]` แสดงคนละ mode:

- session ยังเปิดอยู่: แสดง QR presenter / live context
- session ปิดแล้ว: แสดง Session Report

### 2.3 ยังไม่มี Course Report

การดูแค่รายคาบไม่พอสำหรับการตัดสินใจเชิงรายวิชา อาจารย์ต้องเห็นทั้งเทอม เช่น นักศึกษาคนไหนขาดบ่อย หรือแนวโน้ม attendance เริ่มตก

Phase 5 จึงเพิ่ม `/teacher/courses/[id]/report` เพื่อดูภาพรวมระดับรายวิชา

### 2.4 การลบนักศึกษา/รายวิชายังเสี่ยงกับประวัติ

หลังระบบมี attendance แล้ว การลบข้อมูลไม่ใช่เรื่อง UI อย่างเดียว แต่เป็น data integrity issue เพราะถ้าลบนักศึกษาออกจาก roster หรือ delete course ผิดจังหวะ อาจทำให้ประวัติการเช็คชื่อย้อนหลังอธิบายไม่ได้

Phase 5 จึงเพิ่ม:

- `Enrollment.droppedAt` เพื่อแยก active/dropped
- `Course.archivedAt` เพื่อเก็บรายวิชาที่จบแล้ว
- rule ว่า course ที่มี sessions แล้วควร archive ไม่ใช่ hard delete

### 2.5 Schedule อาจเปลี่ยน แต่ report เก่าต้องไม่เปลี่ยนตาม

ถ้า session เก่าผูกกับ schedule ตลอดเวลา แล้วอาจารย์แก้ห้องเรียนใน schedule ภายหลัง รายงานเก่าอาจแสดงห้องผิดจากวันที่เช็คชื่อจริง

Phase 5 จึงเพิ่ม `ClassSession.roomSnapshot` เพื่อบันทึกห้องตอนเปิด session และทำให้ `scheduleId` nullable เพื่อรองรับ ad-hoc session หรือ schedule ที่เปลี่ยนภายหลัง

---

## 3. สิ่งที่ทำจริงใน Phase 5

### 3.1 Teacher Dashboard

หน้า `/teacher` ถูกปรับให้เป็นหน้าสรุปงานสอนจริงของอาจารย์:

- นับเฉพาะ active courses
- แสดง attendance stats จาก `Attendance`
- แสดง sessions วันนี้
- แสดง active/off-schedule session
- แสดง latest attendance เป็นภาพรวมที่เข้าใจง่าย
- ซ่อน archived courses ออกจาก workflow ปกติ

แนวคิดหลักคือ dashboard ไม่ควรเป็นแค่เมนู แต่ควรเป็น “หน้าแรกที่บอกสถานะการสอนตอนนี้”

### 3.2 Course Report

เพิ่มหน้า `/teacher/courses/[id]/report` เพื่อดูผลระดับรายวิชา:

- summary cards
- attendance matrix แยกตามนักศึกษาและ session
- filter/search
- export CSV จากข้อมูลที่แสดงอยู่
- risk/trend/cumulative view
- แยก `PRESENT`, `LATE`, `ABSENT`, `EXCUSED`

Course Report ตอบคำถามแบบทั้งเทอม เช่น “นักศึกษาคนนี้เข้าเรียนสม่ำเสมอไหม”

### 3.3 Session Report

ปรับ `/teacher/sessions/[id]` ให้เมื่อ session ปิดแล้วแสดง report:

- session metadata
- status filters
- roster table
- inline status editing
- session danger zone / actions
- แสดง `roomSnapshot` ก่อน `schedule.room`

Session Report ตอบคำถามแบบรายคาบ เช่น “คาบนี้ใครมา ใครสาย ใครขาด ใครลา”

### 3.4 Attendance Status Editing

เพิ่ม server action สำหรับแก้ attendance status:

- อาจารย์แก้เป็น `PRESENT`
- อาจารย์แก้เป็น `LATE`
- อาจารย์แก้เป็น `ABSENT`
- อาจารย์แก้เป็น `EXCUSED`

ทุก action ต้องตรวจ ownership ฝั่ง server ก่อน เพราะเป็นข้อมูล academic record

### 3.5 Roster Management

เพิ่มหน้าและ flow สำหรับจัดการนักศึกษาในรายวิชา:

- search นักศึกษา
- manual add
- import roster
- edit student name
- drop student ออกจาก active roster
- dropped students view
- hard delete enrollment หลัง drop แล้วเท่านั้น

จุดสำคัญคือการ drop ไม่ได้ลบ attendance history เพราะ attendance ผูกกับ `User` ไม่ใช่ `Enrollment`

### 3.6 Course Lifecycle

เพิ่ม lifecycle control ของรายวิชา:

- edit course
- edit schedules
- archive/unarchive
- safer delete
- danger zone
- course more menu

แนวคิดคือรายวิชาที่ยังไม่มี session อาจลบได้ แต่รายวิชาที่มี session แล้วควร archive เพราะเริ่มมีประวัติ academic record แล้ว

### 3.7 Flexible Session Opening

ปรับ session opening ให้เหมาะกับห้องเรียนจริงมากขึ้น:

- อาจารย์เลือก duration ได้
- อาจารย์กำหนด late threshold/grace minutes ได้
- session ปิดตาม `endsAt`
- archived course เปิด session ใหม่ไม่ได้
- session เก็บ `roomSnapshot`

เหตุผลคือเวลาเรียนจริงอาจไม่ได้ตรง schedule เสมอ ครูควบคุม QR window เองจึง practical กว่า

---

## 4. Decision ที่ต้องจำ

### 4.1 Report ใช้ `Attendance` เท่านั้น

`DemoCheckIn` มีไว้สำหรับทดลองระบบ ไม่ใช่ academic record ถ้าเอามารวมใน report จะทำให้เปอร์เซ็นต์การเข้าเรียนผิด

ดังนั้น report ทุกหน้าต้อง query จาก `Attendance` เท่านั้น

### 4.2 `EXCUSED` เป็น manual-only

การลาไม่ควรถูกระบบเดาเองจาก QR เพราะต้องมีเหตุผล เอกสาร หรือการตัดสินใจของอาจารย์ ระบบจึงให้ `EXCUSED` เป็นสถานะที่อาจารย์แก้เองเท่านั้น

### 4.3 สูตร attendance percentage

สูตรที่ใช้:

```text
(PRESENT + LATE * 0.5) / counted * 100
counted = PRESENT + LATE + ABSENT
EXCUSED ไม่อยู่ใน counted
```

เหตุผล:

- `PRESENT` ได้เต็ม
- `LATE` ได้ครึ่งหนึ่ง เพราะมาสายดีกว่าไม่มา แต่ไม่เท่ามาตรงเวลา
- `ABSENT` นับเป็นฐานและได้ 0
- `EXCUSED` ไม่นับในฐาน เพราะถือว่าคาบนั้นไม่ควรลงโทษนักศึกษาคนนั้น

ถ้า `counted === 0` ให้แสดง `—` แทนเปอร์เซ็นต์ เพื่อไม่ให้ระบบสร้างเลขหลอกจากข้อมูลที่ยังไม่มีฐานคำนวณ

### 4.4 ใช้ `droppedAt` แทนการลบนักศึกษาออกทันที

การถอนรายวิชาไม่ควรทำให้ประวัติหาย จึงใช้ `Enrollment.droppedAt` เพื่อบอกว่านักศึกษาคนนี้ไม่อยู่ใน active roster แล้ว แต่ยังสามารถอธิบาย attendance history เก่าได้

### 4.5 Attendance ผูกกับ `User` ไม่ใช่ `Enrollment`

เหตุผลคือ enrollment เป็นความสัมพันธ์ระหว่าง student กับ course ที่อาจถูก drop หรือลบภายหลัง แต่ attendance เป็นประวัติของคนจริงใน session จริง จึงควรเก็บกับ `User`

### 4.6 ใช้ `archivedAt` แทน boolean

`archivedAt` บอกได้ทั้งว่า archive แล้วหรือยัง และ archive เมื่อไหร่ ซึ่งมีประโยชน์กว่า boolean เพราะเป็น historical decision

### 4.7 Hard delete course จำกัดเฉพาะ course ที่ไม่มี session

ถ้ามี session แล้วแปลว่ารายวิชานั้นมีประวัติการเช็คชื่อ การลบถาวรเสี่ยงทำลายข้อมูลที่อาจต้องอ้างอิงในอนาคต จึงให้ archive เป็น path หลัก

### 4.8 `roomSnapshot` เป็น historical truth

ห้องเรียนใน schedule เปลี่ยนได้ แต่ session เก่าควรแสดงห้องที่ใช้ตอนเปิด session นั้นจริง ๆ จึงต้อง snapshot ห้องลง session

### 4.9 `scheduleId` nullable

เพื่อให้รองรับ:

- ad-hoc session
- schedule ที่ถูกแก้หรือลบภายหลัง
- session เก่าที่ยังต้องอ่านได้

### 4.10 QR ยังเป็น static ต่อ session

QR rotation ถูกพิจารณาแล้ว แต่กันการส่งต่อได้ไม่จริงพอ เพราะนักศึกษายัง screenshot หรือส่งต่อทันในช่วงเวลาสั้น ๆ ได้ และเพิ่ม complexity สูง

Phase นี้จึงคง static QR ต่อ session แล้ววาง Phase 6 เป็น Geofence ซึ่งเป็น defense ที่ practical กว่าในบริบทห้องเรียนจริง

---

## 5. Advisor Q&A — Phase 5

### Q: Phase 5 ทำอะไรเพิ่มจากของเดิม?

A: Phase 5 เปลี่ยนระบบจาก “เช็คชื่อแบบ live อย่างเดียว” ให้กลายเป็นระบบที่อาจารย์ตรวจสอบย้อนหลังได้จริง มี dashboard, course report, session report, การแก้สถานะย้อนหลัง, การจัดการนักศึกษาที่ถอนออก และ archive รายวิชาเพื่อเก็บประวัติ academic record

### Q: ทำไมต้องแยก Course Report กับ Session Report?

A: เพราะคำถามของอาจารย์มี 2 ระดับ:

- Course Report ตอบว่า “ทั้งเทอม นักศึกษาคนนี้มาเรียนสม่ำเสมอไหม”
- Session Report ตอบว่า “คาบนี้ใครมา ใครสาย ใครขาด ใครลา”

ถ้ารวมเป็นหน้าเดียวจะรก และจะตอบโจทย์คนละระดับได้ไม่ชัด

### Q: ทำไม report ต้องใช้ `Attendance` เท่านั้น ไม่รวม `DemoCheckIn`?

A: `DemoCheckIn` มีไว้ให้คนลองระบบตอน demo แต่ไม่ใช่ academic record จริง ถ้าเอามารวม report จะทำให้เปอร์เซ็นต์เข้าเรียนผิด ระบบจึง enforce ที่ query ให้ report ดึงเฉพาะ `Attendance`

### Q: ทำไมเพิ่ม `EXCUSED`?

A: เพราะ “ลา” ไม่เหมือน “ขาด” การขาดคือไม่มาโดยไม่มีเหตุผล แต่การลามีเหตุผลหรือเอกสาร อาจารย์ควรเป็นคนตัดสินเอง ระบบ check-in ไม่ควร auto-mark เป็นลา

### Q: ทำไม `EXCUSED` ไม่เอาไปนับในเปอร์เซ็นต์?

A: ใช้สูตร `(PRESENT + LATE * 0.5) / counted * 100` โดย `counted = PRESENT + LATE + ABSENT` และไม่รวม `EXCUSED` เพราะการลาควรถูกมองเหมือนคาบนั้นไม่นับคะแนนกับนักศึกษาคนนั้น ไม่ใช่หักเป็นขาด

### Q: ทำไมให้ `LATE` มีค่า 0.5?

A: เป็น compromise ที่อธิบายง่าย: มาสายดีกว่าไม่มา แต่ไม่เท่ามาทันเวลา ทำให้ dashboard/report สะท้อนพฤติกรรมมากกว่าแค่ present/absent แบบแข็ง ๆ

### Q: ทำไมต้องมี dropped students แทนการลบนักศึกษาออกเลย?

A: ถ้านักศึกษาถอนรายวิชา เราไม่ควรให้เขาอยู่ใน active roster ต่อ แต่ก็ไม่ควรลบประวัติ attendance เก่า เพราะเป็นข้อมูลย้อนหลังของรายวิชา จึงใช้ `droppedAt` แยก active/dropped

### Q: ทำไม hard delete enrollment ต้อง drop ก่อน?

A: เพื่อกัน accidental delete นักศึกษาที่ยัง active อยู่ การลบถาวรต้องเป็น action ที่ deliberate คือถอนก่อน แล้วค่อยลบจาก dropped view

### Q: ลบ enrollment แล้ว attendance หายไหม?

A: ไม่หาย เพราะ `Attendance` ผูกกับ `User` ไม่ได้ผูกกับ `Enrollment` ดังนั้นต่อให้ลบ enrollment หลัง drop แล้ว session report เก่ายังแสดงประวัติได้

### Q: ทำไมต้องมี archive course?

A: หลังรายวิชามี session/attendance แล้ว รายวิชานั้นกลายเป็น academic record ไม่ควร hard delete ง่าย ๆ archive จึงเป็นวิธีซ่อนจากงานสอนปัจจุบันแต่ยังเก็บประวัติให้ดูย้อนหลังได้

### Q: ทำไม hard delete course ถึงจำกัดเฉพาะ course ที่ไม่มี session?

A: ถ้ามี session แล้วแปลว่ามีประวัติการเรียน/เช็คชื่อ การลบ course จะเสี่ยงทำลาย record สำคัญ จึงบังคับให้ใช้ archive แทน

### Q: ทำไมต้องเพิ่ม `roomSnapshot`?

A: ห้องเรียนใน schedule อาจถูกแก้ภายหลัง แต่รายงานย้อนหลังควรแสดงห้องที่ใช้จริงตอนเปิด session นั้น ๆ เลย snapshot ห้องลง session ตอนเปิด เพื่อรักษา historical truth

### Q: ทำไม `scheduleId` ของ session ถึง nullable?

A: เพื่อรองรับ ad-hoc session และรองรับกรณี schedule ถูกแก้/ลบภายหลัง แต่ session เก่ายังอยู่ได้ ไม่พังเพราะผูกกับ schedule เดิมแน่นเกินไป

### Q: ทำไม session auto-close เปลี่ยนเป็นปิดที่ `endsAt`?

A: เพราะ Phase 5 ให้ครูเลือก duration ของการเปิด QR เองแล้ว ดังนั้นเวลาที่ระบบรับเช็คชื่อควรตรงกับหน้าต่างเวลาที่ครูเลือก ไม่ควรต่อ safety buffer อีก 30 นาทีเหมือนเก่า

### Q: ทำไม QR ยังเป็น static ไม่ rotate?

A: เคยพิจารณา rotate แล้ว แต่กันการส่งต่อไม่ได้จริง เพราะเพื่อนยังส่ง/สแกนทันในช่วงสั้น ๆ ได้ และเพิ่ม complexity เยอะกว่า value ตอนนี้เลือกใช้ static QR ร่วมกับ login + enrollment และจะเพิ่ม Geofence ใน Phase 6 เป็น defense ที่ practical กว่า

### Q: ทำไมต้องใช้ server-side authorization ทั้งที่มี middleware?

A: Middleware เป็นแค่ UX gate เพื่อ redirect เร็ว ๆ แต่ action สำคัญต้องเช็กฝั่ง server ทุกครั้ง เช่น update attendance, drop enrollment, archive course เพราะ server-side authorization เป็นตัวจริงที่ไว้ใจได้

### Q: ทำไมมี CSV export ใน Phase 5 ทั้งที่ระบบยังไม่ใช่ full export module?

A: CSV export ใน Phase 5 เป็น lightweight export จากข้อมูล report ที่แสดงอยู่แล้ว ไม่ใช่ระบบเอกสาร/Excel เต็มรูปแบบ เหตุผลคืออาจารย์มักต้องเอาข้อมูลออกไปตรวจหรือส่งต่อได้เร็ว ส่วน export ที่ซับซ้อนกว่านี้ยังพัฒนาเพิ่มในอนาคตได้

### Q: ทำไม Phase 6 เปลี่ยนเป็น Geofence?

A: เพราะปัญหาหลักหลัง QR/login/enrollment คือ proxy check-in หรือส่ง QR ให้เพื่อน Location verification เป็น defense ถัดไปที่ practical และอธิบายได้ดีในบริบทห้องเรียนจริง

### Q: ทำไม Face Scan ไป Phase 7 หรือ future enhancement?

A: Face scan มี value แต่เสี่ยงกว่า geofence ทั้งเรื่อง privacy, camera permission, matching accuracy, false positive/negative และเวลา implement ถ้าเวลาจำกัดควรทำ location ให้แข็งก่อน แล้ววาง face scan เป็น extension ที่มีเหตุผล

---

## 6. Important Files

### Data and migrations

- `prisma/schema.prisma`
- `prisma/migrations/20260511115035_phase5_excused_and_dropped/`
- `prisma/migrations/20260511152122_phase6_adhoc_session/`
- `prisma/migrations/20260512051819_add_section_to_course/`
- `prisma/migrations/20260512061934_decouple_schedule_and_snapshot_room/`
- `prisma/migrations/20260512112911_add_archived_at_to_course/`

### Session and check-in

- `src/app/actions/session.ts`
- `src/lib/session-helpers.ts`
- `src/lib/checkin.ts`
- `src/app/actions/checkin.ts`
- `src/components/courses/OpenSessionButton.tsx`
- `src/components/courses/CloseSessionButton.tsx`
- `src/components/sessions/SessionView.tsx`
- `src/components/sessions/QrDisplay.tsx`
- `src/components/sessions/CheckedInSidebar.tsx`
- `src/components/checkin/CheckInShell.tsx`
- `src/app/checkin/page.tsx`
- `src/app/demo/checkin/page.tsx`

### Reports

- `src/actions/attendance.ts`
- `src/app/(app)/teacher/courses/[id]/report/page.tsx`
- `src/app/(app)/teacher/sessions/[id]/page.tsx`
- `src/components/report/ReportClient.tsx`
- `src/components/report/ExportCsvButton.tsx`
- `src/components/sessions/SessionReport.tsx`
- `src/components/sessions/RosterTable.tsx`
- `src/components/sessions/SessionMetaBar.tsx`
- `src/components/sessions/FilterTabs.tsx`
- `src/components/sessions/FilterButtonGroup.tsx`
- `src/components/sessions/SessionMoreMenu.tsx`
- `src/components/sessions/SessionDangerZone.tsx`

### Roster

- `src/actions/enrollment.ts`
- `src/app/actions/roster.ts`
- `src/lib/roster-import.ts`
- `src/app/(app)/teacher/courses/[id]/students/page.tsx`
- `src/components/import/AddStudentDialog.tsx`
- `src/components/import/RosterImport.tsx`
- `src/components/import/EditStudentDialog.tsx`
- `src/components/import/DropStudentButton.tsx`
- `src/components/import/DeleteEnrollmentButton.tsx`
- `src/components/import/StudentsSearchInput.tsx`

### Course lifecycle

- `src/app/actions/course.ts`
- `src/app/(app)/teacher/courses/new/page.tsx`
- `src/app/(app)/teacher/courses/[id]/edit/page.tsx`
- `src/app/(app)/teacher/courses/page.tsx`
- `src/components/courses/CourseForm.tsx`
- `src/components/courses/CourseMoreMenu.tsx`
- `src/components/courses/CourseDangerZone.tsx`

### Dashboard and shared UI

- `src/app/(app)/teacher/page.tsx`
- `src/app/(app)/teacher/courses/[id]/page.tsx`
- `src/app/(app)/teacher/settings/page.tsx`
- `src/app/(auth)/login/LoginForm.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/brand/QRollLogo.tsx`
- `src/components/shell/Sidebar.tsx`
- `src/components/shell/UserCard.tsx`

---

## 7. Verification

หลังจบ Phase 5 มีการ verify แล้ว:

```bash
npx.cmd tsc --noEmit
npm.cmd run build
```

ผลคือผ่านทั้ง typecheck และ production build หลังแก้ type/lint warnings เพิ่มเติม

Phase 5 ถูก push ขึ้น GitHub แล้วเป็น focused commits:

- `feat(data): support phase 5 attendance and course lifecycle decisions`
- `feat(sessions): open flexible QR sessions and preserve historical context`
- `feat(reports): add course and session attendance reports`
- `feat(roster): manage active and dropped students safely`
- `feat(courses): add archive, edit, and safer deletion flows`
- `feat(ui): polish teacher dashboard and shared app shell`
- `fix(types): align check-in and session report props`
- `chore(lint): clean phase 5 build warnings`

---

## 8. สิ่งที่ยังเหลือ / Phase ถัดไป

### Phase 6 — Geofence / Location Verification

เป้าหมายคือทำ location verification ให้ใช้งานจริงได้มากที่สุด เพื่อช่วยลด proxy check-in หลังจากระบบมี login, enrollment, QR และ report แล้ว

สิ่งที่ควรออกแบบก่อนเริ่ม:

- course/session จะเก็บพิกัดอย่างไร
- radius เท่าไรถึงเหมาะกับห้องเรียนจริง
- ถ้า browser ไม่ให้ permission ต้องแสดงอะไร
- ถ้า GPS เพี้ยนต้องมี fallback หรือ manual override ไหม
- จะ log location evidence แค่ไหนโดยไม่กระทบ privacy เกินจำเป็น

### Phase 7 — Face Scan / Face Verification

เป้าหมายเดิมคือเพิ่ม face scan เพื่อยืนยันตัวตนเพิ่มอีกชั้น แต่ความเสี่ยงสูงกว่า Geofence ทั้งด้าน privacy, camera permission, matching accuracy และเวลา implement

ถ้าเวลาพอ Phase 7 อาจทำเป็น prototype ที่ใช้งานได้จริงใน scope จำกัด แต่ถ้าเวลาไม่พอควรวางเป็น future enhancement พร้อมอธิบาย tradeoff ว่าเลือกทำ Geofence ให้แข็งก่อนเพราะ practical กว่า

---

## 9. One-Minute Explanation

ถ้าต้องอธิบาย Phase 5 แบบสั้น ๆ:

> Phase 5 คือรอบที่ทำให้ QRoll ไม่ใช่แค่เครื่องมือสแกน QR แต่กลายเป็นระบบจัดการ attendance history ของอาจารย์ได้จริง ผมเพิ่ม dashboard ที่ใช้ข้อมูลจริง, report ระดับรายวิชาและรายคาบ, การแก้สถานะย้อนหลัง, การจัดการนักศึกษาที่ถอนแล้วโดยไม่ลบประวัติ, และระบบ archive รายวิชาเพื่อรักษา academic record การตัดสินใจหลักคือแยกข้อมูล demo ออกจาก attendance จริง, ให้ EXCUSED เป็น manual-only, เก็บ roomSnapshot เพื่อให้รายงานเก่าไม่เปลี่ยนตาม schedule ใหม่ และใช้ archive/drop แทนการลบข้อมูลที่มีประวัติแล้ว
