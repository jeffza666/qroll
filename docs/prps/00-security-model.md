# PRP 00 — Security Model

> **PRP = Plan-Research-Pattern** — เอกสาร security เชิงลึกของโปรเจกต์ Qroll
> เป็น **single source of truth** เรื่อง security — PRP อื่น ๆ ทุกตัวต้องอ้างอิงไฟล์นี้แทนการเขียน security pattern ใหม่เอง

**Status:** Ready to use as reference
**Owner:** ครอบทุก Phase (โดยเฉพาะ Phase 2 Auth, Phase 4 Dynamic QR, Phase 5 Check-in)
**Prerequisites:** [INSTRUCTIONS.md §3 Security](../../INSTRUCTIONS.md) (ตารางสรุป) + [PRP 01 §1](01-database-schema.md) (schema constraint)

---

## 1. Context & Scope

ระบบ Qroll = ระบบเช็คอินมี **incentive โกงสูงมาก** (นักศึกษามีแรงจูงใจหลีกเลี่ยงการเข้าเรียน) → security ต้องอยู่ทุก layer ไม่ใช่แค่ login page

### สิ่งที่ PRP นี้ครอบคลุม

- Threat model: ใครจะโจมตี โจมตีอะไร โจมตียังไง
- Auth defense pattern: ขยายจาก [INSTRUCTIONS.md §3.3-Layer Auth](../../INSTRUCTIONS.md) แบบมีโค้ดตัวอย่าง
- Security checklist 8 ข้อ: เจาะลึกแต่ละข้อพร้อม attack scenario + control + verify steps
- Token / QR security policy
- CSRF, secret management, logging

### สิ่งที่ PRP นี้ไม่ครอบคลุม

- Performance / scalability (ไม่ใช่ scope MVP)
- Network-level DDoS (Vercel จัดการ)
- Physical security (out of scope)

---

## 2. Threat Model

### 2.1 Actors (ใครคือคนร้าย)

| Actor                | Capability                                                 | Motivation                       | ระดับความเสี่ยง |
| -------------------- | ---------------------------------------------------------- | -------------------------------- | --------------- |
| **Student-cheater**  | login ได้ปกติ, เปิด DevTools เป็น, เขียน script เป็นบางคน  | เข้าเรียนแทนเพื่อน / โดดแต่ติ๊ก  | **สูง** (หลัก)  |
| **External attacker**| ไม่มี TU account                                           | ทดลองเจาะ / เก็บข้อมูล           | กลาง            |
| **Teacher-misuse**   | login เป็น TEACHER, มี course ของตัวเอง                    | แก้ attendance ของวิชาคนอื่น     | ต่ำ-กลาง        |
| **Insider (dev)**    | เข้าถึง DB หรือ env vars                                   | (out of scope MVP — trust model) | —               |

### 2.2 Assets ที่ต้องปกป้อง

1. **Attendance record** — integrity สำคัญที่สุด (แก้ไม่ได้, สร้างปลอมไม่ได้)
2. **TU API credentials** — ถ้า leak = ทุกคนปลอม login ได้
3. **Session tokens** (NextAuth) — ถ้า leak = แอบใช้ account คนอื่น
4. **QR token** (dynamic, 30s) — ถ้า leak/replay = check-in โดยไม่อยู่ในห้อง
5. **Personal data** — email, studentId (PDPA scope)

### 2.3 Trust Boundaries

```
[Student Browser] ── HTTPS ──> [Next.js Server] ── ──> [Postgres]
       ↑ ห้ามเชื่อ                   ↑ trusted                ↑ trusted
                                      └── ──> [TU API] (external)
```

**กฎ:** อะไรที่มาจาก browser = ไม่เชื่อจนกว่าจะ validate ที่ server. Server timestamp, server-generated ID, server-side auth check เป็น "ของจริง"

---

## 3. 3-Layer Auth Defense (รายละเอียด)

ขยายจากตารางใน [INSTRUCTIONS.md §3](../../INSTRUCTIONS.md)

### Layer 1 — Optimistic Middleware

**ที่อยู่:** `src/middleware.ts`
**หน้าที่:** redirect ไป `/login` ถ้าไม่มี session cookie — เป็นแค่ UX ไม่ใช่ security
**ห้าม:** เชื่อ middleware ว่ากันเข้าได้จริง — ทุก protected resource ต้อง check ซ้ำที่ Layer 3

```ts
// src/middleware.ts (blueprint)
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublic = ["/login", "/api/auth"].some((p) =>
    req.nextUrl.pathname.startsWith(p)
  );
  if (!isLoggedIn && !isPublic) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
```

