# QRoll — Phase 7 Review: Face Scan / Face Verification

> **Status:** Implemented on branch `phase-7-face-scan`, migration applied to Supabase, pending commit/push
> **Date:** 2026-05-19
> **Related PRP:** [PRP 09 — Face Scan / Face Verification (Phase 7)](../prps/09-face-scan.md)
> **Purpose:** สรุปว่า Phase 7 ทำอะไร ต่างจาก PRP ตรงไหน ทำไม และเตรียมคำตอบสำหรับอธิบายอาจารย์

---

## 1. สรุปสั้นที่สุด

Phase 7 เพิ่ม **layer สุดท้ายของ anti-proxy defense** คือ **face verification** ตอนนักศึกษาเช็คชื่อ — ตรวจว่าผู้ที่อยู่หน้ามือถือเป็นเจ้าของบัญชีจริง ไม่ใช่เพื่อนที่ได้ login + QR + อยู่ในรัศมีห้องเรียนแทน

หัวใจของ design นี้ที่ต่างจากระบบทั่วไป:

> **Source of truth ของ face identity = ฐานรูปนักศึกษาของ TU** ที่มหาวิทยาลัย verify ตอนสมัครเข้าเรียน. QRoll integrate ผ่าน API ดึงรูปมา compare ตอนเช็คชื่อ. ใน prototype นี้ mock การ integration ด้วย admin seed page เพราะ TU API ปัจจุบันส่งแค่ `type/name/email` ไม่ส่งรูป

Phase 7 ทำงานต่อจาก defense layer เดิม (TU login + Enrollment + QR token + Entry code + Geofence) แบบ **defense-in-depth** ไม่ได้แทน geofence

ผลลัพธ์หลักหลัง Phase 7:

- อาจารย์ (ทำหน้าที่จำลอง TU sync) อัปโหลดรูปนักศึกษาผ่าน `/teacher/face-seed`
- ระบบ extract `Float[1024]` descriptor ด้วย `@vladmandic/human` ในเบราว์เซอร์ → save → **รูปต้นฉบับ discard**
- นักศึกษาที่ถูก seed แล้ว เวลาเช็คชื่อต้องผ่าน face scan (passive + active liveness + match)
- นักศึกษาที่ยังไม่ถูก seed → check-in ผ่าน geofence อย่างเดียวเหมือนเดิม (backward compat)
- `Attendance.faceVerified` บอกว่าผ่าน face check หรือไม่

---

## 2. ปัญหาก่อน Phase 7

ระบบหลัง Phase 6 กัน proxy ด้วย:

- TU login จริง (กัน account ปลอม)
- Enrollment check (กันนักศึกษาคนอื่นเช็คให้)
- QR token + entry code (กัน replay)
- Geofence (กัน "ส่ง QR ให้เพื่อนเช็คจากที่อื่น")

แต่ยังเหลือ scenario:

> นักศึกษา A ให้ password TU + token QR + พาเพื่อน B เข้ามาในห้อง — B อยู่ในรัศมี geofence + login ด้วย account A → ผ่านทุก layer

Phase 7 ปิด case นี้: B กดเช็ค → กล้องเห็นหน้า B → descriptor ไม่ match กับของ A ใน DB → reject

### ทำไม face scan ทำที่ check-in ไม่ใช่ที่ login

- TU login เกิดครั้งเดียวต่อ session ของ browser, ไม่ใช่ทุกครั้งที่เช็คชื่อ → ถ้าทำที่ login ไม่ได้ตรวจการเปลี่ยนตัวระหว่าง class
- check-in คือ "จุดที่นักศึกษาอ้างว่าตัวเองอยู่ที่นี่ตอนนี้" — เป็นจังหวะที่สมเหตุสมผลที่สุดที่จะตรวจอัตลักษณ์

---

## 3. สิ่งที่ทำจริงใน Phase 7

### 3.0 Library + Model ที่ใช้ (attribution)

ระบบใช้ **`@vladmandic/human`** — open-source library โดย Vlad Mandic (MIT license) ที่รวม pre-trained model สำหรับงาน face ไว้หลายตัวให้ใช้ผ่าน API เดียวบน TensorFlow.js + WebGL

| Task               | Model ภายใน Human               | ที่มา                         |
| ------------------ | ------------------------------- | ----------------------------- |
| Face detection     | BlazeFace (TFJS port)           | Google MediaPipe              |
| Face description   | FaceRes (MobileFaceNet variant) | งานวิจัย MobileFaceNet (2018) |
| Passive anti-spoof | real-vs-fake classifier         | custom train โดย Vlad Mandic  |

**ไม่ train model เอง** เพราะ:

1. Train face recognition ต้อง dataset ใหญ่ระดับหลายแสนหน้า + GPU cluster
2. Contribution ของโปรเจ็กต์คือ **การประยุกต์ face recognition เข้ากับ flow check-in ของมหาวิทยาลัย + trust model ที่อิง TU registry** ไม่ใช่การพัฒนา CV model ใหม่

**สิ่งที่ QRoll เขียนเอง:**

