# PRP 04 — Teacher: Dynamic QR Display

> **Phase:** 4 (after Phase 3.5 — Schedule + ClassSession lifecycle)
> **Demo gate:** teacher login → /teacher → "ตารางสอนวันนี้" → กด "เปิด session" → redirect `/teacher/sessions/[id]` → เห็น **QR ใหญ่กลางจอ + countdown ring + Entry Code 6 หลัก + Generation #** → รอ 30s → QR/Code/Generation เปลี่ยนพร้อมกัน → กดปุ่ม Fullscreen → QR เต็มจอ ฉาย projector ได้ → กด ESC ออก → กด "ปิด Session" → status เปลี่ยนเป็นปิด

---

## Goal

ให้อาจารย์มีหน้า **session active** ที่:
1. **แสดง QR Code ที่ refresh ทุก 30 วินาที** ผ่าน client polling (ไม่มี SSE/WebSocket — MVP)
2. **มี Entry Code 6 หลัก** เป็น fallback กรณีกล้องนักศึกษาเสีย / สแกนไม่ได้ — rotate พร้อม QR
3. **Fullscreen mode** สำหรับฉาย projector หน้าห้องเรียน
4. **Token verification ปลอดภัย** — DB เป็น source of truth, มี grace window 1 รอบกัน race ระหว่างนักศึกษากด scan ตอน token เพิ่ง rotate

เป้าหมายเชิง architecture:
- **DB เป็น source of truth ของ token** — ไม่ใช่ JWT (revoke ได้ทันที, audit ได้)
- **Server คำนวณทุกอย่าง** — client แค่ render + trigger refresh
- **รองรับ Phase 4.5 (Student check-in) โดยไม่ต้อง refactor** — verification API เตรียมไว้แล้ว
- **ไม่มี cron / background worker** — rotation ทำตอน client ขอใหม่ (lazy server-side rotation)

---

## Non-goals (ไม่ทำใน Phase 4)

- **Student-side scan / check-in flow** — Phase 4.5
- **Sidebar รายชื่อเช็คอินสด** ตามดีไซน์ HTML — Phase 4 ทำ skeleton/placeholder ไว้ก่อน, Phase 4.5 ค่อย wire กับ attendance polling
- **Pause / Resume button** — schema bloat (`pausedAt`) + edge case ไม่ชัด ("scan ตอน pause ทำยังไง?") — workaround = ปิด session + เปิดใหม่ (1 click). ดู Tradeoffs
- **SSE / WebSocket push** — Phase 6+ ถ้ามีเวลา (โต mature ค่อยอัปเกรด)
- **QR token revocation list / blacklist** — ไม่จำเป็น เพราะรหัสแค่ 30s + DB-driven (ลบ token ออกจาก row = revoke ทันที)
- **Rate limiting Route Handler** — Phase 6 (Vercel Edge rate-limit / Upstash)
- **Geofence check** — Phase 6 (Milestone)

---

## Decisions Summary

| # | จุด | เลือก | เหตุผล |
| -- | --- | ----- | ------ |
| 1 | Refresh mechanism | Client polling 30s ผ่าน Route Handler | Vercel-friendly serverless, ไม่ติด timeout, debug ง่าย, MVP-appropriate |
| 2 | QR payload format | Full URL `${APP_URL}/checkin?t=<token>` | UX ดีสุด — สแกนแล้วเปิด browser ตรง, ไม่ต้องมี dedicated scanner app |
| 3 | Token format | Opaque random 32-byte URL-safe (Node `crypto.randomBytes`) | ไม่มีข้อมูลใน token — ป้องกัน leak metadata, revoke ได้ทันที |
| 4 | Token storage | DB columns `qrToken` + `qrPrevToken` (current + previous 1 รอบ) | Source of truth at DB-level, รองรับ grace window |
| 5 | Token TTL | Rotate 30s, accept current + prev 1 รอบ (รวม window ~60s) | กัน clock skew + นักศึกษา scan ตอน rotate พอดี |
| 6 | Entry Code | 6 หลักตัวเลข (000000-999999), rotate พร้อม QR | กรอกแทน QR ได้ถ้ากล้องเสีย — 6 หลักจำง่ายกว่า 4 หลัก collision น้อยกว่า |
| 7 | Generation # | Derive ฝั่ง client จากจำนวนครั้งที่ refresh fetch สำเร็จ | ไม่ต้อง schema field — เป็น UX feedback ล้วน |
| 8 | Fullscreen | Browser Fullscreen API (`element.requestFullscreen()`) | Standard, ESC ออกได้, ไม่ต้องสร้าง route แยก |
| 9 | `lateAfter` | Set ตอน `openSession` = `startsAt + 15 min` (hardcoded) | Phase 4 เปิดทาง Phase 4.5 ใช้คำนวณ status — config field ใน Course/Schedule = Phase 6 |
| 10 | Sidebar (เช็คอิน count + รายชื่อล่าสุด) | Skeleton/placeholder ใน Phase 4 — Phase 4.5 wire จริง | ยังไม่มี attendance row ใน Phase 4 — wire ตอนนี้ = dead code |