**ทำไมเชื่อไม่ได้:** middleware เช็ค cookie ที่ "มีอยู่" ไม่ได้เช็คว่าเจ้าของ cookie ลงทะเบียนวิชานี้หรือเป็น TEACHER จริง — attacker login ด้วย account ตัวเอง (มี cookie ถูกต้อง) แต่ยิง POST ไปที่ Server Action ที่ไม่ใช่ของตัวเอง → middleware ปล่อยผ่าน

### Layer 2 — signIn Callback (Domain whitelist)

**ที่อยู่:** `src/lib/auth.ts` ใน NextAuth `callbacks.signIn`
**หน้าที่:** reject login ถ้า email ไม่อยู่ใน whitelist domain

```ts
// src/lib/auth.ts (blueprint)
const ALLOWED_DOMAINS = ["dome.tu.ac.th", "tu.ac.th"]; // student + teacher

callbacks: {
  async signIn({ user }) {
    const email = user.email?.toLowerCase().trim();
    if (!email) return false;
    const domain = email.split("@")[1];
    return ALLOWED_DOMAINS.includes(domain);
  }
}
```

**Edge cases ที่ต้องระวัง:**
- Email case-insensitive: `Foo@Dome.TU.ac.th` → lowercase ก่อนเทียบ
- Subdomain: `xxx.dome.tu.ac.th` ≠ `dome.tu.ac.th` (split `@` แล้วเทียบ exact)
- Plus alias: `foo+bar@dome.tu.ac.th` → ผ่าน (ไม่ block — TU เป็นคนคุม domain)
- Trailing whitespace / unicode lookalikes — `.trim()` แล้ว normalize

### Layer 3 — Authoritative Check (Server Action / Route Handler)

**ที่อยู่:** ทุกไฟล์ใน `src/lib/actions/*.ts` + Server Components ที่อ่านข้อมูล sensitive
**หน้าที่:** เช็ค session **ทุกครั้ง** + เช็ค ownership / enrollment **ทุกครั้ง**

#### Helper functions (เขียนครั้งเดียว ใช้ทุก action)

สร้างไว้ที่ `src/lib/auth-helpers.ts`:

```ts
// src/lib/auth-helpers.ts (blueprint)
import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user; // { id, email, role }
}

export async function requireTeacher() {
  const user = await requireAuth();
  if (user.role !== "TEACHER") throw new Error("FORBIDDEN");
  return user;
}

export async function requireCourseOwner(courseId: string) {
  const user = await requireTeacher();
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });
  if (!course || course.teacherId !== user.id) throw new Error("FORBIDDEN");
  return user;
}

export async function requireEnrolledStudent(courseId: string) {
  const user = await requireAuth();
  if (user.role !== "STUDENT") throw new Error("FORBIDDEN");
  const enrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId } },
  });
  if (!enrollment) throw new Error("NOT_ENROLLED");
  return user;
}
```

**ทุก Server Action ต้องเริ่มด้วย helper เหล่านี้ — ไม่มีข้อยกเว้น**

```ts
"use server";
import { requireCourseOwner } from "@/lib/auth-helpers";
import { z } from "zod";

const Schema = z.object({ courseId: z.string().cuid(), title: z.string().min(1) });

export async function createClassSession(input: unknown) {
  const { courseId, title } = Schema.parse(input);
  const teacher = await requireCourseOwner(courseId); // auth + ownership
  // ...
}
```

---

## 4. Security Checklist 8 ช่องโหว่ (เจาะลึก)

อ้างอิงจาก [INSTRUCTIONS.md §3.Security Checklist](../../INSTRUCTIONS.md)

### #1 — Replay attack (ใช้ token ซ้ำ)

**Scenario:** นักศึกษา A check-in สำเร็จได้ token ใน response → copy token → นักศึกษา B ใช้ token เดียวกันยิง POST อีกรอบ
**Control:**
- Token เดี่ยว ใช้ครั้งเดียว: เก็บ `usedAt` ใน table `QrToken` หรือเก็บ token hash ใน `Attendance.tokenHash` พร้อม unique constraint
- Unique constraint `@@unique([sessionId, studentId])` ใน `Attendance` (PRP 01) → student เดียวกัน check-in ซ้ำใน session เดียวกันไม่ได้ (DB คุม)
**ไฟล์:** `prisma/schema.prisma` (constraint), `src/lib/qr/verify.ts` (lookup + reject ถ้า used)
**Verify:**
```bash
# ส่ง token เดียวกัน 2 ครั้ง — ครั้งที่ 2 ต้อง 409
curl -X POST .../api/checkin -d '{"token":"X"}'
curl -X POST .../api/checkin -d '{"token":"X"}'   # expect: error
```

