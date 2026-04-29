# Phase 4 Review — Dynamic QR Display

**วันที่:** 2026-04-29  
**สถานะ:** ใช้งานได้แล้ว  
**Build:** `npm.cmd run build` ผ่าน  
**Migration:** `phase4_dynamic_qr` apply กับ Supabase แล้ว

---

## โน้ตสำคัญสำหรับรอบถัดไป

หน้า `/teacher/sessions/[id]` ที่ทำใน Phase 4 **ใช้งานได้แล้ว**: เปิด session แล้วเห็น QR, countdown, entry code, generation, fullscreen และปิด session ได้

แต่หน้าตาตอนนี้ยังเป็น implementation version ที่เรียบกว่า reference เดิมมาก รอบถัดไปควรปรับ UI ให้ใกล้ `Teacher Session.html` เพราะไฟล์นั้นสวยกว่าและเหมาะกับ demo มากกว่า โดยเฉพาะ:

- ใช้ layout แบบมี sidebar ซ้าย + header บน เหมือน reference
- วาง QR ในการ์ดใหญ่กลางจอ พร้อมวง countdown ใหญ่ล้อม QR
- ทำ entry code card ใต้ QR ให้ดูเด่นกว่าเดิม
- เพิ่มแถบสถิติ/รายชื่อนักศึกษาล่าสุดด้านขวาให้เหมือน reference
- ใช้ spacing, shadow, border radius, สีแดง QRoll และ typography ให้ใกล้ `Teacher Session.html`
- ตอนนี้ Phase 4 ยังไม่ทำ pause/resume ตาม PRP เดิม ดังนั้นถ้าจะยก UI จาก reference ต้องระวังไม่เอา behavior pause/resume เข้ามาโดยไม่ตัดสินใจใหม่

สรุปสั้น ๆ: **logic Phase 4 ใช้ได้แล้ว แต่ UI ยังควร polish ตาม `Teacher Session.html` ก่อน demo จริง**

---

## ภาพรวม Phase 4

Phase 4 ทำให้ฝั่งอาจารย์เปิดคาบเรียนแล้วแสดง Dynamic QR สำหรับเช็คชื่อได้

สิ่งที่ทำสำเร็จ:

1. ตอนกดเปิด session ระบบสร้าง QR token ทันที
2. QR token หมุนใหม่ทุก 30 วินาทีผ่าน API polling
3. มี previous token 1 รอบ เพื่อกันปัญหานักศึกษาสแกนตอน QR เพิ่งเปลี่ยน
4. มี entry code 6 หลัก เผื่อกรณีสแกน QR ไม่ได้
5. มีหน้า session จริง แสดง QR, countdown, generation และ fullscreen
6. มี helper สำหรับ Phase 4.5 เพื่อ verify QR token / entry code
7. ตอนปิด session ระบบล้าง token/code ออกจาก DB

เหตุผลหลักของ Phase นี้คือเตรียม “จุดออก token” ให้มั่นคงก่อนทำฝั่งนักศึกษาใน Phase 4.5

---

## Flow การทำงาน

```text
Teacher กด "เปิด session"
  ↓
openSession(scheduleId)
  ↓
สร้าง ClassSession พร้อม qrToken + entryCode
  ↓
redirect ไป /teacher/sessions/[id]
  ↓
SessionView ฝั่ง client fetch /api/sessions/[id]/qr
  ↓
API เช็ก owner + rotate token ถ้าหมดอายุ
  ↓
client เอา token ไปสร้าง QR เป็น URL /checkin?t=<token>
  ↓
ทุก 30 วินาที client fetch ใหม่
```

---

## ไฟล์ที่แก้หรือสร้าง

### 1. `prisma/schema.prisma`

**หน้าที่:** กำหนด schema ของ database

Phase 4 เพิ่ม field ใน `ClassSession`:

- `qrPrevToken` — token รอบก่อนหน้า
- `qrPrevTokenExpiresAt` — เวลาหมดอายุของ token รอบก่อนหน้า
- `entryCode` — รหัสเข้าเรียน 6 หลักปัจจุบัน
- `entryCodePrev` — รหัสเข้าเรียนรอบก่อนหน้า
- index ของ `qrPrevToken`
- index ของ `entryCode`

ของเดิมมีอยู่แล้ว:

- `qrToken` — token ปัจจุบัน
- `qrTokenExpiresAt` — เวลาหมดอายุ token ปัจจุบัน
- `qrRefreshedAt` — เวลาที่ refresh ล่าสุด

**ทำไมต้องมี previous token:**  
ถ้านักศึกษากดสแกนพอดีกับจังหวะที่ QR เปลี่ยน token จะหมดอายุทันที อาจทำให้ UX แย่ เราเลยยอมให้ token รอบก่อนหน้าใช้ได้อีก 1 รอบสั้น ๆ

