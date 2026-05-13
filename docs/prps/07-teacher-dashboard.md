# PRP 07 — Teacher Dashboard + Reports

> **Phase:** 5  
> **Status:** Implemented and pushed to GitHub  
> **Depends on:** PRP 05 Student Check-in Flow, PRP 06 Roster + Session Overhaul  
> **Primary screen:** `/teacher`  
> **Related screens:** `/teacher/courses`, `/teacher/courses/[id]`, `/teacher/courses/[id]/report`, `/teacher/courses/[id]/students`, `/teacher/sessions/[id]`

---

## Goal

Phase 5 ทำให้ฝั่งอาจารย์ “อ่านสถานะการเรียนการสอนได้จริง” หลังจากระบบเริ่มเก็บ Attendance จริงแล้ว

เป้าหมายหลักคือ:

1. หน้า Teacher Dashboard (`/teacher`) ต้องสรุปสถานะปัจจุบันของอาจารย์ได้ทันที
2. อาจารย์ต้องดูย้อนหลังได้ทั้งระดับรายวิชาและรายคาบ
3. ข้อมูล report ต้องมาจาก `Attendance` จริงเท่านั้น ไม่ปน `DemoCheckIn`
4. อาจารย์ต้องแก้สถานะเช็คชื่อย้อนหลังได้ในกรณีระบบบันทึกผิดหรือมีใบลา
5. รายชื่อที่ถอนออกจากวิชาต้องไม่หายจากประวัติเดิม
6. รายวิชาที่มีประวัติแล้วต้อง archive ได้ แทนการลบ record ทิ้ง

สรุปสั้น ๆ: Phase นี้เปลี่ยนระบบจาก “เปิด QR แล้วเช็คชื่อ” เป็น “ระบบเช็คชื่อที่อาจารย์ใช้ติดตามและอธิบายข้อมูลย้อนหลังได้”

---

## Non-goals

สิ่งที่ตั้งใจไม่ทำใน Phase 5:

- ยังไม่ทำ Geofence/location check เพราะย้ายไป Phase 6
- ยังไม่ทำ Face Scan เพราะย้ายไป Phase 7 หรือ future enhancement
- ยังไม่รวม `DemoCheckIn` เข้า report จริง
- ยังไม่ทำ notification/email notify
- ยังไม่ทำ restore enrollment UI สำหรับกรณีถอนผิด
- ยังไม่ทำระบบ account settings แบบแก้ไขข้อมูลจริง หน้า settings รอบนี้เป็น polish/read-only เป็นหลัก
- ยังไม่เปลี่ยน stack หรือ auth model

---

## Problem

หลังจบ Phase 4.6 ระบบเก็บ `Attendance` จริงได้แล้ว แต่ฝั่งอาจารย์ยังมีช่องว่างสำคัญ:

- Dashboard ยังไม่ช่วยตอบภาพรวมว่า “วันนี้สอนอะไร”, “มีคาบไหนกำลังเช็คชื่อ”, “สถิติการเข้าเรียนเป็นอย่างไร”
- อาจารย์ยังไม่มีหน้าดูสรุปรายวิชาทั้งเทอม
- Session ที่ปิดแล้วไม่ควรแสดง QR presenter ต่อ เพราะ QR ไม่มีประโยชน์หลังปิดคาบ
- ยังไม่มีวิธีแก้สถานะรายคน เช่น มาสายผิด, ขาดผิด, หรือมีใบลา
- นักศึกษาที่ถอนรายวิชาควรถูกซ่อนจาก roster ปัจจุบัน แต่ประวัติคาบเก่ายังควรอ่านได้
- รายวิชาที่มี Attendance แล้วไม่ควรถูกลบง่าย ๆ เพราะเป็น academic record

---

## User Flow

### Dashboard Flow

1. อาจารย์ login แล้วเข้าหน้า `/teacher`
2. เห็น stat cards:
   - จำนวนรายวิชาที่ active
   - จำนวนคาบวันนี้
   - จำนวนนักศึกษาปัจจุบัน
   - อัตราเข้าเรียนเฉลี่ยจาก Attendance จริง
3. เห็นตารางสอนวันนี้:
   - คาบตาม schedule วันนี้
   - session ที่กำลังเปิด แม้จะเปิดนอก schedule วันนี้
   - ปุ่มไปหน้า QR/session เมื่อกำลังเช็คชื่อ
4. เห็นสรุปคาบล่าสุด:
   - donut แยก มา / สาย / ขาด / ลา
   - ลิงก์เข้า Session Report ของคาบล่าสุด