### #2 — QR screenshot ส่งต่อ

**Scenario:** นักศึกษาในห้อง screenshot QR ส่ง LINE ให้เพื่อนนอกห้อง check-in
**Control:**
- Dynamic QR refresh ทุก **30 วินาที** (server-driven — client poll หรือใช้ WebSocket/SSE)
- Token `expiresAt = now() + 30s` ใน DB → verify path ต้อง `expiresAt > now()`
- (Phase B) Geofencing เสริม
**ไฟล์:** `src/lib/qr/generate.ts`, `src/lib/qr/verify.ts`, PRP 03
**Verify:** สร้าง token แล้วรอ > 30s ลอง check-in → ต้อง reject

### #3 — Login bypass

**Scenario:** เรียก `/teacher/dashboard` หรือ `POST /api/...` ตรง ๆ โดยไม่ login
**Control:**
- Layer 1 middleware redirect (UX)
- Layer 3 `requireAuth()` ใน Server Component / Server Action / Route Handler **เด็ดขาด**
- middleware matcher ครอบทุก path ยกเว้น `/login`, `/api/auth/*`, static
**ไฟล์:** `src/middleware.ts`, `src/lib/auth-helpers.ts`
**Verify:** logout แล้ว `curl -X POST .../actions/createCourse` ต้องได้ UNAUTHORIZED

### #4 — Email อื่นเข้าได้ (domain bypass)

**Scenario:** Google OAuth ให้คนอื่นนอก TU login ได้
**Control:**
- ใช้ TU API custom provider (ไม่ใช่ Google OAuth) → email มาจาก TU เท่านั้น (ดู PRP 02)
- signIn callback double-check `@dome.tu.ac.th` หรือ `@tu.ac.th` (Layer 2 ข้างบน)
- DB constraint: ไม่มี constraint ระดับ DB กำหนด domain (Postgres CHECK constraint optional) — พึ่ง app layer
**ไฟล์:** `src/lib/auth.ts`
**Verify:** mock signIn ด้วย email `evil@gmail.com` → callback return false

### #5 — CSRF บน mutation

**Scenario:** Attacker host หน้าเว็บที่มี `<form action="https://qroll.app/api/...">` — เหยื่อกดเข้า → POST ส่งจาก browser พร้อม cookie
**Control:**
- **Server Actions** — Next.js 15 ใส่ encrypted action ID + Origin check ให้อัตโนมัติ (ไม่ต้องเขียนเพิ่ม)
- **Route Handlers** (`/api/*`) — ตรวจ `Origin` header ด้วยมือสำหรับ POST/PUT/DELETE
- NextAuth จัดการ CSRF บน auth flow ของตัวเอง
**ไฟล์:** `src/app/api/*/route.ts` ทุกไฟล์ที่รับ POST
**Verify:** ส่ง POST จาก origin อื่น (`curl -H "Origin: https://evil.com"`) → reject 403

### #6 — เช็คอินวิชาที่ไม่ได้ลง

**Scenario:** นักศึกษา A ลงวิชา CS101 → ขโมย QR token ของวิชา MA102 (ที่ไม่ได้ลง) → check-in
**Control:**
- `requireEnrolledStudent(courseId)` helper (Layer 3) — JOIN `Enrollment` ก่อนเขียน `Attendance`
- Foreign key chain: `Attendance.classSessionId → ClassSession.courseId` → ตรวจว่า student มีใน `Enrollment(studentId, courseId)`
**ไฟล์:** `src/lib/actions/checkin-actions.ts`
**Verify:** seed student ที่ลงเฉพาะ CS101 → call `checkIn(MA102_session_id)` → NOT_ENROLLED

### #7 — Time skew (client เปลี่ยนเวลา)

**Scenario:** นักศึกษาเปลี่ยนเวลาเครื่องตัวเองเป็นช่วงคาบเรียน แล้ว check-in หลังคาบ
**Control:**
- เช็คเวลาที่ **server เท่านั้น** — `new Date()` ใน Server Action / DB `now()`
- ห้าม trust `clientTimestamp` ใด ๆ ที่ส่งมาจาก browser
- `Attendance.checkedAt = DateTime @default(now())` (DB clock)
**ไฟล์:** ทุก action ที่เกี่ยวกับ time
**Verify:** ส่ง `clientTime: "2020-01-01"` ใน request body → server ต้อง ignore

### #8 — Race condition (กดเร็ว ๆ / ส่งคู่ขนาน)

