import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  History as HistoryIcon,
  MapPin,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { notFound } from "next/navigation";

import AttendanceRow from "@/components/student/AttendanceRow";
import PageHeader from "@/components/shell/PageHeader";
import { requireStudent } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

const DAYS_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export default async function StudentCourseDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireStudent();

  const enrollment = await db.enrollment.findFirst({
    where: { studentId: user.id, courseId: id },
    include: {
      course: {
        include: {
          teacher: { select: { name: true } },
          schedules: { orderBy: { dayOfWeek: "asc" } },
          _count: { select: { enrollments: { where: { droppedAt: null } } } },
        },
      },
    },
  });

  if (!enrollment) notFound();
  const course = enrollment.course;

  const attendances = await db.attendance.findMany({
    where: {
      studentId: user.id,
      classSession: { courseId: id },
    },
    orderBy: { checkedInAt: "desc" },
    include: {
      classSession: {
        select: {
          startsAt: true,
          roomSnapshot: true,
          schedule: { select: { room: true } },
        },
      },
    },
  });

  const total = attendances.length;
  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const late = attendances.filter((a) => a.status === "LATE").length;
  const absent = attendances.filter((a) => a.status === "ABSENT").length;
  const counted = present + late + absent;
  const avgPct = counted > 0 ? Math.round(((present + late * 0.5) / counted) * 100) : null;

  return (
    <>
      <PageHeader className="justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-inter text-2xl font-black text-slate-900">{course.code}</h1>
            <p className="truncate text-sm text-slate-500">{course.name}</p>
          </div>
        </div>
        {enrollment.droppedAt && (
          <span className="font-inter shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            ถอนแล้ว
          </span>
        )}
      </PageHeader>

      <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
        <div className="animate-fade-in pb-8">
          {/* Course info card */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative h-32 bg-[#990000] p-6">
              <div className="absolute right-0 top-0 -mr-10 -mt-10 h-40 w-40 rounded-full bg-white opacity-5 blur-xl" />
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-32 w-32 rounded-full bg-white opacity-10 blur-lg" />
              <h2 className="font-inter relative z-10 text-2xl font-black tracking-wide text-white">
                ข้อมูลรายวิชา
              </h2>
              <p className="relative z-10 mt-1.5 text-sm font-medium text-red-100/80">
                เทอม {course.semester}
              </p>
            </div>
            <div className="relative p-6">
              <div className="-mt-12 mb-6 flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#990000] to-red-800 text-white shadow-lg shadow-red-900/20">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-inter text-lg font-black text-slate-900">
                    {course.code}
                    {course.section && (
                      <span className="ml-2 text-sm font-bold text-slate-400">
                        Sec {course.section}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500">{course.name}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <UserIcon className="h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-500">ผู้สอน</p>
                    <p className="font-inter mt-0.5 text-sm font-bold text-slate-800">
                      {course.teacher.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <CalendarDays className="h-5 w-5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">ตารางเรียน</p>
                    {course.schedules.length === 0 ? (
                      <p className="mt-0.5 text-sm text-slate-400">ยังไม่ได้ตั้งตารางเรียน</p>
                    ) : (
                      <ul className="mt-0.5 space-y-0.5">
                        {course.schedules.map((s) => (
                          <li
                            key={s.id}
                            className="font-inter text-sm font-bold text-slate-800"
                          >
                            {DAYS_TH[s.dayOfWeek]} {s.startTime}–{s.endTime}
                            {s.room && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                <MapPin className="h-3 w-3" /> {s.room}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/20">
                  <HistoryIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">บันทึกทั้งหมด</p>
                  <p className="font-inter text-2xl font-black text-slate-800">{total}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">ทันเวลา</p>
                  <p className="font-inter text-2xl font-black text-emerald-700">{present}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">มาสาย</p>
                  <p className="font-inter text-2xl font-black text-amber-700">{late}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-500/20">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">ขาด</p>
                  <p className="font-inter text-2xl font-black text-red-700">{absent}</p>
                </div>
              </div>
            </div>
          </div>

          {avgPct !== null && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-slate-500">อัตราเข้าเรียน</p>
                <p
                  className={`font-inter text-2xl font-black ${
                    avgPct >= 80
                      ? "text-emerald-600"
                      : avgPct >= 60
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {avgPct}%
                </p>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    avgPct >= 80
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                      : avgPct >= 60
                        ? "bg-gradient-to-r from-amber-400 to-amber-500"
                        : "bg-gradient-to-r from-red-400 to-red-500"
                  }`}
                  style={{ width: `${Math.min(avgPct, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Attendance history */}
          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden border-b border-slate-100 px-6 py-5">
              <div className="absolute top-0 left-0 h-full w-1.5 bg-[#990000]" />
              <div className="flex items-center gap-3 pl-2">
                <HistoryIcon className="h-5 w-5 text-slate-400" />
                <h2 className="font-inter text-xl font-black text-slate-800">
                  ประวัติการเช็คชื่อ{" "}
                  <span className="ml-1 font-medium text-slate-400">(Attendance History)</span>
                </h2>
              </div>
            </div>

            {total === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-slate-400">
                <Clock className="mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-semibold">ยังไม่มีประวัติเช็คชื่อในวิชานี้</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attendances.map((attendance) => (
                  <AttendanceRow
                    key={attendance.id}
                    status={attendance.status}
                    checkedInAt={attendance.checkedInAt}
                    sessionStartsAt={attendance.classSession.startsAt}
                    room={
                      attendance.classSession.roomSnapshot ??
                      attendance.classSession.schedule?.room ??
                      null
                    }
                    distanceM={attendance.distanceM}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
