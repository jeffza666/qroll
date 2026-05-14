# PRP 08 — Geofence / Location Verification (Phase 6)

## Goal

เพิ่ม layer ใหม่ของ anti-proxy defense คือ **location verification** ตอนนักศึกษาเช็คชื่อ — ระบบจะตรวจว่านักศึกษาที่กดเช็คชื่ออยู่ในรัศมีใกล้ห้องเรียนจริง ไม่ใช่ส่ง QR ให้เพื่อนเช็คแทนจากนอกพื้นที่

Phase 6 นี้ทำงานร่วมกับ defense layer เดิม (TU login + Enrollment check + QR token + Entry code) แบบ defense-in-depth ไม่ใช่แทน

## Non-goals

- **Map picker UI** — ใช้ปุ่ม "ใช้ตำแหน่งปัจจุบัน" จาก browser geolocation พอ (อาจารย์ไปยืนในห้องจริงด้วยมือถือเพื่อ set anchor)
- **Custom radius per course** — ใช้ค่า constant 150m ทั่วระบบ (เปิด config ทีหลังได้)
- **Grace / pending workflow** เมื่ออยู่นอกพื้นที่ — block ทันที, นักศึกษาที่มีเหตุผลให้อาจารย์ mark EXCUSED แทน
- **"Test geofence" feature** ให้อาจารย์ลองก่อนคาบ
- **Spoof detection** (DevTools mock location, rooted Android fake-GPS) — ยอมรับเป็น Limitation
- **Hardware-based positioning** (BLE beacon, NFC, WiFi RTT) — ระบุเป็น future work
- **Face verification** — เป็น Phase 7 (stretch) ไม่อยู่ใน PRP นี้

## Decisions Summary

| จุด | เลือก | เหตุผล |
| --- | --- | --- |
| **Anchor model** | (1) course saved anchor + (2) opt-out "ไม่ตรวจตำแหน่ง" | Saved anchor ที่อาจารย์ตั้งจากมือถือในห้องจริงครั้งเดียวคือ source of truth; opt-out เผื่ออาจารย์ไม่อยากใช้ feature นี้ — initial design มี option ที่ 3 (`teacher_current`) แต่ตัดออกกลาง Phase 6 (ดู §"Changes from Initial Design") |
| **Radius** | 150m fixed | ครอบคลุมห้องเรียน/ตึก + ทนต่อ indoor GPS degradation; ค่าคงที่ทำให้ defendable; เปิด config ทีหลังได้ (initial design 100m — ดู §"Changes from Initial Design") |
| **Effective radius (student side)** | `150m + accuracyM` ของ student | ชดเชย GPS noise ของนักศึกษาเอง — ถ้านักศึกษา accuracy 30m → effective 180m, ไม่ลงโทษนักศึกษาเพราะ GPS chip ตัวเอง |
| **Student accuracy ceiling** | `STUDENT_ACCURACY_MAX_M = 200` | accuracy แย่กว่า 200m = ปฏิเสธไม่ให้ check-in (เกือบทั้งหมดคือ laptop WiFi-only / IP fallback); มือถือทั่วไป 5-80m ผ่านสบาย |
| **Teacher accuracy gate (save anchor)** | ≤50m pass / 50-150m warn / >150m block | กัน laptop GPS เพี้ยนทำให้ anchor ผิด → block นักศึกษาทั้งห้อง |
| **นักศึกษาอยู่นอกพื้นที่** | Block ทันที | Anti-proxy ต้องเด็ดขาด; แก้ผ่านอาจารย์ override → mark EXCUSED |
| **Student permission denied / GPS unavailable** | Block + ข้อความชัด | ปฏิเสธ = ไม่มี anti-proxy signal ที่ต้องการ; ถ้ายอม bypass จะเปิดช่องโกง |
| **เก็บข้อมูลนักศึกษา** | `distanceM` + `accuracyM` only | Privacy: ไม่เก็บ lat/lng ของนักศึกษา; audit ได้ว่าเช็คชื่อในระยะเท่าไหร่ + อุปกรณ์แม่นแค่ไหน |
| **เก็บ anchor ของ session** | snapshot `anchorLat`, `anchorLng`, `anchorSource` ใน ClassSession | ถ้าอาจารย์เปลี่ยน course anchor ทีหลัง ค่าเก่ายังคงอยู่ = audit ได้; `anchorSource` เหลือใช้แค่ `COURSE_SAVED` หลัง mid-phase pivot (enum `TEACHER_CURRENT` ค้างใน DB) |
| **Backward compatibility** | Session ที่ไม่มี anchor → bypass check, check-in เหมือนเดิม | Phase 5 flow ยังใช้ได้; ไม่บังคับทุก course; opt-in per session |
| **ทำไม geolocation (ไม่ใช่ BLE/NFC/WiFi BSSID)** | เป็นทางเดียวที่ web standard รองรับโดยไม่ต้องลงทุน hardware และไม่ทิ้ง user ใช้ iOS Safari | BLE/NFC: iOS Safari ไม่รองรับ Web Bluetooth/Web NFC + ต้องซื้อ beacon/tag ทุกห้อง; WiFi BSSID: browser ไม่ให้อ่าน BSSID ของ AP ปัจจุบัน (privacy) ต้องเป็น native app; IP CIDR: คนใน hostel/coffee shop เดียวกันก็ผ่าน + คนใช้ 4G ในห้องไม่ผ่าน |
| **ทำไม distance check ฝั่ง server (ไม่เชื่อ client)** | server-side authoritative | client ส่ง "อยู่ในห้อง: true" มาเองได้; server ต้องคำนวณ distance เองจาก lat/lng ที่ส่งมา |

