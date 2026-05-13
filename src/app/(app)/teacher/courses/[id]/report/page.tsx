import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, Users } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";

import ReportClient from "@/components/report/ReportClient";
import ExportCsvButton from "@/components/report/ExportCsvButton";
import { requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

const DAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function sessionLabel(startsAt: Date): string {
  const bkk = new Date(startsAt.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${DAYS_SHORT[bkk.getDay()]} ${bkk.getDate()} ${TH_MONTHS_SHORT[bkk.getMonth()]}`;
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
    const cells: (AttendanceStatus | null)[] = sessions.map((s) => {
      const att = s.attendances.find((a) => a.studentId === en.student.id);
      return att?.status ?? null;
    });

    const presentCount = cells.filter((c) => c === "PRESENT").length;
    const lateCount = cells.filter((c) => c === "LATE").length;
    const absentCount = cells.filter((c) => c === "ABSENT").length;
    const excusedCount = cells.filter((c) => c === "EXCUSED").length;
    const counted = presentCount + lateCount + absentCount;

    return {
      enrollmentId: en.id,
      studentId: en.student.studentId,
      name: en.student.name,
      cells,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      pct: counted > 0 ? Math.round(((presentCount + lateCount * 0.5) / counted) * 100) : null,
    };
  });

  // Risk buckets — skip pct === null (counted === 0)
  const riskBuckets = matrixStudents.reduce(
    (acc, s) => {
      if (s.pct === null) return acc;
      if (s.pct >= 80) acc.safe += 1;
      else if (s.pct >= 60) acc.warn += 1;
      else acc.danger += 1;
      return acc;
    },
    { safe: 0, warn: 0, danger: 0 }
  );

  // Per-session pct using same formula as avgPct: (P + L*0.5) / counted
  const sessionStats = sessions.map((s) => {
    let p = 0;
    let l = 0;
    let a = 0;
    for (const att of s.attendances) {
      if (att.status === "PRESENT") p += 1;
      else if (att.status === "LATE") l += 1;
      else if (att.status === "ABSENT") a += 1;
    }
    const counted = p + l + a;
    return {
      label: sessionLabel(s.startsAt),
      pct: counted > 0 ? Math.round(((p + l * 0.5) / counted) * 100) : null,
    };
  });

  const totalAbsent = matrixStudents.reduce((sum, s) => sum + s.absentCount, 0);
  const totalLate = matrixStudents.reduce((sum, s) => sum + s.lateCount, 0);

  // Avg pct — overall
  const allCounted = matrixStudents.flatMap((s) => {
    const counted = s.presentCount + s.lateCount + s.absentCount;
    if (counted === 0) return [];
    return [(s.presentCount + s.lateCount * 0.5) / counted];
  });
  const avgPct =
    allCounted.length > 0 ? Math.round((allCounted.reduce((x, y) => x + y, 0) / allCounted.length) * 100) : null;

  const csvFilename = `report-${course.code}${course.section ? `-sec${course.section}` : ""}-${course.semester}.csv`;

  return (
    <>
      <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/85 px-6 backdrop-blur-md lg:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={`/teacher/courses/${id}`}
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

        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/courses/${id}/students`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-base font-bold antialiased hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Users className="w-4 h-4" />
            จัดการนักศึกษา
          </Link>
          <ExportCsvButton filename={csvFilename} sessions={matrixSessions} students={matrixStudents} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="mx-auto max-w-6xl">
          {/* CourseHeader card with inline stats */}
          <div className="mb-8 flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-7 w-2 rounded-full bg-[#990000] shadow-sm" />
                <h2 className="text-2xl font-extrabold tracking-wide text-slate-800 md:text-[28px]">
                  สรุปการเข้าเรียนทั้งเทอม
                </h2>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-4">
                <h3 className="font-inter text-4xl font-black leading-none tracking-tight text-slate-900 md:text-5xl">
                  {course.code}
                </h3>
                {course.section && (
                  <span className="rounded-lg bg-[#990000] px-3 py-1 font-inter text-xs font-bold uppercase tracking-wider text-white shadow-sm">
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
                <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">เข้าเรียนเฉลี่ย</p>
                <p className={`font-inter text-3xl font-black ${avgPct !== null ? "text-emerald-600" : "text-slate-900"}`}>
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