---

## Schema Touch Points

### MODIFY: `ClassSession` model

```prisma
model ClassSession {
  id         String    @id @default(cuid())
  courseId   String
  scheduleId String
  startsAt   DateTime
  endsAt     DateTime
  lateAfter  DateTime? // ✅ Phase 4: set ตอน openSession (= startsAt + 15min)

  // ❗ Dynamic QR fields
  qrToken              String?   @unique          // current token
  qrTokenExpiresAt     DateTime?
  qrRefreshedAt        DateTime?
  qrPrevToken          String?                    // ✨ NEW: previous token (grace 1 รอบ) — ไม่ @unique
  qrPrevTokenExpiresAt DateTime?                  // ✨ NEW

  // ❗ Entry Code (fallback)
  entryCode     String?  // ✨ NEW: current 6-digit
  entryCodePrev String?  // ✨ NEW: previous 6-digit (grace)

  isOpen    Boolean   @default(true)
  closedAt  DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  course      Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  schedule    Schedule     @relation(fields: [scheduleId], references: [id], onDelete: Restrict)
  attendances Attendance[]

  @@index([courseId])
  @@index([scheduleId])
  @@index([startsAt])
  @@index([qrToken])
  @@index([qrPrevToken])  // ✨ NEW: lookup ตอน verify ในช่วง grace
  @@index([entryCode])    // ✨ NEW
}
```

**Why these field choices:**

- **`qrPrevToken` ไม่ `@unique`** — เลี่ยง constraint conflict ตอน atomic rotation (PostgreSQL ตรวจ unique end-of-statement, แต่ semantics ที่ปลอดภัยกว่าคือไม่ enforce). Collision ในทาง practice = 0 เพราะ token random 32-byte
- **`entryCode` ไม่ `@unique` ทั้งสอง** — 6 digit = 1M space, 1 ครู เปิดได้ทีละ session, collision ระดับ system แทบเป็นไปไม่ได้ + ถึงชน 2 sessions ก็ verify ด้วย sessionId อยู่แล้ว
- **Index `qrPrevToken` + `entryCode`** — Phase 4.5 (check-in) จะ lookup ทาง field พวกนี้ — ถ้าไม่ index = full scan
- **เก็บแยก `qrPrevTokenExpiresAt`** — ไม่ derive จาก `qrTokenExpiresAt - 30s` เพราะ refresh interval อาจเปลี่ยน (Phase 6 มี per-course config)

### Migration

```bash
npx prisma migrate dev --name phase4_dynamic_qr
```

Migration จะมี:
1. Auto-generated: `ALTER TABLE ClassSession ADD COLUMN qrPrevToken/qrPrevTokenExpiresAt/entryCode/entryCodePrev`
2. Auto-generated: `CREATE INDEX ... ON ClassSession(qrPrevToken)` + `CREATE INDEX ... ON ClassSession(entryCode)`

⚠️ **ไม่มี breaking change** — fields ทั้งหมด nullable, ClassSession แถวเก่าใน DB ยังอ่านได้ปกติ (ถ้ามี seed test session จาก Phase 3.5 — ไม่ต้องลบ)

---

## Constants / Config

ไฟล์ใหม่: `src/lib/qr-config.ts`

```ts
import "server-only";

export const QR_REFRESH_INTERVAL_MS = 30 * 1000; // 30 วินาที
export const QR_GRACE_WINDOW_MS     = 30 * 1000; // prev token ใช้ได้อีก 30s หลัง rotate
export const QR_TOKEN_BYTES         = 32;        // 32 bytes = 256-bit, base64url ~43 chars
export const ENTRY_CODE_LENGTH      = 6;
export const LATE_AFTER_MIN         = 15;        // student มาช้ากว่า 15 นาที = LATE
```

**Why values:**
- **30s rotate** — ตรงกับ design HTML, สั้นพอที่ relay attack จะลำบาก, ยาวพอที่ network/scan latency ไม่ทำให้ fail
- **32-byte token** — overkill แต่ cheap (free entropy); ปลอดภัยจาก brute force
- **15 min lateAfter** — มาตรฐานวิชาการทั่วไป; future = config per-course

---

## Server-Side Code

### 1. Token generator helper — `src/lib/qr-token.ts`