### Course Report Flow

1. จาก course detail หรือ header action กด “ดูรายงานสรุป”
2. เข้าหน้า `/teacher/courses/[id]/report`
3. เห็น CourseHeader พร้อม code, section, semester, จำนวนนักศึกษา, avg attendance
4. เห็น cards:
   - risk buckets
   - trend รายคาบ
   - cumulative summary
5. เห็น matrix นักศึกษา x คาบเรียน
6. ค้นหาด้วยชื่อ/รหัสนักศึกษา หรือ filter กลุ่มเสี่ยงได้
7. export CSV ได้จากข้อมูล report

### Session Report Flow

1. เข้า `/teacher/sessions/[id]`
2. ถ้า session ยังเปิดอยู่ แสดง `SessionView` สำหรับ QR
3. ถ้า session ปิดแล้ว แสดง `SessionReport`
4. อาจารย์เห็น meta ของคาบ, ค่าเฉลี่ย, count ตามสถานะ
5. filter/search รายชื่อนักศึกษาได้
6. แก้สถานะรายคนเป็น `PRESENT`, `LATE`, `ABSENT`, `EXCUSED` ได้

### Roster Flow

1. เข้า `/teacher/courses/[id]/students`
2. ดูเฉพาะ active students เป็น default
3. search ด้วยชื่อหรือรหัสนักศึกษา
4. เพิ่มนักศึกษาด้วย manual add หรือ import
5. แก้ชื่อได้
6. กดถอนนักศึกษาเพื่อย้ายไป dropped view
7. dropped view แสดงคนที่ถอนแล้ว พร้อมวันถอน และอนุญาต hard delete เฉพาะคนที่ถูก drop แล้ว

### Course Lifecycle Flow

1. รายวิชา active แสดงใน `/teacher/courses`
2. รายวิชาที่ archive แล้วแยกไป `?show=archived`
3. รายวิชาที่ archive แล้วเปิด session ใหม่ไม่ได้
4. รายวิชาที่มี session แล้วควร archive แทน hard delete
5. hard delete อนุญาตเฉพาะรายวิชาที่ยังไม่มี session

---

## Decisions Summary

| จุดตัดสินใจ | เลือก | เหตุผล |
| --- | --- | --- |
| Dashboard metrics | ใช้ `Attendance` จริงและ active courses เท่านั้น | Dashboard ต้องสะท้อนข้อมูลสอนจริง ไม่รวมวิชาที่ archive แล้ว |
| รายงานย้อนหลัง | แยก Course Report กับ Session Report | Course Report ตอบภาพรวมทั้งเทอม ส่วน Session Report ตอบคาบเดียว |
| Session URL | ใช้ `/teacher/sessions/[id]` ทั้ง live และ closed | URL เดียวเปลี่ยน behavior ตาม `isOpen`: เปิดอยู่ = QR, ปิดแล้ว = report |
| Demo data | ไม่เอา `DemoCheckIn` เข้า report | Demo check-in ไม่ใช่ academic record |
| สถานะลา | เพิ่ม `EXCUSED` และให้ manual-only | การลาต้องใช้อาจารย์ตัดสินจากเหตุผล/เอกสาร ระบบ infer เองไม่ได้ |
| สูตร avgPct | `(PRESENT + LATE * 0.5) / counted * 100`; `counted` ไม่รวม `EXCUSED` | มาสายควรได้ครึ่งหนึ่ง ขาดได้ศูนย์ ลาไม่ควรถูกหัก |
| ถอนนักศึกษา | ใช้ `Enrollment.droppedAt` | ซ่อนจาก roster ปัจจุบันแต่ไม่ลบประวัติ |
| Hard delete enrollment | ต้อง drop ก่อนเท่านั้น | กัน accidental delete active student |
| Attendance relation | ผูก Attendance กับ `User` ไม่ใช่ `Enrollment` | ลบ enrollment แล้ว attendance เก่ายังอ่านได้ |
| Course archive | ใช้ `Course.archivedAt` | เก็บ timestamp และซ่อนจากงานสอนปัจจุบัน |
| Course delete | ถ้ามี session แล้วไม่ hard delete | รายวิชาที่มี attendance เป็น academic record |
| Session schedule link | `ClassSession.scheduleId` nullable | รองรับ ad-hoc session และ schedule decoupling |
| ห้องเรียนย้อนหลัง | เก็บ `roomSnapshot` ตอนเปิด session | รายงานเก่าไม่เปลี่ยนเมื่อแก้ schedule ภายหลัง |
| Session duration | อาจารย์เลือก duration + grace minutes ตอนเปิด session | ใช้งานจริงยืดหยุ่นกว่า fixed schedule time |
| Auto-close | close ที่ `endsAt` | QR window ควรตรงกับเวลาที่อาจารย์เลือก |