## Limitations (ต้องเขียนในรายงาน)

1. **Browser geolocation spoofable**
   - Chrome DevTools → Sensors panel → ใส่ lat/lng ปลอม (ใครก็ทำได้)
   - Mock-location apps บน rooted Android (ต้องอาศัยความรู้/ความตั้งใจ)
   - iOS jailbreak (ยาก, น้อยมาก)
   - Mitigation: defense-in-depth — ต้องผ่าน login + enrollment + QR/entry code พร้อมกัน ทำให้ effort สูงกว่า casual proxy

2. **GPS accuracy ผันแปร**
   - มือถือ/iPad ที่มี GPS chip: ~5-20m
   - Laptop ใช้ WiFi triangulation: ~30-200m (ดีขึ้นในที่ที่มี WiFi APs ของ Google database)
   - Hotspot ส่วนตัวจากมือถือ: fallback ไป IP geolocation → ห่างกิโล
   - Mitigation: accuracy gate ฝั่ง teacher + saved anchor model + accuracy buffer ฝั่ง student

3. **Permission denied**
   - User ปฏิเสธ permission → block check-in
   - Mitigation: เขียนข้อความบอกชัดว่าต้องอนุญาตเพื่อเช็คชื่อ + ลิงก์ไปวิธีเปิด permission

4. **Indoor GPS degradation**
   - ในตึก/ห้องที่ไม่มี window, GPS ตรงรับสัญญาณยาก → fallback ไป network-based positioning ที่แม่นน้อยกว่า
   - Mitigation: accuracy buffer และ radius 150m พอครอบคลุมห้องเรียน/ตึก

## Data Model

### Course (เพิ่ม fields)
- `geofenceLat: Float?` — anchor latitude ที่อาจารย์ตั้ง (saved)
- `geofenceLng: Float?` — anchor longitude

ถ้าทั้งคู่ null = course นี้ยังไม่เคย save anchor → ตอนเปิดคาบจะตรวจตำแหน่งไม่ได้ (เปิดแบบไม่มี geofence เท่านั้น)

### ClassSession (เพิ่ม fields)
- `anchorLat: Float?`
- `anchorLng: Float?`
- `anchorSource: AnchorSource?` (enum: `COURSE_SAVED` | `TEACHER_CURRENT`) — ปัจจุบันใช้แค่ `COURSE_SAVED`; ค่า `TEACHER_CURRENT` ค้างใน DB enum หลัง mid-phase pivot แต่ไม่มี row เขียนค่านี้

ทั้ง 3 null = session นี้ไม่เปิด geofence (opt-out หรือ legacy session ก่อน Phase 6)

### Attendance (เพิ่ม fields)
- `distanceM: Int?` — ระยะห่างจาก anchor ตอนเช็คชื่อ (เมตร)
- `accuracyM: Int?` — accuracy ที่ browser รายงาน

ทั้ง 2 null = check-in นี้ไม่ได้ผ่าน geofence (session ไม่มี anchor หรือเป็น legacy)

### ไม่เก็บ lat/lng ของนักศึกษา
เพื่อ privacy — ระบบไม่ต้องการรู้ตำแหน่งนักศึกษา ต้องการแค่ "ผ่าน/ไม่ผ่าน + ใกล้แค่ไหน" เท่านั้น

