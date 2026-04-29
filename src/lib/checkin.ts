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
        schedule: {
          room: string | null;
          startTime: string;
          endTime: string;
        };
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
  if (lateAfter && now > lateAfter) return AttendanceStatus.LATE;
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

  return {
    ok: true,
    session: {
      id: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      lateAfter: session.lateAfter,
      isOpen: session.isOpen,
      course: raw.course,
      schedule: raw.schedule,
    },
  };
}
