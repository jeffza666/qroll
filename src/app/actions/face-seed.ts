"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

import { AuthError, requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { FACE_DESCRIPTOR_LENGTH, isFaceSeedEnabled } from "@/lib/face/constants";

const seedSchema = z.object({
  targetStudentId: z.string().min(1),
  descriptor: z
    .array(z.number().finite())
    .length(FACE_DESCRIPTOR_LENGTH, "descriptor length mismatch"),
});

export type SeedFaceResult =
  | { ok: true }
  | {
      ok: false;
      reason: "disabled" | "unauthorized" | "forbidden" | "validation" | "not_found" | "wrong_role";
      message?: string;
    };

// teacher admin seed — จำลอง TU photo sync
// browser ทำ descriptor มาแล้วส่ง array ตัวเลขมานี่ ไม่เก็บรูป
export async function seedFaceForStudent(
  targetStudentUserId: string,
  descriptor: number[],
): Promise<SeedFaceResult> {
  if (!isFaceSeedEnabled()) return { ok: false, reason: "disabled" };
  try {
    await requireTeacher();
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        reason: err.code === "UNAUTHORIZED" ? "unauthorized" : "forbidden",
      };
    }
    throw err;
  }

  const parsed = seedSchema.safeParse({
    targetStudentId: targetStudentUserId,
    descriptor,
  });
  if (!parsed.success) {
    return {
      ok: false,
      reason: "validation",
      message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const target = await db.user.findUnique({
    where: { id: parsed.data.targetStudentId },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, reason: "not_found" };
  if (target.role !== Role.STUDENT) return { ok: false, reason: "wrong_role" };

  await db.user.update({
    where: { id: target.id },
    data: {
      faceDescriptor: parsed.data.descriptor,
      faceEnrolledAt: new Date(),
    },
  });

  revalidatePath("/teacher/face-seed");
  return { ok: true };
}

export type ClearFaceResult =
  | { ok: true }
  | { ok: false; reason: "disabled" | "unauthorized" | "forbidden" | "not_found" };

export async function clearFaceForStudent(
  targetStudentUserId: string,
): Promise<ClearFaceResult> {
  if (!isFaceSeedEnabled()) return { ok: false, reason: "disabled" };
  try {
    await requireTeacher();
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        reason: err.code === "UNAUTHORIZED" ? "unauthorized" : "forbidden",
      };
    }
    throw err;
  }

  const target = await db.user.findUnique({
    where: { id: targetStudentUserId },
    select: { id: true },
  });
  if (!target) return { ok: false, reason: "not_found" };

  await db.user.update({
    where: { id: target.id },
    data: { faceDescriptor: [], faceEnrolledAt: null },
  });

  revalidatePath("/teacher/face-seed");
  return { ok: true };
}