---

### 2. `prisma/migrations/20260429060250_phase4_dynamic_qr/migration.sql`

**หน้าที่:** SQL ที่ apply schema ใหม่ลง Supabase จริง

เพิ่ม column:

- `entryCode`
- `entryCodePrev`
- `qrPrevToken`
- `qrPrevTokenExpiresAt`

เพิ่ม index:

- `ClassSession_qrPrevToken_idx`
- `ClassSession_entryCode_idx`

**ทำไม entry code ไม่ unique:**  
entry code มีแค่ 6 หลัก มีโอกาสซ้ำได้ทางทฤษฎี แต่ Phase 4.5 จะ verify คู่กับ session/course context อยู่แล้ว และระบบมีการ rotate สั้น ๆ จึงไม่จำเป็นต้อง unique ใน DB ตอนนี้

---

### 3. `src/lib/qr-config.ts`

**หน้าที่:** รวมค่าคงที่ของระบบ QR

ค่าหลัก:

- `QR_REFRESH_INTERVAL_MS = 30 * 1000`
- `QR_GRACE_WINDOW_MS = 30 * 1000`
- `QR_TOKEN_BYTES = 32`
- `ENTRY_CODE_LENGTH = 6`
- `LATE_AFTER_MIN = 15`

**ทำไมแยกไฟล์:**  
ถ้าวันหลังอยากเปลี่ยน refresh จาก 30 วินาทีเป็นค่าอื่น จะเปลี่ยนที่เดียว ไม่ต้องไล่แก้หลายไฟล์

---

### 4. `src/lib/qr-token.ts`

**หน้าที่:** สร้าง token และ entry code

ฟังก์ชัน:

- `generateQrToken()` — ใช้ `crypto.randomBytes(32)` แล้วแปลงเป็น base64url
- `generateEntryCode()` — ใช้ `crypto.randomInt()` สุ่มตัวเลข 6 หลัก

**ทำไมไม่ใช้ `Math.random()`:**  
เพราะ token และ entry code เป็นข้อมูลด้าน security ควรใช้ crypto random ที่เดายากกว่า

---

### 5. `src/lib/qr-rotate.ts`

**หน้าที่:** หมุน QR token เมื่อ token ปัจจุบันหมดอายุ

ฟังก์ชันหลัก:

- `rotateIfExpired(session)`

ทำงานแบบนี้:

1. ถ้า session ปิดแล้ว คืนค่าเดิม
2. ถ้า token ยังไม่หมดอายุ คืนค่าเดิม
3. ถ้าหมดอายุ:
   - สร้าง token ใหม่
   - สร้าง entry code ใหม่
   - ย้าย token/code ปัจจุบันไปเป็น previous
   - ตั้ง expiry ใหม่
4. ใช้ `updateMany` พร้อม condition เพื่อกันสอง tab rotate ชนกัน

**ทำไม rotate แบบ lazy:**  
ไม่มี cron/background worker ระบบจะ rotate ตอน teacher page fetch token เท่านั้น ง่ายกว่าและเหมาะกับ MVP

---

### 6. `src/lib/qr-verify.ts`

**หน้าที่:** เตรียม logic verify สำหรับ Phase 4.5

ฟังก์ชัน:

- `verifyQrToken(token)`
- `verifyEntryCode(sessionId, code)`

ผลลัพธ์ที่คืน:

- `{ ok: true, sessionId, via: "current" | "previous" }`
- `{ ok: false, reason: "not_found" | "expired" | "session_closed" }`

**Phase 4 ยังไม่ได้ใช้จริงกับนักศึกษา** แต่เตรียมไว้เพื่อให้ Phase 4.5 ไม่ต้องเขียน verification logic ซ้ำ

---

### 7. `src/app/actions/session.ts`

**หน้าที่:** Server Action เปิด/ปิด session

Phase 4 แก้ `openSession()`:

- สร้าง `lateAfter`
- สร้าง `qrToken`
- สร้าง `qrTokenExpiresAt`
- สร้าง `qrRefreshedAt`
- สร้าง `entryCode`

Phase 4 แก้ `closeSession()`:

- ปิด session เหมือนเดิม
- ล้าง QR token และ entry code ทั้ง current/previous

**ทำไมสร้าง token ตั้งแต่เปิด session:**  
ถ้ารอให้หน้า QR fetch ครั้งแรกค่อยสร้าง token จะมีช่วงสั้น ๆ ที่ session เปิดแล้วแต่ยังไม่มี QR การสร้างทันทีทำให้ state ใน DB พร้อมตั้งแต่เริ่ม

---

### 8. `src/lib/session-helpers.ts`

**หน้าที่:** helper สำหรับ lazy auto-close session

Phase 4 เพิ่ม logic ให้ตอน auto-close ล้าง field เหล่านี้ด้วย:

