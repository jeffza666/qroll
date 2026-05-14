# QRoll — Phase 6 Review: Geofence / Location Verification

> **Status:** Implemented on branch `phase-6-geofence`, migration applied to Supabase, pending commit/push
> **Date:** 2026-05-14
> **Related PRP:** [PRP 08 — Geofence / Location Verification](../prps/08-geofence.md)
> **Purpose:** สรุปว่า Phase 6 ทำอะไร เปลี่ยนอะไรไปจาก PRP ตอนทำจริง ทำไม และเตรียมคำตอบสำหรับอธิบายอาจารย์

---

## 1. สรุปสั้นที่สุด

Phase 6 เพิ่ม **layer ใหม่ของการกัน proxy attendance** คือ "location verification" — ตอนนักศึกษากดเช็คชื่อ ระบบจะตรวจว่าอยู่ในรัศมีใกล้ห้องเรียนจริง ไม่ใช่ส่ง QR ให้เพื่อนเช็คให้จากที่อื่น

Phase 6 ทำงานร่วมกับ defense layer เดิม (TU login + Enrollment check + QR token + Entry code) แบบ **defense-in-depth** — ไม่ได้แทนของเดิม แต่เพิ่มอีกชั้นให้ casual proxy attack ทำได้ยากขึ้น

ผลลัพธ์หลักหลัง Phase 6:

- อาจารย์บันทึก "anchor" ของห้องเรียนได้ครั้งเดียวจากมือถือในห้องจริง
- เปิดคาบเลือกได้ระหว่าง "ตรวจตำแหน่ง" กับ "ไม่ตรวจ" (opt-out ได้)
- นักศึกษาเช็คชื่อจะถูกตรวจระยะห่างจาก anchor ฝั่ง server
- เก็บแค่ระยะห่าง (`distanceM`) และความแม่นยำ (`accuracyM`) — **ไม่เก็บพิกัดนักศึกษา** เพื่อ privacy
- หน้า session report มี badge แสดงว่าแถวไหนผ่าน location verification

---

## 2. ปัญหาก่อน Phase 6

### 2.1 Proxy attendance ยังเป็นไปได้

ระบบเดิมกัน proxy ด้วย:
- ต้อง login TU จริง (กัน account ปลอม)
- ต้องอยู่ใน Enrollment (กันนักศึกษาคนอื่นมาเช็คให้)
- QR token + entry code (กัน replay หลังจาก session ปิด)

แต่ถ้านักศึกษา A ส่งภาพ QR หรือ entry code ให้เพื่อน B ที่ login ด้วย account ของ A ได้ → ยังเช็คสำเร็จ
ก่อน Phase 6 ระบบไม่มีทางรู้ว่า B อยู่ที่ไหนตอนเช็ค

### 2.2 ทำไมเลือก "geolocation" ไม่ใช่อย่างอื่น

ตอน design มี alternative หลายตัว แต่ถูกตัดทิ้งเพราะข้อจำกัด:

| ทางเลือก | ทำไมไม่ใช้ |
|---|---|
| **BLE beacon** | iOS Safari ไม่รองรับ Web Bluetooth + ต้องซื้อ hardware ทุกห้อง |
| **Web NFC** | iOS Safari ไม่รองรับ — ทิ้งนักศึกษาทุกคนที่ใช้ iPhone |
| **WiFi BSSID match** | Browser ไม่อนุญาตให้อ่าน BSSID ของ AP (privacy) ต้องเป็น native app |
| **IP CIDR match** | คน 4G ในห้องไม่ผ่าน, คนใน hostel ติดกันก็ผ่านได้ |
| **Geolocation API** ✅ | เป็นทางเดียวที่ web standard รองรับโดยไม่ทิ้ง iOS user |

ข้อแลกคือ geolocation **spoofable ผ่าน DevTools ได้** → เขียนเป็น Limitation ในรายงานชัดเจน

---

## 3. สิ่งที่ทำจริงใน Phase 6

### 3.1 Course-level anchor (saved location)

