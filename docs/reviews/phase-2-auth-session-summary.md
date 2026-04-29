# Phase 2 Auth Session Summary — Qroll

> ไฟล์นี้สรุปสิ่งที่ทำในแชทนี้แบบอธิบายเหตุผล เหมาะสำหรับอ่านทบทวนเองหรือใช้อธิบายให้อาจารย์ที่ปรึกษาฟัง  
> วันที่ทำงาน: 2026-04-28  
> สถานะสุดท้าย: **Phase 2 เสร็จสมบูรณ์และทดสอบผ่านแล้ว**

---

## 1. เป้าหมายของ Phase 2

Phase 2 คือการเพิ่มระบบ login ให้ Qroll โดยใช้บัญชี TU/Dome AD ผ่าน TU REST API และให้ระบบรู้ว่า user ที่ login เข้ามาเป็น:

- `TEACHER`
- `STUDENT`

รวมถึงต้องมี `studentId` ใน session สำหรับนักศึกษา เพื่อให้ Phase ถัดไปใช้ตรวจสิทธิ์ตอนสร้างวิชา/เช็คอินได้

สิ่งสำคัญของ Phase นี้ไม่ใช่แค่ “มีหน้า login” แต่คือ:

1. ยืนยันตัวตนกับ TU API จริงได้
2. มี dev mode สำหรับทดสอบโดยไม่ยิง TU API
3. session ต้องเก็บข้อมูลพอสำหรับ role-based access
4. route ที่ต้อง login ต้องถูก redirect ไปหน้า login
5. มี helper ฝั่ง server สำหรับบังคับเช็ค auth ซ้ำใน Phase ถัดไป

---

## 2. เอกสารและข้อมูลที่ใช้ตัดสินใจ

ก่อนเขียน code มีการอ่านไฟล์หลักของโปรเจกต์:

- `INSTRUCTIONS.md`
- `STATE.md`
- `docs/prps/00-security-model.md`
- `docs/prps/01-database-schema.md`

เหตุผลที่ต้องอ่านก่อน:

- `INSTRUCTIONS.md` เป็นกฎของโปรเจกต์ เช่น tech stack, security model, ห้าม commit `.env`
- `STATE.md` บอกว่าทำถึง Phase ไหนแล้ว
- PRP 00 บอก security model โดยเฉพาะ 3-layer auth defense
- PRP 01 บอก schema database และ seed users ที่ใช้ใน BYPASS mode

หลังจากนั้นใช้เอกสาร TU API ที่คุณส่งมาเพื่อยืนยัน contract จริงของ API

TU API ที่ใช้:

```http
POST https://restapi.tu.ac.th/api/v1/auth/Ad/verify
Content-Type: application/json
Application-Key: <TU_API_KEY>
```

body:

```json
{
  "UserName": "username",
  "PassWord": "password"
}
```

จุดสำคัญคือชื่อ field ต้องเป็น `UserName` และ `PassWord` ตาม casing ในเอกสาร TU

---

## 3. Dependencies ที่เพิ่ม

ติดตั้ง package:

```bash
npm.cmd install next-auth@beta zod lucide-react
```

เหตุผลของแต่ละตัว:

- `next-auth@beta`  
  ใช้ NextAuth v5 เพราะเข้ากับ Next.js App Router และมี `auth()` สำหรับ middleware/server

- `zod`  
  ใช้ validate input/response จาก credentials และ TU API เพื่อไม่เชื่อข้อมูล raw ตรง ๆ

- `lucide-react`  
  ใช้ icon ในหน้า login แทน inline SVG ยาว ๆ จาก prototype HTML

ผลลัพธ์:

- `package.json` มี dependency ใหม่
- `package-lock.json` ถูกอัปเดต

---

## 4. ไฟล์ PRP 02

สร้างไฟล์:

```text
docs/prps/02-auth-tu-api.md
```