- Integration logic: lazy load, singleton, dynamic import (`src/lib/face/human.ts`)
- L2-normalize + Euclidean distance (`src/lib/face/distance.ts`) — Human ไม่ได้ให้มา เขียนเอง 5 บรรทัด
- Threshold tuning + rationale (`src/lib/face/constants.ts`)
- Active liveness logic (yaw challenge state machine) — Human ให้แค่ raw `face.rotation.angle.yaw` เป็นมุม, การออกแบบ challenge เป็นของเรา
- Seed admin page + server action (mock TU sync)
- Server-authoritative match flow + retry mechanism
- UI/UX, schema design, integration กับ existing check-in flow

**Model weights ดึงจาก CDN** (`https://cdn.jsdelivr.net/...`) ครั้งแรก ~10MB, cache ในเบราว์เซอร์ ครั้งต่อไปโหลดเร็ว

### 3.1 Identity source = TU registry (mocked)

ต่างจาก face-auth ทั่วไปที่ให้ user ถ่ายรูปลงทะเบียนเอง — Phase 7 trust **upstream identity provider** คือมหาวิทยาลัย:

- TU verify ตัวตนตอนสมัครเข้าเรียน (ใช้บัตรประชาชน + รูปถ่าย + interview)
- รูปในระบบทะเบียน TU = ground truth ของ "หน้าจริงของบัญชีนี้"
- QRoll **ไม่ reinvent identity** — แค่ compare กับสิ่งที่ TU verify มาแล้ว

**ใน prototype นี้** TU API ส่งแค่ `type/name/email` ไม่มี endpoint สำหรับรูป → mock ด้วย admin seed page ที่อาจารย์อัปโหลดรูปแทน

### 3.2 Seed flow (อาจารย์/admin)

1. Teacher เข้า `/teacher/face-seed`
2. หน้าโชว์รายชื่อ student ทั้งหมดพร้อมสถานะ "sync แล้ว / ยังไม่ sync"
3. กดปุ่ม "sync รูป" → เปิด `<FaceScanModal mode="seed-from-file" />`
4. เลือกไฟล์รูป (JPG/PNG) → เบราว์เซอร์โหลดเป็น `HTMLImageElement` → Human detect → ออก descriptor 1024 ตัว
5. ส่ง descriptor + targetStudentId ไป `seedFaceForStudent` server action
6. Server: requireTeacher → Zod validate length=1024 → confirm target.role=STUDENT → update `User.faceDescriptor` + `faceEnrolledAt`
7. รูปต้นฉบับ **discard ในเบราว์เซอร์** (`URL.createObjectURL` → revoke หลัง detect)

### 3.3 Student check-in with face verification

1. นักศึกษา scan QR / ใส่ entry code → `/checkin?t=<token>`
2. Server query `User.faceDescriptor` → ถ้า length > 0 → pass `requiresFace: true` ให้ client
3. ถ้า `requiresFace = false` → flow Phase 6 เดิม (QR + geofence)
4. ถ้า `requiresFace = true`:
   - ผ่าน geofence step ก่อน (Phase 6 logic)
   - เปิด `<FaceScanModal mode="verify" />`
   - State machine: `loading-model` → `requesting-camera` → `scanning` → `challenge-turn` (รอ |yaw| > 20°) → `challenge-center` (รอ |yaw| < 10°) → `capture`
   - ที่ frame capture: check `face.real > 0.7` (passive anti-spoof) → ส่ง descriptor
5. Server action `checkInWithQrToken`:
   - หา enrollment ก่อน
   - ถ้า user มี descriptor + ไม่ส่ง descriptor มา → `face_required`
   - Zod validate length=1024 → ไม่ผ่าน = `face_invalid`
   - L2-normalize ทั้งคู่ → Euclidean distance
   - ถ้า distance > 1.0 → `face_mismatch` (return distance ไปด้วยเพื่อ debug)
   - ถ้าผ่าน → create Attendance พร้อม `faceVerified = true`
6. UI badge: "ตรวจตำแหน่งแล้ว • ยืนยันใบหน้าแล้ว"

### 3.4 Privacy-preserving storage

ใน DB:

- `User.faceDescriptor: Float[]` (~1024 ตัว, ขนาด ~1KB/คน)
- `User.faceEnrolledAt: DateTime?`
- `Attendance.faceVerified: Boolean`

**ไม่มี:**

- ไม่เก็บรูปต้นฉบับ ไม่มี blob storage
- ไม่เก็บ probe descriptor ที่ส่งมาตอน check-in (compare แล้วทิ้ง)
- ไม่เก็บ liveness score รายครั้ง

ตรวจสอบได้ใน Prisma Studio: ไม่มี column สำหรับ binary/รูป

### 3.5 Active + passive liveness

**Passive** — Human library คำนวณ `face.real` score (0–1) จาก texture/depth ของรูปกล้อง:

- รูปถ่าย / หน้าจอ มือถือส่อง = score ต่ำ
- หน้าจริง = score สูง
- Threshold = 0.6 (เริ่มที่ 0.7 — ลดเป็น 0.6 หลังเทสกับใบหน้าสูงอายุพบว่า score มักอยู่ 0.6-0.7 ทำให้ false-reject เยอะ; active liveness ยังกันรูปแบนได้)

**Active** — yaw challenge:

- ขอให้นักศึกษาหันซ้าย/ขวา (รอ |yaw| > 20°)
- แล้วหันกลับมาตรง (|yaw| < 10°)
- ที่ "ตรง" frame นั้นถึง capture descriptor + ตรวจ passive
- Timeout 15 วินาที

**ทำไมต้องมีทั้งสอง**: passive อย่างเดียวกัน flat photo ได้ แต่ถ้าคนถือรูปเคลื่อนหัวก็ยังหลอกได้บ้าง; active บังคับให้หันหน้าจริง ๆ → กันรูปถ่ายแบนทันทีเพราะรูปหันไม่ได้

---

## 4. Data model (สรุป schema changes)

### User (เพิ่ม 2 field)

- `faceDescriptor: Float[] @default([])` — embedding; `[]` = ยังไม่ sync
- `faceEnrolledAt: DateTime?` — เวลา sync ครั้งล่าสุด

### Attendance (เพิ่ม 1 field)

- `faceVerified: Boolean @default(false)`

### Migration

- `prisma/migrations/20260518172151_phase7_face_scan/`
- Apply ผ่าน `npx prisma migrate dev` ไป Supabase แล้ว

### Constants ใหม่ ([src/lib/face/constants.ts](../../src/lib/face/constants.ts))

| Constant                   | ค่า    | หน้าที่                                                                                |
| -------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `FACE_MATCH_THRESHOLD`     | 0.85   | L2-normalized Euclidean distance; ≤ 0.85 = match                                       |
| `FACE_LIVENESS_THRESHOLD`  | 0.6    | passive anti-spoof score ขั้นต่ำ (ลด 0.7 → 0.6 หลังเทสใบหน้าสูงอายุ false-reject เยอะ) |
| `FACE_YAW_THRESHOLD_DEG`   | 20     | มุมหันสำหรับ active liveness                                                           |
| `FACE_YAW_CENTER_DEG`      | 10     | มุมตรงพร้อม capture                                                                    |
| `FACE_LIVENESS_TIMEOUT_MS` | 15_000 | active liveness ทั้ง flow                                                              |
| `FACE_MAX_RETRY`           | 3      | retry ต่อ check-in                                                                     |
| `FACE_DESCRIPTOR_LENGTH`   | 1024   | Human `faceres` output dim                                                             |

---

## 5. Changes from Initial Design (PRP 09)

### 5.1 PRP เดิมระบุ `FACE_MATCH_THRESHOLD = 0.6`

**ทำจริง:** 0.85

**ทำไม:**

- PRP เดิมเขียน 0.6 ตอน design โดยอิงจาก documentation ของ face library ทั่วไปที่ embedding ถูก normalized แล้ว
- Human `faceres` embedding **ไม่ normalized** — raw Euclidean ได้ค่า 5–10+ แม้ same person
- แก้โดย L2-normalize ทั้งคู่ก่อนเทียบ → distance อยู่ในช่วง [0, 2]
- หลัง L2 norm, measurement จริงบน iPhone 13 (หลายรอบ + 2 seed types):

  | Pair                                              | Distance range                   |
  | ------------------------------------------------- | -------------------------------- |
  | Same person, current photo seed (5 รอบ)           | 0.52, 0.54, 0.52, 0.52, **0.68** |
  | Same person, old student-card seed (~4 ปี, 2 รอบ) | **0.80, 0.82**                   |
  | Sibling (พี่ชาย), current seed (2 รอบ)            | 0.91, 0.95                       |
  | Sibling, old card seed                            | 1.13                             |
  | Advisor (คนละคน), advisor's own photo seed        | 1.10–1.13                        |

- 0.6 ต่ำเกินไป → false-reject แม้ same-person ที่ scan ครั้ง variance สูง
- 1.0 หลวมเกินไป → sibling+current (0.91-0.95) ผ่านได้
- 0.8 false-reject same-person+old-card seed (0.80-0.82)
- เลือก 0.85 (compromise):
  - ครอบ same person ทั้งกรณี current + old card seed (max 0.82 < 0.85)
  - reject sibling+current (0.91) — margin 0.06
  - reject sibling+old (1.13), advisor (1.10+) ชัดเจน

**Observation สำคัญ:** photo aging กระทบ same-person มากกว่า impostor — impostor distance ไม่ลดลงตามอายุรูป seed (สอดคล้องกับ behavior ของ FaceNet-class embeddings)

**Limitation:** sample เล็ก (1 same-person × 2 seed types + 1 sibling + 1 advisor). Margin ระหว่าง self+old (0.82) กับ sibling+current (0.91) แค่ 0.09 — production ต้อง re-tune ด้วย ROC curve จากหลายคน. Threshold นี้อาจ false-accept identical twin หรือ sibling หน้าใกล้กว่า 0.85

### 5.2 `serverExternalPackages` ใน next.config.ts

**ปัญหา:** `npm run build` พังเพราะ Next รวม `@vladmandic/human` ลง server bundle → require `@tensorflow/tfjs-node` ที่ไม่มี

**แก้:**

```ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["@vladmandic/human"],
};
```

บอก Next ให้ skip bundling — library จะถูก dynamic-import ฝั่ง client เท่านั้น

