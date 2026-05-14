"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AnchorSource, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCourseOwner } from "@/lib/auth-helpers";
import { generateEntryCode, generateQrToken } from "@/lib/qr-token";

// Phase 6: anchor choice ตอนเปิด session
// - none        = ไม่เปิด geofence (opt-out)
// - course_saved = ใช้ Course.geofenceLat/Lng (server lookup เอง)
// Source of truth สำหรับ anchor = หน้า edit course เท่านั้น
// (ถ้าอาจารย์ต้องการเปลี่ยน เช่นย้ายห้อง ให้ไปแก้ที่หน้า edit course)
const anchorInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("course_saved") }),
]);

const openSessionSchema = z.object({
  courseId: z.string().min(1),
  durationMinutes: z.number().int().min(1).max(180),
  graceMinutes: z.number().int().min(0).max(180).nullable(),
  anchor: anchorInputSchema.default({ kind: "none" }),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;

// หา Schedule ของ courseId ที่ตรงกับ "วันนี้" (Bangkok) — คืน id + room
// room ถูก snapshot ลง ClassSession.roomSnapshot เพื่อไม่ให้เปลี่ยนแม้แก้ Schedule ทีหลัง
async function findTodaySchedule(
  courseId: string
): Promise<{ id: string; room: string | null } | null> {
  const bangkokNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const match = await db.schedule.findFirst({
    where: { courseId, dayOfWeek: bangkokNow.getDay() },
    select: { id: true, room: true },
  });
  return match ?? null;
}

export async function openSession(input: OpenSessionInput) {
  const parsed = openSessionSchema.safeParse(input);
  if (!parsed.success) return { error: "ข้อมูลไม่ถูกต้อง" };

  const { courseId, durationMinutes, graceMinutes, anchor } = parsed.data;

  if (graceMinutes !== null && graceMinutes >= durationMinutes) {
    return { error: "เวลาแยกผู้มาสายต้องน้อยกว่าเวลาเปิด" };
  }

  await requireCourseOwner(courseId);

  // กัน archived course เปิด session ใหม่ — archive = read-only
  // เก็บ geofence ไว้ใช้ใน anchor resolution ด้วย (lookup ครั้งเดียว)
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { archivedAt: true, geofenceLat: true, geofenceLng: true },
  });
  if (course?.archivedAt) {
    return {
      error: "รายวิชานี้ถูก archive แล้ว ต้อง unarchive ก่อนเปิด session ใหม่",
    };
  }

  // Phase 6: resolve anchor ตาม choice
  let anchorLat: number | null = null;
  let anchorLng: number | null = null;
  let anchorSource: AnchorSource | null = null;

  if (anchor.kind === "course_saved") {
    if (course?.geofenceLat == null || course.geofenceLng == null) {
      return {
        error: "วิชานี้ยังไม่ได้บันทึกตำแหน่งห้องเรียน กรุณาไปบันทึกที่หน้าแก้ไขรายวิชาก่อน",
      };
    }
    anchorLat = course.geofenceLat;
    anchorLng = course.geofenceLng;
    anchorSource = AnchorSource.COURSE_SAVED;
  }

  const existingOpenSession = await db.classSession.findFirst({
    where: { courseId, isOpen: true },
    select: { id: true },
  });
  if (existingOpenSession) {
    redirect(`/teacher/sessions/${existingOpenSession.id}`);
  }

  const now = new Date();
  const startsAt = now;
  const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
  const lateAfter =
    graceMinutes !== null
      ? new Date(now.getTime() + graceMinutes * 60 * 1000)
      : null;
  const todaySchedule = await findTodaySchedule(courseId);

  // ถ้าไม่มีตารางวันนี้ ยังดึง room จาก schedule แรกมาใช้เป็น snapshot
  const fallbackRoom = todaySchedule?.room
    ?? (await db.schedule.findFirst({ where: { courseId }, select: { room: true } }))?.room
    ?? null;

  let sessionId: string;
  try {
    const session = await db.classSession.create({
      data: {
        courseId,
        scheduleId: todaySchedule?.id ?? null,
        roomSnapshot: fallbackRoom,
        startsAt,
        endsAt,
        durationMinutes,
        lateAfter,
        graceMinutes,
        qrToken: generateQrToken(),
        entryCode: generateEntryCode(),
        isOpen: true,
        anchorLat,
        anchorLng,
        anchorSource,
      },
      select: { id: true },
    });
    sessionId = session.id;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const activeSession = await db.classSession.findFirst({
        where: { courseId, isOpen: true },
        select: { id: true },
      });

      if (activeSession) {
        redirect(`/teacher/sessions/${activeSession.id}`);
      }

      return {
        error: "มี session ของวิชานี้ที่เปิดอยู่แล้ว กรุณาปิดก่อนเปิดใหม่",
      };
    }
    throw err;
  }

  redirect(`/teacher/sessions/${sessionId}`);
}

/**
 * Hard delete session — ลบ ClassSession + cascade attendances + demoCheckIns
 * Cascade ตั้งไว้ใน schema แล้ว (onDelete: Cascade) — ลบตัว parent ตัวเดียวพอ
 *
 * ไม่ใช้ soft delete เพราะ:
 * - ลด complexity (ไม่ต้อง filter `deletedAt IS NULL` ทุก query)
 * - Scope ของโปรเจกต์ไม่ต้องการ audit trail ของ session ที่ลบ
 * - User เห็น type-to-confirm แล้ว = ตัดสินใจ deliberate พอ
 */
export async function deleteSession(sessionId: string) {
  const session = await db.classSession.findUnique({
    where: { id: sessionId },
    select: { courseId: true },
  });
  if (!session) return { error: "ไม่พบ session" };

  await requireCourseOwner(session.courseId);

  await db.classSession.delete({ where: { id: sessionId } });

  revalidatePath("/teacher");
  revalidatePath(`/teacher/courses/${session.courseId}`);
  return { success: true, courseId: session.courseId };
}

export async function closeSession(sessionId: string) {
  const session = await db.classSession.findUnique({
    where: { id: sessionId },
    select: { courseId: true, isOpen: true },
  });
  if (!session) return { error: "ไม่พบ session" };

  await requireCourseOwner(session.courseId);

  await db.classSession.updateMany({
    where: { id: sessionId, isOpen: true },
    data: {
      isOpen: false,
      closedAt: new Date(),
      qrToken: null,
      entryCode: null,
    },
  });

  revalidatePath("/teacher");
  revalidatePath(`/teacher/courses/${session.courseId}`);
  // ไม่ revalidate หน้า session ปัจจุบัน — ปล่อยให้ client (SessionView) ค้างที่ empty state
  // user จะกดปุ่ม "ดูประวัติคาบนี้" เองทีหลัง (เรียก router.refresh ที่ฝั่ง client)
  return { success: true };
}
