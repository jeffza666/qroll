# INSTRUCTIONS.md — Qroll Project Constitution

> ⚠️ **AI ทุกตัวต้องอ่านไฟล์นี้ก่อนเขียนโค้ดทุกครั้ง** ห้ามข้าม ห้ามเดา
> ถ้าขัดกับสิ่งที่ user สั่ง ให้ถามก่อนเสมอ อย่าตัดสินใจเอง

---

## 1. ข้อมูลโปรเจกต์

| รายการ | รายละเอียด |
|---|---|
| ชื่อ | **Qroll** (คิวโรล) |
| ประเภท | ระบบเช็คอินเข้าเรียนอัจฉริยะ |
| สถาบัน | มหาวิทยาลัยธรรมศาสตร์ |
| Domain อีเมลที่อนุญาต | `@dome.tu.ac.th` เท่านั้น |
| เป้าหมาย | MVP production-grade ส่งอาจารย์ได้ |

---

## 2. Tech Stack (ห้ามเบี่ยงเบน)

### ✅ ต้องใช้

| Layer | เครื่องมือ | เหตุผล |
|---|---|---|
| Framework | **Next.js 15.5.x (App Router)** | Full-stack, API routes ในตัว, stable + มี doc/community รองรับเยอะ |
| Runtime | **React 19.x** | Server Components default, รองรับ `use` hook + form actions API ใหม่ |
| Language | **TypeScript (Strict mode)** | `"strict": true` ใน `tsconfig.json` |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) | config ผ่าน `postcss.config.mjs` (ไม่มี `tailwind.config.js` แบบ v3) |
| Database | **PostgreSQL** (Supabase Cloud) | Production-grade, มี free tier |
| ORM | **Prisma** | Type-safe, migration ดี, เหมาะกับ Next.js |
| Auth | **NextAuth.js v5 (Auth.js)** | Custom provider เชื่อม TU API (combo ที่ stable บน Next 15) |
| QR Code | **`qrcode`** (gen) + **`html5-qrcode`** (scan) | มาตรฐาน, ใช้งานง่าย |
| Deployment | **Vercel** | เข้ากับ Next.js ดีที่สุด |

> ⚠️ **หมายเหตุ Next.js version:** โปรเจกต์เคยเริ่มที่ Next 16.2.4 แล้ว downgrade กลับเป็น 15.5 เพื่อ stability + community support สำหรับโปรเจกต์จบ ห้ามอัปเป็น 16 หรือสูงกว่าโดยไม่ได้รับอนุมัติ

### ❌ ห้ามใช้เด็ดขาด

- Docker / Kubernetes (over-engineering สำหรับโปรเจกต์นี้)
- XAMPP / WordPress / Strapi (ไม่เกี่ยวกับ stack)
- React + Vite (เราใช้ Next.js ไม่ใช่ React ธรรมดา)
- Drizzle ORM (เราเลือก Prisma แล้ว)
- MongoDB / MySQL / SQLite (เราใช้ PostgreSQL)
- ClickUp / Asana (ใช้ STATE.md แทน)
- styled-components / emotion (ใช้ Tailwind)

---

## 3. กฎการเขียนโค้ด (Coding Rules)

### TypeScript
- `strict: true` เสมอ
- ห้ามใช้ `any` ยกเว้นมีคอมเมนต์อธิบายว่าทำไม
- ใช้ `type` กับ object shapes, ใช้ `interface` กับ class contracts
- Export type จาก Prisma ใช้ผ่าน `import type { User } from "@prisma/client"`

### Next.js (15.5)
- ใช้ **App Router** เท่านั้น (`app/` ไม่ใช่ `pages/`)
- Server Component เป็น default ใส่ `"use client"` เฉพาะที่จำเป็น
- **Server Actions = default pattern** สำหรับ mutation จาก UI ภายใน (form submit, button onClick ใน Client Component) — `'use server'` directive
- **Route Handlers** (`app/api/.../route.ts`) ใช้เฉพาะ external client (mobile app, webhook, third-party API caller)
- ⚠️ **Next 15 breaking change:** `params` ใน page/layout/route handler เป็น `Promise<{...}>` — ต้อง `await params` เสมอ ตัวอย่าง:
  ```ts
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
  }
  ```
- ⚠️ **Next 15 breaking change:** Route Handler GET **ไม่ cache by default** — ถ้าต้อง cache ใส่ `export const dynamic = 'force-static'` ให้ชัด
- ติดตั้ง package `server-only` แล้ว `import 'server-only'` ในไฟล์ที่มี secret/DB query เพื่อกัน accidental import จาก Client Component

### Database (Prisma)
- ทุก model ต้องมี `id`, `createdAt`, `updatedAt`
- ใช้ `cuid()` สำหรับ primary key (ไม่ใช่ UUID หรือ auto-increment)
- ความสัมพันธ์ต้องชัดเจน ใช้ `onDelete: Cascade` อย่างระมัดระวัง
- Index ทุก field ที่ใช้ค้นหาบ่อย (เช่น `studentId`, `email`)