ไฟล์นี้เขียนเพื่อเป็น audit trail ว่า Phase 2 ตัดสินใจอะไรและทำไม

หัวข้อสำคัญในไฟล์:

- Goal & non-goals
- TU API contract
- ทำไมใช้ JWT session strategy
- ทำไมยังไม่ใช้ PrismaAdapter
- BYPASS_TU_AUTH dev mode
- role mapping
- 3-layer auth defense
- anti-patterns ที่ห้ามทำ
- วิธี verify

ความสำคัญ:

โปรเจกต์นี้เป็น final project จุดสำคัญคือ “นักศึกษาเข้าใจและตัดสินใจเอง” PRP 02 จึงช่วยอธิบาย decision ได้ ไม่ใช่แค่มี code โผล่มา

---

## 5. Environment Variables

แก้ไฟล์:

```text
.env.example
```

ให้มีตัวแปรที่ถูกต้องสำหรับ Phase 2:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""
BYPASS_TU_AUTH=false
TU_API_URL="https://restapi.tu.ac.th/api/v1/auth/Ad/verify"
TU_API_KEY=""
```

ความสำคัญ:

- `.env.example` เป็น template ที่ commit ได้
- `.env.local` เป็นของจริง ห้าม commit
- `TU_API_KEY` ต้องอยู่ใน `.env.local` เท่านั้น เพราะเป็น secret

ในแชทนี้เคยพบว่า `TU_API_KEY` จริงถูกใส่ใน `.env.example` แล้วจึงล้างออกให้ทันที เพราะ `.env.example` เป็นไฟล์ที่มีโอกาสถูก commit

---

## 6. NextAuth Config หลัก

สร้างไฟล์:

```text
src/lib/auth.ts
```

หน้าที่ของไฟล์นี้:

- ตั้งค่า NextAuth v5
- สร้าง Credentials provider
- รองรับ BYPASS mode
- เรียก TU API จริงเมื่อปิด BYPASS
- map TU user เป็น Qroll user
- ใส่ `id`, `role`, `studentId` ลง JWT/session

จุดสำคัญ:

```ts
import "server-only";
```

ใส่ไว้บนสุดเพื่อบอกว่าไฟล์นี้ใช้ได้เฉพาะฝั่ง server เท่านั้น เพราะมี:

- DB query
- TU API key
- auth secret

ถ้า Client Component เผลอ import ไฟล์นี้ build จะ fail เพื่อป้องกัน secret หลุดไป browser

---

## 7. BYPASS Mode

ใน `src/lib/auth.ts` มี branch:

```ts
if (process.env.BYPASS_TU_AUTH === "true") {
  return authorizeBypass(username);
}
```

ถ้าเปิด:

```env
BYPASS_TU_AUTH=true
```

ระบบจะไม่ยิง TU API แต่จะหา user จาก database ด้วย email ที่กรอกมา

seed users ที่ใช้:

```text
teacher@tu.ac.th
test.student@dome.tu.ac.th
```

password ใส่อะไรก็ได้ใน BYPASS mode

ทำไมต้องมี:

- ไม่เผา quota TU API ระหว่าง dev
- ทดสอบ login/session/middleware ได้แม้ไม่มี key จริง
- demo flow ได้เร็ว

---

## 8. Real TU API Mode

ถ้าตั้ง:

```env
BYPASS_TU_AUTH=false
```

ระบบจะเรียก TU API จริงผ่าน `callTuApi()`

flow คือ:

1. user กรอก username/password
2. NextAuth เรียก `authorize()`
3. `callTuApi()` ส่ง request ไป TU API
4. ถ้า TU API ตอบ success ระบบ map role
5. ระบบ `upsert` user ลง database
6. NextAuth สร้าง session

การ map role:

| TU API type | Qroll role | studentId |
| --- | --- | --- |
| `student` | `STUDENT` | ใช้ `username` จาก TU API |
| `employee` | `TEACHER` | `null` |

student ต้องมี:

```text
tu_status === "ปกติ"
```

เพื่อกันบัญชีที่ไม่ได้อยู่ในสถานะปกติ

---

## 9. ทำไม upsert แต่ไม่ update role

ตอน real TU login ใช้ Prisma `upsert`

ถ้ายังไม่มี user:

- create user ใหม่
- ใส่ role ตาม TU API
- ใส่ studentId ถ้าเป็น student

ถ้ามี user อยู่แล้ว:

- update แค่ `name`
- ไม่ update `role`

เหตุผล:

ถ้า role ถูกเปลี่ยนทุกครั้งตามข้อมูลจาก external API อาจเกิด privilege drift เช่น user ที่เคยเป็น student ถูกเปลี่ยนเป็น teacher โดยไม่ตั้งใจ หรือ mapping ผิดแล้ว role เปลี่ยนเอง ระบบจึงให้ Qroll DB เป็น source of truth เรื่อง role หลังจากสร้างครั้งแรก

ใน log จริงหลัง login เห็น query แบบนี้:

```sql
ON CONFLICT ("email") DO UPDATE SET "name" = ...
```

นี่แปลว่า update เฉพาะชื่อ ไม่ update role ถูกต้องตามที่ตั้งใจ

---

## 10. Shared Auth Config และ Middleware

สร้างไฟล์:

```text
src/lib/auth-config.ts
```

หน้าที่:

- เก็บ config กลางของ NextAuth callback
- เก็บ domain whitelist
- ใช้ร่วมกันระหว่าง `auth.ts` และ `middleware.ts`

เหตุผลที่แยกไฟล์นี้:

ตอนแรก middleware import `auth` จาก `src/lib/auth.ts` โดยตรง ทำให้ build มี warning เรื่อง Edge Runtime เพราะ `auth.ts` มี Prisma/server-only อยู่ด้วย

จึงแยก config กลางออกมาให้ middleware ใช้เฉพาะส่วนที่ปลอดภัยกว่า

---

## 11. Middleware

สร้างไฟล์:

```text
src/middleware.ts
```

หน้าที่:

- ถ้ายังไม่ login แล้วเข้า protected path เช่น `/teacher`
- redirect ไป `/login?from=/teacher`

ตัวอย่างผลทดสอบ:

```http
GET /teacher
302 Found
location: /login?from=%2Fteacher
```

ความสำคัญ:

middleware เป็น Layer 1 ของ 3-layer auth defense เป็น UX redirect ไม่ใช่ security หลัก

เหตุผลที่ไม่ถือว่า middleware พอ:

คนร้ายอาจยิง Server Action โดยตรงได้ใน Phase ถัดไป ดังนั้นทุก mutation ต้องเรียก helper เช่น `requireAuth()` หรือ `requireTeacher()` ซ้ำ

---

## 12. Auth Helpers

สร้างไฟล์:

```text
src/lib/auth-helpers.ts
```

มี helper:

- `requireAuth()`
- `requireTeacher()`
- `requireStudent()`
- `AuthError`

หน้าที่:

ใช้ใน Server Action/Server Component เพื่อบังคับว่าผู้ใช้ต้อง login และต้องมี role ถูกต้อง

ตัวอย่างแนวคิด:

```ts
const teacher = await requireTeacher();
```

ถ้า user ไม่ login:

```text
UNAUTHORIZED
```

ถ้า login แล้วแต่ role ไม่ใช่ teacher:

```text
FORBIDDEN
```

ความสำคัญ:

นี่คือ Layer 3 ของ security model และเป็นชั้นที่เชื่อถือจริง

---

## 13. NextAuth Type Augmentation

สร้างไฟล์:

```text
src/types/next-auth.d.ts
```

หน้าที่:

บอก TypeScript ว่า session ของ Qroll มี field เพิ่ม:

```ts
session.user.id
session.user.role
session.user.studentId
```

ถ้าไม่มีไฟล์นี้ TypeScript จะไม่รู้จัก field พวกนี้ ทำให้เขียน code ฝั่ง server/action แล้ว type error

ความสำคัญ:

ช่วยให้ Phase ถัดไปเขียน logic เช่น:

```ts
if (session.user.role !== "TEACHER") ...
```

ได้อย่าง type-safe

---

## 14. Auth Route Handler

สร้างไฟล์:

```text
src/app/api/auth/[...nextauth]/route.ts
```

หน้าที่:

เปิด endpoint ของ NextAuth เช่น:

- `/api/auth/providers`
- `/api/auth/csrf`
- `/api/auth/callback/credentials`
- `/api/auth/session`

ใน NextAuth v5 route handler จะ re-export จาก config:

```ts
export { GET, POST } from "@/lib/auth";
```

---

## 15. Login UI

ใช้ไฟล์ต้นแบบ:

```text
D:\load\QRoll UI\Login Page.html
```

แล้วแปลงเป็น Next.js/Tailwind จริง

สร้างไฟล์:

```text
src/app/(auth)/layout.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/login/LoginForm.tsx
```

สิ่งที่เก็บจาก design:

- left sidebar / brand rail
- QRoll logo
- topbar
- login card
- accent สีแดง `#990000`
- ช่อง username/password
- show/hide password
- loading state
- error alert
- DEV MODE banner

