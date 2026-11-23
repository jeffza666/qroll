import { BookOpen, ChevronRight, QrCode, Users } from "lucide-react";
import Link from "next/link";

import CheckInLauncher from "@/components/student/CheckInLauncher";
import AttendanceStanding from "@/components/student/AttendanceStanding";
import PageHeader from "@/components/shell/PageHeader";
import { cellForSession, summarizeMarks } from "@/lib/attendance-summary";
import { requireStudent } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function StudentHomePage() {
  const user = await requireStudent();

  const enrollments = await db.enrollment.findMany({
    where: { studentId: user.id, droppedAt: null },
    include: {
      course: {
        include: { _count: { select: { enrollments: { where: { droppedAt: null } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const closedSessions =
    enrollments.length === 0
      ? []
      : await db.classSession.findMany({
          where: {
            isOpen: false,
            courseId: { in: enrollments.map((enrollment) => enrollment.course.id) },
          },
          select: {
            courseId: true,
            startsAt: true,
            attendances: {
              where: { studentId: user.id },
              select: { status: true },
            },
          },
        });

  const standings = enrollments.map((enrollment) => {
    const summary = summarizeMarks(
      closedSessions
        .filter((session) => session.courseId === enrollment.course.id)
        .map((session) =>
          cellForSession(enrollment.createdAt, {
            startsAt: session.startsAt,
            status: session.attendances[0]?.status ?? null,
          }),
        ),
    );
    return { enrollmentId: enrollment.id, ...summary };
  });
  const standingByEnrollment = new Map(
    standings.map((standing) => [standing.enrollmentId, standing]),
  );
  const dangerCount = standings.filter((standing) => standing.band === "danger").length;
  const warnCount = standings.filter((standing) => standing.band === "warn").length;

  return (
    <>
      <PageHeader>
        <div className="min-w-0">
          <h1 className="truncate font-inter text-2xl font-black text-slate-900">วิชาที่ลงเรียน</h1>
          <p className="truncate text-sm text-slate-500">{enrollments.length} รายวิชา</p>
        </div>
      </PageHeader>

      <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
        <div className="animate-fade-in pb-8">
          <div className="mb-8">
            <CheckInLauncher />
          </div>

          {dangerCount > 0 ? (
            <div
              role="status"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800"
            >
              มี {dangerCount} วิชาที่อัตราเข้าเรียนต่ำกว่า 60% — เปิดรายวิชาเพื่อดูคาบที่ขาด
            </div>
          ) : warnCount > 0 ? (
            <div
              role="status"
              className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900"
            >
              มี {warnCount} วิชาที่ควรเฝ้าระวัง เพราะอัตราเข้าเรียนต่ำกว่า 80%
            </div>
          ) : null}

          <div className="relative mb-6 ml-1 flex items-center gap-3">
            <div className="h-8 w-2 rounded-full bg-qroll-red-dark shadow-md shadow-red-900/20" />
            <h2 className="font-inter text-xl font-black text-slate-800">
              รายวิชาที่ลงเรียน{" "}
              <span className="ml-1 font-medium text-slate-400">(Enrolled Courses)</span>
            </h2>
          </div>

          {enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-slate-400 shadow-sm">
              <QrCode className="mb-4 h-14 w-14 opacity-30" />
              <p className="text-sm font-semibold">ยังไม่มีรายวิชาที่ลงเรียน</p>
              <p className="mt-1 text-xs text-slate-400">
                เมื่ออาจารย์เพิ่มรายชื่อ จะเห็นรายวิชาที่นี่
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {enrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/student/courses/${enrollment.course.id}`}
                  className="group block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-qroll-red-dark to-red-800 text-white shadow-lg shadow-red-900/20 transition-transform duration-300 group-hover:scale-110">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-qroll-red-dark" />
                  </div>
                  <p className="font-inter text-lg font-black text-slate-900 transition-colors group-hover:text-qroll-red-dark">
                    {enrollment.course.code}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {enrollment.course.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    เทอม {enrollment.course.semester}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-sm text-slate-500">
                    <Users className="h-4 w-4 text-slate-400" />
                    {enrollment.course._count.enrollments} นักศึกษา
                  </div>
                  <AttendanceStanding
                    pct={standingByEnrollment.get(enrollment.id)?.pct ?? null}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