### Security (สำคัญมาก)
- **ห้าม** commit `.env*` ขึ้น Git เด็ดขาด
- **ห้าม** hardcode secrets ในโค้ด
- ทุก API route / Server Action / Server Component ที่ต้อง auth ต้องเช็ค session ก่อนเสมอ
- Validate input ทุกครั้งด้วย **Zod**
- Sanitize ข้อมูลก่อนแสดงผล (Next.js ทำให้ default แต่ต้องระวัง `dangerouslySetInnerHTML`)

#### 3-Layer Auth Defense

| Layer | ที่ | หน้าที่ | เชื่อถือได้แค่ไหน |
|---|---|---|---|
| 1. Optimistic | `src/middleware.ts` | redirect ถ้าไม่มี cookie session | **ต่ำ** — แค่ UX, ห้ามเชื่อ |
| 2. Session callback | `lib/auth.ts` (NextAuth `signIn`) | reject ถ้า email ≠ `@dome.tu.ac.th` | กลาง |
| 3. Authoritative | Server Action / Route Handler / Server Component | `await auth()` + DB query ด้วย `userId` จาก session | **สูง — ของจริง** |

**กฎเหล็ก:** Server Action ถูกเรียกผ่าน HTTP POST ตรงๆ ได้เสมอ ไม่ว่า form จะอยู่หลัง login UI หรือไม่ก็ตาม **attacker ส่ง POST ตรงได้** ทุก Server Action ต้องขึ้นต้นด้วย:

```ts
'use server'
import { auth } from '@/lib/auth'

export async function createCourse(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  // ...
}
```

#### Security Checklist 8 ช่องโหว่ (ต้องอุดที่ Layer 3 ทุกข้อ)

| # | ช่องโหว่ | วิธีกัน |
|---|---|---|
| 1 | Replay attack (ใช้ token ซ้ำ) | Token one-time + unique constraint `(sessionId, studentId)` ใน Attendance |
| 2 | QR screenshot ส่งต่อ | Dynamic QR refresh ทุก 30s + token `expiresAt` ใน DB |
| 3 | Login bypass | middleware ครอบทุก route ยกเว้น `/login`, `/api/auth/*` |
| 4 | Email อื่นเข้าได้ | Validate `@dome.tu.ac.th` ใน `signIn callback` + DB constraint |
| 5 | CSRF บน mutation | NextAuth จัดการ + เช็ค `Origin` header ใน sensitive Route Handlers |
| 6 | เช็คอินวิชาที่ไม่ได้ลง | JOIN `Enrollment` ก่อนเขียน `Attendance` |
| 7 | Time skew (client เปลี่ยนเวลา) | เช็คเวลาที่ server เท่านั้น อย่าเชื่อ client timestamp |
| 8 | Race condition (กดเร็วๆ) | DB unique constraint + `prisma.attendance.upsert` |

### Naming Convention
- Files: `kebab-case.ts` (เช่น `qr-generator.ts`)
- Components: `PascalCase.tsx` (เช่น `QrScanner.tsx`)
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- DB tables (Prisma model): `PascalCase` singular (เช่น `User`, `Course`)

---

## 4. โครงสร้างโฟลเดอร์มาตรฐาน

```
qroll/
├── INSTRUCTIONS.md           ← ไฟล์นี้ (กฎเหล็ก)
├── STATE.md                  ← สถานะ + handoff ระหว่าง AI session
├── README.md                 ← สำหรับคนทั่วไป/อาจารย์
├── .env.example              ← ตัวอย่าง env vars (commit ได้)
├── .env.local                ← ของจริง (gitignored)
├── docs/
│   └── prps/                 ← Plan-Research-Pattern เชิงลึก
│       ├── 01-database-schema.md
│       ├── 02-auth-tu-api.md
│       ├── 03-dynamic-qr.md
│       ├── 04-checkin-flow.md
│       └── 05-teacher-dashboard.md
├── prisma/
│   └── schema.prisma
├── public/
├── src/
│   ├── middleware.ts         ← Auth gate (optimistic redirect — ห้ามใช้เป็น auth solution หลัก)
│   ├── app/                  ← App Router
│   │   ├── (auth)/           ← Login pages
│   │   ├── (teacher)/        ← Teacher routes
│   │   ├── (student)/        ← Student routes
│   │   └── api/              ← Route Handlers (เฉพาะ external client)
│   ├── components/
│   │   ├── ui/               ← Reusable primitives
│   │   └── features/         ← Feature-specific
│   ├── lib/
│   │   ├── auth.ts           ← NextAuth config + export `auth()` helper
│   │   ├── db.ts             ← Prisma client singleton (กัน hot-reload connection leak)
│   │   ├── actions/          ← Server Actions ('use server' ทุกไฟล์)
│   │   │   ├── course-actions.ts
│   │   │   ├── session-actions.ts
│   │   │   └── checkin-actions.ts
│   │   ├── validations/      ← Zod schemas (reuse client+server)
│   │   └── qr/               ← gen + verify QR token logic
│   ├── hooks/                ← Custom React hooks
│   └── types/                ← Shared TS types
└── tests/                    ← (Phase ภายหลัง)
```

