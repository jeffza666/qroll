"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { AuthError, requireStudent } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  getAttendanceStatus,
  getCheckInContext,
  isDemoCheckInEnabled,
} from "@/lib/checkin";
import { demoCheckInSchema, qrTokenSchema } from "@/lib/validations/checkin";
import { haversineDistanceM } from "@/lib/geo/haversine";
import {
  GEOFENCE_RADIUS_M,
  STUDENT_ACCURACY_MAX_M,
} from "@/lib/geo/constants";

// Phase 6: location payload จากนักศึกษา (optional — session ที่ไม่เปิด geofence ไม่ต้องส่ง)
const locationInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().int().min(0).max(100_000),
});
export type CheckInLocationInput = z.infer<typeof locationInputSchema>;

export type CheckInActionResult =
  | {
      ok: true;
      status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
      checkedInAt: string;
      duplicate: boolean;
      /** Phase 6: เก็บผลลัพธ์ geofence ไว้โชว์ใน success panel (badge "ตรวจตำแหน่งแล้ว") */
      locationVerified?: {
        distanceM: number;
        accuracyM: number;
      };
    }
  | {
      ok: false;
      reason:
        | "invalid"
        | "expired"
        | "closed"
        | "not_enrolled"
        | "wrong_role"
        | "unauthorized"
        | "location_required"
        | "location_invalid"
        | "location_inaccurate"
        | "out_of_range";
      /** สำหรับ out_of_range → ระยะที่วัดได้จริงเอาไปโชว์ user ได้ */
      distanceM?: number;
      accuracyM?: number;
    };

export type DemoCheckInActionResult =
  | {
      ok: true;
      displayName: string;
      checkedInAt: string;
    }
  | {
      ok: false;
      reason: "disabled" | "invalid" | "expired" | "closed" | "validation";
      message?: string;
    };

function mapContextFailure(reason: "missing_token" | "invalid" | "expired" | "closed") {
  if (reason === "expired") return "expired";
  if (reason === "closed") return "closed";
  return "invalid";
}

export async function checkInWithQrToken(
  token: string,
  location?: CheckInLocationInput
): Promise<CheckInActionResult> {
  const parsedToken = qrTokenSchema.safeParse(token);
  if (!parsedToken.success) return { ok: false, reason: "invalid" };

  let user: Awaited<ReturnType<typeof requireStudent>>;
  try {
    user = await requireStudent();
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: false,
        reason: error.code === "UNAUTHORIZED" ? "unauthorized" : "wrong_role",
      };
    }

    throw error;
  }

  const context = await getCheckInContext(parsedToken.data);
  if (!context.ok) return { ok: false, reason: mapContextFailure(context.reason) };

  const enrollment = await db.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId: context.session.course.id,
      },
    },
    select: { id: true },
  });

  if (!enrollment) return { ok: false, reason: "not_enrolled" };

  // Phase 6: geofence verification (server-authoritative)
  // ถ้า session มี anchor → ต้องมี location จาก client + ผ่าน distance check
  // ถ้าไม่มี anchor → bypass ทั้งหมด (Phase 5 flow / opt-out)
  let verifiedDistanceM: number | null = null;
  let verifiedAccuracyM: number | null = null;
  if (context.session.anchor) {
    if (!location) return { ok: false, reason: "location_required" };

    const parsedLoc = locationInputSchema.safeParse(location);
    if (!parsedLoc.success) return { ok: false, reason: "location_invalid" };

    if (parsedLoc.data.accuracyM > STUDENT_ACCURACY_MAX_M) {
      return {
        ok: false,
        reason: "location_inaccurate",
        accuracyM: parsedLoc.data.accuracyM,
      };
    }

    const distanceM = haversineDistanceM(
      { lat: parsedLoc.data.lat, lng: parsedLoc.data.lng },
      context.session.anchor
    );
    // radius = GEOFENCE_RADIUS_M + accuracy buffer (ยอมรับ uncertainty ของ GPS นักศึกษา)
    const effectiveRadius = GEOFENCE_RADIUS_M + parsedLoc.data.accuracyM;
    if (distanceM > effectiveRadius) {
      return {
        ok: false,
        reason: "out_of_range",
        distanceM,
        accuracyM: parsedLoc.data.accuracyM,
      };
    }
    verifiedDistanceM = distanceM;
    verifiedAccuracyM = parsedLoc.data.accuracyM;
  }

  const existing = await db.attendance.findUnique({
    where: {
      classSessionId_studentId: {
        classSessionId: context.session.id,
        studentId: user.id,
      },
    },
    select: { status: true, checkedInAt: true },
  });

  if (existing) {
    return {
      ok: true,
      status: existing.status,
      checkedInAt: existing.checkedInAt.toISOString(),
      duplicate: true,
    };
  }

  const now = new Date();
  const status = getAttendanceStatus(now, context.session.lateAfter);

  try {
    const attendance = await db.attendance.create({
      data: {
        classSessionId: context.session.id,
        studentId: user.id,
        status,
        checkedInAt: now,
        distanceM: verifiedDistanceM,
        accuracyM: verifiedAccuracyM,
      },
      select: { status: true, checkedInAt: true },
    });

    return {
      ok: true,
      status: attendance.status,
      checkedInAt: attendance.checkedInAt.toISOString(),
      duplicate: false,
      ...(verifiedDistanceM !== null && verifiedAccuracyM !== null
        ? { locationVerified: { distanceM: verifiedDistanceM, accuracyM: verifiedAccuracyM } }
        : {}),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = await db.attendance.findUniqueOrThrow({
        where: {
          classSessionId_studentId: {
            classSessionId: context.session.id,
            studentId: user.id,
          },
        },
        select: { status: true, checkedInAt: true },
      });

      return {
        ok: true,
        status: duplicate.status,
        checkedInAt: duplicate.checkedInAt.toISOString(),
        duplicate: true,
      };
    }

    throw error;
  }
}

export async function demoCheckInWithQrToken(
  token: string,
  displayName: string
): Promise<DemoCheckInActionResult> {
  if (!isDemoCheckInEnabled()) return { ok: false, reason: "disabled" };

  const parsed = demoCheckInSchema.safeParse({ token, displayName });
  if (!parsed.success) {
    return {
      ok: false,
      reason: "validation",
      message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const context = await getCheckInContext(parsed.data.token);
  if (!context.ok) {
    return { ok: false, reason: mapContextFailure(context.reason) };
  }

  const now = new Date();

  const demoCheckIn = await db.demoCheckIn.create({
    data: {
      classSessionId: context.session.id,
      displayName: parsed.data.displayName,
      checkedInAt: now,
    },
    select: { displayName: true, checkedInAt: true },
  });

  return {
    ok: true,
    displayName: demoCheckIn.displayName,
    checkedInAt: demoCheckIn.checkedInAt.toISOString(),
  };
}
