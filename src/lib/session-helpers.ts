import "server-only";

import type { ClassSession } from "@prisma/client";
import { db } from "@/lib/db";

// Lazy auto-close: ถ้า session ยัง open แต่เลย endsAt แล้ว → ปิดทันที
// เรียกก่อน render ทุก page ที่แสดง session — ไม่ต้องใช้ cron job
export async function autoCloseIfExpired(
  session: ClassSession
): Promise<ClassSession> {
  if (!session.isOpen) return session;
  if (Date.now() < session.endsAt.getTime()) return session;

  const updated = await db.classSession.update({
    where: { id: session.id, isOpen: true },
    data: {
      isOpen: false,
      closedAt: session.endsAt,
      qrToken: null,
      entryCode: null,
    },
  });
  return updated;
}
