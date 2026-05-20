# QRoll — Phase 8 Review: UI Cleanup + Hardening

> **Status:** Implemented on branch `phase-8-ui-hardening` ออกจาก `phase-7-face-scan`, ยังไม่ merge เข้า master
> **Date:** 2026-05-21
> **Related PRP:** ไม่มี — Phase นี้ตั้งใจเป็นรอบ polish + harden ไม่ใช่ phase ของ feature ใหม่
> **Purpose:** สรุปว่า Phase 8 ทำอะไร ทำไม และเตรียมคำตอบเวลาอธิบายอาจารย์

---

## 1. สรุปสั้นที่สุด

Phase 8 ไม่ได้เพิ่ม feature ใหม่ — เป็นรอบ **ปิดงานหลังจากทุก feature เสร็จแล้ว** เพื่อให้ระบบพร้อมขึ้น production จริง โดยรวม 3 หมวด:

1. **Security hardening** — กัน env flag รั่วบน production deployment
2. **Bug fixes ที่เจอตอนใช้งานจริง** — จาก iPhone 13 / MacBook ที่ทดสอบหลัง Phase 7
3. **UI consistency + theming** — page header pattern, responsive sweep, brand color tokens

ผลลัพธ์: ระบบที่ Phase 7 ปิดไว้เป็น "ใช้งานได้ end-to-end" → Phase 8 ปิดเป็น "พร้อม deploy + พร้อม defend เรื่อง production safety ได้"

---

## 2. ทำไมต้องมี Phase 8

หลัง Phase 7 ปิด face scan ครบทุก layer ของ anti-proxy แล้ว ระบบใช้งานได้จริงบน iPhone 13 ผ่าน cloudflared tunnel แต่ยังมีหลายจุดที่ "ถ้าส่งขึ้น production วันนี้จะเจอปัญหา":

- `ENABLE_FACE_SEED=true` กับ `BYPASS_TU_AUTH=true` พึ่งพา env flag อย่างเดียว — ถ้าวันหนึ่งเผลอ tick scope ผิดบน Vercel = หน้า seed เปิดสู่สาธารณะ / login ปลอมผ่านได้บน production จริง
- หน้า teacher dashboard โชว์ % เข้าเรียน แต่ denominator ใช้จำนวน record (P+L+A) ทำให้คาบที่ ABSENT ยังไม่ถูก auto-mark = 100% ทุกคาบ ไม่สะท้อนความจริง
- UI ของ student บางหน้าใช้ไม่ได้บนมือถือจริง (table ล้น / hamburger ตำแหน่งไม่ thumb-reach)
- หน้า fullscreen QR ของอาจารย์บน MacBook เห็น QR ใหญ่ แต่รหัส 6 หลักถูก crop หลุดจอ
- scanner ของนักศึกษา crash บน production เพราะ unmount ระหว่าง camera init
- iOS Safari hydration mismatch จากการ auto-link วันที่ภาษาไทย
- สี brand ฝังเป็น hex (`#990000`) กระจาย 33 ไฟล์ → เปลี่ยนธีมต้องไล่ทีละจุด

Phase 8 เก็บงานเหล่านี้รวบเดียวเพื่อให้ git history สะอาด ไม่ผสมเข้ากับ feature phase ก่อนหน้า

---

## 3. สิ่งที่ทำจริงใน Phase 8

### 3.1 Production hard guard (`e06a8b4`)

**ปัญหา:** สอง env flag ที่ออกแบบมาเพื่อ dev/demo เท่านั้น แต่ถ้ารั่วไปติด production = หายนะ
- `ENABLE_FACE_SEED=true` → เปิดหน้า `/teacher/face-seed` ให้ใครก็ตามที่มี teacher account อัปรูปเข้า DB ได้
- `BYPASS_TU_AUTH=true` → กรอกอะไรก็ login ผ่าน (ใช้สำหรับเทสตอน TU API ใช้งานไม่ได้)

**Defense-in-depth strategy:** เพิ่ม layer ที่ตัด flag ทิ้งเลยถ้า runtime detect ว่าเป็น production deployment — flag ผิดก็ไม่ทำงาน
- เพิ่ม `src/lib/env.ts` — function `isProductionDeployment()` ตรวจ `NODE_ENV === "production"` (universal ไม่ผูก Vercel)
- `src/lib/face/constants.ts` — `isFaceSeedEnabled()` คืน `false` ทันทีถ้า production ไม่ดู `ENABLE_FACE_SEED`
- `src/lib/auth.ts` — `authorize()` `throw` error ถ้า `BYPASS_TU_AUTH=true` บน production แทนที่จะปล่อย bypass ผ่าน

**ทำไมเลือก `NODE_ENV` แทน `VERCEL_ENV`:** ถ้าวันหนึ่งย้าย hosting ไม่ใช่ Vercel `VERCEL_ENV` จะ undefined → guard fail-open ซึ่งอันตรายกว่า `NODE_ENV` เป็น Node.js standard ทุก host รองรับ

### 3.2 Bug fix: attendance % denominator (`b105bd5`)

