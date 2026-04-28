# STATE.md — Qroll Handoff Tracker

> 📌 **ต้องอ่านไฟล์นี้หลัง `INSTRUCTIONS.md` เพื่อรู้ว่าโปรเจกต์ทำถึงไหนแล้ว**
> อัปเดตทุกครั้งที่จบงาน — อย่าให้ stale

---

## 🎯 Current Status

**Phase:** `Phase 2 — Auth via TU API` ✅ **DONE**
**Last updated:** 2026-04-28

---

## ✅ ทำเสร็จแล้ว (Phase 0)

| # | Task | สถานะ | Note |
| --- | --- | --- | --- |
| 1 | สร้างโปรเจกต์ Next.js | ✅ | `npx create-next-app` |
| 2 | เขียน `INSTRUCTIONS.md` (Project Constitution) | ✅ | v1.1 |
| 3 | Downgrade Next.js 16.2.4 → 15.5.15 | ✅ | เพื่อ stability + community support |
| 4 | แก้ `eslint.config.mjs` ให้ตรง Next 15 ESM resolver | ✅ | เพิ่ม `.js` ใน import path |
| 5 | Verify build (`npm run build`) | ✅ | ผ่าน ไม่มี warning |
| 6 | สร้าง Context Architecture (`STATE.md`, `docs/prps/`) | ✅ | ไฟล์นี้ |
| 7 | เขียน PRP 01 — Database Schema | ✅ | `docs/prps/01-database-schema.md` |

## ✅ ทำเสร็จแล้ว (Phase 1)

| # | Task | สถานะ | Note |
| --- | --- | --- | --- |
| 1 | สร้าง Supabase project (Singapore) | ✅ | ได้ DATABASE_URL + DIRECT_URL |
| 2 | Install Prisma 5.22 + server-only + ts-node | ✅ | downgrade จาก 7 → 5 (stability) |
| 3 | สร้าง `prisma/schema.prisma` (8 models + 2 enums) | ✅ | ตาม PRP 01 blueprint |
| 4 | สร้าง `.env.local` + `.env` + ตรวจ gitignore | ✅ | ทั้งสองถูก gitignore ด้วย `.env*` |
| 5 | รัน `npx prisma migrate dev --name init` | ✅ | migration สำเร็จ, 8 tables + unique constraints ครบ |
| 6 | สร้าง `src/lib/db.ts` Prisma client singleton | ✅ | มี `import "server-only"` กัน bundle ฝั่ง browser |
| 7 | สร้าง `prisma/seed.ts` + รัน `npx prisma db seed` | ✅ | teacher + student seed user พร้อมสำหรับ Phase 2 dev |
| 8 | Verify build (`npm run build`) | ✅ | ผ่าน |

---

## ✅ ทำเสร็จแล้ว (Phase 2)

| # | Task | สถานะ | Note |
| --- | --- | --- | --- |
| 1 | เขียน PRP 02 — Auth via TU API | ✅ | `docs/prps/02-auth-tu-api.md` |
| 2 | Install NextAuth v5 beta + Zod + lucide-react | ✅ | auth, validation, icons |
| 3 | สร้าง NextAuth Credentials provider | ✅ | BYPASS mode + real TU API contract |
| 4 | สร้าง auth helpers | ✅ | `requireAuth`, `requireTeacher`, `requireStudent` |
| 5 | สร้าง middleware auth gate | ✅ | redirect ไป `/login?from=...` |
| 6 | สร้าง login page จาก HTML design | ✅ | Server shell + Client form |
| 7 | Update env template | ✅ | `TU_API_URL`, `TU_API_KEY`, `NEXTAUTH_*`, `BYPASS_TU_AUTH` |
| 8 | Verify lint/build + BYPASS smoke test | ✅ | teacher/student session claims ถูกต้อง |

---

## 🎯 Next Step (Phase 3 — ขั้นถัดไปทันที)

**Teacher: สร้างวิชา + import นักศึกษา (CSV)**