**Scenario:** นักศึกษากดปุ่ม check-in 5 ครั้งติดกัน (หรือ script ยิง 100 requests พร้อมกัน) → สร้าง Attendance ซ้ำ
**Control:**
- DB unique constraint `@@unique([sessionId, studentId])` ใน `Attendance` — ครั้งที่ 2+ จะ error ที่ DB level
- ใช้ `prisma.attendance.upsert` หรือ `create` แล้ว catch `P2002` (unique violation) เป็น "already checked-in"
- หลีกเลี่ยง `findUnique → create` pattern (TOCTOU race window)
**ไฟล์:** `src/lib/actions/checkin-actions.ts`
**Verify:** ยิง 10 requests พร้อมกันด้วย `xargs -P 10` → ต้องมี attendance row เดียว

---

## 5. Token & QR Security

### 5.1 รูปแบบ Token

**ตัดสินใจ:** ใช้ **random nonce + DB lookup** (ไม่ใช่ JWT signed)

| Approach            | ข้อดี                          | ข้อเสีย                                             | เลือก? |
| ------------------- | ------------------------------ | --------------------------------------------------- | ------ |
| JWT signed          | stateless, ไม่ต้อง DB hit      | revoke ยาก, replay ยังกันเองไม่ได้ ต้อง state เพิ่ม | ❌     |
| Random nonce + DB   | revoke ง่าย, audit ได้, simple | DB hit ทุก verify                                   | ✅     |

**Reason:** เราต้อง track `usedAt`, `expiresAt` ต่อ token อยู่แล้ว → state-ful ไม่หลีกเลี่ยง → JWT ไม่ได้ประโยชน์

### 5.2 Token format

```
Token = base64url(crypto.randomBytes(32))   // 256-bit entropy
DB row: QrToken { id, classSessionId, token, expiresAt, usedAt? }
```

- เก็บ token plaintext ใน DB ได้ (ไม่ใช่ password) — แต่ถ้า paranoid ใช้ `sha256(token)` เป็น index
- `expiresAt = createdAt + 30s`
- ระดับ `classSessionId` ผูก token กับคาบเรียนแน่นอน (กัน token ของวิชา A ใช้กับวิชา B)

### 5.3 Refresh window 30s — ทำไม

- สั้นพอกันคนถ่ายรูปส่ง LINE (กว่าเพื่อนเปิดดู → expired)
- ยาวพอ network latency + scan ทำงานได้
- ตรงกับงานวิจัย attendance system ทั่วไป (15-60s range)

---

## 6. CSRF & Origin Policy

### 6.1 Server Actions

Next.js 15 จัดการ CSRF ให้: encrypted action ID, server-side Origin verification, single-use action ID — **ไม่ต้องเขียนเพิ่ม**

**ห้าม:** override `serverActions.allowedOrigins` ใน `next.config.ts` ถ้าไม่จำเป็น

### 6.2 Route Handlers

ที่ใช้ใน `src/app/api/*` (สำหรับ external clients เท่านั้นตาม INSTRUCTIONS) ต้อง check Origin เอง:

```ts
// src/lib/api-helpers.ts (blueprint)
const ALLOWED_ORIGINS = [process.env.NEXT_PUBLIC_APP_URL!];

export function requireValidOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    throw new Error("FORBIDDEN_ORIGIN");
  }
}
```

---

## 7. Secret Management

| Secret                  | ที่อยู่                | กฎ                                          |
| ----------------------- | ---------------------- | ------------------------------------------- |
| `DATABASE_URL`          | `.env.local` / Vercel  | gitignored, ไม่ log                         |
| `DIRECT_URL`            | `.env.local` / Vercel  | gitignored                                  |
| `NEXTAUTH_SECRET`       | `.env.local` / Vercel  | random 32+ bytes — `openssl rand -base64 32`|
| `TU_API_KEY` (or token) | `.env.local` / Vercel  | gitignored, ใช้ผ่าน Server-only เท่านั้น    |
| `NEXT_PUBLIC_*`         | `.env.local`           | **bundle ลง client** — ห้ามใส่ secret ที่นี่|

**Enforcement:**
- ทุกไฟล์ใน `src/lib/auth.ts`, `src/lib/db.ts`, `src/lib/qr/*`, `src/lib/actions/*` ต้อง `import "server-only"` ที่บรรทัดแรก
- ถ้า Client Component import file พวกนี้โดยบังเอิญ → build fail (กัน leak)

**Rotation policy (MVP):**
- `NEXTAUTH_SECRET`: rotate ตอน deploy แรก, หลังจากนั้นไม่ rotate (ยอมรับ risk ในระดับโปรเจกต์จบ)
- `TU_API_KEY`: ตามรอบที่ TU กำหนด