- `qrToken`
- `qrTokenExpiresAt`
- `qrRefreshedAt`
- `qrPrevToken`
- `qrPrevTokenExpiresAt`
- `entryCode`
- `entryCodePrev`

**ทำไมต้องล้าง:**  
token/code เป็น secret ชั่วคราว เมื่อ session ปิดแล้วไม่ควรเก็บไว้ใน DB ต่อโดยไม่จำเป็น

---

### 9. `src/app/api/sessions/[id]/qr/route.ts`

**หน้าที่:** API สำหรับหน้า teacher session ดึง QR token ปัจจุบัน

Endpoint:

```text
GET /api/sessions/[id]/qr
```

สิ่งที่ทำ:

1. รับ `sessionId`
2. หา `ClassSession`
3. เช็กว่า teacher เป็นเจ้าของ course ด้วย `requireCourseOwner`
4. เรียก `autoCloseIfExpired`
5. ถ้า session ยังเปิดอยู่ เรียก `rotateIfExpired`
6. ส่งกลับ:
   - `token`
   - `entryCode`
   - `expiresAt`
   - `refreshedAt`
   - `refreshIntervalMs`
7. ใส่ `Cache-Control: no-store`

**ทำไมต้องเป็น Route Handler:**  
เพราะ client component ต้อง fetch token หลัง render เพื่อไม่ให้ token ฝังอยู่ใน initial HTML/RSC payload

---

### 10. `src/app/(app)/teacher/sessions/[id]/page.tsx`

**หน้าที่:** Server Component shell ของหน้า session

สิ่งที่ทำ:

- โหลดข้อมูล session/course/schedule
- เช็ก owner ด้วย `requireCourseOwner`
- เรียก `autoCloseIfExpired`
- ส่งข้อมูลทั่วไปไปให้ `SessionView`

**สิ่งที่ตั้งใจไม่ทำ:**  
ไม่ส่ง `qrToken` เข้า component นี้ เพราะ token ไม่ควรอยู่ใน HTML แรกของหน้า

---

### 11. `src/components/sessions/SessionView.tsx`

**หน้าที่:** Client Component หลักของหน้า Dynamic QR

ทำหน้าที่:

- fetch `/api/sessions/[id]/qr`
- เอา token ไปสร้าง URL `/checkin?t=<token>`
- ใช้ package `qrcode` สร้าง QR image ฝั่ง browser
- นับเวลาถอยหลังจาก `expiresAt`
- polling ทุก 30 วินาที
- เพิ่ม generation เมื่อ token เปลี่ยน
- จัด fullscreen area
- แสดง error ถ้า refresh ไม่สำเร็จ

**ทำไม QR สร้างฝั่ง client:**  
ลดการส่งรูป QR จาก server และลดโอกาส token ไปอยู่ใน server image URL/log โดยตรง

---

### 12. `src/components/sessions/QrDisplay.tsx`

**หน้าที่:** แสดง QR + countdown ring + generation

ข้อมูลที่รับ:

- `qrDataUrl`
- `secondsLeft`
- `generation`
- `isLoading`

ตอนนี้ UI ใช้งานได้ แต่ยังไม่สวยเท่า `Teacher Session.html` เพราะ reference มีวง countdown ขนาดใหญ่รอบ QR และ composition ที่ดู demo-ready กว่า

---

### 13. `src/components/sessions/EntryCodeCard.tsx`

**หน้าที่:** แสดงรหัสเข้าเรียน 6 หลัก

ตอนนี้แยกตัวเลขเป็น 6 ช่อง อ่านง่าย และใช้ fallback เมื่อสแกน QR ไม่ได้

สิ่งที่ควร polish รอบหน้า:

- ทำให้หน้าตาใกล้ card ใน `Teacher Session.html`
- อาจแสดงข้อความ “กรอกแทน QR ได้” แบบชัดเจนกว่า

---

### 14. `src/components/sessions/FullscreenButton.tsx`

**หน้าที่:** ปุ่มเข้า/ออก fullscreen

ใช้ Browser Fullscreen API:

- `requestFullscreen()`
- `exitFullscreen()`
- ฟัง event `fullscreenchange`

**ทำไมใช้ Browser API:**  
เป็นมาตรฐาน กด Esc เพื่อออกได้ และไม่ต้องสร้าง route แยกสำหรับ projector

---

### 15. `src/components/sessions/CheckedInSidebar.tsx`

**หน้าที่:** sidebar placeholder สำหรับรายชื่อนักศึกษาที่เช็คอิน

ตอนนี้ยังเป็น skeleton เพราะ Phase 4 ยังไม่มี student check-in จริง

Phase 4.5 หรือ Phase 5 ควรต่อ:

- จำนวน check-in จริง
- รายชื่อนักศึกษาล่าสุด
- สถานะ present/late
- polling หรือ refresh ของ attendance list

