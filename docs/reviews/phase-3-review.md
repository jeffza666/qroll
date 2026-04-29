# Phase 3 Code Review — QRoll
**วันที่:** 2026-04-29
**Scope:** AppShell + Teacher Courses + Roster Import
**Build status:** ✅ TypeScript clean, ESLint clean, `npm run build` ผ่าน

---

## ภาพรวม

Phase 3 สร้าง **Teacher side ฝั่ง UI + logic ครบวงจร** — ตั้งแต่ layout shell ไปจนถึง import นักศึกษาจากไฟล์ ทุกอย่างทำงานผ่าน Next.js Server Actions เชื่อมกับ Prisma → Supabase โดยตรง ไม่มี REST API layer กลาง

---

## แผนที่ไฟล์ Phase 3

```
src/
├── app/
│   ├── globals.css                          ← Brand tokens + Sarabun font
│   ├── (app)/
│   │   ├── layout.tsx                       ← ครอบทุก route ด้วย AppShell
│   │   └── teacher/
│   │       ├── layout.tsx                   ← Guard: requireTeacher()
│   │       ├── page.tsx                     ← Dashboard (stat cards)
│   │       ├── courses/
│   │       │   ├── page.tsx                 ← List วิชา
│   │       │   ├── new/page.tsx             ← Form สร้างวิชา
│   │       │   └── [id]/page.tsx            ← Detail + roster table
│   │       └── settings/page.tsx            ← Profile stub
│   └── actions/
│       ├── course.ts                        ← createCourse, deleteCourse
│       └── roster.ts                        ← importRoster (CSV + XLSX)
├── lib/
│   ├── auth-helpers.ts                      ← requireAuth / Teacher / Student / CourseOwner
│   └── nav-config.ts                        ← Link list แยกตาม role
└── components/
    ├── shell/
    │   ├── AppShell.tsx                     ← Layout 2 column (Sidebar + content)
    │   ├── Sidebar.tsx                      ← Nav + logo + active link
    │   └── UserCard.tsx                     ← Avatar + ชื่อ + ปุ่ม logout
    └── import/
        └── RosterImport.tsx                 ← Modal upload + summary
```

---

## ไฟล์ต่อไฟล์ — ทำหน้าที่อะไร

### `globals.css`
กำหนด design system ของ QRoll ทั้งหมดไว้ที่นี่ที่เดียว
- `--color-primary: #990000` — สีแดง TU
- `--color-bg: #f7f8fc` — พื้นหลังทั้ง app
- โหลด Sarabun (Google Fonts) สำหรับภาษาไทย
- Custom scrollbar บาง 4px

---

### `src/app/(app)/layout.tsx`
Route Group Layout — ทุก URL ที่อยู่ใน `(app)/` จะได้ AppShell ครอบอัตโนมัติ

```
URL /teacher/courses  →  (app)/layout.tsx  →  AppShell  →  teacher/courses/page.tsx
```

---

### `src/app/(app)/teacher/layout.tsx`
**Security layer แรกของ teacher routes**
- เรียก `requireTeacher()` ก่อน render ทุกหน้า
- ถ้า user ไม่ใช่ teacher → โยน `AuthError("FORBIDDEN")`

---

### `src/lib/auth-helpers.ts`
ศูนย์กลาง authorization ทั้งหมด มี 4 helper:

| Function | ทำอะไร |
|---|---|
| `requireAuth()` | ตรวจว่า login อยู่ไหม |
| `requireTeacher()` | ตรวจว่าเป็น TEACHER |
| `requireStudent()` | ตรวจว่าเป็น STUDENT |
| `requireCourseOwner(courseId)` | ตรวจว่าวิชานี้เป็นของ teacher คนนี้จริงไหม (query DB) |

**ทุก Server Action ต้องเรียก helper เหล่านี้เป็นบรรทัดแรก** — ถ้าไม่ผ่าน throw ทันที ไม่มีทาง bypass ได้

---

### `src/lib/nav-config.ts`
เก็บ link list ของแต่ละ role ไว้เป็น config แยกจาก component
- `TEACHER_NAV` — Dashboard, My Courses, Settings
- `STUDENT_NAV` — Dashboard, Enrolled Courses, Attendance History
- Sidebar อ่านจาก config นี้ → ถ้าอยาก add/remove เมนู แก้ที่นี่ที่เดียว

---

### `src/components/shell/AppShell.tsx`
Layout หลัก 2 คอลัมน์

```
┌──────────────┬────────────────────────────┐
│   Sidebar    │        main content        │
│   (w-64)     │         (flex-1)           │
└──────────────┴────────────────────────────┘
```

- `requireAuth()` ที่นี่ด้วย — ถ้า session หมดอายุระหว่างใช้งาน จะถูก redirect ทันที