1. เขียน PRP 03 สำหรับ Teacher course + CSV import
2. สร้าง `/teacher` dashboard shell
3. สร้าง Server Actions สำหรับ create course และ import enrollment
4. ใช้ `requireTeacher()` ทุก action
5. เพิ่ม ownership helper เมื่อมี course actions จริง

---

## 🛤️ Phase Roadmap

| Phase | Goal                                                 | Status         |
| ----- | ---------------------------------------------------- | -------------- |
| 0     | Setup project + Context Architecture                 | ✅ Done        |
| 1     | Database (Prisma + Supabase + schema)                | ✅ Done        |
| 2     | Auth via TU API (NextAuth v5)                        | ✅ Done        |
| 3     | Teacher: สร้างวิชา + import นักศึกษา (CSV)           | 🔜 **Up next** |
| 4     | Teacher: สร้างคาบเรียน + Dynamic QR                  | ⏳             |
| 5     | Student: สแกน QR → check-in                          | ⏳             |
| 6     | Teacher Dashboard (สรุปการเข้าเรียน)                 | ⏳             |
| 7     | Milestone features (Geofencing, manual edit, export) | ⏳             |
| 8     | Milestone features (Face Scan, Email notify)         | ⏳             |

---

## 📚 PRP Index (Plan-Research-Pattern docs)

| File                                | หัวข้อ                               | สถานะ      |
| ----------------------------------- | ------------------------------------ | ---------- |
| `docs/prps/00-security-model.md`    | Security Model (threats + controls)  | ✅ Done    |
| `docs/prps/01-database-schema.md`   | Database Schema (Prisma blueprint)   | ✅ Done    |
| `docs/prps/02-auth-tu-api.md`       | NextAuth v5 + TU API custom provider | ✅ Done    |
| `docs/prps/03-dynamic-qr.md`        | Dynamic QR (refresh ทุก 30s + token) | ⏳ Pending |
| `docs/prps/04-checkin-flow.md`      | Student check-in flow                | ⏳ Pending |
| `docs/prps/05-teacher-dashboard.md` | Teacher dashboard + reports          | ⏳ Pending |

---

## 🧠 Decision Log

### 2026-04-27 — Stack version pin

- **Decision:** ใช้ Next.js 15.5.15 (downgrade จาก 16.2.4)
- **Why:** Next 16 ใหม่เกินไป — AI training data + community examples ยังไม่ครอบคลุม + breaking changes (`middleware.ts` → `proxy.ts`) เพิ่มความเสี่ยงโดยไม่จำเป็น
- **Pinned versions:** Next.js `^15.5.0`, React `19.2.4`, Tailwind CSS `v4`

### 2026-04-27 — Context Architecture

- **Decision:** ใช้ระบบ `INSTRUCTIONS.md` (กฎเหล็ก) + `STATE.md` (handoff) + `docs/prps/*.md` (deep dive ต่อ feature)
- **Why:** ป้องกัน AI session ใหม่ "หลงทาง" — ทุก session อ่าน 3 ไฟล์นี้ก่อนเริ่มงาน

### 2026-04-27 — Auth strategy

- **Decision:** ใช้ TU API จริง (มี endpoint + credentials) ผ่าน NextAuth v5 Custom Provider
- **Why:** Dome email (`@dome.tu.ac.th`) เป็น single source of truth — ไม่ใช้ Google OAuth filtered

### 2026-04-27 — Schema naming: ClassSession (ไม่ใช่ Session)

- **Decision:** เปลี่ยนชื่อ table "Session" ใน INSTRUCTIONS.md ข้อ 5 → `ClassSession` ใน Prisma schema
- **Why:** NextAuth v5 ใช้ `Session` table มาตรฐาน → ชนกัน
- **Action:** PRP 01 ระบุชัด, ตอน implement ให้ใช้ `ClassSession`

### 2026-04-28 — เอกสาร Security Model และอัปเดต PRP 01