---

### 16. `src/components/courses/CloseSessionButton.tsx`

**หน้าที่:** ปุ่มปิด session

Phase 4 แก้เพิ่ม:

- หลังปิด session แล้วเรียก `router.refresh()`
- ทำให้หน้า session อัปเดตสถานะเป็นปิดหลัง action สำเร็จ

---

## Security ที่ Phase 4 ทำแล้ว

| เรื่อง | ทำยังไง |
| ------ | ------- |
| Token เดายาก | ใช้ `crypto.randomBytes(32)` |
| Entry code ไม่ใช้ random ธรรมดา | ใช้ `crypto.randomInt()` |
| กัน teacher ดู session คนอื่น | `requireCourseOwner` ใน page และ API |
| กัน cache token เก่า | API ส่ง `Cache-Control: no-store` |
| กัน token ฝังใน initial HTML | client fetch token จาก API หลัง render |
| กัน scan ตอน rotate พอดี | เก็บ previous token 1 รอบ |
| ล้าง secret หลังปิด session | close/auto-close set token/code เป็น `null` |
| ใช้ server time | expiry/lateAfter คำนวณฝั่ง server |

---

## สิ่งที่ยังไม่ได้ทำใน Phase 4

ยังไม่ทำ:

- หน้า `/checkin`
- student scan flow
- บันทึก `Attendance`
- เช็ก enrollment ตอนนักศึกษาเช็คอิน
- รายชื่อนักศึกษาเช็คอินสดใน sidebar
- manual entry code flow ฝั่ง student
- geofence
- pause/resume
- export/report

งานเหล่านี้อยู่ Phase 4.5 เป็นต้นไป

---

## วิธีเทส Phase 4

1. เปิด dev server:

```bash
npm run dev
```

2. เปิด browser:

```text
http://localhost:3000
```

3. Login เป็น teacher:

```text
teacher@tu.ac.th
```

ใช้กับ `BYPASS_TU_AUTH=true`

4. ไปที่ `/teacher`

5. ถ้ายังไม่มี course/schedule:

- สร้าง course
- เข้า course detail
- เพิ่ม schedule ใน tab ตารางสอน

6. กด “เปิด session”

7. ควรเห็นหน้า `/teacher/sessions/[id]` พร้อม:

- QR code
- countdown 30 วินาที
- entry code 6 หลัก
- generation number
- fullscreen button
- ปุ่มปิด session

8. รอ 30 วินาที:

- QR ควรเปลี่ยน
- entry code ควรเปลี่ยน
- generation ควรเพิ่ม

9. กด fullscreen:

- QR area ควรเต็มจอ
- กด Esc เพื่อออก

10. กดปิด session:

- QR ควรหาย
- session เปลี่ยนเป็น closed
- token/code ใน DB ถูกล้าง

---

## ข้อควรระวัง

### 1. อย่าเอา token ไป render ใน Server Component

ถ้าทำแบบนี้:

```tsx
return <QrDisplay token={session.qrToken} />;
```

token จะไปอยู่ใน initial payload ของหน้า ซึ่งเปิดดูได้ใน DevTools

แนวทางที่ถูกตอนนี้คือ:

```text
Server Component ส่งแค่ sessionId
Client Component fetch /api/sessions/[id]/qr
```

### 2. อย่า cache `/api/sessions/[id]/qr`

ถ้า response ถูก cache นักศึกษาอาจได้ QR token เก่า

ตอนนี้ route ใส่:

```http
Cache-Control: no-store, max-age=0, must-revalidate
```

### 3. ถ้าจะยก UI จาก `Teacher Session.html`

ต้องแยก “ดีไซน์” ออกจาก “behavior demo” ในไฟล์ HTML นั้น

ใน `Teacher Session.html` มี behavior demo บางอย่าง เช่น:

- pause/resume
- mock student list
- fake QR matrix
- toast demo
- tweak panel

ถ้าจะนำมาใช้จริง ควรเอาเฉพาะ layout/visual แล้วผูกกับ logic จริงของ Phase 4 แทน

---

## Verdict

Phase 4 ฝั่ง logic ถือว่าเสร็จและต่อ Phase 4.5 ได้แล้ว

สิ่งที่ดี:

- token model วางไว้ถูกทาง
- DB เป็น source of truth
- ไม่ใช้ JWT สำหรับ QR
- มี grace window
- เตรียม verify helper สำหรับ student flow
- build ผ่าน

สิ่งที่ควรทำก่อน demo:

- polish หน้า session ให้ใกล้ `Teacher Session.html`
- ต่อ sidebar รายชื่อนักศึกษาเมื่อ Phase 4.5/5 มี attendance จริง
- ทดสอบ manual smoke test อีกครั้งหลังปรับ UI