### 5.3 `AUTH_TRUST_HOST=true` สำหรับ cloudflared tunnel

**ปัญหา:** เปิดผ่าน cloudflared แล้ว NextAuth ปฏิเสธ login (host header ของ proxy ไม่ตรงกับ origin ที่ trust)

**แก้:** เพิ่ม `AUTH_TRUST_HOST=true` ใน `.env.local`

ไม่ใช่ Phase 7 concern โดยตรง แต่จำเป็นเพื่อ E2E test บน iPhone จริง

### 5.4 Page layout wrapper

หน้า `/teacher/face-seed` และ `/student/settings` ต้อง wrap ด้วย `flex-1 overflow-y-auto p-6 lg:p-10` เพื่อให้ scroll ทำงาน — match pattern ของหน้าอื่น

---

## 6. Limitations (ต้องเขียนในรายงาน)

### 6.1 Mocked TU integration

- ระบบ production ต้องดึงรูปจาก TU registry ผ่าน API ที่ ITSC TU จัดเตรียม
- ปัจจุบัน TU API ไม่มี photo endpoint ในชุด API ที่ใช้ verify ตัวตน
- **Mitigation prototype:** teacher (admin) อัปโหลดแทน เพื่อพิสูจน์ว่า downstream verification logic พร้อมใช้
- **Defense:** integration layer คือฝั่งที่เปลี่ยน implementation ได้ง่ายที่สุดถ้า TU เพิ่ม endpoint — descriptor extraction + match logic + UI ไม่ต้องเปลี่ยน

### 6.2 Demo limited to seeded users + ไม่บังคับ face enrollment

- บัญชีที่ยังไม่ถูก seed จะข้าม face check → ใช้ geofence อย่างเดียว (backward compat)
- **Mitigation:** seed รูปกรรมการ/อาจารย์ที่ปรึกษาล่วงหน้าก่อน demo

**Decision: ไม่ block check-in สำหรับ user ที่ยังไม่ได้ sync รูป**

ระหว่าง Phase 7 พิจารณา 3 ทาง:

| ทาง                                                            | ผล                                    | ตัดสิน                                                             |
| -------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| A. Block check-in ถ้ายังไม่มี descriptor → force ติดต่ออาจารย์ | ปลอดภัยสูงสุด, ตรง V3 narrative       | ❌ เสี่ยง demo day: ถ้า account ใดยังไม่ seed → check-in ไม่ได้เลย |
| B. Skip face ถ้ายังไม่มี descriptor (เหมือนปัจจุบัน)           | rollout เป็น batch ได้, demo flexible | ✅ เลือก                                                           |
| C. `ClassSession.requireFace` toggle ระดับ session             | flexible สุด                          | ❌ เพิ่ม schema + UI โดยไม่จำเป็นสำหรับ prototype                  |

**เหตุผลเลือก B:**

1. **Phased rollout pattern จริง** — ระบบมหาวิทยาลัยจริงไม่ flip switch บังคับทั้ง campus วันเดียว; bootstrap ทีละคณะ/ภาควิชา
2. **Defense narrative:** "Phase 1 deployment — เปิดให้คนที่ TU sync รูปแล้วใช้ face verification, ส่วนคนที่ยังไม่ sync ใช้ geofence; Phase 2 ค่อยบังคับเมื่อ TU sync coverage = 100%"
3. **Bypass risk ต่ำใน production** — นักศึกษาไม่มี DB access; การลบ descriptor ตัวเองทำไม่ได้จาก client
4. **Demo day robustness:** ถ้ามีกรรมการที่ลืม seed → ยังเข้า demo flow ได้ (geofence-only)

**ที่ยอมรับเป็น risk:**

- ถ้า admin (ตัวร้าย) ลบ descriptor ของนักศึกษา → นักศึกษาคนนั้น skip face verification ในการเช็คชื่อครั้งต่อไป — ระบบไม่มี audit log สำหรับ descriptor mutation (deferred ไป Phase ถัดไป)

**UI placement + feature flag (defense narrative):**

ในระบบจริง TU API จะเป็นคน sync รูป — ไม่ใช่อาจารย์อัปเอง. เพื่อให้ UI ตรงกับ narrative นี้:

- ✅ Face Seed **ไม่อยู่ใน main nav** ของอาจารย์ — ย้ายไปเป็น sub-page ใต้ "ตั้งค่าระบบ" ในกล่อง "เครื่องมือ Admin (Dev)"
- ✅ Gate ด้วย env flag `ENABLE_FACE_SEED=true` (pattern เดียวกับ `DEMO_CHECKIN_ENABLED`)
  - Page `/teacher/face-seed` → `notFound()` ถ้าปิด flag
  - Server actions `seedFaceForStudent` + `clearFaceForStudent` → return `{ ok: false, reason: "disabled" }` ก่อน auth check (กัน direct call แม้รู้ URL)
  - Link ในหน้า settings → render เฉพาะตอน flag เปิด
- ✅ ใน production deploy ปิด flag → ทั้ง UI + endpoint หายไป
- Demo day: เปิด flag ผ่าน `.env.local` (local) หรือ Vercel env (deploy) ตอน seed รูปกรรมการล่วงหน้า, ปิดได้หลัง demo จบ

