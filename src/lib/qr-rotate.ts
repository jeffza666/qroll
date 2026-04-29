import "server-only";

import type { ClassSession } from "@prisma/client";

import { db } from "@/lib/db";
import { QR_GRACE_WINDOW_MS, QR_REFRESH_INTERVAL_MS } from "@/lib/qr-config";
import { generateEntryCode, generateQrToken } from "@/lib/qr-token";

export async function rotateIfExpired(
  session: ClassSession
): Promise<ClassSession> {
  if (!session.isOpen) return session;
  if (session.qrTokenExpiresAt && Date.now() < session.qrTokenExpiresAt.getTime()) {
    return session;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + QR_REFRESH_INTERVAL_MS);

  const rotated = await db.classSession.updateMany({
    where: {
      id: session.id,
      isOpen: true,
      OR: [{ qrTokenExpiresAt: null }, { qrTokenExpiresAt: { lte: now } }],
    },
    data: {
      qrToken: generateQrToken(),
      qrTokenExpiresAt: expiresAt,
      qrRefreshedAt: now,
      qrPrevToken: session.qrToken,
      qrPrevTokenExpiresAt: session.qrToken
        ? new Date(now.getTime() + QR_GRACE_WINDOW_MS)
        : null,
      entryCode: generateEntryCode(),
      entryCodePrev: session.entryCode,
    },
  });

  if (rotated.count === 0) {
    const latest = await db.classSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    return latest;
  }

  return db.classSession.findUniqueOrThrow({
    where: { id: session.id },
  });
}