อาจารย์เข้าหน้าแก้ไขรายวิชา → section "ตำแหน่งห้องเรียน" → กดปุ่ม "ใช้ตำแหน่งปัจจุบัน" จากมือถือในห้องจริง → ระบบบันทึก `Course.geofenceLat/Lng`

มี accuracy gate ฝั่ง client:
- accuracy > 150m → **block** ("ความแม่นยำต่ำเกินไป — แนะนำทำบนมือถือในห้องเรียนจริง")
- 50–150m → confirm
- ≤ 50m → ผ่านเลย

**เหตุผลของ gate**: ถ้าอาจารย์เปิด picker บน laptop ที่ใช้ WiFi triangulation จะได้ accuracy ~50–200m → anchor ผิดที่ → block ทั้งห้อง

นอกจากหน้าแก้ไข ยังเพิ่ม picker เดียวกันในหน้า **สร้างรายวิชา** เป็น optional section — อาจารย์เซ็ตทันทีตอนสร้างหรือข้ามไปก็ได้

### 3.2 Open-session location choice

ตอนกด "เปิดเช็คชื่อ" modal มี radio:

| ตัวเลือก | ใช้เมื่อ |
|---|---|
| **ตรวจตำแหน่ง (course saved)** | course มี anchor — ใช้ค่าที่บันทึกไว้ |
| **ไม่ตรวจตำแหน่ง** | opt-out คาบนี้ ไม่ตรวจ location |

ถ้า course ยังไม่มี anchor → เลือกได้แค่ "ไม่ตรวจตำแหน่ง" + มี note บอกว่า "ไปบันทึกตำแหน่งห้องที่หน้าแก้ไขก่อน"

Server snapshot `anchorLat/Lng/anchorSource` ลง `ClassSession` ตอนเปิด — ไม่ใช้ join กับ `Course.geofenceLat` ตอนตรวจเพื่อกัน race: ถ้าอาจารย์แก้ anchor หลังเปิดคาบไปแล้ว, session เดิมยังใช้ค่าเดิม (historical truth)

### 3.3 Student check-in flow

1. นักศึกษา scan QR / กรอก entry code → server return context `{ requiresLocation: boolean }` (ไม่ส่งพิกัด anchor ไปให้ client — privacy)
2. ถ้า `requiresLocation = true` → form ขอ permission + `navigator.geolocation.getCurrentPosition()`
3. ส่ง `{ lat, lng, accuracyM }` ไป server action
4. Server ตรวจ:
   - accuracy > `STUDENT_ACCURACY_MAX_M` (200m) → reject `location_inaccurate`
   - คำนวณ haversine distance จาก session anchor
   - `effectiveRadius = GEOFENCE_RADIUS_M (150m) + studentAccuracy`
   - ถ้า distance > effective radius → reject `out_of_range` พร้อม distance
   - ผ่าน → สร้าง Attendance พร้อม `distanceM` + `accuracyM`

**ทำไมต้อง server-side?** Client ส่งฟิลด์ "อยู่ในรัศมี: true" มาเองได้ → server ต้องคำนวณเองทุกครั้งจาก `lat/lng` ที่ส่งมา

### 3.4 Privacy-preserving storage

`Attendance` เก็บแค่ 2 column ใหม่:
- `distanceM Int?` — ระยะห่างจาก anchor (เมตร)
- `accuracyM Int?` — accuracy ของอุปกรณ์นักศึกษา ตอนเช็คชื่อ

**ไม่เก็บ `lat/lng` ของนักศึกษา** — ระบบไม่ต้องรู้ตำแหน่งนักศึกษา ต้องการแค่ "ผ่าน/ไม่ผ่าน + ใกล้แค่ไหน + อุปกรณ์แม่นแค่ไหน" สำหรับ audit

### 3.5 Session report badge

หน้า session ที่ปิดแล้ว แถวที่มี `distanceM != null` จะมี badge เล็ก ๆ `📍 Xm` ขึ้นข้างชื่อนักศึกษา + tooltip อธิบายว่า "ตรวจตำแหน่งแล้ว ห่างห้อง ~Xm"

แถว legacy (Phase 5 หรือ session ที่ opt-out) ไม่มี badge