**Defense narrative ที่ครอบ:**
> "Face Seed เป็น mock layer สำหรับ TU photo integration — ในระบบจริง TU API จะ sync รูปอัตโนมัติ ไม่มี UI ส่วนนี้. เราเลือกใช้ feature flag + sub-page placement เพื่อให้ admin tool ไม่ปนกับ workflow ปกติของอาจารย์ + ปิดได้ง่ายตอน deploy production"

### 6.3 Threshold tuning จาก sample เล็ก

- Tune ด้วยตัวเอง 1 คน × 2 seed types (รูปปัจจุบัน + รูปบัตร นศ. ~4 ปี) + พี่ชาย × 2 seed types + อาจารย์ที่ปรึกษา 1 ครั้ง — ไม่มี ROC curve
- Margin หลังครอบ photo aging:
  - self+current (max 0.68) ↔ sibling+current (min 0.91) = 0.23
  - self+old card (max 0.82) ↔ sibling+current (min 0.91) = 0.09 (ตึง)
- **Production ต้อง:** เก็บ ROC จากหลายคน + ปรับ threshold per-population + re-sync รูปจาก TU เป็นระยะ
- **Identical twin / sibling หน้าใกล้กว่า 0.85** = false-accept (known limitation)
- **Photo aging effect:** seed รูปเก่ามาก (>4 ปี) เพิ่ม same-person distance ~0.15 แต่ไม่ลด impostor distance — ยืนยันว่า embedding ตอบสนองต่อ aging ในทิศทางที่ predictable (false-reject มากขึ้น ไม่ใช่ false-accept)

### 6.4 Video-replay attack

- ถ่ายวิดีโอเจ้าของหน้า (พร้อมหัน) เล่นใน iPad ส่องกล้องอีกเครื่อง → ผ่านทั้ง passive + active liveness ได้
- **Mitigation:** production ต้องใช้ depth sensor (Face ID) หรือ challenge แบบ random; browser-only ทำไม่ได้แม่น
- ยอมรับเป็น Limitation เพราะอยู่นอก scope ของ web app

### 6.5 False-negative ในสภาพแสง/อายุรูปต่างจาก seed + ใบหน้าสูงอายุ

- แสงสลัว / รูป registry อายุหลายปี → match distance อาจเพิ่ม
- **ใบหน้าสูงอายุ:** เทสกับแม่ (seed รูปปัจจุบัน) — distance variance สูง (0.62 ครั้ง / 0.98-1.06 อีก 3 ครั้ง) แม้อยู่ในสภาพแสงเดียวกัน + liveness score มักอยู่ 0.6-0.7 (ต่ำกว่า threshold เดิม 0.7) → false-reject บ่อย
- ลด `FACE_LIVENESS_THRESHOLD` เป็น 0.6 เพื่อรองรับ — active liveness (yaw challenge) ยังกันรูปแบนได้
- **Root cause:** model (Human / FaceNet-class) trained ส่วนใหญ่กับใบหน้าวัยรุ่น/วัยทำงาน — สูงอายุ + non-Western อาจมี variance สูงกว่า. Production แก้ด้วย multi-photo enrollment + depth sensor + domain-adapted model ซึ่งอยู่นอก scope web app
- **Mitigation:** teacher edit `Attendance.status` แบบ manual ผ่าน session report (Phase 5); เปิด re-seed ผ่าน admin page ได้ทุกเมื่อ; retry-max-3 mechanism ใน UI

### 6.6 Browser camera compatibility

- iOS Safari ต้อง 14.3+ และ HTTPS เท่านั้น
- Standalone PWA mode อาจเปิดกล้องไม่ได้
- **Mitigation:** error message ชัด + แนะนำใช้ Safari ปกติ

### 6.7 Model size + load time

- Human library + models ~10MB ครั้งแรก
- Load 2–5 วินาทีบนเน็ต 4G (CDN cache ครั้งต่อไปเร็วกว่า)

---

## 7. Files changed (สรุปสำหรับ review)

### Schema / migration

- `prisma/schema.prisma` — User.faceDescriptor/faceEnrolledAt + Attendance.faceVerified
- `prisma/migrations/20260518172151_phase7_face_scan/`

### Library

- `src/lib/face/constants.ts` — thresholds
- `src/lib/face/distance.ts` — L2-normalize + Euclidean
- `src/lib/face/human.ts` — Human singleton, lazy load, dynamic import
- `src/lib/face/types.ts` — shared types

### Server actions

- `src/app/actions/face-seed.ts` — `seedFaceForStudent` / `clearFaceForStudent` (TEACHER role)
- `src/app/actions/checkin.ts` — extended Zod schema; L2-normalize + Euclidean compare; return `face_required` / `face_invalid` / `face_mismatch` reasons + distance

### Library functions

- `src/lib/checkin.ts` — return `requiresFace: boolean` in context

### UI components

- `src/components/face/FaceScanModal.tsx` — verify mode (camera + liveness) + seed-from-file mode
- `src/components/face/FaceStatusInfo.tsx` — student-facing status widget
- `src/components/checkin/StudentCheckInForm.tsx` — open modal after geofence; track retry (max 3); show distance on mismatch
- `src/components/shell/Sidebar.tsx` — add ScanFace icon mapping

