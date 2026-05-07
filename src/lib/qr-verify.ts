import "server-only";

import { db } from "@/lib/db";

export type VerifyResult =
  | { ok: true; sessionId: string; via: "current" | "previous" }
  | { ok: false; reason: "not_found" | "expired" | "session_closed" };

export async function verifyQrToken(token: string): Promise<VerifyResult> {
  const session = await db.classSession.findUnique({
    where: { qrToken: token },
    select: { id: true, isOpen: true },
  });

  if (session) {
    if (!session.isOpen) return { ok: false, reason: "session_closed" };
    return { ok: true, sessionId: session.id, via: "current" };
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
    },
  });

  if (!session) return { ok: false, reason: "not_found" };
  if (!session.isOpen) return { ok: false, reason: "session_closed" };

  if (session.entryCode === code) {
    return { ok: true, sessionId: session.id, via: "current" };
  }

  return { ok: false, reason: "not_found" };
}