---

## 4. Data model (สรุป schema changes)

### Course (เพิ่ม)
- `geofenceLat: Float?` — anchor latitude
- `geofenceLng: Float?` — anchor longitude

### ClassSession (เพิ่ม)
- `anchorLat: Float?`
- `anchorLng: Float?`
- `anchorSource: AnchorSource?` — enum `COURSE_SAVED` | `TEACHER_CURRENT` (เก็บไว้แต่ไม่ write ใหม่หลัง pivot)

### Attendance (เพิ่ม)
- `distanceM: Int?`
- `accuracyM: Int?`

### Migration
- `prisma/migrations/20260514120000_phase6_geofence/`
- Apply ผ่าน `npx prisma migrate deploy` ไป Supabase แล้ว

### Constants ใหม่ ([src/lib/geo/constants.ts](../../src/lib/geo/constants.ts))

ระบบมี 4 constants ที่ทำงานคนละหน้าที่ — สรุปเป็นตารางก่อน แล้วค่อยขยาย:

| Constant | ค่า | ใช้ตอนไหน | ใช้กับใคร |
| --- | --- | --- | --- |
| `GEOFENCE_RADIUS_M` | 150 | นักศึกษากด check-in | server เช็คระยะนักศึกษา-anchor |
| `STUDENT_ACCURACY_MAX_M` | 200 | นักศึกษากด check-in | server กรอง accuracy ที่แย่เกินไป |
| `TEACHER_ACCURACY_GOOD_M` | 50 | อาจารย์ตั้ง anchor | client เตือน UX ตอนกด "ใช้ตำแหน่งปัจจุบัน" |
| `TEACHER_ACCURACY_POOR_M` | 150 | อาจารย์ตั้ง anchor | client block ไม่ให้บันทึก anchor ที่เพี้ยน |
| `GEOLOCATION_OPTIONS` | (object) | ทุกครั้งที่ขอ GPS | browser geolocation API |

ทุกตัวอยู่รวมกันที่ `src/lib/geo/constants.ts` ตัวเดียว — แก้ที่นี่ที่เดียวมีผลทั้งระบบ (ไม่กระจายเป็น magic number)

---

**1) `GEOFENCE_RADIUS_M = 150` — "นักศึกษาต้องอยู่ในรัศมีกี่เมตรของห้อง"**

- คือรัศมีพื้นฐานที่ server ใช้ตอนคำนวณว่านักศึกษา "อยู่ในห้อง" หรือไม่
- ใช้คู่กับ accuracy ของนักศึกษาเสมอ: `effectiveRadius = 150 + studentAccuracyM`
- ตัวอย่าง: นักศึกษามือถือ accuracy 20m → effective 170m; นักศึกษา accuracy 80m → effective 230m
- **ทำไม 150 (ไม่ใช่ 100 ตาม PRP เดิม)**: indoor GPS ในตึก/ห้องโถงใหญ่ degrade เป็น 30-100m เป็นปกติ; 100 + buffer ตัดเฉียดไป — 150 ให้ห้องโถงผ่านได้ โดยไม่กว้างจน "เดินผ่านหน้าตึก" ก็เช็คได้
- **ทำไมไม่กว้างกว่านี้ (เช่น 300)**: ต้อง defendable — 150m ตรงกับ "ตึกเดียว" อธิบายให้ committee ได้

**2) `STUDENT_ACCURACY_MAX_M = 200` — "เพดาน accuracy ที่ยอมรับ"**

- ถ้า browser ของนักศึกษารายงาน accuracy แย่กว่า 200m → server reject ทันที (`location_inaccurate`)
- เป็น **คนละเรื่อง** กับ radius — radius คือ "อยู่ไกลกี่เมตร" / ceiling คือ "อุปกรณ์แม่นแค่ไหน"
- **ทำไมต้องมี ceiling**: ถ้าไม่มี เพดาน effective radius จะบานไปเรื่อย ๆ ตาม accuracy ที่แย่ — laptop WiFi-only accuracy 500m จะได้ effective radius 650m = ครอบคลุมหลายตึก ไม่ใช่ห้องเรียนแล้ว
- **ทำไม 200 (ไม่ใช่ 100 หรือ 500)**:
  - 100 = strict เกิน, laptop ส่วนใหญ่ไม่ผ่าน (แม้แต่ใน WiFi ที่ดี)
  - 500 = หละหลวม, effective radius บานเป็น 650m ตึกข้างเคียงเช็คได้
  - 200 = sweet spot — มือถือทั่วไป (5-80m) ผ่านสบาย, laptop WiFi-only ที่ accuracy 300m+ ปฏิเสธ