---

## Data Model Changes

### `AttendanceStatus`

เพิ่ม:

```prisma
EXCUSED
```

ความหมาย:

- ใช้แทนการลา
- เกิดจาก teacher manual edit เท่านั้น
- ไม่เกิดจาก check-in flow อัตโนมัติ
- ไม่ถูกนับใน denominator ของ attendance percentage

### `Enrollment`

เพิ่ม:

```prisma
droppedAt DateTime?
```

ความหมาย:

- `null` = ยัง active อยู่ในรายวิชา
- not null = ถอนออกแล้ว
- active roster ต้อง filter `droppedAt: null`
- dropped view ต้อง filter `droppedAt: { not: null }`

### `Course`

เพิ่ม:

```prisma
section String?
archivedAt DateTime?
```

ความหมาย:

- `section` ใช้แยก sec ของรายวิชา
- `archivedAt` ใช้ซ่อนรายวิชาจาก workflow ปัจจุบัน และเก็บว่า archive เมื่อไหร่

### `ClassSession`

เพิ่ม/เปลี่ยน:

```prisma
scheduleId String?
durationMinutes Int
graceMinutes Int?
roomSnapshot String?
```

ความหมาย:

- `scheduleId` nullable เพื่อรองรับ ad-hoc session และ schedule changes
- `durationMinutes` เก็บระยะเวลา QR window
- `graceMinutes` เก็บ threshold สำหรับ LATE ถ้ามี
- `roomSnapshot` เก็บห้องตอนเปิด session เพื่อ historical truth

---

## Dashboard Design

หน้า `/teacher` มีหน้าที่ตอบคำถามเร็ว ๆ ของอาจารย์:

1. ตอนนี้อาจารย์มีรายวิชา active กี่วิชา
2. วันนี้มีคาบกี่คาบ
3. มีนักศึกษาปัจจุบันรวมกี่คน
4. อัตราเข้าเรียนเฉลี่ยเป็นเท่าไร
5. คาบไหนกำลังเช็คชื่ออยู่
6. คาบล่าสุดสรุปผลเป็นอย่างไร

### Query Rules

- นับเฉพาะ course ที่ `archivedAt: null`
- นับเฉพาะ enrollment ที่ `droppedAt: null`
- Average attendance ใช้ `Attendance` ผ่าน `classSession.course.teacherId`
- ไม่ include `DemoCheckIn`
- Today schedule ใช้ timezone Asia/Bangkok
- Off-schedule open sessions ต้องแสดงด้วย เพราะอาจารย์เปิดคาบนอกตารางได้

### UI Sections

- Top stat cards
- Today schedule table
- Active session state พร้อมปุ่ม “แสดง QR ขึ้นจอ”
- Latest class summary donut
- Link จาก latest class summary ไป Session Report

---

## Course Report Design

หน้า `/teacher/courses/[id]/report` ใช้ดูภาพรวมทั้งรายวิชา

### Query Rules

- ต้องผ่าน `requireCourseOwner(id)`
- ดึงเฉพาะ closed sessions (`isOpen: false`)
- ดึง active students จาก `Enrollment.droppedAt: null`
- Matrix cells มาจาก `Attendance`
- ไม่ดึง `DemoCheckIn`

### Metrics

- จำนวนนักศึกษาปัจจุบัน
- จำนวน session ที่ปิดแล้ว
- Average percentage
- Risk buckets:
  - safe: `>= 80%`
  - warning: `60-79%`
  - danger: `< 60%`
- Total absent
- Total late
- Trend รายคาบ

### Matrix Cell Meaning

- `PRESENT` = มาเรียน
- `LATE` = มาสาย
- `ABSENT` = ขาด
- `EXCUSED` = ลา
- `null` = ไม่มีข้อมูลในคาบนั้น

---

## Session Report Design

หน้า `/teacher/sessions/[id]` แยก behavior ตามสถานะ session:

- `isOpen === true` แสดง QR presenter (`SessionView`)
- `isOpen === false` แสดง report (`SessionReport`)

### Query Rules

- ต้องหา session ก่อนแล้วเช็ก `requireCourseOwner(session.courseId)`
- ดึง attendances พร้อม student
- ดึง enrollments ทั้ง active และ dropped เพื่อให้ session เก่ายังอธิบายได้
- แสดง dropped badge เมื่อ `Enrollment.droppedAt !== null`