สิ่งที่ตัดออก:

- React CDN
- Babel CDN
- fake login timeout
- fake success screen
- tweak panel
- TU SSO button ที่ยังไม่มี flow จริง
- forgot password link เพราะ Qroll reset TU password ไม่ได้

เหตุผล:

prototype HTML มีไว้โชว์ UI แต่ใน production Next.js ต้องใช้ component จริง, routing จริง, auth จริง และไม่โหลด React จาก CDN

---

## 16. Root Layout และ Global CSS

แก้ไฟล์:

```text
src/app/layout.tsx
src/app/globals.css
```

สิ่งที่แก้:

- metadata จาก default Next app เป็น QRoll
- `lang="th"` เพื่อรองรับภาษาไทย
- background/text color ของ app
- font fallback สำหรับภาษาไทย เช่น `Noto Sans Thai`, `Leelawadee UI`

เหตุผล:

หน้า login เป็นภาษาไทย ถ้า root layout ยังเป็น `lang="en"` จะไม่เหมาะ และ font fallback ช่วยให้ render ภาษาไทยอ่านง่ายขึ้น

---

## 17. ESLint Config

แก้ไฟล์:

```text
eslint.config.mjs
```

ปัญหาที่เจอ:

ตอน build/lint มี error:

```text
nextVitals is not iterable
Plugin "" not found
```