---

## 5. Database Schema (เบื้องต้น — ดู PRP 01 สำหรับรายละเอียด)

หลัก ๆ จะมี 5 tables:

1. **User** — อาจารย์ + นักศึกษา (มี `role: "TEACHER" | "STUDENT"`)
2. **Course** — รายวิชาที่อาจารย์สร้าง
3. **Enrollment** — เชื่อม Student กับ Course (M:N)
4. **Session** — คาบเรียนแต่ละครั้ง (มี QR code ที่ active)
5. **Attendance** — บันทึกการเข้าเรียนต่อ session ต่อ student

> รายละเอียด field ทั้งหมดดูใน `docs/prps/01-database-schema.md`

---

## 6. Workflow การพัฒนา

### ก่อนเริ่มทำงานใน session ใหม่:
1. อ่าน `INSTRUCTIONS.md` (ไฟล์นี้)
2. อ่าน `STATE.md` เพื่อรู้ว่าทำถึงไหนแล้ว
3. ถ้ากำลังทำ feature ใด ให้อ่าน PRP ของ feature นั้นใน `docs/prps/`

### หลังทำงานเสร็จแต่ละ session:
1. อัปเดต `STATE.md` ว่าทำอะไรไปแล้ว มีอะไรค้าง
2. ถ้ามีการตัดสินใจสำคัญ บันทึกใน Decision Log ของ STATE.md
3. ถ้าเจอ blocker ระบุไว้ชัด ๆ

### กฎเหล็กในการพัฒนา
- ❌ ห้ามเพิ่ม feature ที่ไม่ได้อยู่ใน scope
- ❌ ห้ามเปลี่ยน tech stack โดยไม่บันทึก Decision Log
- ❌ ห้าม install package โดยไม่อัปเดต `package.json` และแจ้งทีม
- ✅ ถ้าไม่แน่ใจ ให้ถามก่อน
- ✅ ถ้าพบบั๊กในส่วนอื่น ให้บันทึกไว้ก่อน อย่าแก้โดยไม่ได้วางแผน

---

## 7. Git Workflow

- Branch หลัก: `main` (deploy อัตโนมัติ)
- Branch พัฒนา: `dev` หรือ `feature/<ชื่อ>`
- Commit message: ใช้ Conventional Commits
  - `feat:` ฟีเจอร์ใหม่
  - `fix:` แก้บั๊ก
  - `chore:` งานเก็บกวาด
  - `docs:` เอกสาร
  - `refactor:` ปรับโครงสร้างไม่เปลี่ยน behavior

ตัวอย่าง: `feat(auth): add TU API integration via NextAuth`

---

## 8. Milestones ของโปรเจกต์

> **หมายเหตุ:** Milestone A/B/C ที่นี่ = feature checklist รวม ดู [STATE.md](STATE.md) สำหรับ Milestone breakdown ละเอียดที่ใช้ track งานจริง (M0–M8)

### Milestone A — Core MVP (ต้องเสร็จก่อน)
- [ ] Setup Next.js + TypeScript + Tailwind
- [ ] Setup Prisma + Supabase
- [ ] Database schema + migration
- [ ] Auth via TU API
- [ ] Teacher: สร้างวิชา, import นักศึกษา (CSV)
- [ ] Teacher: สร้าง session + Dynamic QR (refresh ทุก 30s)
- [ ] Student: สแกน QR → login → บันทึก attendance
- [ ] Teacher Dashboard: ดูสรุปการเข้าเรียน

### Milestone B — Smart Features (ภายหลัง)
- [ ] Geofencing (Haversine formula, 50–100m)
- [ ] Manual attendance edit
- [ ] Export reports (CSV/PDF)

### Milestone C — Advanced (ถ้ามีเวลา)
- [ ] Face Scan ด้วย face-api.js
- [ ] Notification ส่งอีเมลแจ้งเตือน
- [ ] Mobile-optimized UI

---

## 9. คำสั่งที่ใช้บ่อย

```bash
# Dev
npm run dev

# Database
npx prisma migrate dev --name <ชื่อ>
npx prisma studio
npx prisma generate

# Build
npm run build
npm run start

# Lint & Format
npm run lint
npm run format
```

---

**Version:** 1.1
**Last updated:** 2026-04-27
**Changelog:**
- v1.1 — ระบุ Next.js 15.5 (downgrade จาก 16) + React 19 + Tailwind v4, เพิ่ม 3-Layer Auth Defense + Security Checklist 8 ช่องโหว่, ปรับ folder structure (เพิ่ม `middleware.ts`, `lib/auth.ts`, `lib/db.ts`, `lib/actions/`, `lib/validations/`, `lib/qr/`)