- **assumption**: นักศึกษาส่วนใหญ่เช็คชื่อด้วยมือถือ (สมเหตุสมผลในสภาพห้องเรียน) — เคส laptop เป็น edge case ที่ยอมรับว่าอาจต้องสลับเครื่อง

**3) `TEACHER_ACCURACY_GOOD_M = 50` / `TEACHER_ACCURACY_POOR_M = 150` — "Gate ตอนอาจารย์ตั้ง anchor"**

- ใช้ตอนอาจารย์กดปุ่ม "ใช้ตำแหน่งปัจจุบัน" บนหน้าตั้ง anchor (course create/edit)
- 3 zone:
  - accuracy ≤ 50m → ✓ ผ่านไม่มีคำเตือน (มือถือที่ใช้ GPS chip จริง)
  - 50–150m → ⚠ ผ่านพร้อมเตือน "ความแม่นยำต่ำ (ใช้ laptop?) แนะนำมือถือในห้องจริง"
  - \> 150m → ✗ block ไม่ให้บันทึกเลย
- **ทำไม strict กว่า student** (50/150 vs student 200): anchor ผิด 1 ครั้ง = block นักศึกษาทั้งห้องทุกคาบ; student accuracy แย่ = บล็อกแค่ตัวเอง (และเขา retry ได้). ผลกระทบไม่สมมาตร เลย gate ฝั่งอาจารย์ต้องเข้มกว่า
- **ทำไม 50/150 ไม่ใช่เลขอื่น**: 50m คือ ceiling ของมือถือ GPS ที่ "ดี"; 150m เท่ากับ `GEOFENCE_RADIUS_M` (anchor เพี้ยน 150m = ในกรณีแย่ที่สุดยังพอครอบห้องได้ด้วย buffer — แต่ถ้าเพี้ยนกว่านี้คือ laptop เพี้ยนทั้งหมด ต้อง block)

**4) `GEOLOCATION_OPTIONS` — option ที่ส่งให้ browser ตอนขอ GPS**

```ts
{ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
```

- `enableHighAccuracy: true` → บอก browser พยายามใช้ GPS chip จริง (ถ้ามี) ก่อน fallback ไป WiFi/IP — แลกกับใช้แบตเตอรี่/เวลามากขึ้น แต่ accuracy ดีกว่ามาก สำคัญสำหรับ anti-proxy
- `timeout: 15_000` (15 วินาที) → ถ้า GPS หาไม่เจอใน 15 วิ ให้ error แทนรอไม่จบ; 15 วิคือสมดุล — สั้นไป (5 วิ) GPS chip ยังไม่ lock; ยาวไป (60 วิ) นักศึกษาจะคิดว่าค้าง
- `maximumAge: 0` → "ห้ามใช้ cache" บังคับขอตำแหน่ง**ใหม่**ทุกครั้ง; ถ้ายอม cache นักศึกษาที่เปิดแอปไว้ตอนอยู่ห้องเรียนแล้วเดินออกมาเช็คทีหลังจะผ่าน — กัน proxy แบบนี้

### Library ใหม่ ([src/lib/geo/haversine.ts](../../src/lib/geo/haversine.ts))
- `haversineDistanceM({lat,lng}, {lat,lng}) → number`

---

## 5. Changes from Initial Design (PRP 08)

ระหว่างทำจริงมี 3 จุดที่ต่างจาก PRP — บันทึกไว้เพื่อความ defendable:

### 5.1 ตัด `teacher_current` ออกจาก open-session choice