---

### `src/components/shell/Sidebar.tsx`
แถบซ้าย navigation
- อ่าน role จาก session → เลือก nav config ที่ถูก role
- Link ไหน active (URL ตรงกัน) → highlight สีแดง
- ล่างสุด: `UserCard`

---

### `src/components/shell/UserCard.tsx`
Widget เล็ก ๆ ด้านล่าง Sidebar
- แสดงชื่อ + email ของ user ที่ login อยู่
- ปุ่ม "ออกจากระบบ" → `signOut()`
- Avatar = ตัวอักษรแรกของชื่อ บน background สีแดง

---

### `src/app/(app)/teacher/page.tsx` — Dashboard
หน้าแรกหลัง login
- Stat cards ดึงจาก DB จริง (จำนวนวิชา, จำนวนนักศึกษา)
- "อัตราเข้าเรียน" ยังเป็น placeholder `—` รอ Phase 5
- Section "ตารางสอนวันนี้" ยังว่าง รอ Phase 3.5

---

### `src/app/(app)/teacher/courses/page.tsx` — รายการวิชา
- Grid 3 คอลัมน์ แสดงวิชาทั้งหมดของ teacher
- แต่ละ card: รหัสวิชา, ชื่อ, ภาคการศึกษา, จำนวนนักศึกษา
- Empty state ถ้ายังไม่มีวิชา

---

### `src/app/(app)/teacher/courses/new/page.tsx` — สร้างวิชา
Form 3 ช่อง: รหัสวิชา, ชื่อวิชา, ภาคการศึกษา
- Submit → `createCourse()` Server Action → redirect ไปหน้า detail ทันที

---

### `src/app/(app)/teacher/courses/[id]/page.tsx` — หน้าวิชา
หน้าหลักของแต่ละวิชา
- Header: รหัส + ชื่อวิชา + semester + จำนวนนักศึกษา
- ตาราง roster: เลขที่, รหัสนักศึกษา, ชื่อ, อีเมล
- ปุ่ม "Import รายชื่อ" → เปิด `RosterImport` modal

---

### `src/app/(app)/teacher/settings/page.tsx` — Settings
Stub หน้าแสดง profile (ชื่อ, อีเมล, role) แบบ read-only
- ยังไม่มี edit functionality — รอ Phase 7

---

### `src/app/actions/course.ts` — Course Actions
```
createCourse(formData)
  → requireTeacher()       ← ตรวจสิทธิ์
  → zod validate           ← ตรวจ input
  → db.course.create()     ← บันทึก DB
  → redirect /teacher/courses/[id]

deleteCourse(courseId)
  → requireCourseOwner()   ← ตรวจทั้งสิทธิ์ + ownership
  → db.course.delete()
  → redirect /teacher/courses
```

---

### `src/app/actions/roster.ts` — Roster Import
Action ที่ซับซ้อนที่สุดใน Phase 3

```
importRoster(formData)
  → requireCourseOwner()          ← security
  → อ่านไฟล์ (CSV หรือ XLSX)     ← detect by extension
  → normalize headers             ← รองรับทั้ง EN/TH column name
  → validate แต่ละแถว (Zod)      ← studentId 10 หลัก, email @dome.tu.ac.th
  → upsert User + Enrollment      ← กัน duplicate อัตโนมัติ
  → return { ok, skipped, errors }
```

**Limits:** ไฟล์ไม่เกิน 1MB, แถวไม่เกิน 500 แถว

---

### `src/components/import/RosterImport.tsx` — Import Modal
UI สำหรับ upload ไฟล์ มี 3 state:

```
idle   → แสดง dropzone + column requirement
loading → spinner ระหว่าง upload
done   → สรุปผล (เพิ่มแล้ว X คน, ซ้ำ Y คน, error Z แถว)
```

---

## จุดเด่น

- **Security ชัดเจน** — ทุก action ผ่าน auth helper ก่อนเสมอ ไม่มี shortcut
- **Ownership check** — `requireCourseOwner` query DB จริง ไม่เชื่อ input จาก client
- **Graceful import** — duplicate enrollment ไม่ error, นับแยกเป็น "skipped"
- **Config-driven nav** — เพิ่มเมนูได้โดยไม่แตะ component

## จุดที่ยังเป็น Placeholder (รอ phase ถัดไป)

| จุด | รอ Phase |
|---|---|
| อัตราเข้าเรียน บน Dashboard | Phase 5 |
| ตารางสอนวันนี้ บน Dashboard | Phase 3.5 |
| Settings — edit profile | Phase 7 |
| Student routes (/student/\*) | Phase 4.5 |

---

## Verdict

> ✅ **Approved** — Phase 3 พร้อม commit และต่อ Phase 3.5 ได้
