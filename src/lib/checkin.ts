import "server-only";

import { AttendanceStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { autoCloseIfExpired } from "@/lib/session-helpers";
import { verifyQrToken } from "@/lib/qr-verify";

export type CheckInContext =
  | {
      ok: true;
      session: {
        id: string;
        startsAt: Date;
        endsAt: Date;
        lateAfter: Date | null;
        isOpen: boolean;
        course: {
          id: string;
          code: string;
          name: string;
          semester: string;
        };
        /** ห้อง — มาจาก roomSnapshot ที่ freeze ตอนเปิด session, fallback ไป schedule.room */
        room: string | null;
        schedule: {
          startTime: string;
          endTime: string;
        } | null;
        /** Phase 6: ถ้า null = session ไม่เปิด geofence (backward compat) */
        anchor: {
          lat: number;
          lng: number;
        } | null;
      };
    }
  | {
      ok: false;
      reason: "missing_token" | "invalid" | "expired" | "closed";
    };

export function isDemoCheckInEnabled() {
  return process.env.DEMO_CHECKIN_ENABLED === "true";
}

export function getAttendanceStatus(now: Date, lateAfter: Date | null) {
  if (lateAfter && now >= lateAfter) return AttendanceStatus.LATE;
  return AttendanceStatus.PRESENT;
}

export async function getCheckInContext(token?: string | null): Promise<CheckInContext> {
  const cleanToken = token?.trim();
  if (!cleanToken) return { ok: false, reason: "missing_token" };

  const verified = await verifyQrToken(cleanToken);
  if (!verified.ok) {
    if (verified.reason === "session_closed") return { ok: false, reason: "closed" };
    if (verified.reason === "expired") return { ok: false, reason: "expired" };
    return { ok: false, reason: "invalid" };
  }

  const raw = await db.classSession.findUnique({
    where: { id: verified.sessionId },
    include: {
      course: { select: { id: true, code: true, name: true, semester: true } },
      schedule: { select: { room: true, startTime: true, endTime: true } },
    },
  });

  if (!raw) return { ok: false, reason: "invalid" };

  const session = await autoCloseIfExpired(raw);
  if (!session.isOpen) return { ok: false, reason: "closed" };

  // room: ใช้ snapshot ที่ freeze ตอนเปิด session ก่อน — fallback ไป schedule.room
  // (สำหรับ session ที่เปิดก่อน snapshot pattern จะถูก backfill โดย migration)
  const room = session.roomSnapshot ?? raw.schedule?.room ?? null;

  return {
    ok: true,
    session: {
      id: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      lateAfter: session.lateAfter,
      isOpen: session.isOpen,
      course: raw.course,
      room,
      schedule: raw.schedule
        ? { startTime: raw.schedule.startTime, endTime: raw.schedule.endTime }
        : null,
      anchor:
        session.anchorLat !== null && session.anchorLng !== null
          ? { lat: session.anchorLat, lng: session.anchorLng }
          : null,
    },
  };
}