### Status Editing

Server Action:

```ts
updateAttendanceStatus(attendanceId, newStatus)
```

กฎ:

- validate status ด้วย Zod
- หา attendance พร้อม `classSession.courseId`
- verify course ownership
- update status
- revalidate path ที่เกี่ยวข้อง

เหตุผล:

- แก้ข้อมูลผิดได้โดยไม่ต้องเข้า database ตรง
- ยังรักษา server-side authorization
- รองรับกรณีใบลาโดยใช้ `EXCUSED`

---

## Roster Management Design

หน้า `/teacher/courses/[id]/students` แยกจาก Course Detail เพื่อไม่ให้หน้ารายวิชาหลักรกเกินไป

### Active View

- default แสดง `droppedAt: null`
- search ผ่าน query string `?q=`
- manual add
- roster import
- edit name
- drop student

### Dropped View

- ใช้ `?show=dropped`
- แสดง `droppedAt` และเรียงล่าสุดก่อน
- hard delete ได้เฉพาะ dropped enrollment

### Why

การถอนรายวิชาไม่ใช่การลบประวัติ นักศึกษาที่ถอนควรถูกซ่อนจากรายชื่อปัจจุบัน แต่ session report เก่าควรยังอธิบายได้ว่าเขาเคยอยู่ในวิชานี้

---

## Course Lifecycle Design

### Archive

ใช้กับรายวิชาที่มีประวัติแล้ว:

- ซ่อนจาก default course list
- ยังเปิดดู report/history ได้
- เปิด session ใหม่ไม่ได้

### Hard Delete

ใช้เฉพาะรายวิชาที่ยังไม่มี session:

- ถ้ามี session แล้วให้ archive แทน
- เหตุผลคือ session/attendance เป็น academic record

### Edit Course

หน้า edit รวม:

- code
- section
- name
- semester
- schedules
- danger zone

---

## Security Rules

- Middleware เป็นแค่ UX gate
- Server Components / Server Actions ต้อง verify session/ownership เอง
- ทุก report route ต้องใช้ course ownership
- Server Action ที่แก้ attendance/enrollment/course ต้อง verify ownership จาก database
- ห้าม trust `attendanceId`, `enrollmentId`, หรือ `courseId` จาก client โดยตรง
- Report ห้าม include `DemoCheckIn`

---

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Report เผลอนับ demo data | บังคับ query จาก `Attendance` เท่านั้น |
| ลืม filter dropped students | product rule ชัดเจนว่า current roster ต้องใช้ `droppedAt: null` |
| อาจารย์ลบ course ที่มี record | ใช้ archive เป็น path หลัก และ hard delete เฉพาะ no-session course |
| ห้องใน report เปลี่ยนเมื่อแก้ schedule | ใช้ `roomSnapshot` |
| แก้ attendance ผิดสิทธิ์ | Server Action ต้องโหลด ownership จาก DB ก่อน update |
| EXCUSED ถูก auto-mark | ห้ามมี check-in/background logic ที่สร้าง EXCUSED เอง |

---

## Verification

### Automated Verification

- `npx.cmd tsc --noEmit` ผ่าน
- `npm.cmd run build` ผ่าน

### Manual Smoke Test

1. Login เป็น teacher แล้วเข้า `/teacher`
2. ตรวจว่า dashboard แสดง:
   - active courses
   - today class count
   - current student count
   - average attendance
   - today schedule
   - latest class summary
3. เข้า course detail แล้วไป report
4. ตรวจว่า Course Report แสดง matrix และ risk/trend/cumulative cards
5. เข้า closed session แล้วตรวจว่าแสดง Session Report ไม่ใช่ QR presenter
6. แก้ attendance status เป็น `EXCUSED`
7. ตรวจว่า avgPct ไม่นับ `EXCUSED`
8. ไปหน้า students แล้ว drop student
9. ตรวจว่า active roster ไม่แสดง student นั้นแล้ว
10. เข้า dropped view แล้วเห็น student พร้อมวันที่ถอน
11. เปิด session report เก่าแล้วตรวจว่ายังเห็น dropped student พร้อม badge
12. Archive course แล้วตรวจว่าไม่อยู่ใน default course list
13. ตรวจว่า archived course เปิด session ใหม่ไม่ได้

---

## Explanation For Advisor

Phase 5 ทำให้ระบบเช็คชื่อไม่จบแค่ “สแกน QR แล้วบันทึก” แต่กลายเป็นระบบที่อาจารย์ใช้ติดตามและตรวจสอบย้อนหลังได้จริง

