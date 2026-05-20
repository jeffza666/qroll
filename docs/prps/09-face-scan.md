# PRP 09 — Face Scan / Face Verification (Phase 7)

## Goal

เพิ่ม layer สุดท้ายของ anti-proxy defense คือ **face verification** ตอนนักศึกษาเช็คชื่อ — ระบบจะตรวจว่าผู้ที่อยู่หน้ามือถือเป็นเจ้าของบัญชีจริง ไม่ใช่เพื่อนที่ได้ login + QR + อยู่ในรัศมีห้องเรียนแทน

**Source of truth ของ face identity = ฐานรูปนักศึกษาของ TU** (มหาวิทยาลัย verify ตอนสมัครเข้าเรียน). QRoll integrate ผ่าน API ดึงรูปมา compare ตอนเช็คชื่อ ใน prototype นี้ **mock การ integration ด้วย admin seed page** เพราะ TU API ปัจจุบันส่งแค่ `type/name/email` ไม่ส่งรูป การประสาน ITSC TU เพื่อขอ photo endpoint อยู่นอก scope ของ final project

Phase 7 นี้ทำงานเรียงต่อจาก defense layer เดิม (TU login + Enrollment + QR token + Entry code + Geofence) แบบ defense-in-depth ไม่ใช่แทน geofence

## Non-goals

- **Cloud face API** (AWS Rekognition / Azure Face / Google Vision) — ทำในเครื่องผ่าน browser ML แทน (ไม่ส่งใบหน้าออก third-party, ไม่มี cost, ทำงาน offline ได้)
- **เก็บรูปจริง** — เก็บแค่ embedding (Float[] ~1024 ตัว) ไม่เก็บรูปต้นฉบับในทุกขั้นตอน
- **Self-enrollment โดยนักศึกษา** — ไม่มี flow ให้นักศึกษาอัพรูปตัวเอง เพราะ trust ผ่าน TU registry แล้ว ระบบจริงจะ sync อัตโนมัติผ่าน API; prototype นี้ teacher (admin) เป็นคน sync แทน
- **TU API photo integration ตัวจริง** — out of scope (mocked) ต้องประสาน ITSC ขอ endpoint photo เพิ่ม ใช้เวลา/permission นอกขอบเขต project
- **กัน video-replay** (เอาวิดีโอเจ้าของหน้าเล่นใน iPad ส่อง) — passive + active liveness แบบ browser-only ไม่พอ ต้อง depth sensor; ยอมรับเป็น Limitation
- **Settings page เต็มรูปแบบ** — `/student/settings` มีเฉพาะ Face Status info เท่านั้น

## Decisions Summary

| จุด | เลือก | เหตุผล |
| --- | --- | --- |
| **Identity source** | ฐานรูป TU (mocked via teacher seed page) | trust ผลัก upstream — มหาลัย verify ตัวตนตอนสมัครเข้าเรียนแล้ว ระบบ check-in ไม่ต้อง reinvent identity; ไม่มี "enrollment trust problem" |
| **Seed mechanism (prototype)** | `/teacher/face-seed` — TEACHER role เปิดรูปในเบราว์เซอร์ → ออก descriptor → save | จำลอง TU sync endpoint; ในระบบจริงเป็น cron/webhook ดึงรูปจาก TU มา process |
| **Library** | `@vladmandic/human` 3.3.x | all-in-one: face detect + descriptor + passive liveness + head pose; MIT license; รัน 100% client-side บน TF.js |
| **เก็บอะไรใน DB** | descriptor (Float[]) + timestamp | ขนาด ~1KB/คน; one-way; ไม่ใช่ biometric ที่ระบุตัวได้โดยลำพัง |
| **Match algorithm** | L2-normalize → Euclidean distance, threshold 0.85 | Human's `faceres` embedding ไม่ normalized (raw Euclidean = 5–10+) ต้อง L2-normalize ก่อน หลัง normalize ค่าอยู่ในช่วง [0, 2]; threshold 0.85 tune จาก measurement จริงบน iPhone 13: self+current ≤0.68, self+old-card ≤0.82, sibling+current 0.91–0.95, sibling+old 1.13, advisor 1.10+ (Step 10) |
| **Liveness — passive** | Human `face.real` score, threshold 0.6 (ลด 0.7→0.6 หลังเทสใบหน้าสูงอายุ false-reject เยอะ) | กัน photo-attack แบบไม่ต้องให้ user ทำอะไรเพิ่ม; ติดมาฟรีกับ library |
| **Liveness — active** | challenge: หันซ้าย/ขวา (yaw > ±20°) → ตรงหน้า (|yaw| < 10°) | ใช้ `face.rotation.angle.yaw` จาก Human; logic ~30 บรรทัด |
| **Server-side authority** | server เก็บ + compare descriptor; client ส่งแค่ vector | consistent กับ pattern Phase 6 geofence (server-authoritative); client ส่ง `faceVerified=true` มาเองไม่ได้ |
| **กรณี user ยังไม่ sync** | check-in ผ่าน QR + geofence อย่างเดียวได้ | backward compat กับ Phase 6; ระบบใช้ได้ทันทีหลัง deploy โดยไม่ต้องรอ TU sync ทุกคน |
| **กรณี face fail** | reject + retry max 3; แสดงข้อความติดต่ออาจารย์ | กัน proxy ต้องเด็ดขาด; teacher แก้ปัญหา edge case ด้วย manual status edit ใน session report |
| **Privacy storage** | `User.faceDescriptor` + `User.faceEnrolledAt`; `Attendance.faceVerified` | minimum data; ไม่เก็บรูป ไม่เก็บ liveness score รายครั้ง |
| **ทำไม browser ML (ไม่ใช่ cloud)** | privacy + cost + iOS Safari compatibility | ไม่ส่งใบหน้านักศึกษาออก third-party; ฟรี; ทำงาน offline; เน็ตขาดตอน demo = จบ |
| **ทำไม mocked seed (ไม่ทำ TU API จริง)** | scope/permission | ITSC TU integration ใช้เวลา/permission นอกขอบเขต project; mock ผ่าน admin page = แสดงว่าระบบ "พร้อม integrate" ได้ทันที |