```ts
import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { ENTRY_CODE_LENGTH, QR_TOKEN_BYTES } from "./qr-config";

export function generateQrToken(): string {
  // base64url = URL-safe, ไม่มี + / = ต้อง encode
  return randomBytes(QR_TOKEN_BYTES).toString("base64url");
}

export function generateEntryCode(): string {
  // randomInt = uniform distribution (ไม่ใช่ Math.random ซึ่ง biased)
  // 0 - 999999 → padStart "000123"
  const max = Math.pow(10, ENTRY_CODE_LENGTH);
  return randomInt(0, max).toString().padStart(ENTRY_CODE_LENGTH, "0");
}
```

**Why `crypto.randomInt`:** `Math.random()` ไม่ใช่ CSPRNG — guess ได้ถ้ารู้ seed pattern, ไม่ควรใช้กับ token ใด ๆ ที่ป้องกัน attacker

### 2. Modify `openSession` — `src/app/actions/session.ts`

เพิ่ม initial token + entryCode + lateAfter ตอนสร้าง:

```ts
import { generateQrToken, generateEntryCode } from "@/lib/qr-token";
import { QR_REFRESH_INTERVAL_MS, LATE_AFTER_MIN } from "@/lib/qr-config";

// ... existing openSession code ...
const now = new Date();
const lateAfter = new Date(startsAt.getTime() + LATE_AFTER_MIN * 60 * 1000);

const newSession = await db.classSession.create({
  data: {
    courseId,
    scheduleId,
    startsAt,
    endsAt,
    lateAfter,                                    // ✨ NEW
    qrToken: generateQrToken(),                   // ✨ NEW initial token
    qrTokenExpiresAt: new Date(now.getTime() + QR_REFRESH_INTERVAL_MS),  // ✨ NEW
    qrRefreshedAt: now,                           // ✨ NEW
    entryCode: generateEntryCode(),               // ✨ NEW
    isOpen: true,
  },
});
```

**Why initial generation ตอน create:** ถ้ารอ generate ตอน first GET — มี window ที่ session.qrToken=null → UI render ยังไม่มี QR. กว่าจะ generate เสร็จ student ที่อยู่หน้าจอเห็น QR ช้า. Initialize ทันที = consistency

### 3. Rotate function — `src/lib/qr-rotate.ts`

```ts
import "server-only";
import { db } from "./db";
import { generateQrToken, generateEntryCode } from "./qr-token";
import { QR_REFRESH_INTERVAL_MS, QR_GRACE_WINDOW_MS } from "./qr-config";
import type { ClassSession } from "@prisma/client";

/**
 * Rotate QR token + entry code ถ้าเลย expiry แล้ว — ไม่งั้น return เดิม
 * เรียกจาก Route Handler GET /api/sessions/[id]/qr
 */
export async function rotateIfExpired(session: ClassSession): Promise<ClassSession> {
  if (!session.isOpen) return session;
  if (session.qrTokenExpiresAt && Date.now() < session.qrTokenExpiresAt.getTime()) {
    return session; // ยังไม่หมดอายุ
  }

  const now = new Date();
  const newToken = generateQrToken();
  const newCode  = generateEntryCode();
  // prev expires = ตอนนี้ + grace window (กัน student ที่กำลัง scan token เก่า)
  const prevExpires = new Date(now.getTime() + QR_GRACE_WINDOW_MS);

  return db.classSession.update({
    where: { id: session.id, isOpen: true },
    data: {
      qrPrevToken: session.qrToken,
      qrPrevTokenExpiresAt: prevExpires,
      qrToken: newToken,
      qrTokenExpiresAt: new Date(now.getTime() + QR_REFRESH_INTERVAL_MS),
      qrRefreshedAt: now,
      entryCodePrev: session.entryCode,
      entryCode: newCode,
    },
  });
}
```

**Why `where: { id, isOpen: true }`:**
- ถ้า session ถูกปิดระหว่างนี้ (race) → update no-op, ไม่ rotate token ของ session ปิดแล้ว
- ป้องกัน corrupted state ที่ closed session กลับมา active เพราะ rotate

**ทำไมไม่ใช้ `setInterval` ฝั่ง server:** Vercel serverless functions ไม่มี persistent runtime — function จบ → interval ตาย. Lazy rotation เรียกตอน client ขอใหม่ = scale ได้, simple

