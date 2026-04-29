"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCourseOwner } from "@/lib/auth-helpers";

// แปลง "HH:MM" Bangkok time + Bangkok date → UTC Date
function buildBangkokDateTime(bangkokDateStr: string, hhmm: string): Date {
  const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
  const [year, month, day] = bangkokDateStr.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  // Date.UTC ใช้ year/month/day จาก Bangkok date + h/m จาก Bangkok clock
  // แล้วลบ offset 7h เพื่อได้ UTC จริง
  return new Date(Date.UTC(year, month - 1, day, h, m) - BANGKOK_OFFSET_MS);
}

export async function openSession(scheduleId: string) {
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, courseId: true, startTime: true, endTime: true },
  });
  if (!schedule) return { error: "ไม่พบตารางสอน" };

  await requireCourseOwner(schedule.courseId);

  // คำนวณ server-side — ห้ามรับจาก client (anti-tampering)
  const bangkokDateStr = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Bangkok",
  });
  const startsAt = buildBangkokDateTime(bangkokDateStr, schedule.startTime);
  const endsAt = buildBangkokDateTime(bangkokDateStr, schedule.endTime);

  let sessionId: string;
  try {
    const session = await db.classSession.create({
      data: {
        courseId: schedule.courseId,
        scheduleId: schedule.id,
        startsAt,
        endsAt,
        isOpen: true,
      },
      select: { id: true },
    });
    sessionId = session.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // Prisma P2002 = unique constraint violation = partial unique index hit = double-open
    if (msg.includes("P2002") || msg.includes("unique constraint")) {
      return {
        error: "มี session ของวิชานี้ที่เปิดอยู่แล้ว — กรุณาปิดก่อนเปิดใหม่",
      };
    }
    throw err;
  }

  redirect(`/teacher/sessions/${sessionId}`);
}

export async function closeSession(sessionId: string) {
  const session = await db.classSession.findUnique({
    where: { id: sessionId },
    select: { courseId: true, isOpen: true },
  });
  if (!session) return { error: "ไม่พบ session" };

  await requireCourseOwner(session.courseId);

  // idempotent — ถ้าปิดไปแล้วก็ no-op
  await db.classSession.updateMany({
    where: { id: sessionId, isOpen: true },
    data: { isOpen: false, closedAt: new Date() },
  });

  revalidatePath("/teacher");
  revalidatePath(`/teacher/courses/${session.courseId}`);
  revalidatePath(`/teacher/sessions/${sessionId}`);
  return { success: true };
}