## Limitations (ต้องเขียนในรายงาน + defend)

1. **Mocked TU integration**
   - ระบบ production ต้องดึงรูปจาก TU registry ผ่าน API ที่ ITSC TU จัดเตรียม endpoint นี้ปัจจุบันยังไม่มีในชุด API ที่ใช้ verify ตัวตน
   - Mitigation ใน prototype: teacher (admin) อัพรูปแทน เพื่อพิสูจน์ว่า downstream verification logic พร้อมใช้
   - Defense: รายงานจะอธิบายว่า integration layer คือ "ฝั่งที่เปลี่ยน implementation ได้ง่ายที่สุดถ้า TU เพิ่ม endpoint"

2. **Demo limited to seeded users**
   - บัญชีที่ยังไม่ถูก seed จะข้าม face check ใช้ geofence อย่างเดียว
   - Mitigation: seed รูปกรรมการ/อาจารย์ที่ปรึกษาล่วงหน้าก่อน demo

3. **Threshold tuning จาก sample เล็ก**
   - Tune ด้วยตัวเอง 1 คน (5 รอบ) + พี่ชาย (2 รอบ) + อาจารย์ที่ปรึกษา 1 ครั้ง (ไม่มี ROC curve)
   - Margin วัดได้ ~0.23 ระหว่าง self max (0.68) กับ sibling min (0.91)
   - Production ต้องเก็บ ROC จากหลายคน + ปรับ threshold per-population
   - Identical twin / sibling หน้าใกล้กว่า 0.85 = false-accept (known limitation)
   - Photo aging: seed รูปเก่ามาก (>4 ปี) เพิ่ม same-person distance ~0.15 → margin worst-case (self+old vs sibling+current) แค่ 0.09

4. **Video-replay attack**
   - ถ่ายวิดีโอเจ้าของหน้า (พร้อมหัน) เล่นใน iPad ส่องกล้องอีกเครื่อง → ผ่านทั้ง passive + active liveness ได้
   - Mitigation: production ต้องใช้ depth sensor (Face ID) หรือ challenge แบบ random; browser-only ทำไม่ได้แม่น

5. **False-negative ในสภาพแสง/อายุรูปต่างจาก seed**
   - แสงสลัว / รูป registry อายุหลายปี → match distance อาจเพิ่ม
   - Mitigation: teacher edit `Attendance.status` แบบ manual ผ่าน session report; เปิด re-seed ผ่าน admin page

6. **Browser camera compatibility**
   - iOS Safari ต้อง 14.3+ และ HTTPS เท่านั้น; standalone PWA mode อาจเปิดกล้องไม่ได้
   - Mitigation: error message ชัด + แนะนำใช้ Safari ปกติ