### Pages

- `src/app/(app)/teacher/face-seed/page.tsx` + `FaceSeedClient.tsx` — admin seed UI
- `src/app/(app)/student/settings/page.tsx` — student settings (account info + face status)
- `src/app/checkin/page.tsx` — query `hasFace` and pass `requiresFace` down

### Config

- `next.config.ts` — `serverExternalPackages: ["@vladmandic/human"]`
- `src/lib/nav-config.ts` — เพิ่ม Face Seed (teacher) + ตั้งค่า (student) nav items

---

## 8. Verification status

| Check                                           | สถานะ                                      |
| ----------------------------------------------- | ------------------------------------------ |
| `npx prisma migrate dev` to Supabase            | ✅                                         |
| `npx prisma generate`                           | ✅                                         |
| `npx tsc --noEmit`                              | ✅                                         |
| `npm run build` (with `serverExternalPackages`) | ✅                                         |
| iPhone 13 E2E ผ่าน cloudflared tunnel           | ✅ ยกเว้น photo-attack (ไม่มีอุปกรณ์ที่ 2) |

### Recorded E2E measurements (iPhone 13, threshold = 0.85)

| สถานการณ์                          | Seed                     | L2 distance                  | ผลลัพธ์                    |
| ---------------------------------- | ------------------------ | ---------------------------- | -------------------------- |
| Same person, scan #1–5             | current photo            | 0.52, 0.54, 0.52, 0.52, 0.68 | ✅ PASS                    |
| Same person, scan #6 (tune verify) | current photo            | 0.64                         | ✅ PASS                    |
| Same person, scan #7 (tune verify) | current photo            | 0.68                         | ✅ PASS                    |
| Same person, scan #8–9             | old student-card (~4 ปี) | 0.80, 0.82                   | ✅ PASS (threshold 0.85)   |
| Sibling (พี่ชาย)                   | current photo            | 0.91, 0.95                   | ✅ FAIL `face_mismatch`    |
| Sibling (พี่ชาย)                   | old student-card         | 1.13                         | ✅ FAIL `face_mismatch`    |
| Advisor (คนละคน) → ตัวเอง scan     | advisor's photo          | 1.10, 1.12                   | ✅ FAIL `face_mismatch`    |
| Un-seeded user check-in            | —                        | —                            | ✅ geofence-only ผ่าน      |
| Re-seed บนคนเดิม                   | —                        | —                            | ✅ descriptor ใหม่เขียนทับ |

Margins:

- self+current (0.68) ↔ sibling+current (0.91) = **0.23**
- self+old card (0.82) ↔ sibling+current (0.91) = **0.09** (worst case)

---

## 9. ที่เตรียมตอบอาจารย์

### Q: ทำไมไม่ให้นักศึกษาอัปโหลดรูปตัวเองตอนสมัคร (self-enrollment)?

ปัญหาคือ **enrollment trust problem** — ใครจะ verify ว่ารูปที่ user อัปโหลดเป็นรูปตัวเองจริง? ถ้าใช้ teacher verify ตอนเริ่ม class จะใช้เวลาเรียน + เป็น manual process ที่ไม่ scale. ผลักไปให้ identity provider (TU) ที่ verify ตอนสมัครเข้ามหาวิทยาลัยอยู่แล้ว ทำให้ระบบ check-in ไม่ต้อง reinvent identity verification

### Q: model ที่ใช้มาจากไหน เทรนเองหรือเปล่า?

ใช้ `@vladmandic/human` (MIT license) — รวม pre-trained model 3 ตัวคือ BlazeFace (face detection, Google MediaPipe), FaceRes/MobileFaceNet variant (descriptor, งานวิจัย 2018), และ anti-spoof classifier ของ Vlad Mandic เอง. **ไม่ train model เอง** เพราะต้อง dataset หลายแสนหน้า + GPU cluster ซึ่งอยู่นอก scope. Contribution ของโปรเจ็กต์อยู่ที่ integration กับ flow check-in มหาวิทยาลัย + trust model ที่อิง TU registry ไม่ใช่การพัฒนา CV model ใหม่. รายละเอียดเต็มอยู่ใน §3.0

### Q: ทำไมไม่ใช้ AWS Rekognition / Azure Face / Google Vision?

- **Privacy:** ส่งใบหน้านักศึกษาออก third-party = ปัญหา PDPA
- **Cost:** API ฟรี tier จำกัด, scale ใหญ่จ่ายต่อ call
- **Network:** เน็ตขาดตอน demo = จบ; browser ML ทำงาน offline ได้หลังโหลด model แล้ว
- **iOS compatibility:** Human (TF.js + WebGL) รันบน iOS Safari ได้โดยไม่ต้องตั้ง CORS หรือจัดการ token

### Q: ทำไมเก็บ descriptor ไม่เก็บรูป?

- ไม่ใช่ biometric ที่ระบุตัวได้โดยลำพัง (one-way embedding; reconstruct รูปกลับเป็น lossy + ต้องรู้ model)
- ขนาดเล็ก (~1KB/คน) vs รูป (~100KB+)
- ลด attack surface — DB leak = ได้แค่ vector ไม่ใช่รูปหน้านักศึกษา
- ตรง spirit ของ PDPA — เก็บข้อมูลขั้นต่ำที่จำเป็นต่อการใช้งาน

