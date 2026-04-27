# STATE.md — Qroll Handoff Tracker

> 📌 **AI ทุกตัวต้องอ่านไฟล์นี้หลัง `INSTRUCTIONS.md` เพื่อรู้ว่าโปรเจกต์ทำถึงไหนแล้ว**
> อัปเดตทุกครั้งที่จบงาน — อย่าให้ stale

---

## 🎯 Current Status

**Phase:** `Phase 0 — Setup Project` ✅ **DONE**
**Last updated:** 2026-04-28

---

## ✅ ทำเสร็จแล้ว (Phase 0)

| # | Task | สถานะ | Note |
|---|---|---|---|
| 1 | สร้างโปรเจกต์ Next.js | ✅ | `npx create-next-app` |
| 2 | เขียน `INSTRUCTIONS.md` (Project Constitution) | ✅ | v1.1 |
| 3 | Downgrade Next.js 16.2.4 → 15.5.15 | ✅ | เพื่อ stability + community support |
| 4 | แก้ `eslint.config.mjs` ให้ตรง Next 15 ESM resolver | ✅ | เพิ่ม `.js` ใน import path |
| 5 | Verify build (`npm run build`) | ✅ | ผ่าน ไม่มี warning |
| 6 | สร้าง Context Architecture (`STATE.md`, `docs/prps/`) | ✅ | ไฟล์นี้ |
| 7 | เขียน PRP 01 — Database Schema | ✅ | `docs/prps/01-database-schema.md` |

---

## 🎯 Next Step (Phase 1 — ขั้นถัดไปทันที)

**Setup Database (Prisma + Supabase + Schema migration)**

ทำตาม [docs/prps/01-database-schema.md](docs/prps/01-database-schema.md) ขั้นที่ 1–7:

1. สมัคร/เปิด Supabase project + copy `DATABASE_URL` (pooled) + `DIRECT_URL`
2. Install Prisma: `npm install prisma @prisma/client && npm install -D prisma`
3. Init Prisma: `npx prisma init`
4. ใส่ schema ตาม blueprint ใน PRP 01
5. ใส่ `DATABASE_URL` ลง `.env.local` + อัปเดต `.env.example`
6. รัน `npx prisma migrate dev --name init`
7. สร้าง `src/lib/db.ts` Prisma client singleton

หลังจากนั้นเขียน **PRP 02 — Auth via TU API** ก่อนทำ feature ถัดไป

---

## 🛤️ Phase Roadmap

| Phase | Goal | Status |
|---|---|---|
| 0 | Setup project + Context Architecture | ✅ Done |
| 1 | Database (Prisma + Supabase + schema) | 🔜 **Up next** |
| 2 | Auth via TU API (NextAuth v5) | ⏳ |
| 3 | Teacher: สร้างวิชา + import นักศึกษา (CSV) | ⏳ |
| 4 | Teacher: สร้างคาบเรียน + Dynamic QR | ⏳ |
| 5 | Student: สแกน QR → check-in | ⏳ |
| 6 | Teacher Dashboard (สรุปการเข้าเรียน) | ⏳ |
| 7 | Phase 2 features (Geofencing, manual edit, export) | ⏳ |
| 8 | Phase 3 features (Face Scan, Email notify) | ⏳ |

---

## 📚 PRP Index (Plan-Research-Pattern docs)

| File | หัวข้อ | สถานะ |
|---|---|---|
| `docs/prps/01-database-schema.md` | Database Schema (Prisma blueprint) | ✅ Done |
| `docs/prps/02-auth-tu-api.md` | NextAuth v5 + TU API custom provider | ⏳ Pending |
| `docs/prps/03-dynamic-qr.md` | Dynamic QR (refresh ทุก 30s + token) | ⏳ Pending |
| `docs/prps/04-checkin-flow.md` | Student check-in flow | ⏳ Pending |
| `docs/prps/05-teacher-dashboard.md` | Teacher dashboard + reports | ⏳ Pending |

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

---

## 🚧 Blockers / Open Questions

ไม่มีตอนนี้ — Phase 1 พร้อมเริ่ม

---

## 📝 Notes for Next Session

1. **อ่าน 3 ไฟล์นี้ตามลำดับก่อนเขียนโค้ด:**
   - `INSTRUCTIONS.md` (กฎเหล็ก)
   - `STATE.md` (ไฟล์นี้ — รู้สถานะ)
   - `docs/prps/01-database-schema.md` (รายละเอียด schema)

2. **Stack ที่ติดตั้งจริง** (ดู `package.json`):
   - Next.js `15.5.15`, React `19.2.4`, Tailwind `v4`
   - ยังไม่ install: Prisma, NextAuth, Zod, qrcode, html5-qrcode, server-only

3. **Supabase credentials** — ยังไม่ได้สร้าง project — ต้องทำก่อน run migration

4. **TU API doc** — มีอยู่แล้ว แต่ยังไม่นำมาใช้ — ต้องอ่านก่อนทำ auth (M2)
