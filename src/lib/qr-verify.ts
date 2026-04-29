import "server-only";

import { db } from "@/lib/db";

export type VerifyResult =
  | { ok: true; sessionId: string; via: "current" | "previous" }
  | { ok: false; reason: "not_found" | "expired" | "session_closed" };

export async function verifyQrToken(token: string): Promise<VerifyResult> {
  const now = new Date();

  const byCurrent = await db.classSession.findUnique({
    where: { qrToken: token },
    select: { id: true, isOpen: true, qrTokenExpiresAt: true },
  });

  if (byCurrent) {
    if (!byCurrent.isOpen) return { ok: false, reason: "session_closed" };
    if (!byCurrent.qrTokenExpiresAt || now > byCurrent.qrTokenExpiresAt) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, sessionId: byCurrent.id, via: "current" };
  }

  const byPrev = await db.classSession.findFirst({
    where: { qrPrevToken: token },
    select: { id: true, isOpen: true, qrPrevTokenExpiresAt: true },
  });

  if (byPrev) {
    if (!byPrev.isOpen) return { ok: false, reason: "session_closed" };
    if (!byPrev.qrPrevTokenExpiresAt || now > byPrev.qrPrevTokenExpiresAt) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, sessionId: byPrev.id, via: "previous" };
  }

  return { ok: false, reason: "not_found" };
}

export async function verifyEntryCode(
  sessionId: string,
  code: string
): Promise<VerifyResult> {
  const session = await db.classSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      isOpen: true,
      entryCode: true,
      entryCodePrev: true,
      qrTokenExpiresAt: true,
      qrPrevTokenExpiresAt: true,
    },
  });

  if (!session) return { ok: false, reason: "not_found" };
  if (!session.isOpen) return { ok: false, reason: "session_closed" };

  const now = new Date();
  if (
    session.entryCode === code &&
    session.qrTokenExpiresAt &&
    now <= session.qrTokenExpiresAt
  ) {
    return { ok: true, sessionId: session.id, via: "current" };
  }
  if (
    session.entryCodePrev === code &&
    session.qrPrevTokenExpiresAt &&
    now <= session.qrPrevTokenExpiresAt
  ) {
    return { ok: true, sessionId: session.id, via: "previous" };
  }

  return { ok: false, reason: "expired" };
}
