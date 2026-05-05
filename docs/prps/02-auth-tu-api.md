# PRP 02 — Auth via TU API + NextAuth v5

> **Implementation update (Phase 4.6 / PRP 06):** auth flow ปัจจุบันยังยึด TU API + NextAuth v5 ตาม PRP นี้ แต่มี decision ที่ปรับแล้วเพื่อให้ตรงกับ TU response จริง:
>
> - ผู้ใช้ login ด้วย TU `username/password`; email ไม่ใช่ username สำหรับ TU login
> - Role ใช้ TU API `type` เป็น source of truth (`student` → `STUDENT`, `employee` → `TEACHER`)
> - Email ใช้เป็นข้อมูลประกอบหลัง auth สำเร็จและตรวจ domain เป็น sanity check / defense-in-depth ไม่ได้ใช้แยก role
> - Name priority ใช้ `displayname_th` ก่อน `displayname_en` เพื่อให้ UI ภาษาไทยตรงกับข้อมูล TU
> - First login ของนักศึกษาจะหา user ด้วย email ก่อน แล้ว fallback ไปหา `studentId` เพื่อ link กับ pre-imported roster ที่ `email = null`
> - BYPASS dev mode ยังใช้ seed email เพื่อความสะดวกในการทดสอบ local เท่านั้น ไม่ใช่พฤติกรรม production

> **PRP = Plan-Research-Pattern** — เอกสารก่อน implement สำหรับ Phase 2
> เป้าหมายคือทำ auth ให้ใช้งานได้จริง แต่ยังอธิบาย decision ได้ว่าไม่ได้ทำแบบสุ่มหรือ copy boilerplate มาเฉย ๆ

**Status:** Ready to implement  
**Owner:** Phase 2  
**Prerequisites:** [PRP 00 — Security Model](00-security-model.md), [PRP 01 — Database Schema](01-database-schema.md)

---

## 1. Goal & Non-goals

### Goal

เพิ่ม authentication layer ให้ Qroll โดยใช้ TU REST API เป็นแหล่งยืนยันตัวตนหลัก และใช้ NextAuth v5 จัดการ session ใน Next.js App Router

ผลลัพธ์ที่ต้องได้:

- นักศึกษาและอาจารย์ login ด้วยบัญชี TU/Dome AD
- session มี `id`, `role`, `studentId`
- dev mode ใช้ `BYPASS_TU_AUTH=true` เพื่อ login seed user โดยไม่ยิง TU API
- middleware redirect ผู้ใช้ที่ยังไม่ login ไป `/login`
- Server Action/Server Component ใช้ helper เช่น `requireAuth()` ซ้ำเสมอ

### Non-goals

- ยังไม่ทำ dashboard จริงของ `/teacher` หรือ `/student`
- ยังไม่ทำ `requireCourseOwner()` และ `requireEnrolledStudent()` จนกว่าจะมี course/check-in actions ใน Phase 3/5
- ยังไม่ทำ rate limit login attempts
- ยังไม่ใช้ TU auth log API เพราะไม่จำเป็นต่อ login flow ของ MVP

---

## 2. TU API Contract

อ้างอิงจากเอกสาร TU APIs Developer: Getting Authentication

### Request

```http
POST https://restapi.tu.ac.th/api/v1/auth/Ad/verify
Content-Type: application/json
Application-Key: <TU_API_KEY>
```

```json
{
  "UserName": "username",
  "PassWord": "password"
}
```

จุดสำคัญ:

- ชื่อ field ต้องใช้ casing ตามเอกสารจริง: `UserName`, `PassWord`
- `Application-Key` เป็น secret server-side เท่านั้น ห้ามใช้ `NEXT_PUBLIC_*`
- ใช้ env `TU_API_URL` เพื่อให้ override endpoint ได้ถ้า TU เปลี่ยน path ภายหลัง

### Student response

Field ที่ใช้:

- `status: boolean`
- `message: string`
- `type: "student"`
- `username: string` — ใช้เป็น `studentId`
- `tu_status: string`
- `email: string`
- `displayname_en?: string`
- `displayname_th?: string`

ระบบรับเฉพาะ student ที่:

- `status === true`
- `type === "student"`
- `tu_status === "ปกติ"` เมื่อ field นี้มีอยู่
- email ลงท้าย `@dome.tu.ac.th`

### Employee response

Field ที่ใช้:

- `status: boolean`
- `message: string`
- `type: "employee"`
- `username: string`
- `email: string`
- `displayname_en?: string`
- `displayname_th?: string`
- `StatusWork?: string`
- `StatusEmp?: string`

ระบบรับ employee ที่:

- `status === true`
- `type === "employee"`
- email ลงท้าย `@tu.ac.th`

`StatusWork` และ `StatusEmp` เก็บไว้เป็น context จาก TU API แต่ Phase 2 ยังไม่เพิ่ม field ใน database เพราะยังไม่มี requirement ให้ audit สถานะพนักงาน

---

## 3. NextAuth v5 Architecture

### เลือก JWT session strategy

ใช้:

```ts
session: { strategy: "jwt" }
```

เหตุผล:

- middleware อ่าน session ผ่าน `auth()` ได้ตรงและเร็ว
- Phase 2 ต้องการแค่ identity claims (`id`, `role`, `studentId`) ไม่ต้องเก็บ session row
- schema มี NextAuth adapter tables เผื่ออนาคตอยู่แล้ว แต่ยังไม่จำเป็นต้องใช้

### ทำไมไม่ใช้ PrismaAdapter ตอนนี้

ไม่ wire PrismaAdapter ใน Phase 2 เพราะ:

- Credentials provider + JWT เพียงพอสำหรับ MVP auth
- adapter session database strategy ทำให้มี moving parts เพิ่มโดยยังไม่มีประโยชน์ชัดเจน
- ลดความเสี่ยงสับสนระหว่าง NextAuth `Session` table กับ Qroll `ClassSession`

