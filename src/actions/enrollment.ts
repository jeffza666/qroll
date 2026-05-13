"use server";

import { revalidatePath } from "next/cache";

import { requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

type DropResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "already_dropped" };

export async function dropEnrollment(enrollmentId: string): Promise<DropResult> {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { courseId: true, droppedAt: true },
  });

  if (!enrollment) return { ok: false, reason: "not_found" };
  if (enrollment.droppedAt) return { ok: false, reason: "already_dropped" };

  try {
    await requireCourseOwner(enrollment.courseId);
  } catch {
    return { ok: false, reason: "forbidden" };
  }

  await db.enrollment.update({
    where: { id: enrollmentId },
    data: { droppedAt: new Date() },
  });

  revalidatePath(`/teacher/courses/${enrollment.courseId}`);

  return { ok: true };
}

/**
 * Hard delete enrollment — ลบทิ้งถาวร
 *
 * เงื่อนไข: ต้อง dropped ก่อนเท่านั้น (droppedAt ไม่เป็น null)
 * เหตุผล: กัน accidental delete นศ. active — ต้อง drop ก่อน → ค่อยลบ
 *
 * Side effects:
 * - Attendance history ของนศ. คนนี้ "ไม่หาย" เพราะ Attendance.student → User (ไม่ใช่ Enrollment)
 * - Session Report เก่ายังเห็นชื่อนศ. คนนี้พร้อม badge "ถอนแล้ว"
 */
type DeleteResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "not_dropped" };

export async function deleteEnrollment(enrollmentId: string): Promise<DeleteResult> {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { courseId: true, droppedAt: true },
  });

  if (!enrollment) return { ok: false, reason: "not_found" };
  if (!enrollment.droppedAt) return { ok: false, reason: "not_dropped" };

  try {
    await requireCourseOwner(enrollment.courseId);
  } catch {
    return { ok: false, reason: "forbidden" };
  }

  await db.enrollment.delete({ where: { id: enrollmentId } });

  revalidatePath(`/teacher/courses/${enrollment.courseId}/students`);
  return { ok: true };
}

// Phase 6: restore enrollment UI (use Prisma Studio in the meantime)
export async function restoreEnrollment(enrollmentId: string): Promise<DropResult> {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { courseId: true, droppedAt: true },
  });

  if (!enrollment) return { ok: false, reason: "not_found" };

  try {
    await requireCourseOwner(enrollment.courseId);
  } catch {
    return { ok: false, reason: "forbidden" };
  }

  await db.enrollment.update({
    where: { id: enrollmentId },
    data: { droppedAt: null },
  });

  revalidatePath(`/teacher/courses/${enrollment.courseId}`);

  return { ok: true };
}
