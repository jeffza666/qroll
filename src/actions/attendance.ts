"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import type { AttendanceStatus } from "@prisma/client";

const StatusSchema = z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]);

type UpdateResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "invalid_status" };

export async function updateAttendanceStatus(
  attendanceId: string,
  newStatus: AttendanceStatus
): Promise<UpdateResult> {
  const parsed = StatusSchema.safeParse(newStatus);
  if (!parsed.success) return { ok: false, reason: "invalid_status" };

  const attendance = await db.attendance.findUnique({
    where: { id: attendanceId },
    select: { classSession: { select: { courseId: true } } },
  });

  if (!attendance) return { ok: false, reason: "not_found" };

  try {
    await requireCourseOwner(attendance.classSession.courseId);
  } catch {
    return { ok: false, reason: "forbidden" };
  }

  await db.attendance.update({
    where: { id: attendanceId },
    data: { status: parsed.data },
  });

  revalidatePath(`/teacher/courses/${attendance.classSession.courseId}`);

  return { ok: true };
}