### Q: ทำไมต้องทำ active liveness (yaw challenge)?

Passive อย่างเดียวกัน flat photo ได้ แต่ photo บนมือถือเคลื่อนหัวด้วยมือก็ยังหลอกได้บ้าง. Active บังคับให้หันจริง → flat photo หันไม่ได้ → fail ทันที. ทำได้ฟรีจาก `face.rotation.angle.yaw` ของ Human, logic ~30 บรรทัด

### Q: video-replay (ถ่ายวิดีโอเจ้าของหน้าหันแล้วเล่นใน iPad) กันได้ไหม?

ตอบตรง ๆ — **กันไม่ได้บน web browser อย่างเดียว** (ตอบใน §6.4). ต้องใช้ depth sensor (Face ID/IR camera) หรือ random challenge ที่ระบบสั่ง real-time. ระบบนี้เน้น defense-in-depth + raise the bar; ไม่ใช่ unbreakable. ใน production ถ้ามี budget ใช้ native iOS app + Face ID API ได้เลย

### Q: threshold 0.85 ทำไมไม่ใช่ค่าอื่น?

ตอบใน §5.1 — tune จาก measurement จริงบน iPhone 13 หลายรอบ + 2 seed types: self+current ≤0.68, self+old-card ≤0.82, sibling+current 0.91–0.95, sibling+old-card 1.13, advisor 1.10+. ลอง 0.6/0.8/1.0 ก่อน — 0.6 ตึงเกินจน false-reject, 1.0 หลวมจน sibling ผ่าน, 0.8 false-reject same-person+old-card. เลือก 0.85 เป็น compromise: ครอบ same-person ทุก seed type + reject sibling/advisor ชัดเจน. **Limitation:** margin worst-case (self+old vs sibling+current) แค่ 0.09 — production ต้อง re-tune ด้วย ROC + sync รูป TU เป็นระยะ. Identical twin = known false-accept

### Q: ทำไม mock TU API ไม่ทำของจริง?

ตอบใน §6.1 — ITSC TU integration ใช้เวลา/permission นอกขอบเขต final project. API ปัจจุบันส่งแค่ type/name/email ไม่มี photo endpoint. Mocked seed page **แสดงว่าระบบ downstream พร้อม integrate** ทันทีเมื่อ ITSC เพิ่ม endpoint — ไม่ต้องเขียน verification logic ใหม่

### Q: ถ้านักศึกษาคนนึงเปลี่ยนหน้าตา (ทรงผม/แว่น/ฯลฯ) จะทำยังไง?

- Re-seed ได้ตลอดผ่าน `/teacher/face-seed` (teacher จะอัปโหลดรูปใหม่)
- ระหว่างที่ยังไม่ re-seed: teacher แก้ `Attendance.status` แบบ manual ผ่าน session report (Phase 5)
- ใน production: เปิด self-update flow ให้นักศึกษาส่งคำขอ re-seed + teacher approve ได้

### Q: ถ้านักศึกษาไม่มี descriptor ระบบทำยังไง? ทำไมไม่บังคับให้ทุกคนต้อง sync ก่อนเช็คชื่อ?

Backward compatible — `requiresFace` ดูจาก `User.faceDescriptor.length > 0`. ถ้ายังไม่ sync → ข้าม face step, ใช้ geofence อย่างเดียวเหมือน Phase 6 ตั้งใจไม่บังคับเพื่อรองรับ phased rollout (มหาวิทยาลัยจริงไม่ flip switch ทั้ง campus วันเดียว) — ระบบ deploy ได้ทันทีโดยไม่ต้องรอ TU sync ครบทุกคน รายละเอียดการตัดสินใจ + risk ที่ยอมรับ ดู §6.2

### Q: ทำไมเลือก server-authoritative (ไม่ใช่ client check แล้วส่ง `faceVerified=true`)?

Consistent กับ pattern Phase 6 geofence — client ส่ง `{ faceVerified: true }` มาเองได้ผ่าน DevTools. Server ต้อง compare descriptor เองทุกครั้ง. Client ส่งแค่ raw vector มา; trust boundary อยู่ที่ server

---

## Appendix A. Auth (bypass + real TU login) — สถานะหลัง refinement ระหว่าง Phase 7

Phase 7 ไม่ใช่ phase ของ auth โดยตรง แต่ระหว่าง E2E test บน iPhone เจอว่า bypass mode (สำหรับ dev/demo) ไม่ตรงกับ UX จริงของ TU login (student type studentId, not email) จึง refine ให้ตรงกัน + เก็บข้อสังเกตเกี่ยวกับ login จริงไว้สำหรับ future hardening

### A.1 Logic ปัจจุบัน

ไฟล์: `src/lib/auth.ts` — Credentials provider แยก 2 path

```
authorize(credentials)
  ├─ if BYPASS_TU_AUTH === "true" → authorizeBypass(username)
  └─ else                         → authorizeTuUser(username, password)
```

#### Path A — `authorizeBypass` (default OFF)