สาเหตุ:

config ของ `eslint-config-next` ในเวอร์ชันนี้ export เป็น legacy extends config ไม่ใช่ flat config array ที่ spread ได้ตรง ๆ

วิธีแก้:

ใช้ `FlatCompat` จาก `@eslint/eslintrc` เพื่อแปลง legacy config ให้ ESLint 9 flat config ใช้ได้

ผลลัพธ์:

```bash
npm.cmd run lint
```

ผ่านเรียบร้อย

---

## 18. STATE.md

แก้ไฟล์:

```text
STATE.md
```

อัปเดตว่า:

- Phase 2 Done
- Next Step เป็น Phase 3
- PRP 02 Done
- เพิ่ม Decision Log:
  - ใช้ JWT session strategy
  - upsert ไม่ update role
  - helper scope จำกัดไว้ที่ auth/teacher/student ก่อน
- เพิ่มรายการ verify lint/build + BYPASS smoke test

ความสำคัญ:

session ถัดไปหรือคนอื่นมาอ่านจะรู้ทันทีว่า Phase 2 จบแล้ว และ Phase 3 ต้องทำอะไรต่อ

---

## 19. Terminal Commands ที่รัน

### อ่าน/สำรวจไฟล์

```powershell
Get-Content -Raw -LiteralPath .\INSTRUCTIONS.md
Get-Content -Raw -LiteralPath .\STATE.md
Get-ChildItem -Force -LiteralPath .\docs\prps
Get-Content -Raw -Encoding UTF8 -LiteralPath .\docs\prps\00-security-model.md
Get-Content -Raw -Encoding UTF8 -LiteralPath .\docs\prps\01-database-schema.md
Get-Content -Raw -Encoding UTF8 -LiteralPath .\package.json
Get-ChildItem -Recurse -File -LiteralPath .\src
Get-Content -Raw -Encoding UTF8 -LiteralPath .\prisma\schema.prisma
```