**PRP เดิม**: 3 ตัวเลือก (`course_saved` / `teacher_current` / `none`)
**ทำจริง**: 2 ตัวเลือก (`course_saved` / `none`)

**ทำไมตัด**:
- ลองใช้จริงพบว่า "อาจารย์เปิดคาบจาก laptop ที่ห้องพัก แล้วเลือก current" → anchor ผิด → block ทั้งห้อง
- ถ้าอยากใช้ "current" ต้องเปิดคาบจากมือถือในห้องเท่านั้น — แต่ practical ของอาจารย์คือเปิดคาบจาก laptop ในห้อง
- การมี 2 ทางเดียวกัน (current vs saved) ทำให้ user สับสนว่าควรเลือกอันไหน
- **ตัดสินใจ**: single source of truth = หน้าแก้ไขรายวิชา → เปลี่ยน anchor ต้องไปที่นั่นเท่านั้น → mental model ตรงกัน

**ผลกระทบ schema**: `AnchorSource.TEACHER_CURRENT` ยังคงอยู่ใน enum เพราะไม่อยาก migrate ตอนนี้ — ไม่มี code เขียนค่านี้ลง DB อีกแล้ว (อาจ drop ทีหลังถ้าตรวจว่าไม่มีแถวไหนใช้)

### 5.2 เพิ่ม geofence picker ในหน้าสร้างรายวิชา (optional)

**PRP เดิม**: anchor setup อยู่ที่หน้า edit เท่านั้น
**ทำจริง**: เพิ่มเป็น optional section ในหน้าสร้างด้วย

**ทำไมเพิ่ม**:
- หลังจาก pivot ตัด `teacher_current` ออก, หน้าแก้ไขกลายเป็น single source of truth สำหรับ anchor — แต่ flow ของ user คือ "สร้างวิชาแล้วเปิดคาบเลย" จะต้องวนกลับเข้าหน้าแก้ไขก่อน
- เพิ่มในหน้าสร้างเป็น optional แก้ปัญหานี้โดยไม่บังคับ — ถ้ายังไม่อยู่ห้องจริง ข้ามได้ ตั้งทีหลังในหน้าแก้ไข
- มีคำเตือนชัดในหน้า: "แนะนำตั้งจากมือถือในห้องเรียนจริง" (สีเหลือง bold)

### 5.3 Student accuracy ceiling = 200m

**PRP เดิม**: ไม่ได้ระบุตัวเลขเพดาน
**ทำจริง**: `STUDENT_ACCURACY_MAX_M = 200` — ถ้า accuracy ที่ browser รายงาน > 200m → server ปฏิเสธ `location_inaccurate`

**ทำไมต้องมีเพดานนี้**:

ถ้าไม่จำกัด ฝั่ง student ที่อุปกรณ์ห่วยรายงาน accuracy = 50,000m (เช่น laptop ที่ใช้ IP geolocation) จะคำนวณ `effectiveRadius = 150 + 50,000 = 50,150m` → **ผ่านทุกที่ในกรุงเทพ** → ทำลายจุดประสงค์ของ geofence

**ทำไมเลือก 200m (ไม่ใช่ 100 หรือ 500)**:

| เพดาน | ผล |
|---|---|
| 100m (เข้ม) | บังคับมือถือ/iPad อย่างเดียว — laptop ส่วนใหญ่ถูกปฏิเสธ; นักศึกษาที่อยู่ในตึกลึก accuracy 100–150m อาจไม่ผ่าน |
| **200m (เลือก)** | รับมือถือทั้งหมด + iPad ในทุกสภาพ; ปฏิเสธ laptop WiFi-only ส่วนใหญ่ที่มัก 30–200m+; ปฏิเสธ hotspot ที่ fallback ไป IP |
| 500m (อ่อน) | รับ laptop WiFi-only เกือบหมด → ลด anti-proxy signal ที่ตั้งใจให้บังคับมือถือ |

**Real-world expectation**:

