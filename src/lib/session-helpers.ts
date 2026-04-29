import "server-only";

import type { ClassSession } from "@prisma/client";
import { db } from "@/lib/db";

const SAFETY_TIMEOUT_MIN = 30;

// Lazy auto-close: ถ้า session ยัง open แต่เลยเวลา endsAt + 30 นาทีแล้ว → ปิดอัตโนมัติ
// เรียกก่อน render ทุก page ที่แสดง session — ไม่ต้องใช้ cron job
export async function autoCloseIfExpired(
  session: ClassSession
): Promise<ClassSession> {
  if (!session.isOpen) return session;

  const expiresAt = new Date(
    session.endsAt.getTime() + SAFETY_TIMEOUT_MIN * 60 * 1000
  );
  if (Date.now() < expiresAt.getTime()) return session;

  const updated = await db.classSession.update({
    where: { id: session.id, isOpen: true },
    data: { isOpen: false, closedAt: expiresAt },
  });
  return updated;
}