ใช้เพื่อเข้าใจสถานะก่อน implement

### ติดตั้ง dependencies

คำสั่งแรกด้วย `npm` ใน PowerShell fail เพราะ execution policy:

```powershell
npm install next-auth@beta zod lucide-react
```

จึงใช้:

```powershell
npm.cmd install next-auth@beta zod lucide-react
```

มีครั้งหนึ่งต้องรันนอก sandbox เพราะ Windows permission block `C:\Users\jefza`

### Build

```powershell
npm.cmd run build
```

รอบแรกเจอ type error:

```text
Type 'unknown' is not assignable to type 'string'
```

ที่ `token.id` ใน session callback จึงแก้โดย cast token claims ให้ชัดเจน

หลังแก้:

```powershell
npm.cmd run build
```

ผ่าน

### Lint

```powershell
npm.cmd run lint
```

ตอนแรกเจอ ESLint config error จึงแก้ `eslint.config.mjs`

หลังแก้:

```powershell
npm.cmd run lint
```

ผ่าน

### เปิด dev server ชั่วคราวเพื่อ smoke test

ใช้ port 3001 เพราะ port 3000 มี process อื่นใช้อยู่:

```powershell
npm.cmd run dev -- -p 3001
```

เปิดแบบ background/hidden เพื่อทดสอบ endpoint

### เช็คหน้า login

```powershell
curl.exe -I -s http://localhost:3001/login
```

ผล:

```text
HTTP/1.1 200 OK
```

แปลว่าหน้า login render ได้

### เช็ค middleware redirect

```powershell
curl.exe -I -s http://localhost:3001/teacher
```

ผล:

```text
HTTP/1.1 302 Found
location: /login?from=%2Fteacher
```

แปลว่า middleware ทำงานถูกต้อง

### เช็ค BYPASS teacher login

เรียก CSRF:

```powershell
curl.exe -s -c .codex-auth-cookies.txt http://localhost:3001/api/auth/csrf
```

จากนั้น POST credentials:

```powershell
curl.exe -i -s -b .codex-auth-cookies.txt -c .codex-auth-cookies.txt `
  -X POST http://localhost:3001/api/auth/callback/credentials `
  -H "Content-Type: application/x-www-form-urlencoded" `
  --data-urlencode "csrfToken=<csrfToken>" `
  --data-urlencode "username=teacher@tu.ac.th" `
  --data-urlencode "password=anything" `
  --data-urlencode "redirect=false" `
  --data-urlencode "callbackUrl=http://localhost:3001/teacher"
```

เช็ค session:

```powershell
curl.exe -s -b .codex-auth-cookies.txt http://localhost:3001/api/auth/session
```

ผลที่ได้:

```json
{
  "user": {
    "name": "Test Teacher",
    "email": "teacher@tu.ac.th",
    "role": "TEACHER",
    "studentId": null
  }
}
```

### เช็ค BYPASS student login

ใช้ `test.student@dome.tu.ac.th`

ผล:

```json
{
  "user": {
    "name": "Test Student",
    "email": "test.student@dome.tu.ac.th",
    "role": "STUDENT",
    "studentId": "0000000001"
  }
}
```