**ปัญหา:** ก่อนแก้ avg % ของอาจารย์ใน 4 จุด (session report, course detail, course report, dashboard) คำนวณจาก `(PRESENT + LATE*0.5) / (P+L+A) * 100` — ถ้าทุกคนยัง ABSENT ไม่ถูก auto-mark = denominator นับแค่คนที่เช็คอินจริง = ได้ 100% ทุกคาบ

**แก้:** เปลี่ยน denominator เป็น `enrolled - EXCUSED` (จำนวนนักศึกษาที่ลงทะเบียนหักลาคน) — สูตรเดียวกันทุกหน้า สะท้อนสภาพจริง: คาบที่ยังไม่มีใครเช็คก็ได้ 0% ไม่ใช่ 100%

นอกจากนั้นกรองคอร์ส archived ออกจาก stat dashboard เพราะ "วิชาที่จบเทอมแล้ว" ไม่ควรเด้งใน "today's schedule"

### 3.3 PageHeader pattern + thumb-reach hamburger (`1f0f8c4`)

**ปัญหา:** header ของแต่ละหน้าเขียนซ้ำกัน ไม่มี shared component → padding/spacing เพี้ยนข้ามหน้า hamburger menu บน mobile อยู่มุมขวาบน ซึ่งห่างจาก thumb ของมือขวาที่ถือมือถือ

**แก้:**
- สร้าง `PageHeader` shared component — รับ `title`, `subtitle`, optional `actions` slot
- refactor หน้า teacher/student dashboard ทั้งหมดมาใช้ pattern เดียว
- ย้าย hamburger ไปมุมซ้ายบน + ใช้ slide-from-left drawer — ตรงตำแหน่ง thumb reach ของ right-handed user (~75% ของผู้ใช้ตามผลสำรวจ)

### 3.4 Responsive sweep (`ab61832`, `f71017b`)

**ปัญหา:** ก่อน Phase 8 หน้าทำงานบน desktop เป็นหลัก mobile ใช้ได้แต่ scroll แนวนอน ตารางล้น typography เล็กเกินไป

**แก้:**
- หน้า teacher (`/teacher`, `/teacher/courses`, `/teacher/courses/[id]`) + หน้า student ทุกหน้า — ปรับ padding/font-size/grid breakpoint สำหรับ ≤640px
- shared table components (`RosterTable`, `SessionReport`) — เพิ่ม `max-h` + sticky header + horizontal scroll wrap แทนการบีบ cell
- ทดสอบจริงบน iPhone 13 viewport

### 3.5 Bug fixes จาก real-device testing

**`829ae88` — scanner crash on iPhone:** scanner ของ check-in launcher crash ด้วย error `"Cannot stop, scanner is not running or paused"` ตอน user กดปิด modal ก่อน camera init เสร็จ. แก้โดยเพิ่ม `started` flag ใน `scannerRef` — เรียก `stop()` แค่ตอน started=true + จัดการเคส unmount ระหว่าง start

**`617fd99` — iOS Safari hydration drift:** SSR render Thai date เป็น text ปกติ แต่ iOS Safari ตอน hydrate ตรวจ "เลข+คำว่า พ.ค." แล้วจับเป็น phone number → wrap ใน `<a href="tel:...">` ทำให้ DOM ไม่ตรงกับ server. แก้ที่ root layout: `metadata.formatDetection = { telephone: false, date: false, address: false, email: false }`

**`1147d16` — presenter fullscreen layout บน MacBook:** เดิม fullscreen QR เป็น single column place-items-center — QR ใหญ่กลางจอ แต่รหัส 6 หลักถูก crop หลุด viewport บน 13" MacBook landscape. แก้เป็น 2-column grid (`lg:grid-cols-[auto_minmax(360px,420px)]`) QR ซ้าย รหัสขวา ทั้งคู่อยู่ในจอแน่นอน

### 3.6 Check-in UX (`3e6e09b`)

**ปัญหา 3 อย่างที่เจอตอนใช้จริง:**

1. นักศึกษากด QR เข้าไปหน้า check-in แล้ว = ไม่สามารถกลับไปดูหน้าอื่นได้ ถ้ายังไม่เช็ค (no nav)
2. ถ้านักศึกษา revisit URL เดิมหลังเช็คไปแล้ว → ระบบให้กดเช็คใหม่ได้ → กดแล้วเด้ง error "ซ้ำ" — ไม่มี indication ก่อนกด
3. หลังเช็คอินสำเร็จไม่มีทางไปดูประวัติของวิชานั้น ต้องไปหา menu เอง

**แก้:**
- เพิ่มปุ่ม Back บน `CheckInShell` (prop `showBack` — เปิดเฉพาะ state เช็คอินจริง ไม่โชว์บน invalid/expired/closed)
- pre-load existing attendance ฝั่ง server → ส่งให้ `StudentCheckInForm` seed เป็น result state ทันที → user เห็น "เช็คแล้ว" panel เลยตั้งแต่เปิดหน้า ไม่ต้องกด
- หลังเช็คสำเร็จเพิ่มปุ่ม "ดูประวัติเช็คชื่อ" → ไป `/student/courses/[id]`