---

## 8. Logging & Audit Trail

### ✅ ต้อง log

- Login success/failure (email, timestamp, IP) — debug + audit
- Attendance create/update (who, when, sessionId, studentId)
- Failed auth check (FORBIDDEN, NOT_ENROLLED) — detect attack pattern
- Server errors (stack trace, request path)

### ❌ ห้าม log

- Password (ไม่มีอยู่แล้วเพราะใช้ TU SSO)
- TU API tokens / NextAuth session tokens / QR tokens
- Full request body ที่อาจมี PII

### Tooling

- MVP: `console.log` + Vercel Log Drains (ฟรี tier พอ)
- ห้ามใช้ third-party logger ที่ส่งข้อมูลออก (Sentry / Datadog) ก่อนถาม PDPA

---

## 9. Manual Verification Checklist

(ใช้แทน automated test ในเฟสนี้ — รันด้วยมือก่อน deploy production แต่ละครั้ง)

### Auth

- [ ] login ด้วย email `@dome.tu.ac.th` → ผ่าน
- [ ] login ด้วย email `@gmail.com` → ถูก reject ที่ signIn callback
- [ ] logout แล้วเข้า `/teacher/dashboard` → redirect `/login`
- [ ] logout แล้วยิง `curl -X POST .../api/...` → 401/UNAUTHORIZED

### Authorization

- [ ] Teacher A สร้างวิชา → Teacher B ลอง update วิชาของ A → FORBIDDEN
- [ ] Student ที่ไม่ได้ลงวิชา → check-in → NOT_ENROLLED
- [ ] Student check-in 2 ครั้งติดกัน → ครั้งที่ 2 ผ่าน (idempotent) แต่ row เดียว

### Token / QR

- [ ] รอ token expire (>30s) แล้ว check-in → expired
- [ ] copy token ที่ใช้แล้ว → reject (already used)
- [ ] ใช้ token ของ session A ไป check-in session B → mismatch

### Misc

- [ ] ส่ง POST จาก `Origin: https://evil.com` → 403
- [ ] กรอก `clientTimestamp` ปลอม → server ignore (ใช้ DB now())
- [ ] ดู Vercel build output → ไม่มี secret leak ใน client bundle (ค้น `grep -r "TU_API"` ใน `.next/static`)

> **TODO Phase หลัง:** เปลี่ยน checklist นี้เป็น Vitest + Playwright (ดู `00-testing-strategy.md` ที่จะสร้างตอน Phase 4 ขึ้นไป)

---

## 10. Cross-reference Matrix

ตารางว่า security control ไหน implement ที่ไหน — PRP อื่น ๆ อ้างกลับมาที่นี่

| Control                          | Implement ที่             | PRP/Phase ที่เขียนจริง |
| -------------------------------- | ------------------------- | ---------------------- |
| `@@unique([sessionId, studentId])` | `prisma/schema.prisma`    | PRP 01                 |
| `requireAuth()` helper           | `src/lib/auth-helpers.ts` | Phase 2 (PRP 02)       |
| signIn domain check              | `src/lib/auth.ts`         | Phase 2 (PRP 02)       |
| middleware redirect              | `src/middleware.ts`       | Phase 2 (PRP 02)       |
| QR token generation              | `src/lib/qr/generate.ts`  | Phase 4 (PRP 03)       |
| QR token verify (expire+used)    | `src/lib/qr/verify.ts`    | Phase 4 (PRP 03)       |
| `requireEnrolledStudent`         | `src/lib/auth-helpers.ts` | Phase 2 (PRP 02)       |
| Origin check (Route Handler)     | `src/lib/api-helpers.ts`  | ตามที่ใช้              |
| `import "server-only"`           | ทุกไฟล์ใน `src/lib/`      | ทุก Phase              |
| Server-side timestamp            | DB `@default(now())`      | PRP 01                 |

---

## 11. Open Decisions

- [ ] **Rate limiting** — ยังไม่มีในแผน MVP. ถ้าเจอ abuse จะเพิ่มผ่าน Vercel Edge Middleware หรือ Upstash. **Defer**
- [ ] **PDPA compliance** — ต้องมี consent หน้าก่อน login ครั้งแรกหรือไม่? ปรึกษาอาจารย์ที่ปรึกษา
- [ ] **Geofencing strictness** — radius 50m หรือ 100m? อิงผลทดสอบจริง (PRP 06 ภายหลัง)

---

**Version:** 1.0
**Created:** 2026-04-28
**Update trigger:** เมื่อเพิ่ม security control ใหม่ หรือพบ vulnerability ใหม่ในระบบ