7. **Model size + load time**
   - Human library + models ~10MB ครั้งแรก; load 2–5 วินาทีบนเน็ต 4G (CDN cache ครั้งต่อไปเร็วกว่า)

## Data Model

### User (เพิ่ม fields)
- `faceDescriptor: Float[] @default([])` — embedding ~1024 ตัว (Human `faceres` output); `[]` = ยังไม่ sync
- `faceEnrolledAt: DateTime?` — เวลา seed/sync ครั้งล่าสุด; `null` = ยังไม่ sync

### Attendance (เพิ่ม field)
- `faceVerified: Boolean @default(false)` — ผ่าน face check ตอน check-in หรือไม่; `false` ทั้งกรณีที่ user ไม่มี descriptor + กรณีที่ session ไม่บังคับ

### ไม่เก็บอะไร
- ไม่เก็บรูปต้นฉบับ (ไม่ใช้ S3 / blob storage)
- ไม่เก็บ probe descriptor ที่ส่งมาตอน check-in (compare แล้วทิ้ง)
- ไม่เก็บ liveness score รายครั้ง

## Flows

### Teacher: Seed รูป (จำลอง TU sync)

1. Teacher เข้า `/teacher/face-seed`
2. หน้าโชว์รายชื่อ user ที่ `role = STUDENT` พร้อมสถานะ "sync แล้ว / ยังไม่ sync"
3. กดปุ่ม "sync รูป" บน row → เปิด `<FaceScanModal mode="seed-from-file" />`
4. เลือกไฟล์รูป → เบราว์เซอร์โหลดเป็น `HTMLImageElement` → Human detect → ออก descriptor
5. ส่ง descriptor + targetStudentId ไป `seedFaceForStudent` server action
6. Server: requireTeacher → Zod validate length=1024 → confirm target.role=STUDENT → update `User.faceDescriptor` + `faceEnrolledAt`
7. รูปต้นฉบับถูก discard (อยู่แค่ใน RAM เบราว์เซอร์ขณะ process); URL.createObjectURL ถูก revoke หลัง detect

### Student: Check-in with face verification

1. นักศึกษา scan QR / ใส่ entry code → `/checkin?t=<token>`
2. Server-side query `User.faceDescriptor` → `hasFace: boolean` → pass เป็น `requiresFace` prop
3. ถ้า `requiresFace = false` → flow Phase 6 เดิม (QR + geofence)
4. ถ้า `requiresFace = true`:
   - ผ่าน geofence step ก่อน (Phase 6 logic) ถ้ามี
   - เปิด `<FaceScanModal mode="verify" />` หลัง geofence ผ่าน
   - State machine: loading-model → requesting-camera → scanning → challenge-turn (รอ |yaw| > 20°) → challenge-center (รอ |yaw| < 10°) → capture
   - ที่ frame capture: check `face.real > 0.6` (passive) → ถ้า fail = error; ถ้าผ่าน → submit descriptor
5. Server action `checkInWithQrToken(token, location?, faceDescriptor?)`:
   - หา enrollment ก่อน
   - ถ้า user มี descriptor + ไม่ส่ง descriptor มา → reject `face_required`
   - Zod validate length=1024 → ถ้าไม่ผ่าน = `face_invalid`
   - L2-normalize ทั้งคู่ → Euclidean distance
   - ถ้า distance > 0.85 → reject `face_mismatch` (return distance ไปด้วยเพื่อ debug)
   - ถ้าผ่าน → create Attendance พร้อม `faceVerified = true`
6. UI แสดง badge "ตรวจตำแหน่งแล้ว • ยืนยันใบหน้าแล้ว"

### Teacher: Override flow

- ถ้า student ติด face-mismatch หลายครั้ง (false-negative) → teacher mark attendance manually ผ่าน session report ที่มีอยู่แล้ว (Phase 5)
- ไม่ build UI override พิเศษ — re-use inline status edit
- Manual mark = `faceVerified = false` คงเดิม → audit trail บอกได้ว่าผ่านแบบ manual ไม่ใช่ face check

### Error states (student)