ผมแยก report เป็น 2 ระดับ เพราะอาจารย์มีคำถามคนละแบบ:

- Course Report ตอบภาพรวมทั้งเทอมว่าใครมาเรียนสม่ำเสมอ ใครเสี่ยง
- Session Report ตอบรายละเอียดคาบเดียวว่าในคาบนี้ใครมา สาย ขาด หรือลา

ข้อมูล report ใช้ `Attendance` เท่านั้น ไม่รวม `DemoCheckIn` เพราะ demo check-in เป็นข้อมูลโชว์ระบบ ไม่ใช่ academic record จริง

ผมเพิ่ม `EXCUSED` เพื่อแยก “ลา” ออกจาก “ขาด” และตั้งใจให้เป็น manual-only เพราะระบบไม่ควรตัดสินเองว่านักศึกษาลาถูกต้องหรือไม่ ต้องให้อาจารย์แก้จากเอกสารหรือเหตุผลจริง สูตรเปอร์เซ็นต์จึงไม่นับ `EXCUSED` ใน denominator เพราะการลาไม่ควรถูกหักเหมือนการขาดเรียน

ส่วน roster ใช้ `droppedAt` แทนการลบออกทันที เพราะในระบบจริงนักศึกษาที่ถอนรายวิชาไม่ควรอยู่ในรายชื่อปัจจุบัน แต่ประวัติ attendance เก่าต้องยังอ่านได้ ผมจึงให้ hard delete ทำได้เฉพาะหลัง drop แล้วเท่านั้น

รายวิชาที่มี session แล้วก็ใช้ archive แทน hard delete เพราะถือว่าเริ่มมี academic record แล้ว การ archive ทำให้หน้าสอนปัจจุบันไม่รก แต่ยังเปิดดูประวัติได้

สุดท้าย ผมเพิ่ม `roomSnapshot` เพราะ schedule สามารถแก้ทีหลังได้ แต่ report ย้อนหลังควรแสดงห้องที่ใช้จริงตอนเปิด session นั้น ไม่ใช่เปลี่ยนตาม schedule ปัจจุบัน

---

## Important Files

### Dashboard

- `src/app/(app)/teacher/page.tsx`

### Course Report

- `src/app/(app)/teacher/courses/[id]/report/page.tsx`
- `src/components/report/ReportClient.tsx`
- `src/components/report/AttendanceMatrixTable.tsx`
- `src/components/report/RiskCard.tsx`
- `src/components/report/TrendCard.tsx`
- `src/components/report/CumulativeCard.tsx`
- `src/components/report/ExportCsvButton.tsx`

### Session Report

- `src/app/(app)/teacher/sessions/[id]/page.tsx`
- `src/actions/attendance.ts`
- `src/components/sessions/SessionReport.tsx`
- `src/components/sessions/SessionMetaBar.tsx`
- `src/components/sessions/RosterTable.tsx`
- `src/components/sessions/FilterButtonGroup.tsx`
- `src/components/sessions/SessionMoreMenu.tsx`

### Roster

- `src/app/(app)/teacher/courses/[id]/students/page.tsx`
- `src/actions/enrollment.ts`
- `src/app/actions/roster.ts`
- `src/lib/roster-import.ts`
- `src/components/import/AddStudentDialog.tsx`
- `src/components/import/RosterImport.tsx`
- `src/components/import/EditStudentDialog.tsx`
- `src/components/import/DropStudentButton.tsx`
- `src/components/import/DeleteEnrollmentButton.tsx`
- `src/components/import/StudentsSearchInput.tsx`

### Course Lifecycle

- `src/app/(app)/teacher/courses/page.tsx`
- `src/app/(app)/teacher/courses/[id]/page.tsx`
- `src/app/(app)/teacher/courses/[id]/edit/page.tsx`
- `src/app/actions/course.ts`
- `src/components/courses/CourseForm.tsx`
- `src/components/courses/CourseMoreMenu.tsx`
- `src/components/courses/CourseDangerZone.tsx`
- `src/components/courses/OpenSessionButton.tsx`

### Schema

- `prisma/schema.prisma`
- `prisma/migrations/20260511115035_phase5_excused_and_dropped/migration.sql`
- `prisma/migrations/20260511152122_phase6_adhoc_session/migration.sql`
- `prisma/migrations/20260512051819_add_section_to_course/migration.sql`
- `prisma/migrations/20260512061934_decouple_schedule_and_snapshot_room/migration.sql`
- `prisma/migrations/20260512112911_add_archived_at_to_course/migration.sql`
