import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, Users } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";

import ReportClient from "@/components/report/ReportClient";
import ExportCsvButton from "@/components/report/ExportCsvButton";
import PageHeader from "@/components/shell/PageHeader";
import {
  cellForSession,
  riskBand,
  summarizeMarks,
  summarizeSession,
} from "@/lib/attendance-summary";
import { requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bangkokParts } from "@/lib/datetime";

type Props = { params: Promise<{ id: string }> };

const DAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function sessionLabel(startsAt: Date): string {
  const bkk = bangkokParts(startsAt);
  return `${DAYS_SHORT[bkk.dayOfWeek]} ${bkk.day} ${TH_MONTHS_SHORT[bkk.month - 1]}`;
}

export default async function CourseReportPage({ params }: Props) {
  const { id } = await params;
  const user = await requireCourseOwner(id);
  void user;

  const [course, sessions, enrollments] = await Promise.all([
    db.course.findFirst({
      where: { id },
      select: { id: true, code: true, name: true, section: true, semester: true },
    }),
    db.classSession.findMany({
      where: { courseId: id, isOpen: false },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        attendances: {
          select: {
            studentId: true,
            status: true,
          },
        },
      },
    }),
    db.enrollment.findMany({
      where: { courseId: id, droppedAt: null },
      select: {
        id: true,
        createdAt: true,
        student: { select: { id: true, name: true, studentId: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!course) notFound();

  const matrixSessions = sessions.map((s) => ({
    sessionId: s.id,
    label: sessionLabel(s.startsAt),
  }));

  const matrixStudents = enrollments.map((en) => {
    const cells: (AttendanceStatus | null)[] = sessions.map((s) =>
      cellForSession(en.createdAt, {
        startsAt: s.startsAt,
        status: s.attendances.find((a) => a.studentId === en.student.id)?.status ?? null,
      }),
    );
    const summary = summarizeMarks(cells);

    return {
      enrollmentId: en.id,
      studentId: en.student.studentId,
      name: en.student.name,
      cells,
      presentCount: summary.present,
      lateCount: summary.late,
      absentCount: summary.absent,
      excusedCount: summary.excused,
      pct: summary.pct,
    };
  });

  const riskBuckets = matrixStudents.reduce(
    (acc, s) => {
      const band = riskBand(s.pct);
      if (band === "safe") acc.safe += 1;
      else if (band === "warn") acc.warn += 1;
      else if (band === "danger") acc.danger += 1;
      return acc;
    },
    { safe: 0, warn: 0, danger: 0 },
  );

  const sessionStats = sessions.map((s) => ({
    label: sessionLabel(s.startsAt),
    pct: summarizeSession({
      startsAt: s.startsAt,
      students: enrollments.map((en) => ({
        enrolledAt: en.createdAt,
        status: s.attendances.find((a) => a.studentId === en.student.id)?.status ?? null,
      })),
    }).pct,
  }));

  const totalAbsent = matrixStudents.reduce((sum, s) => sum + s.absentCount, 0);
  const totalLate = matrixStudents.reduce((sum, s) => sum + s.lateCount, 0);

  // Avg pct — เฉลี่ยจาก rate ของแต่ละ student (ไม่ใช่ของทั้ง session)
  const studentPcts = matrixStudents.flatMap((s) => (s.pct === null ? [] : [s.pct]));
  const avgPct =
    studentPcts.length > 0
      ? Math.round(studentPcts.reduce((x, y) => x + y, 0) / studentPcts.length)
      : null;

  const csvFilename = `report-${course.code}${course.section ? `-sec${course.section}` : ""}-${course.semester}.csv`;

  return (
    <>
      <PageHeader className="justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href={`/teacher/courses/${id}`}
            aria-label="กลับไปรายวิชา"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="กลับไปรายวิชา"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black text-slate-900">รายละเอียดรายวิชา</h1>
            <p className="truncate text-sm text-slate-500">{course.name} • เทอม {course.semester}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/teacher/courses/${id}/students`}
            aria-label="จัดการนักศึกษา"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-bold text-slate-700 antialiased shadow-sm transition-colors hover:bg-slate-50 sm:px-5"
          >
            <Users className="w-4 h-4" />
            <span className="hidden lg:inline">จัดการนักศึกษา</span>
          </Link>
          <ExportCsvButton filename={csvFilename} sessions={matrixSessions} students={matrixStudents} />
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-7 w-2 rounded-full bg-qroll-red-dark shadow-sm" />
                <h2 className="text-2xl font-extrabold tracking-wide text-slate-800 md:text-[28px]">
                  สรุปการเข้าเรียนทั้งเทอม
                </h2>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-4">
                <h3 className="font-inter text-3xl sm:text-4xl font-black leading-none tracking-tight text-slate-900 md:text-5xl">
                  {course.code}
                </h3>
                {course.section && (
                  <span className="rounded-lg bg-qroll-red-dark px-3 py-1 font-inter text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                    Sec {course.section}
                  </span>
                )}
              </div>
              <h4 className="text-xl font-bold text-slate-600 md:text-2xl">
                {course.name}
                <span className="ml-2 text-base font-medium text-slate-400">เทอม {course.semester}</span>
              </h4>
            </div>

            <div className="flex shrink-0 items-center gap-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-sm">
              <div className="border-r border-slate-200 pr-6 text-center">
                <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-200">
                  <Users className="h-5 w-5 text-slate-500" />
                </div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">นักศึกษา</p>
                <p className="font-inter text-3xl font-black text-slate-900">
                  {matrixStudents.length}{" "}
                  <span className="text-sm font-normal text-slate-400">คน</span>
                </p>
              </div>
              <div className="text-center">
                <div
                  className={`mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full ${
                    avgPct === null
                      ? "bg-slate-200"
                      : avgPct >= 80
                        ? "bg-emerald-100"
                        : avgPct >= 60
                          ? "bg-amber-100"
                          : "bg-red-100"
                  }`}
                >
                  <TrendingUp
                    className={`h-5 w-5 ${
                      avgPct === null
                        ? "text-slate-500"
                        : avgPct >= 80
                          ? "text-emerald-600"
                          : avgPct >= 60
                            ? "text-amber-600"
                            : "text-red-600"
                    }`}
                  />
                </div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">เข้าเรียนเฉลี่ย</p>
                <p
                  className={`font-inter text-3xl font-black ${
                    avgPct === null
                      ? "text-slate-900"
                      : avgPct >= 80
                        ? "text-emerald-600"
                        : avgPct >= 60
                          ? "text-amber-600"
                          : "text-red-600"
                  }`}
                >
                  {avgPct !== null ? `${avgPct}%` : "—"}
                </p>
              </div>
            </div>
          </div>

          <ReportClient
            sessions={matrixSessions}
            students={matrixStudents}
            sessionStats={sessionStats}
            totalSessions={sessions.length}
            totalAbsent={totalAbsent}
            totalLate={totalLate}
            riskBuckets={riskBuckets}
          />
        </div>
      </div>
    </>
  );
}