### User source of truth

- TU API เป็น source of truth สำหรับการพิสูจน์ตัวตน
- TU API `type` เป็น source of truth สำหรับ role (`student` / `employee`)
- Qroll `User` table เก็บ local user state เช่น enrollment relation, persisted role, email, name, studentId
- เมื่อ login จริงให้หา user ด้วย email ก่อน แล้ว fallback ด้วย `studentId` สำหรับ student ที่ pre-import จาก roster (`email = null`)
- ถ้าสร้าง user ใหม่ ให้ derive role จาก TU API `type`
- ถ้า user มีอยู่แล้ว ไม่ใช้ email domain เพื่อเปลี่ยน role; email domain เป็น sanity check เท่านั้น

---

## 4. BYPASS_TU_AUTH Dev Mode

เมื่อ `BYPASS_TU_AUTH=true`:

- `authorize()` จะข้าม TU API
- lookup `User` ด้วย `email = username`
- password ถูก ignore
- ใช้ seed users จาก Phase 1:
  - `teacher@tu.ac.th`
  - `test.student@dome.tu.ac.th`

เหตุผล:

- ลดการใช้ quota TU API ระหว่าง dev
- ทำให้ build/demo auth layer ได้แม้ยังไม่มี key จริง
- ยังทดสอบ JWT/session/middleware/role mapping ได้ครบ

ข้อจำกัด:

- ใช้เฉพาะ local/dev เท่านั้น
- production ต้องตั้ง `BYPASS_TU_AUTH=false`

---

## 5. Role Mapping

| TU API `type` | Qroll `Role` | `studentId` |
| --- | --- | --- |
| `student` | `STUDENT` | `username` จาก TU API |
| `employee` | `TEACHER` | `null` |

Name priority:

1. `displayname_th`
2. `displayname_en`
3. `email`

Email domain whitelist:

- student: `@dome.tu.ac.th`
- employee/teacher: `@tu.ac.th`

---

## 6. 3-Layer Auth Defense

อ้างอิง [PRP 00 §3](00-security-model.md)

### Layer 1 — Middleware

`src/middleware.ts` ใช้ `auth()` เพื่อ redirect UX:

- ไม่มี session → `/login?from=<path>`
- public paths: `/`, `/login`, `/api/auth/*`, static assets

ข้อสำคัญ: middleware ไม่ใช่ security source of truth เพราะ attacker ยิง Server Action ตรงได้

### Layer 2 — signIn Callback

`callbacks.signIn` ตรวจ email domain ซ้ำ:

- `@dome.tu.ac.th`
- `@tu.ac.th`

ทำเพื่อลดโอกาส provider bug หรือ mapping bug หลุดเข้าระบบ

### Layer 3 — Server Helpers

`src/lib/auth-helpers.ts` มี:

- `requireAuth()`
- `requireTeacher()`
- `requireStudent()`
- `AuthError`

ทุก Server Action ที่แตะข้อมูลจริงต้องเรียก helper เหล่านี้ซ้ำ

---

## 7. Login UI Contract

ใช้ดีไซน์จาก `D:\load\QRoll UI\Login Page.html` เป็น baseline:

- left brand rail
- topbar
- centered login card
- QRoll red accent `#990000`
- password visibility toggle
- loading state
- generic error
- dev-mode banner

ตัดออกจาก prototype:

- React/Babel CDN
- tweak panel
- fake login timeout
- fake success screen
- TU SSO button เพราะ flow จริงคือ Credentials provider ผ่าน TU API
- forgot password link ถ้ายังไม่มีปลายทางจริง

---

## 8. Anti-patterns

ห้ามทำ:

1. ใส่ `TU_API_KEY` ใน `NEXT_PUBLIC_*`
2. log password หรือ TU response เต็ม
3. ใช้ middleware เป็น security หลัก
4. แยก error เช่น "user not found" กับ "wrong password"
5. ใช้ PrismaAdapter ปนกับ JWT session โดยไม่มีเหตุผล
6. update `User.role` ตอน user login ซ้ำ
7. ใช้ `findUnique → create` แทน `upsert` ใน real TU first-login path
8. ลืม `import "server-only"` ใน auth files
9. commit `.env.local`
10. เพิ่ม helper ownership/enrollment ก่อนมี feature ใช้จริง

---

## 9. Verification

### BYPASS mode

1. ตั้ง `.env.local`: `BYPASS_TU_AUTH=true`
2. เข้า `/teacher` ตอน logout → redirect ไป `/login?from=/teacher`
3. login `teacher@tu.ac.th` ด้วย password อะไรก็ได้ → session role `TEACHER`, `studentId: null`
4. login `test.student@dome.tu.ac.th` → session role `STUDENT`, `studentId: "0000000001"`
5. login non-TU email → reject ด้วย generic error

### Real TU mode

1. ตั้ง `BYPASS_TU_AUTH=false`
2. ใส่ `TU_API_KEY`
3. login ด้วยบัญชี TU จริง
4. ตรวจว่า browser network ไม่เห็น `Application-Key`
5. ตรวจว่า `User` ถูก create/update โดยไม่เปลี่ยน role เดิม

### Build

```bash
npm run build
```

---

## 10. Decision Log Candidates

เพิ่มใน `STATE.md` หลัง implement:

- JWT session strategy ไม่ใช้ PrismaAdapter เพราะ middleware อ่าน claims ได้ตรงและลด moving parts
- `authorize()` upsert ไม่ update role เพื่อกัน privilege drift
- Phase 2 helper scope จำกัดที่ auth/role; ownership/enrollment ค่อยเพิ่มตอนมี feature ใช้จริง
