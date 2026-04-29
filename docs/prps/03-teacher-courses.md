# PRP 03 — Teacher: AppShell + Courses + Roster Import

## Goal

Phase 3 สร้าง foundation UI ที่ใช้ร่วมกันทั้งระบบ (AppShell + Sidebar) และ feature แรกของ Teacher:
สร้างวิชา + import รายชื่อนักศึกษาจากไฟล์ CSV หรือ Excel (.xlsx)

**Demo gate:** login teacher → /teacher → สร้าง CS311 → upload roster.xlsx → roster ขึ้น

## Non-goals (Phase 3)

- Class Session, QR Code — Phase 4
- Student-side UI — Phase 4.5
- Attendance reports/charts — Phase 5
- Settings จริง (profile edit) — Phase 7

## Schema Touch Points

```
Course     (create, list by teacherId)
Enrollment (bulk upsert via importRoster)
User       (upsert name-only; ห้าม update role)
```

## AppShell Architecture

```
src/components/shell/
  AppShell.tsx   — server component: requireAuth() + layout wrapper
  Sidebar.tsx    — client component (usePathname for active state)
  UserCard.tsx   — client component: signOut()

src/lib/nav-config.ts
  TEACHER_NAV = [Dashboard, Courses, Settings]
  STUDENT_NAV = [หน้าหลัก, วิชาที่ลงเรียน, ประวัติเข้าเรียน]  ← ใช้จริง Phase 4.5

src/app/(app)/
  layout.tsx            — <AppShell> wrapper
  teacher/
    layout.tsx          — requireTeacher() guard
    page.tsx            — Dashboard shell
    courses/
      page.tsx          — list
      new/page.tsx      — create form
      [id]/page.tsx     — detail + roster
    settings/page.tsx   — stub
```

## CSV / XLSX Import Contract

### รูปแบบ header ที่รองรับ (case-insensitive, trim whitespace)

| field | alias ไทย | alias EN |
| ----- | --------- | -------- |
| studentId | รหัสนักศึกษา | studentId, student_id, id |
| email | อีเมล | email, e-mail |
| name | ชื่อ-สกุล | name, fullname |

### Validation rules

- `studentId` ต้องตรงกับ `^\d{10}$`
- `email` ต้องลงท้ายด้วย `@dome.tu.ac.th`
- ขนาดไฟล์ ≤ 1MB
- แถวข้อมูล ≤ 500 rows (ไม่รวม header)

### Upsert logic (ต่อ row ที่ผ่าน validate)

```
db.$transaction([
  db.user.upsert({ where: { email }, create: {..., role: STUDENT}, update: { name } }),
  db.enrollment.upsert({ where: { studentId_courseId }, create: {...}, update: {} })
])
```

ถ้า row ใด error → skip แถวนั้น สะสมใน `errors[]`
**ห้าม partial rollback** — ทำ row-by-row upsert แล้ว collect errors

### Return value

```ts
{ ok: number; skippedExisting: number; errors: { row: number; reason: string }[] }
```

## Security

- `requireCourseOwner(courseId)` ทุก action ที่แตะ course (IDOR guard)
- File upload ผ่าน Server Action FormData เท่านั้น — ห้ามส่ง URL / base64 จาก client
- ไม่ expose stack trace ใน errors[] — return human-readable reason เท่านั้น
- จำกัด size ก่อน parse (ไม่ให้ xlsx/papaparse OOM ด้วย malicious input)

## Anti-patterns

1. `User.role` — ห้าม update ตอน import (เคารพ Phase 2 decision)
2. Client-side file parse → server action รับ buffer — ห้าม parse browser-side แล้วส่ง JSON
3. ลืม `requireCourseOwner` → IDOR: teacher A เข้าถึง course ของ teacher B
4. Partial transaction (upsert user แล้ว enrollment fail) — row-by-row try/catch, collect errors