- input มี `@` → lookup `User.email`
- input ไม่มี `@` → lookup `User.studentId` ก่อน, fall back `User.email`
- gate ด้วย `isAllowedEmail()` (dome.tu.ac.th / tu.ac.th)
- ไม่ตรวจ password — ใช้สำหรับ dev/preview เท่านั้น

#### Path B — `authorizeTuUser` (real)

- POST `https://restapi.tu.ac.th/api/v1/auth/Ad/verify` ด้วย `{UserName, PassWord}` + header `Application-Key`
- TU response: `{status, type, username, email, tu_status, displayname_th/en, ...}`
- `isAcceptableTuUser` gate:
  - `status === true`
  - `isAllowedEmail(email)`
  - student → `email domain === dome.tu.ac.th` + `tu_status === "ปกติ"`
  - employee → `email domain === tu.ac.th`
- `mapTuRole`: `type=student → STUDENT`, `type=employee → TEACHER`
- upsert order: by email → by studentId (กรณี pre-imported) → create ใหม่
- เหตุผลที่ลำดับเป็น "email ก่อน": universal — ใช้ได้ทั้ง student และ teacher โดยไม่ต้อง branch ตาม role (teacher ไม่มี `studentId` field). Trade-off ดูใน A.5 ข้อ 5

### A.2 Source-of-truth rules

- **Role** มาจาก TU `type` field, **ไม่ใช่** จาก email domain
- **studentId** มาจาก TU `username` field (สำหรับ student) ไม่ใช่ parse จาก email
- Email domain เป็น defense-in-depth sanity check หลัง TU API verify แล้ว
- รองรับ pre-imported student (มี `studentId` แต่ `email=null`) → match ตอน first login ผ่านลำดับ upsert ข้อ 2

### A.3 การแก้ที่เกิดในช่วง Phase 7

| ก่อน                                           | หลัง                                                     | เหตุผล                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `authorizeBypass` lookup ด้วย email อย่างเดียว | studentId-first, fall back email                         | Real TU login ใช้ studentId — bypass ควร match UX จริง                                           |
| `seed.ts` student upsert `where: { email }`    | `where: { studentId }` + เพิ่ม `update: { email, name }` | Idempotent: re-seed patch row เดิมแม้ email เปลี่ยน (เคยเจอ row email=null ค้างจาก seed รอบก่อน) |

### A.4 Bypass risk (defense)

**Risk:** ใครรู้ studentId คนอื่น + ระบบเปิด `BYPASS_TU_AUTH` → login เป็นคนนั้นได้ทันที (ไม่ตรวจ password)

**Mitigation:**

- Default-closed: env var ไม่ตั้ง = real path
- UI banner สีเหลืองบนหน้า login แจ้งเตือนเมื่อ bypass active
- ใช้เฉพาะ local dev / Vercel preview — ไม่ใช่ production deploy

**Production hardening (deferred):**

- Hard guard: `if (NODE_ENV === "production") refuse bypass`
- Audit log ทุก bypass login

### A.5 Open concerns (deferred, ไม่กระทบ demo)

1. **Teacher TU username ไม่ได้ store** — schema ไม่มี `tuUsername` field; teacher จึง login ด้วย email path. ถ้า production ต้องการ login ด้วย TU staff username จริง ต้องเพิ่ม field และ update `authorizeTuUser`
2. **TU email rename edge case** — ถ้า TU เปลี่ยน email ของบัญชีเดียวกัน upsert by email อาจสร้าง row ใหม่. แก้ด้วยการ lookup by studentId ก่อนใน flow update (logic นี้มีอยู่แล้ว step 2)
3. **TU API dependency** — API ล่ม → login ไม่ได้เลย (no offline cache). Acceptable เพราะระบบ check-in ต้องการ network อยู่แล้ว
4. **Auto-create permissive** — ใคร TU verify ผ่าน + email allowed = ได้ User row ทันที. Acceptable for university SaaS เพราะ TU เป็น identity provider ที่ trust ได้
5. **Upsert lookup ลำดับ email-first** — เลือกเพราะ universal (ทั้ง student/teacher ใช้ลำดับเดียวกัน ไม่ต้อง branch). Trade-off คือ edge case: ถ้า TU re-assign email เดิมให้คนใหม่ (scenario ที่ TU ไม่ค่อยทำเพราะอีเมล TU ผูกกับบัญชีตลอดชีวิต) — step 1 จะเจอ row คนเก่า + ทับด้วย studentId คนใหม่ ผิดตัว. **Production-correct refinement:** student ควร lookup by studentId ก่อน (เป็น stable identifier ที่สุดจาก TU), teacher ค่อย lookup by email. Defer ไว้เพราะ scenario นี้ไม่เกิดในการใช้งานจริง + ไม่กระทบ demo

### A.6 ไฟล์ที่กระทบ

- `src/lib/auth.ts` — `authorizeBypass` refactor
- `src/lib/auth-config.ts` — `isAllowedEmail`, `getEmailDomain`, `normalizeEmail` (ไม่เปลี่ยน Phase 7)
- `prisma/seed.ts` — เปลี่ยน upsert key + เพิ่ม `update` block ให้ idempotent