| สถานการณ์ | Accuracy ทั่วไป | ผ่านเพดาน 200m? |
|---|---|---|
| มือถือ + GPS chip + กลางแจ้ง | 5–15m | ✅ |
| มือถือในตึก (WiFi-assisted) | 20–80m | ✅ |
| iPad (มี GPS) | 10–30m | ✅ |
| Laptop WiFi-only ในเขตเมือง | 30–200m+ | ⚠️ borderline → ตามต้องการ (anti-proxy intent) |
| Hotspot ส่วนตัว / IP-only | 1,000m+ | ❌ ปฏิเสธ → ตามต้องการ |

นักศึกษาส่วนใหญ่เช็คชื่อจากมือถือ — accuracy ต่ำกว่า 100m เกือบทุกครั้ง → 200m เป็น sweet spot ที่ไม่ตัด edge case ของห้องตึกลึก และยังบังคับ "ต้องมีอุปกรณ์ที่มี GPS chip" ตามเจตนาของ Phase 6

### 5.4 รัศมี 100m → 150m

**PRP เดิม**: `GEOFENCE_RADIUS_M = 100`
**ทำจริง**: `GEOFENCE_RADIUS_M = 150`

**ทำไมเพิ่ม**:
- ห้องบรรยายใหญ่ที่อาจใช้ Demo มีขนาด ~50m × 50m → 100m พอ
- แต่ **GPS degradation ในตึก** (สัญญาณดาวเทียมโดน block ด้วยคอนกรีต/หลังคา) ทำให้แม้นักศึกษาอยู่ในห้องจริง อาจรายงาน position ผิด ~30–80m
- โค้ดมี `effectiveRadius = base + studentAccuracy` อยู่แล้ว ซึ่งช่วย buffer ตามอุปกรณ์ แต่ base 100m ค่อนข้างชิดขอบ
- ลอง trade-off: 150m ลด false-reject ในตึกใหญ่ + ยังคุมไม่ให้คนนอกตึกผ่าน (เพราะคนอยู่ห่าง 200m+ จะยังโดน block)
- ไม่เปลี่ยน `effectiveRadius` formula — ยังเป็น `RADIUS + accuracy`

---

## 6. Limitations (ต้องเขียนในรายงาน)

### 6.1 Browser geolocation spoofable
- Chrome DevTools → Sensors → ใส่ lat/lng ปลอม (ใครก็ทำได้)
- Mock-location apps บน rooted Android (ต้องอาศัยความรู้/ความตั้งใจ)
- iOS jailbreak (ยาก, น้อยมาก)
- **Mitigation**: defense-in-depth — ต้องผ่าน login + enrollment + QR/entry code พร้อมกัน → effort สูงกว่า casual proxy

### 6.2 GPS accuracy ผันแปรตามอุปกรณ์
- มือถือ + GPS chip กลางแจ้ง: ~5–20m
- มือถือในตึก (WiFi-assisted): ~20–80m
- Laptop WiFi-only: ~30–200m
- Hotspot ส่วนตัวจากมือถือ: fallback IP geolocation → ห่างเป็นกิโล
- **Mitigation**: teacher accuracy gate ตอนตั้ง anchor + saved anchor model + accuracy buffer ฝั่ง student

### 6.3 Permission denied / GPS unavailable
- User ปฏิเสธ permission → block check-in
- **Mitigation**: error message ชัดเจน + แนะวิธีเปิด permission

### 6.4 Indoor GPS degradation
- ในตึกลึกที่ไม่มี window → fallback ไป network-based positioning ที่แม่นน้อย
- **Mitigation**: radius 150m + accuracy buffer พอครอบคลุมห้องเรียนเดี่ยวในตึก

---

## 7. Files changed (สรุปสำหรับ review)

### Schema / migration
- `prisma/schema.prisma` — เพิ่ม fields ใน Course/ClassSession/Attendance + `AnchorSource` enum
- `prisma/migrations/20260514120000_phase6_geofence/`

### Library
- `src/lib/geo/constants.ts` — radius, accuracy gates, geolocation options
- `src/lib/geo/haversine.ts` — distance calculation

