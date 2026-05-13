"use server";

import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

import { AuthError, requireStudent } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  getAttendanceStatus,
  getCheckInContext,
  isDemoCheckInEnabled,
} from "@/lib/checkin";
import { demoCheckInSchema, qrTokenSchema } from "@/lib/validations/checkin";

export type CheckInActionResult =
  | {
      ok: true;
      status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
      checkedInAt: string;
      duplicate: boolean;
    }
  | {
      ok: false;
      reason:
        | "invalid"
        | "expired"
        | "closed"
        | "not_enrolled"
        | "wrong_role"
        | "unauthorized";
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

async function getRequestInfo() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");

  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip"),
    userAgent: headerList.get("user-agent"),
  };
}

function mapContextFailure(reason: "missing_token" | "invalid" | "expired" | "closed") {
  if (reason === "expired") return "expired";
  if (reason === "closed") return "closed";
  return "invalid";
}

export async function checkInWithQrToken(token: string): Promise<CheckInActionResult> {
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
  const requestInfo = await getRequestInfo();

  try {
    const attendance = await db.attendance.create({
      data: {
        classSessionId: context.session.id,
        studentId: user.id,
        status,
        checkedInAt: now,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
      },
      select: { status: true, checkedInAt: true },
    });

    return {
      ok: true,
      status: attendance.status,
      checkedInAt: attendance.checkedInAt.toISOString(),
      duplicate: false,
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
  const requestInfo = await getRequestInfo();

  const demoCheckIn = await db.demoCheckIn.create({
    data: {
      classSessionId: context.session.id,
      displayName: parsed.data.displayName,
      checkedInAt: now,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
    },
    select: { displayName: true, checkedInAt: true },
  });

  return {
    ok: true,
    displayName: demoCheckIn.displayName,
    checkedInAt: demoCheckIn.checkedInAt.toISOString(),
  };
}
