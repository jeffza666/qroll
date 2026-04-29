"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCourseOwner } from "@/lib/auth-helpers";
import { createScheduleSchema } from "@/lib/validations/schedule";

export async function createSchedule(formData: FormData) {
  const raw = {
    courseId: formData.get("courseId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    room: formData.get("room") ?? "",
  };

  const parsed = createScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { courseId, dayOfWeek, startTime, endTime, room } = parsed.data;

  await requireCourseOwner(courseId);

  await db.schedule.create({
    data: {
      courseId,
      dayOfWeek,
      startTime,
      endTime,
      room: room || null,
    },
  });

  revalidatePath(`/teacher/courses/${courseId}`);
  return { success: true };
}

export async function deleteSchedule(scheduleId: string) {
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    select: { courseId: true },
  });
  if (!schedule) return { error: "ไม่พบตารางสอน" };

  await requireCourseOwner(schedule.courseId);

  try {
    await db.schedule.delete({ where: { id: scheduleId } });
  } catch (err) {
    // Prisma P2003 = foreign key constraint (has sessions)
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("P2003") || msg.includes("Foreign key constraint")) {
      return {
        error:
          "ลบไม่ได้ — มี session ที่บันทึกการเข้าเรียนแล้ว กรุณาลบ session ก่อน",
      };
    }
    throw err;
  }

  revalidatePath(`/teacher/courses/${schedule.courseId}`);
  return { success: true };
}