### เช็ค reject non-TU login

ใช้:

```text
evil@gmail.com
```

ผล:

```text
/login?error=CredentialsSignin&code=credentials
session = null
```

แปลว่า domain whitelist ทำงาน

### ปิด dev server ชั่วคราว

```powershell
Stop-Process -Id <processId> -Force
```

หรือหยุด process ที่ listen port 3001

---

## 20. Real TU API Test

หลังจากใส่ค่าใน `.env.local`:

```env
BYPASS_TU_AUTH=false
TU_API_KEY="<token จริงจาก TU>"
```

แล้ว restart dev server

log ที่คุณส่งมา:

```text
POST /api/auth/callback/credentials? 200
prisma:query INSERT INTO "public"."User" (...)
ON CONFLICT ("email") DO UPDATE SET "name" = ...
COMMIT
```

แปลว่า:

1. login form ส่ง credentials เข้า NextAuth สำเร็จ
2. ระบบยิง TU API จริง
3. TU API ตอบ success
4. Prisma insert/update user ลง Supabase
5. login สำเร็จ

ดังนั้น Phase 2 ไม่ได้ผ่านแค่ BYPASS แต่ผ่าน real TU API แล้ว

---

## 21. วิธีทดสอบเองหลังจากนี้

### Dev/BYPASS mode

ตั้ง `.env.local`:

```env
BYPASS_TU_AUTH=true
TU_API_KEY=""
```

restart:

```bash
npm run dev
```

login:

```text
teacher@tu.ac.th
password อะไรก็ได้
```

หรือ:

```text
test.student@dome.tu.ac.th
password อะไรก็ได้
```

หน้า login ต้องมี banner:

```text
DEV MODE — TU API bypassed
```

### Real TU mode

ตั้ง `.env.local`:

```env
BYPASS_TU_AUTH=false
TU_API_KEY="<token จริงจาก TU>"
```

restart:

```bash
npm run dev
```

login ด้วย username/password TU จริง

ถ้าสำเร็จ เปิด Supabase Table Editor แล้วดู table `User`

ควรเห็น:

- email ของบัญชี TU
- name จาก TU API
- role เป็น `STUDENT` หรือ `TEACHER`
- studentId มีค่าสำหรับ student

---

## 22. สถานะสุดท้าย

Phase 2 ถือว่าเสร็จสมบูรณ์ เพราะ:

- เขียน PRP 02 แล้ว
- ติดตั้ง dependencies แล้ว
- ทำ NextAuth Credentials provider แล้ว
- ทำ BYPASS mode แล้ว
- ทำ real TU API login แล้ว
- ทำ session claims `id`, `role`, `studentId` แล้ว
- ทำ middleware redirect แล้ว
- ทำ server auth helpers แล้ว
- ทำ login UI จาก HTML design แล้ว
- `npm run lint` ผ่าน
- `npm run build` ผ่าน
- smoke test BYPASS ผ่าน
- real TU login ผ่านจาก log และเขียนลง Supabase ได้

สิ่งที่ยังไม่ใช่ bug:

- หลัง login ไป `/teacher` หรือ `/student` อาจยัง 404 เพราะ dashboard อยู่ Phase 3
- `requireCourseOwner()` และ `requireEnrolledStudent()` ยังไม่เพิ่ม เพราะต้องรอมี course/enrollment actions จริงก่อน

---

## 23. จุดที่ต้องระวังต่อ

1. ห้าม commit `.env.local`
2. ห้ามใส่ TU token จริงใน `.env.example`
3. หลังแก้ `.env.local` ต้อง restart dev server
4. Phase 3 Server Actions ทุกตัวต้องเรียก `requireTeacher()` หรือ helper ที่เหมาะสม
5. Middleware เป็นแค่ UX redirect ไม่ใช่ security ชั้นสุดท้าย