| Code | สาเหตุ | UI |
| --- | --- | --- |
| `face_required` | user มี descriptor แต่ client ไม่ได้ส่งมา (ปิด modal ก่อน capture) | warning, แนะนำสแกนใหม่ |
| `face_invalid` | length ไม่ตรง 1024 หรือไม่ใช่ array number | danger, สแกนใหม่ |
| `face_mismatch` | L2-normalized distance > 0.85 | danger, แสดง distance + แนะนำติดต่ออาจารย์ |
| client `camera_denied` | permission denied | warning ในกล่อง modal |
| client `liveness_timeout` | active liveness > 15 วินาที ไม่จบ | warning, ปุ่มลองใหม่ |
| client passive liveness fail | `face.real < 0.6` | danger, แสดง score |
| retry > 3 | rejected 3 ครั้งติด | block + แนะนำติดต่ออาจารย์ |

## Constants

```ts
// src/lib/face/constants.ts (Phase 7 final values)
export const FACE_MATCH_THRESHOLD = 0.85;           // L2-normalized Euclidean
export const FACE_LIVENESS_THRESHOLD = 0.6;         // face.real (passive anti-spoof)
export const FACE_YAW_THRESHOLD_DEG = 20;           // active liveness turn
export const FACE_YAW_CENTER_DEG = 10;              // active liveness center
export const FACE_LIVENESS_TIMEOUT_MS = 15_000;
export const FACE_MAX_RETRY = 3;
export const FACE_DESCRIPTOR_LENGTH = 1024;         // Human faceres output dim
```

## Privacy verification

- DB ไม่มี column สำหรับรูป (Prisma Studio เห็นเฉพาะ `Float[]`)
- Network tab — payload ทั้ง seed และ check-in เป็น array ตัวเลข ไม่มี base64/binary
- รูปที่ teacher อัพ → `URL.createObjectURL` → Human detect → `URL.revokeObjectURL` → discard
- ไม่มี endpoint ใดส่งใบหน้าออก server / third-party

## Verification

1. **Schema migration**
   - `npx prisma migrate dev --name phase7_face_scan` ผ่าน (apply Supabase แล้ว)
   - `npx prisma generate` ผ่าน
2. **Type/build**
   - `npx tsc --noEmit` ผ่าน
   - `npm run build` ผ่าน (ต้องตั้ง `serverExternalPackages: ["@vladmandic/human"]` ใน `next.config.ts` กัน Human node-build ลงไป server bundle)
3. **Manual E2E บน iPhone 13 ผ่าน cloudflared tunnel**
   - ✅ Seed: teacher อัพรูป → `User.faceDescriptor` ความยาว 1024 + `faceEnrolledAt` มีค่า
   - ✅ Re-seed: เขียนทับ descriptor เก่า
   - ✅ Check-in (seeded user, same-person + current photo, 5 รอบ): match 0.52–0.68 → `faceVerified=true`, badge ขึ้น
   - ✅ Check-in (seeded user, same-person + old student card seed): match 0.80, 0.82 (PASS at threshold 0.85)
   - ✅ Check-in (sibling, current seed): distance 0.91, 0.95 > 0.85 → reject `face_mismatch`
   - ✅ Check-in (sibling, old card seed): distance 1.13 → reject
   - ✅ Check-in (cross-person advisor): distance 1.10–1.13 → reject `face_mismatch`
   - ✅ Check-in (un-seeded user): geofence-only ผ่านปกติ
   - ⚠️ Photo-attack: ไม่ได้เทสรอบนี้ (ไม่มีอุปกรณ์ที่ 2) — defend เป็น mitigation พึ่ง active liveness + ภายหลัง
4. **Threshold tuning sample (Step 10)**
   - self+current photo (5 รอบ): 0.52, 0.54, 0.52, 0.52, 0.68
   - self+old student card (~4 ปี, 2 รอบ): 0.80, 0.82
   - sibling+current: 0.91, 0.95
   - sibling+old card: 1.13
   - advisor: 1.10–1.13
   - ลอง 0.6/0.8/1.0 → 0.6 ตึงเกิน, 1.0 หลวมเกิน, 0.8 false-reject self+old → **เลือก 0.85**
   - margin worst-case (self+old 0.82 ↔ sibling+current 0.91) = 0.09

## Implementation Risk Budget

- **Hard deadline: 8 ชั่วโมง** (ใช้จริง ~6 ชม.)
- **Branch `phase-7-face-scan`** ไม่ merge master จนกว่า demo day
- **iPhone 13 test ผ่าน cloudflared tunnel** ไม่ push GitHub
- **Bail-out trigger:** ถ้า success rate < 60% บน iPhone → revert StudentCheckInForm + checkin action (เก็บ seed page + lib เป็น artifact), mark Phase 7 = partial ใน STATE-SHORT — ไม่ trigger เพราะ E2E ผ่านครบ