### 3.7 Brand color tokens (`d70d2e4`)

**ปัญหา:** สี brand QRoll (`#990000`, `#7a0000`) ฝังเป็น Tailwind arbitrary value (`bg-[#990000]`) กระจาย 134 จุดใน 33 ไฟล์ — ถ้าวันหนึ่งเปลี่ยน brand color ต้องไล่แก้ทุกจุด

**แก้:** ใช้ Tailwind v4 `@theme inline` ใน `src/app/globals.css` ประกาศ token แบบ CSS variable:
```css
--color-qroll-red-dark: #990000;
--color-qroll-red-darker: #7a0000;
```

แล้ว sweep ทุกจุด:
- `[#990000]` → `qroll-red-dark` (134 จุด)
- `[#7a0000]`/`[#7F0000]` → `qroll-red-darker` (3 จุด)
- `hover:bg-red-800` ที่ pair กับ brand bg → `hover:bg-qroll-red-darker` (16 จุด)

**Brand vs semantic — แยกชัด:** Tailwind red ตัวอื่น (`bg-red-50`, `text-red-600`, `text-red-700`) ที่ใช้สื่อความหมาย "danger / absent / warning" **ไม่แตะ** เพราะเป็น semantic color — สมมุติเปลี่ยน brand เป็นน้ำเงิน ตัวเลข 45% ก็ยังต้องแดงอยู่ ไม่งั้น user งง

**ผลลัพธ์:** เปลี่ยนธีมทั้งเว็บ = แก้ `globals.css` ที่เดียวจบ

---

## 4. Decisions / Trade-offs ที่ควรจำ

### ทำไม Phase 8 ไม่มี PRP

PRP เขียนสำหรับ feature ที่มี scope/design ต้องตัดสินใจล่วงหน้า. Phase 8 = polish + bug fix ที่ค้นพบระหว่างใช้งานจริง — scope กำหนดจากของที่เจอ ไม่ใช่ของที่ design ไว้ก่อน ถ้าเขียน PRP ก่อนจะกลายเป็น "ลิสต์ของที่ยังไม่รู้ว่าจะเจออะไรบ้าง" = ไม่ตรงกับเจตนาของ PRP

### ทำไมรวมหลายเรื่องไว้ phase เดียว

ทางเลือก: แยกเป็น `phase-8-security` + `phase-9-ui` + `phase-10-theme` — แต่:
- งานแต่ละก้อนเล็กเกินไปต่อ phase
- ทั้งหมดเป็น "ปิดงานหลัง feature เสร็จ" — เจตนาเดียวกัน
- git history สะอาดกว่าถ้าเป็น phase เดียวที่มี commit ย่อยหลายตัว

### Production guard ใช้ `throw` ไม่ใช่ return null

`authorize()` เจอ `BYPASS_TU_AUTH=true` บน production = `throw` ไม่ปล่อย null:
- null = "login failed" — user จะลองใส่ password อีก
- throw = "configuration error" — สังเกตได้ทันทีจาก Sentry/Vercel log → admin แก้ env

### Pre-load existing attendance ฝั่ง server ไม่ใช่ client

ทางเลือก: ให้ client query หลัง mount — แต่ flash "ยังไม่เช็ค" → "เช็คแล้ว" ระหว่าง roundtrip = UX แย่. server query เพิ่ม 1 row เท่านั้น ($\approx$ 5ms) คุ้มแลกกับ no-flash

---

## 5. ผลลัพธ์รวม

| หมวด                | จำนวน commit | จุดที่กระทบ                                |
| ------------------- | ------------- | ------------------------------------------- |
| Security hardening  | 1             | `lib/env.ts`, `lib/face/constants.ts`, `lib/auth.ts` |
| Bug fix (logic)     | 1             | 4 หน้าที่คำนวณ % เข้าเรียน                  |
| Bug fix (UI/runtime)| 3             | scanner, iOS hydration, presenter layout    |
| UX (check-in)       | 1             | back button, pre-seed state, history link   |
| UI consistency      | 1             | PageHeader pattern + hamburger placement    |
| Responsive          | 2             | teacher/student pages + table components    |
| Style polish        | 1             | import warning tone (red → amber)           |
| Theming             | 1             | brand token refactor 153 จุด                |

ระบบหลัง Phase 8: ใช้งานได้ครบ ทดสอบจริงผ่าน iPhone 13 + MacBook landscape + mobile portrait, มี guard ขั้นต่ำที่กัน env config รั่ว, และสามารถเปลี่ยน brand color ได้จากจุดเดียว

---

## 6. สิ่งที่ยัง defer ไป

- **Merge `phase-8-ui-hardening` เข้า master** — รอ owner approve
- **Manual Supabase action** — ปิด `Integrations > Data API > Enable Data API` ของ project `qroll`
- **Mobile E2E ก่อน demo day** — ทดสอบ check-in ของนักศึกษา enrolled จริงผ่าน Phase 6 geofence path บนมือถือจริง (ที่ผ่านมาเทสด้วย DevTools Sensors)
- **Email notification + Settings expansion** — future enhancement ตามที่ระบุไว้ใน Phase 7 review §1
