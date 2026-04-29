import { NextResponse } from "next/server";

import { AuthError, requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function noStoreJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      ...init?.headers,
    },
  });
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await db.classSession.findUnique({
      where: { id },
      select: { courseId: true },
    });

    if (!session) return noStoreJson({ error: "not_found" }, { status: 404 });

    await requireCourseOwner(session.courseId);

    const [attendanceCount, demoCount, attendances, demoCheckIns] =
      await Promise.all([
        db.attendance.count({ where: { classSessionId: id } }),
        db.demoCheckIn.count({ where: { classSessionId: id } }),
        db.attendance.findMany({
          where: { classSessionId: id },
          orderBy: { checkedInAt: "desc" },
          take: 8,
          include: { student: { select: { name: true, studentId: true } } },
        }),
        db.demoCheckIn.findMany({
          where: { classSessionId: id },
          orderBy: { checkedInAt: "desc" },
          take: 8,
          select: { id: true, displayName: true, checkedInAt: true },
        }),
      ]);

    return noStoreJson({
      attendanceCount,
      demoCount,
      attendances: attendances.map((attendance) => ({
        id: attendance.id,
        name: attendance.student.name,
        studentId: attendance.student.studentId,
        status: attendance.status,
        checkedInAt: attendance.checkedInAt.toISOString(),
      })),
      demoCheckIns: demoCheckIns.map((demoCheckIn) => ({
        id: demoCheckIn.id,
        displayName: demoCheckIn.displayName,
        checkedInAt: demoCheckIn.checkedInAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return noStoreJson(
        { error: error.code.toLowerCase() },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 }
      );
    }

    throw error;
  }
}