### 4. Route Handler — `src/app/api/sessions/[id]/qr/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCourseOwner } from "@/lib/auth-helpers";
import { autoCloseIfExpired } from "@/lib/session-helpers";
import { rotateIfExpired } from "@/lib/qr-rotate";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const raw = await db.classSession.findUnique({
    where: { id },
    select: {
      id: true, courseId: true, isOpen: true, startsAt: true, endsAt: true,
      qrToken: true, qrTokenExpiresAt: true, qrRefreshedAt: true,
      entryCode: true, closedAt: true,
    },
  });

  if (!raw) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // ⚠️ Layer 3 auth — ไม่เชื่อ middleware
  await requireCourseOwner(raw.courseId);

  // 1. Auto-close ถ้าเลย endsAt + 30min (lazy)
  let session = await autoCloseIfExpired(raw as never);
  // 2. Rotate ถ้า token หมดอายุ
  session = await rotateIfExpired(session as never);

  return NextResponse.json({
    isOpen: session.isOpen,
    qrToken: session.qrToken,
    qrTokenExpiresAt: session.qrTokenExpiresAt,
    qrRefreshedAt: session.qrRefreshedAt,
    entryCode: session.entryCode,
    closedAt: session.closedAt,
  }, {
    headers: {
      // ❗ ห้าม cache QR token — ทุก request ต้องเช็ค expiry สด ๆ
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
```

**Why GET ไม่ POST:**
- Idempotent semantics — เรียกซ้ำกี่ครั้ง state เดิมยังอยู่ (rotate กลายเป็น no-op ถ้ายังไม่หมด)
- คอมพาทิเบิล browser standard `fetch` GET — ง่ายต่อ debug ใน Network tab
- ❗ **แต่** ถึง GET การ rotate token = side effect — รับได้เพราะ rotation deterministic (ขึ้นกับเวลา) + ไม่กระทบ business logic

**Why select เฉพาะ field:**
- ไม่ leak `qrPrevToken` กลับไปหา client — client ไม่จำเป็นต้องรู้, ป้องกัน prev token ตกใน browser cache/devtools log

### 5. Verification helper (เตรียมไว้ให้ Phase 4.5)

ไฟล์ใหม่: `src/lib/qr-verify.ts`

```ts
import "server-only";
import { db } from "./db";

export type VerifyResult =
  | { ok: true; sessionId: string; via: "current" | "previous" }
  | { ok: false; reason: "not_found" | "expired" | "session_closed" };

export async function verifyQrToken(token: string): Promise<VerifyResult> {
  const now = new Date();

  // ลองหา current token ก่อน (เร็วกว่าเพราะ @unique)
  const byCurrent = await db.classSession.findUnique({
    where: { qrToken: token },
    select: { id: true, isOpen: true, qrTokenExpiresAt: true },
  });

  if (byCurrent) {
    if (!byCurrent.isOpen) return { ok: false, reason: "session_closed" };
    if (byCurrent.qrTokenExpiresAt && now > byCurrent.qrTokenExpiresAt) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, sessionId: byCurrent.id, via: "current" };
  }

  // ตามด้วย prev token (grace window)
  const byPrev = await db.classSession.findFirst({
    where: { qrPrevToken: token },
    select: { id: true, isOpen: true, qrPrevTokenExpiresAt: true },
  });

  if (byPrev) {
    if (!byPrev.isOpen) return { ok: false, reason: "session_closed" };
    if (byPrev.qrPrevTokenExpiresAt && now > byPrev.qrPrevTokenExpiresAt) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, sessionId: byPrev.id, via: "previous" };
  }

  return { ok: false, reason: "not_found" };
}

export async function verifyEntryCode(sessionId: string, code: string): Promise<VerifyResult> {
  // entryCode ไม่ unique — ต้อง pair กับ sessionId
  const s = await db.classSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true, isOpen: true,
      entryCode: true, qrTokenExpiresAt: true,
      entryCodePrev: true, qrPrevTokenExpiresAt: true,
    },
  });
  if (!s) return { ok: false, reason: "not_found" };
  if (!s.isOpen) return { ok: false, reason: "session_closed" };

  const now = new Date();
  if (s.entryCode === code && s.qrTokenExpiresAt && now <= s.qrTokenExpiresAt) {
    return { ok: true, sessionId: s.id, via: "current" };
  }
  if (s.entryCodePrev === code && s.qrPrevTokenExpiresAt && now <= s.qrPrevTokenExpiresAt) {
    return { ok: true, sessionId: s.id, via: "previous" };
  }
  return { ok: false, reason: "expired" };
}
```

**Why แยกเป็น helper แยก:** Phase 4.5 (student check-in) จะเรียก helper พวกนี้ — ไม่ต้องเขียน verification logic ซ้ำใน action ตัวเอง. การ test ก็ test helper ตัวเดียวพอ

---

## Client-Side UI

### 6. Page server component — `src/app/(app)/teacher/sessions/[id]/page.tsx` (refactor)

ปัจจุบัน render placeholder QR. Refactor ให้:

```tsx
// ... auth + load session (เดิม) ...
// ❗ ห้าม render qrToken ลง HTML ตรง ๆ — ให้ client component fetch เอง
// (กัน token รั่วผ่าน Server Components Payload / RSC stream cache)