## Flows

### Teacher: Save course anchor (one-time setup)

1. ไปที่ `/teacher/courses/[id]/edit` (หรือทำตอน create course — มี picker เดียวกัน optional)
2. มี section "ตำแหน่งห้องเรียน — ไม่บังคับ" (component แยก ไม่อยู่ใน CourseForm core)
3. แสดงสถานะปัจจุบัน:
   - ถ้ามี anchor → แสดง lat/lng + ปุ่ม "ลบตำแหน่ง"
   - ถ้ายังไม่มี → warning amber "ยังไม่ได้บันทึกตำแหน่ง — เปิดคาบจะตรวจตำแหน่งไม่ได้"
4. ปุ่ม "ใช้ตำแหน่งปัจจุบัน" → request `navigator.geolocation.getCurrentPosition()`
   - accuracy ≤ 50m → pass
   - 50-150m → pass with warn "ความแม่นยำต่ำ (ใช้ laptop?) แนะนำให้ทำบนมือถือในห้องจริง"
   - > 150m → block ไม่ให้บันทึก
5. Server action `saveCourseGeofence(courseId, lat, lng)` → update Course.geofenceLat/Lng

### Teacher: Open session with location choice

1. กดปุ่ม "เปิดเช็คชื่อ" → Modal เดิม (duration / grace)
2. **เพิ่ม section**: "การตรวจสอบตำแหน่ง"
3. มี 2 ตัวเลือกเท่านั้น:
   - `course_saved` — ตรวจตำแหน่ง (course saved) — default ถ้า course มี saved anchor
   - `none` — ไม่ตรวจตำแหน่ง
   - ถ้า course ไม่มี saved anchor → option `course_saved` ถูก disable + แสดงคำอธิบาย neutral slate "วิชานี้ยังไม่ได้ตั้งตำแหน่งห้องเรียน — จะเปิดคาบโดยไม่ตรวจตำแหน่ง"
4. กดเปิด session → ส่ง `{ anchorSource, anchorLat?, anchorLng? }` ไป `openSession`
5. Server: snapshot anchor ลงใน ClassSession (source = `COURSE_SAVED` เท่านั้น)

### Student: Check-in with geofence

1. นักศึกษา scan QR → `/checkin?t=<token>`
2. Server-side: `getCheckInContext` ตอนนี้ return `requiresLocation: boolean` ด้วย
3. ถ้า `requiresLocation = false` → flow เดิม (Phase 5)
4. ถ้า `requiresLocation = true`:
   - StudentCheckInForm แสดง section "ระบบจะตรวจตำแหน่งของคุณ"
   - กดปุ่ม "ยืนยันเข้าเรียน" → ขอ permission → `navigator.geolocation.getCurrentPosition`
   - ส่ง `{ lat, lng, accuracy }` ไป `checkInWithQrToken` (server action)
5. Server action:
   - ถ้า student `accuracyM` > `STUDENT_ACCURACY_MAX_M` (200) → reject `location_inaccurate`
   - คำนวณ haversine distance จาก session anchor
   - effective radius = `GEOFENCE_RADIUS_M (150) + accuracyM`
   - ถ้า distance > effective radius → reject เป็น `{ ok: false, reason: "out_of_range", distanceM, requiredM }`
   - ถ้าผ่าน → สร้าง Attendance พร้อม `distanceM` + `accuracyM` (lat/lng ของนักศึกษา**ไม่**เก็บ)

### Error states (student)