- **Decision:** สร้าง `docs/prps/00-security-model.md` เป็นเอกสารอ้างอิงหลักด้าน security
- **Why:** ระบบเช็คชื่อมีความเสี่ยงเรื่องการโกงและการโจมตีหลายแบบ จึงต้องมีเอกสารกลางก่อน implement

### 2026-04-28 — Prisma version pin: 5.22 (downgrade จาก 7.8)

- **Decision:** ใช้ Prisma 5.22.0 แทน Prisma 7.8.0 ที่ติดตั้งมา
- **Why:** Prisma 7 เปลี่ยน architecture ใหญ่มาก — `url`/`directUrl` ย้ายออกจาก `schema.prisma` ไปอยู่ใน `prisma.config.ts` (TypeScript config file ใหม่) ทำให้ไม่เข้ากับ Supabase PgBouncer setup + ไม่มี community example รองรับเพียงพอสำหรับ final project — Prisma 5 ใช้ `directUrl` ใน schema.prisma ได้ตามปกติ

### 2026-04-28 — Two env files: `.env` + `.env.local`

- **Decision:** ใช้ 2 ไฟล์ — `.env.local` สำหรับ Next.js runtime, `.env` สำหรับ Prisma CLI
- **Why:** Prisma 5 CLI อ่านแค่ `.env` (dotenv default) ไม่อ่าน `.env.local` — Next.js อ่านทั้งสองไฟล์ — ทั้งสองถูก gitignore ด้วย `.env*` rule ใน `.gitignore`

### 2026-04-28 — JWT session strategy for NextAuth

- **Decision:** ใช้ NextAuth v5 Credentials provider + JWT session strategy โดยไม่ wire PrismaAdapter
- **Why:** Phase 2 ต้องการ claims สั้น ๆ (`id`, `role`, `studentId`) ที่ middleware อ่านได้ตรง และลด moving parts ใน final project MVP

### 2026-04-28 — TU login upsert ไม่ update role

- **Decision:** ตอน real TU login ให้ `upsert` user แต่ update เฉพาะ `name` เมื่อ user มีอยู่แล้ว
- **Why:** ป้องกัน privilege drift ถ้าข้อมูลภายนอกเปลี่ยน หรือ mapping ผิดพลาดแล้วทำให้ role ใน Qroll ถูกยกระดับ/ลดระดับโดยไม่ตั้งใจ

### 2026-04-28 — Phase 2 auth helper scope

- **Decision:** Phase 2 มีแค่ `requireAuth`, `requireTeacher`, `requireStudent`
- **Why:** `requireCourseOwner` และ `requireEnrolledStudent` ต้องอิง course/enrollment actions จริง จึงค่อยเพิ่มใน Phase 3/5 เพื่อไม่สร้าง dead code

---

## 🚧 Blockers / Open Questions

ไม่มีตอนนี้ — Phase 3 พร้อมเริ่ม

---

## 📝 Notes for Next Session

1. **อ่าน 3 ไฟล์นี้ตามลำดับก่อนเขียนโค้ด:**
   - `INSTRUCTIONS.md` (กฎเหล็ก)
   - `STATE.md` (ไฟล์นี้ — รู้สถานะ)
   - PRP ของ Phase ถัดไป (Phase 3 ยังต้องเขียนก่อนเริ่ม code)

2. **Stack ที่ติดตั้งจริง** (ดู `package.json`):
   - Next.js `15.5.15`, React `19.2.4`, Tailwind `v4`
   - Prisma `5.22.0`, `@prisma/client` `5.22.0`, `server-only`, `ts-node`
   - NextAuth v5 beta, Zod, lucide-react
   - ยังไม่ install: qrcode, html5-qrcode

3. **Seed users (dev login Phase 2):**
   - Teacher: `teacher@tu.ac.th`
   - Student: `test.student@dome.tu.ac.th` / studentId: `0000000001`
   - ใช้กับ `BYPASS_TU_AUTH=true` ใน `.env.local` ตอนทดสอบ

4. **Prisma Studio:** รัน `npx prisma studio` เพื่อดู 8 tables + seed data ใน GUI