### Server actions
- `src/app/actions/course.ts` — เพิ่ม `saveCourseGeofence` / `clearCourseGeofence`
- `src/app/actions/session.ts` — `openSession` รับ `anchor: {kind}` + snapshot anchor ลง ClassSession
- `src/app/actions/checkin.ts` — accept `location: {lat,lng,accuracyM}`, run haversine + radius check, store `distanceM/accuracyM`

### Library functions
- `src/lib/checkin.ts` — `getCheckInContext` คืน `anchor` ใน context

### UI components
- `src/components/courses/CourseGeofenceSection.tsx` — picker บนหน้า edit
- `src/components/courses/CourseForm.tsx` — optional picker บนหน้า create
- `src/components/courses/OpenSessionButton.tsx` — radio location choice
- `src/components/checkin/StudentCheckInForm.tsx` — request geolocation ตอน submit, แสดง verified message
- `src/components/sessions/RosterTable.tsx` — badge `📍 Xm`

### Pages
- `src/app/(app)/teacher/courses/[id]/page.tsx` — pass `hasCourseAnchor` ให้ OpenSessionButton
- `src/app/(app)/teacher/courses/[id]/edit/page.tsx` — แสดง CourseGeofenceSection + restructure layout
- `src/app/(app)/teacher/sessions/[id]/page.tsx` — pass `locationVerified` ลง RosterTable rows
- `src/app/checkin/page.tsx` — pass `requiresLocation` ลง StudentCheckInForm

---

## 8. Verification status

| Check | สถานะ |
|---|---|
| `npx prisma migrate deploy` to Supabase | ✅ |
| `npx prisma generate` | ✅ |
| `npx tsc --noEmit` | ✅ |
| `npm run build` | ✅ |
| Manual E2E via DevTools Sensors (happy path / out-of-range / permission denied / no-anchor backward compat / badge visibility) | ⏳ บางส่วน — ต้องทดสอบเพิ่มบน mobile จริงหลัง deploy |

---

## 9. ที่เตรียมตอบอาจารย์

### Q: ทำไมเลือก geolocation แทน BLE/NFC/WiFi
ตอบใน §2.2 — ตัวเลือกอื่นไม่รองรับ iOS Safari หรือต้องลงทุน hardware ทุกห้อง; geolocation เป็นทางเดียวที่ web standard รองรับโดยไม่ทิ้ง user

### Q: ทำไมต้อง check ฝั่ง server ไม่ check ฝั่ง client
client ส่ง `{ inRange: true }` มาเองได้ — server ต้องคำนวณเองจาก lat/lng ที่ส่งมาทุกครั้ง (server-authoritative principle)

### Q: ทำไมไม่เก็บพิกัดนักศึกษา
Privacy — ระบบไม่ต้องการรู้ตำแหน่งนักศึกษา ต้องการแค่ "ผ่าน/ไม่ผ่าน + ระยะห่าง + ความแม่นยำ" สำหรับ audit; เก็บแค่ derived data

### Q: ทำไมรัศมี 150m ไม่ใช่ 100m หรือ 50m
ตอบใน §5.3 — buffer สำหรับ indoor GPS degradation; ขอบสูงสุดยังควบคุมได้เพราะ คนนอกตึกหลายร้อยเมตรยังไม่ผ่าน

### Q: spoof ผ่าน DevTools ได้ จะกันยังไง
ยอมรับเป็น limitation; ป้องกันด้วย defense-in-depth — ต้องผ่าน login + enrollment + QR + entry code + location พร้อมกัน → casual cheating ยากขึ้นมาก (ตอบใน §6.1)

### Q: ถ้าอาจารย์ไม่ตั้ง anchor จะเกิดอะไรขึ้น
เปิดคาบได้ปกติแต่เลือกได้แค่ "ไม่ตรวจตำแหน่ง" — ระบบ backward compatible กับ Phase 5; geofence เป็น opt-in per course/session

### Q: ทำไมตัด `teacher_current` ออก
ตอบใน §5.1 — ลองใช้พบว่า laptop GPS เพี้ยน + ทำให้ user สับสนระหว่าง "current vs saved"; การมี single source of truth เดียวที่หน้า edit ทำให้ mental model ตรงกัน