return (
  <SessionView
    sessionId={session.id}
    course={course}
    schedule={schedule}
    startsAt={session.startsAt}
    isOpenInitial={session.isOpen}
    closedAtInitial={session.closedAt}
  />
);
```

> **Why ไม่ส่ง qrToken เข้า initial render:** แม้ Server Components ไม่ leak ไป browser bundle — payload (HTML + RSC stream) ยังเห็น token ใน DevTools → Network → Response. การ fetch ฝั่ง client ผ่าน Route Handler มี `Cache-Control: no-store` — ปลอดภัยกว่า. Trade-off: มี flash 1 fetch ตอนเริ่ม (~100ms) — รับได้

### 7. SessionView (client) — `src/components/sessions/SessionView.tsx`

```tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";

type Props = { sessionId: string; course: ...; schedule: ...; startsAt: Date;
               isOpenInitial: boolean; closedAtInitial: Date | null; };

type QrState = {
  isOpen: boolean;
  qrToken: string | null;
  qrTokenExpiresAt: string | null;
  entryCode: string | null;
  closedAt: string | null;
};

export default function SessionView(props: Props) {
  const [state, setState] = useState<QrState | null>(null);
  const [generation, setGeneration] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const lastTokenRef = useRef<string | null>(null);

  // ❗ Fetch token + auto-rotate
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/sessions/${props.sessionId}/qr`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as QrState;
    setState(data);
    if (data.qrToken && data.qrToken !== lastTokenRef.current) {
      lastTokenRef.current = data.qrToken;
      setGeneration((g) => g + 1);
      // generate QR data URL — ห้ามใช้ <img src="/qr-image"/> เพราะ token เข้า server log
      const url = await QRCode.toDataURL(
        `${window.location.origin}/checkin?t=${data.qrToken}`,
        { width: 512, margin: 1, errorCorrectionLevel: "M" }
      );
      setQrDataUrl(url);
    }
  }, [props.sessionId]);

  useEffect(() => { refresh(); }, [refresh]); // initial fetch

  // ❗ Polling 30s — clean up ตอน unmount หรือ session ปิด
  useEffect(() => {
    if (state && !state.isOpen) return;
    const t = setInterval(refresh, 30 * 1000);
    return () => clearInterval(t);
  }, [refresh, state?.isOpen]);

  // ❗ Visual countdown (1Hz) — ไม่ trigger network
  useEffect(() => {
    if (!state?.qrTokenExpiresAt || !state.isOpen) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(
        (new Date(state.qrTokenExpiresAt!).getTime() - Date.now()) / 1000
      ));
      setSeconds(remaining);
      // ถ้านับถึง 0 — fetch ใหม่ทันที (อย่ารอ polling 30s grid)
      if (remaining === 0) refresh();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [state?.qrTokenExpiresAt, state?.isOpen, refresh]);

  const enterFullscreen = async () => {
    if (fullscreenRef.current && !document.fullscreenElement) {
      await fullscreenRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  // ... render: header + (left) QR card with countdown ring + entry code
  // ... (right) sidebar skeleton: count placeholder + empty state list
}
```

**Visual ring countdown:** ใช้ SVG `<circle stroke-dasharray>` คำนวณจาก `seconds / 30 * circumference` (ดู Teacher Session.html line 150-200 เป็นต้นแบบ — `CountdownRing` component)

**Color thresholds:** ตาม design — `seconds <= 5` แดง, `<= 10` เหลือง, ปกติ accent (#CC0000)

### 8. Components ย่อยใน `src/components/sessions/`

- `SessionView.tsx` — main orchestrator (above)
- `QrDisplay.tsx` — รับ `qrDataUrl` + `seconds` + render QR + countdown ring + Generation # caption
- `EntryCodeCard.tsx` — รับ `code` → render 6 หลัก JetBrains Mono spaced
- `FullscreenButton.tsx` — รับ `targetRef` → toggle fullscreen API
- `CheckedInSidebar.tsx` — **skeleton สำหรับ Phase 4** — render header "เข้าเรียนล่าสุด" + empty state "ยังไม่มีผู้เช็คอิน — Phase 4.5". รับ `totalRoster` (จาก server prop) แสดง 0 / N

### 9. Header refactor

```
┌─────────────────────────────────────────────────────────┐
│ ← CS101 — Section 1                                      │
│   เทอม 1/2026 · จันทร์ 09:00-12:00 · SC-3001            │
│                          [⛶ Fullscreen] [⏹ ปิด Session] │
└─────────────────────────────────────────────────────────┘
```

ปุ่ม Fullscreen `aria-label="Toggle fullscreen"` + lucide-react `<Maximize />` icon

### 10. Closed state (`isOpen=false`)

ถ้า `state.isOpen=false`:
- หยุด polling (`clearInterval`)
- Hide QR + entry code (กัน student เห็นโค้ดเก่ายัง valid)
- แสดง "ปิดแล้ว" card + ปุ่ม "กลับหน้ารายวิชา"

---

## Security

### 11. Threat × Control mapping

| # | ภัยคุกคาม | การกัน |
| -- | -------- | ------ |
| 1 | **IDOR**: ครูคนอื่นเรียก `/api/sessions/[id]/qr` ของไม่ใช่วิชาตัวเอง | `requireCourseOwner(courseId)` ใน Route Handler |
| 2 | **Unauthenticated read**: external attacker hit endpoint | middleware (Layer 1) + `requireCourseOwner` (Layer 3) — middleware redirect, Layer 3 throw |
| 3 | **Token replay**: นักศึกษาส่งโค้ดเก่าหลังหมดอายุ | `qrTokenExpiresAt` + `qrPrevTokenExpiresAt` check ใน `verifyQrToken` |
| 4 | **Token leak ผ่าน server log / cache** | `Cache-Control: no-store` + ไม่ render token ลง initial HTML — fetch ฝั่ง client เท่านั้น |
| 5 | **Brute force entry code** (1M space) | Phase 6 rate limit — Phase 4 เริ่มจาก code rotate 30s ทำให้ effective brute = ~33k/sec ต้องการ → ไม่ practical สำหรับ student attacker |
| 6 | **Session screenshot relay** (ส่ง QR ให้เพื่อนนอกห้อง) | Rotation 30s ลด window — ถ้า relay realtime กันได้ ต้องมี Phase 6 geofence |
| 7 | **Token in browser history (URL)** | QR payload เป็น URL → student สแกนแล้ว browser เก็บ history. ผลกระทบ: เจ้าของอุปกรณ์เท่านั้นเห็น (ไม่ใช่ public) — รับได้ MVP |
| 8 | **`closedAt` race**: rotate กับ close พร้อมกัน | `where: { id, isOpen: true }` ใน rotate — atomic, ถ้าปิดก่อน rotate = no-op |
| 9 | **Token regenerate ผ่าน DevTools** ครูเรียก endpoint ตรง ๆ ก่อน 30s | rotate function เช็ค `qrTokenExpiresAt > now` → return เดิม ไม่ rotate ก่อนเวลา |

### 12. ห้าม `Cache-Control` ผิด

```ts
// ❌ ห้าม
return NextResponse.json(data); // default Vercel caching อาจติด
// ✅ ใช่
return NextResponse.json(data, { headers: { "Cache-Control": "no-store, ..." } });
```

ถ้า cache ติด → student คนถัดไปได้ token เก่า → check-in ผิด session

### 13. ห้าม render token ใน Server Component RSC payload

```tsx
// ❌ ห้าม
const session = await db.classSession.findUnique(...);
return <QrImage token={session.qrToken} />; // RSC payload เห็น token
// ✅ ใช่
return <SessionView sessionId={session.id} />; // client fetch /api เอง
```

---

## Anti-patterns (ห้ามทำ)

1. **ห้ามใช้ JWT แทน DB-backed token** — revoke ไม่ได้ทันที, payload leak ข้อมูล (sessionId, exp), จะต้องเขียน blacklist anyway
2. **ห้าม cache Route Handler response** — ใช้ `Cache-Control: no-store` และ `cache: "no-store"` ฝั่ง fetch
3. **ห้ามสร้าง QR ฝั่ง server แล้วส่ง `<img src="/api/.../qr.png" />`** — token เข้า server access log + Vercel function bandwidth ราคาแพง. Generate ฝั่ง client ผ่าน `qrcode` package เท่านั้น
4. **ห้าม `setInterval` ใน Server Component / Server Action** — ไม่มี persistent runtime ใน serverless
5. **ห้ามใช้ `Math.random()` generate token หรือ entry code** — ไม่ใช่ CSPRNG, predictable
6. **ห้าม render qrToken ลงใน initial HTML / RSC stream** — token รั่วผ่าน DevTools → Network → Document
7. **ห้ามลืม `Cache-Control: no-store`** บน Route Handler — Vercel CDN อาจ cache 200 OK responses
8. **ห้ามเช็ค expiry ฝั่ง client** ว่า "ยังไม่หมด ก็ใช้ได้" — Server เป็น source of truth, client time tampered ได้
9. **ห้ามให้ Route Handler revalidatePath** — มันคือ read endpoint, การ revalidate page = re-fetch infinite loop
10. **ห้ามใช้ `qrToken @unique` แล้วเขียน upsert ทับ rotate** — ใช้ `update` (id เป็น where clause) — `qrToken` หลัง rotate = token ใหม่ที่ยังไม่มีในตาราง = ไม่ชน
11. **ห้าม commit ทั้ง entry code + qrToken ของ session ปิดแล้ว** — Phase 5 (export) จะ leak. ตอนปิด session → set fields เหล่านี้เป็น null (Phase 5 ทำ; Phase 4 พอแค่ verifyQrToken เช็ค `isOpen=true`)

---

## Tradeoffs (อธิบายอาจารย์ได้)

| Decision | Trade-off ที่รับ | ทำไมรับได้ |
| -------- | --------------- | ---------- |
| Polling 30s แทน SSE | ใช้ network/quota เพิ่มเล็กน้อย (1 req/30s/teacher) + lag visual ไม่เกิน 1s | MVP simplicity > realtime perfection. เปลี่ยนเป็น SSE ทีหลังโดยไม่กระทบ schema |
| Token DB-backed ไม่ใช่ JWT | DB query ทุก verify | revoke ได้ทันที, audit logs โต natural, token ไม่ leak metadata |
| Grace window = current + prev 1 รอบ | window 60s รวม → window relay attack กว้างขึ้น 2 เท่า | ลด UX failure rate (student scan ตอน rotate) — security trade-off รับได้สำหรับ classroom context |
| Rotate ตอน read (lazy) ไม่ใช่ cron | session ที่ไม่มีใครเปิดดู → token ค้าง expired | ไม่ส่งผลต่อ business — student check-in ก็เรียก verify ที่จะ expired-out ปฏิเสธ. ลด infra |
| Entry code 6 หลัก ไม่ unique | brute-force space 1M | rotation 30s + Phase 6 จะใส่ rate limit; collision system-wide แทบเป็น 0 (random) |
| Generation # ใน client ไม่ใช่ DB | restart browser tab → กลับมาเริ่ม #1 ใหม่ | Generation # เป็น UX feedback ไม่ใช่ business data — ไม่ต้องเก็บ DB |
| Fullscreen Browser API ไม่ใช่ /present route | ต้อง user gesture (กดปุ่ม) ก่อน trigger | standard, ESC ออกได้, ไม่ต้องสร้าง auth ซ้ำ, ไม่กิน URL space |
| ไม่มี Pause/Resume | ครูพักนอกเวลา → ต้องปิด session แล้วเปิดใหม่ | ลด schema field + edge case "scan ตอน pause = ?" — workaround 1 click ทำได้ |
| ไม่มี SSE / push notification ฝั่ง teacher ตอน student check-in | ครูเห็น real-time ช้า ~30s | Phase 4.5 ทำ sidebar polling ก็แก้ได้แล้ว — ไม่ต้องเพิ่ม infra |
| `lateAfter = startsAt + 15min` hardcode | ครูปรับ threshold ไม่ได้ | Phase 6 จะมี Course/Schedule config field — Phase 4 มี business value แล้วโดยไม่ต้อง config UI |
| QR payload เป็น URL ลง browser history | privacy minor — เจ้าของอุปกรณ์เห็น token เก่า | token expire 30s — history record ไม่มีค่า. UX > minor leak ที่ไม่ exploitable |

---

## Test Strategy (manual smoke test)

### A. Happy path

1. BYPASS login teacher (`teacher@tu.ac.th`)
2. ไปหน้า `/teacher/courses/[id]?tab=schedule` → กด "เปิด session" ของ slot วันนี้
3. Redirect `/teacher/sessions/[id]` — ภายใน <1s เห็น QR + Entry Code
4. รอ 30s → QR เปลี่ยน + Entry Code เปลี่ยน + Generation # บวก 1
5. กดปุ่ม Fullscreen → QR + Code เต็มจอ
6. ESC → กลับเดิม
7. กด "ปิด Session" → status เปลี่ยนเป็น "ปิดแล้ว" + QR หายไป + polling หยุด

### B. Security

1. เปิด `/teacher/sessions/[id]` ของวิชาคนอื่น (manually แก้ id ใน URL) → 403/redirect
2. เรียก `/api/sessions/<id>/qr` ของวิชาคนอื่น → 403
3. DevTools → Network → ดู response — ไม่เห็น `qrPrevToken` field
4. DevTools → Network → ดู initial HTML / RSC payload — ไม่เห็น token string
5. DevTools → Network → response header `Cache-Control: no-store, ...`
6. ส่ง POST แทน GET ไปที่ Route Handler → 405 Method Not Allowed (Next.js default)

### C. Edge cases

1. กด Fullscreen + รอ token rotate — ยังเห็น QR เปลี่ยนใน fullscreen ปกติ
2. เปิด 2 tabs หน้าเดียวกัน — token ทั้ง 2 tabs ตรงกัน (เพราะ DB เป็น source of truth)
3. ปิด tab → เปิดใหม่ — Generation # reset 1 (UX, ไม่ใช่ bug)
4. ปิด session ระหว่าง countdown ดำเนินอยู่ — UI หยุด rotation, แสดง closed state
5. ทิ้ง tab ไว้ 30 นาทีโดยไม่ interact → กลับมาดู: `endsAt + 30min` → autoCloseIfExpired → closed
6. Network offline ขณะ rotate — fetch fail, UI ค้าง countdown ที่ 0s — กลับมา online → next polling tick recover

---

## Definition of Done

- [ ] PRP นี้ผ่าน user review
- [ ] Schema diff ใน `prisma/schema.prisma` (เพิ่ม `qrPrevToken`, `qrPrevTokenExpiresAt`, `entryCode`, `entryCodePrev` + 2 indexes)
- [ ] Migration `phase4_dynamic_qr` apply สำเร็จ
- [ ] `src/lib/qr-config.ts` (constants)
- [ ] `src/lib/qr-token.ts` (generators using `crypto.randomBytes` + `randomInt`)
- [ ] `src/lib/qr-rotate.ts` (`rotateIfExpired`)
- [ ] `src/lib/qr-verify.ts` (`verifyQrToken`, `verifyEntryCode`) — เตรียมไว้ให้ Phase 4.5
- [ ] Modify `src/app/actions/session.ts` `openSession` — initial token + entryCode + lateAfter
- [ ] `src/app/api/sessions/[id]/qr/route.ts` — GET handler (auth + rotate + return)
- [ ] Refactor `src/app/(app)/teacher/sessions/[id]/page.tsx` → ส่ง props ไป client component
- [ ] `src/components/sessions/SessionView.tsx` — orchestrator (polling + countdown + fullscreen)
- [ ] `src/components/sessions/QrDisplay.tsx` — QR + countdown ring + Generation #
- [ ] `src/components/sessions/EntryCodeCard.tsx` — 6-digit display
- [ ] `src/components/sessions/FullscreenButton.tsx`
- [ ] `src/components/sessions/CheckedInSidebar.tsx` — skeleton สำหรับ Phase 4.5
- [ ] เพิ่ม `NEXTAUTH_URL` (หรือ `APP_URL`) ใน `.env.example` ถ้ายังไม่มี — ใช้ build URL ใน QR (Phase 4 ใช้ `window.location.origin` พอ)
- [ ] `npm run build` ผ่าน 100% (TypeScript + ESLint clean)
- [ ] Smoke test A/B/C ข้างบนผ่าน
- [ ] อัปเดต `STATE.md` (mark Phase 4 done, set Phase 4.5 next)
- [ ] เพิ่ม Decision Log entries: "Polling vs SSE", "DB-backed token vs JWT", "Grace window 1 round", "No pause/resume in v1"

---

## Open Questions (สำหรับ codex / next session)

1. **`window.location.origin` vs `NEXTAUTH_URL`** ใน QR payload URL — Phase 4 ใช้ `window.location.origin` พอ (client-side build URL) เพราะ student จะ scan QR แล้วไปหน้า `/checkin` ซึ่ง Phase 4.5 จะสร้าง. ถ้า production deploy ไปที่ domain ต่าง student จะถูก redirect ตาม `window.location` — ปลอดภัยพอ. เปลี่ยนเป็น env var ทีหลังได้
2. **Visual countdown drift** — ถ้า client clock drift กับ server หลายวินาที, countdown อาจ visual ไม่ตรง expiry จริง. แก้: refresh ฝั่ง client คำนวณจาก `qrTokenExpiresAt - Date.now()` ทุก tick (ทำแล้วใน SessionView) — drift มากสุด = client clock skew + หลังถัด poll
3. **Phase 4.5 ต้องเพิ่ม:** `/checkin?t=<token>` page + student verify action ที่เรียก `verifyQrToken` + Insert `Attendance` row + UI สำหรับเช็คอินผ่าน Entry Code (กรอก 6 หลัก) — ทุกอย่าง pattern เตรียมไว้แล้วใน PRP นี้