- Permission denied → `{ ok: false, reason: "location_denied" }`
- GPS unavailable / timeout → `{ ok: false, reason: "location_unavailable" }`
- Accuracy แย่เกิน 200m → `{ ok: false, reason: "location_inaccurate" }`
- Out of range → `{ ok: false, reason: "out_of_range", distanceM }`
- Missing location data (session requires but client didn't send) → `{ ok: false, reason: "location_required" }`

## Verification

1. **Schema migration**
   - `npx prisma migrate dev --name phase6_geofence` ผ่าน
   - `npx prisma generate` ผ่าน
2. **Type/build**
   - `npx.cmd tsc --noEmit` ผ่าน
   - `npm.cmd run build` ผ่าน
3. **Manual E2E**
   - Teacher: ตั้ง course anchor (จากมือถือจริงหรือ DevTools Sensors)
   - Teacher: เปิด session ด้วย `course_saved` → session มี anchor
   - Student (อยู่ในรัศมี): check-in สำเร็จ, `distanceM` มีค่า, badge "location verified" ขึ้น
   - Student (อยู่นอกรัศมี — DevTools Sensors ใส่พิกัดไกล): reject พร้อม distance
   - Student (permission denied — DevTools block): reject พร้อมข้อความ permission
   - Student (accuracy แย่ >200m): reject `location_inaccurate`
   - Course ไม่มี anchor + เลือก `none`: check-in flow เดิม, no `distanceM` saved
4. **Report**
   - Session report แสดง badge 📍 ที่แถวของ attendance ที่ผ่าน geofence
   - แถวที่ไม่มี `distanceM` (legacy/opt-out) ไม่แสดง badge

## Changes from Initial Design

เนื้อหา PRP ด้านบนถูก sync กับ implementation จริงแล้ว — ส่วนนี้เก็บไว้เพื่อ audit/ป้องกัน defense: "PRP กับของจริงตรงกันมั้ย?"

### 5.1 ตัด `teacher_current` ออกจาก open-session flow

- **เดิม**: 3 ตัวเลือกตอนเปิดคาบ (`course_saved` / `teacher_current` / `none`)
- **เปลี่ยนเป็น**: 2 ตัวเลือก (`course_saved` / `none`)
- **เหตุผล**: source of truth เดียวคือ "ตำแหน่งที่ตั้งจากมือถือในห้องจริง" — `teacher_current` ตอนเปิดคาบจาก laptop ทำให้ anchor เพี้ยน 30-200m แล้ว block ทั้งห้องผิด; การมี 2 ที่ที่ตั้ง anchor ได้ทำให้ mental model สับสน. หนึ่ง code path น้อยลง = bug surface น้อยลง
- **ผลข้างเคียง**: `AnchorSource.TEACHER_CURRENT` enum ยังค้างอยู่ใน DB (ไม่มี row ใช้) — deferred cleanup

### 5.2 เพิ่ม geofence picker (optional) ใน course CREATE form

- **เดิม**: ตั้ง anchor ได้เฉพาะหน้า edit (one-time setup หลังสร้าง)
- **เปลี่ยนเป็น**: หน้า create ก็มี picker เดียวกัน (optional, ข้ามได้)
- **เหตุผล**: ลด friction — อาจารย์ที่อยู่ในห้องตอนสร้างวิชาตั้งได้เลย ไม่ต้องเข้าหน้า edit อีกรอบ; component ใช้ตัวเดียวกัน reuse ผ่าน `belowFields` slot prop

### 5.3 Student accuracy ceiling = 200m (ไม่ใช่ 500m)

- **เดิม**: ไม่กำหนดเพดาน (PRP เขียนเฉพาะ teacher gate)
- **เปลี่ยนเป็น**: `STUDENT_ACCURACY_MAX_M = 200` — accuracy แย่กว่านี้ปฏิเสธทันที (`location_inaccurate`)
- **เหตุผล**: 200m คือ sweet spot — ปฏิเสธ laptop WiFi-only / IP-fallback (มัก 300-2000m) ที่จะทำให้ effective radius บานเกินตึก; ยอมรับมือถือทั่วไป (5-80m) สบาย ๆ; เกือบทั้งหมดของ student เช็คชื่อด้วยมือถือ — case laptop เป็น edge case
- **เปรียบเทียบ threshold**:

| threshold | ผลกระทบ | ตัดสิน |
| --- | --- | --- |
| 100 | strict; laptop ส่วนใหญ่ผ่านไม่ได้ | เข้มไป |
| 200 | มือถือผ่าน, laptop WiFi-only ไม่ผ่าน | ✓ เลือก |
| 500 | laptop ผ่านได้ แต่ effective radius บานเป็น 650m | กว้างไป (ไม่ defendable) |

### 5.4 Radius 100m → 150m

- **เดิม**: `GEOFENCE_RADIUS_M = 100`
- **เปลี่ยนเป็น**: `GEOFENCE_RADIUS_M = 150`
- **เหตุผล**: indoor GPS ในห้องเรียนใหญ่ /ตึกหลายชั้น degrade เป็น 30-100m เป็นปกติ; 100m + accuracy buffer ยังพอ แต่ตัดเฉียดในห้องโถง — 150m ให้ buffer ที่ defendable โดยไม่กว้างจนคนเดินอยู่ข้างตึกแล้วผ่าน; effective radius = `150 + accuracyM` ยังคงคอนเซ็ปต์เดิม
