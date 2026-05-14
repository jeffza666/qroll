import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  History,
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  MonitorPlay,
  Users,
  PieChart,
  Archive,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import CourseMoreMenu from "@/components/courses/CourseMoreMenu";
import OpenSessionButton from "@/components/courses/OpenSessionButton";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatDate(d: Date) {
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function formatTime(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function relativeTime(d: Date) {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return formatDate(d);
}

type Props = { params: Promise<{ id: string }> };

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireTeacher();

  const course = await db.course.findFirst({
    where: { id, teacherId: user.id },
    include: {
      schedules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      _count: {
        select: {
          enrollments: { where: { droppedAt: null } },
          classSessions: true,
        },
      },
      classSessions: {
        where: { isOpen: false },
        orderBy: { startsAt: "desc" },
        include: { attendances: { select: { status: true } } },
      },
    },
  });

  if (!course) notFound();

  const openSession = await db.classSession.findFirst({
    where: { courseId: id, isOpen: true },
    select: { id: true, durationMinutes: true, graceMinutes: true },
  });

  const isArchived = course.archivedAt !== null;
  // ถ้าวิชา archived → ปุ่มย้อนกลับชี้ไปหน้า archived list (ไม่ใช่ active list)
  const backHref = isArchived
    ? "/teacher/courses?show=archived"
    : "/teacher/courses";

  const sessionRows = course.classSessions.map((s) => {
    const stats = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    for (const a of s.attendances) stats[a.status]++;
    const counted = stats.PRESENT + stats.LATE + stats.ABSENT;
    const presentPct =
      counted > 0
        ? Math.round(((stats.PRESENT + stats.LATE * 0.5) / counted) * 100)
        : 0;
    return {
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      present: stats.PRESENT,
      late: stats.LATE,
      excused: stats.EXCUSED,
      absent: stats.ABSENT,
      presentPct,
    };
  });

  const avgPct =
    sessionRows.length > 0
      ? Math.round(
          sessionRows.reduce((sum, r) => sum + r.presentPct, 0) /
            sessionRows.length
        )
      : 0;

  const latestSession = course.classSessions[0];

  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">รายวิชาทั้งหมด</h1>
            <p className="text-sm text-slate-500">
              {course.name} • เทอม {course.semester}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/courses/${id}/students`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-base font-bold antialiased hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Users className="w-4 h-4" />
            จัดการนักศึกษา
          </Link>
          <Link
            href={`/teacher/courses/${id}/report`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-base font-bold antialiased hover:bg-slate-50 transition-colors shadow-sm"
          >
            <PieChart className="w-4 h-4" />
            ดูรายงานสรุป
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-6xl mx-auto">
          {/* Archived banner — แสดงเมื่อ archivedAt !== null */}
          {isArchived && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
              <Archive className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">
                  รายวิชานี้ถูก Archive แล้ว
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  ไม่สามารถเปิด session ใหม่ได้ — ข้อมูลทั้งหมดยังอยู่ครบ
                  เข้าหน้า &ldquo;แก้ไขรายวิชา&rdquo; เพื่อคืนสถานะ
                </p>
              </div>
            </div>
          )}

          {/* CourseHeader card */}
          <div className="relative bg-white rounded-3xl border border-slate-200 p-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 animate-fade-in">
            <CourseMoreMenu
              courseId={id}
              courseCode={course.code}
              courseName={course.name}
              isArchived={isArchived}
              sessionCount={course._count.classSessions}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-7 bg-[#990000] rounded-full shadow-sm"></div>
                <h2 className="text-2xl md:text-[28px] font-extrabold text-slate-800 tracking-wide">
                  รายละเอียดรายวิชา
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-2">
                <h3 className="text-4xl md:text-5xl font-black text-slate-900 font-inter tracking-tight leading-none">
                  {course.code}
                </h3>
                {course.section && (
                  <span className="px-3 py-1 bg-[#990000] text-white text-xs font-bold uppercase rounded-lg shadow-sm font-inter tracking-wider">
                    Sec {course.section}
                  </span>
                )}
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-slate-600 mb-6">
                {course.name}
                <span className="text-slate-400 font-medium text-base ml-2">
                  เทอม {course.semester}
                </span>
              </h4>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-[14px] font-bold text-slate-600 bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100 w-fit">
                {course.schedules.map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-2.5 text-slate-500 font-bold"
                  >
                    <Clock className="w-5 h-5 text-[#990000]" />
                    {DAYS[s.dayOfWeek]} {s.startTime} - {s.endTime}
                  </span>
                ))}
                {course.schedules.find((s) => s.room) && (
                  <span className="flex items-center gap-2.5 text-slate-500 font-bold">
                    <MapPin className="w-5 h-5 text-[#990000]" />
                    {course.schedules.find((s) => s.room)?.room}
                  </span>
                )}
                <span className="flex items-center gap-2.5 text-slate-500 font-bold">
                  <Users className="w-5 h-5 text-[#990000]" />
                  {course._count.enrollments} คน
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 shrink-0 mt-4 md:mt-0">
              {openSession ? (
                <Link
                  href={`/teacher/sessions/${openSession.id}`}
                  className="group relative inline-flex items-center gap-3 px-7 py-3.5 bg-gradient-to-br from-emerald-500 to-emerald-700 !text-white rounded-2xl font-bold hover:from-emerald-600 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-900/25 hover:shadow-xl hover:shadow-emerald-900/35 hover:-translate-y-0.5 overflow-hidden"
                >
                  <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm">
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                    </span>
                    <MonitorPlay className="w-6 h-6 !text-white" strokeWidth={2.2} />
                  </span>
                  <span className="text-2xl tracking-wide !text-white">แสดง QR ขึ้นจอ</span>
                </Link>
              ) : (
                <OpenSessionButton
                  courseId={id}
                  variant="large"
                  hasCourseAnchor={course.geofenceLat !== null && course.geofenceLng !== null}
                />
              )}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-6 mb-8 [&>*:nth-child(3)]:order-4 [&>*:nth-child(4)]:order-3 md:grid-cols-4">
            <Link
              href={`/teacher/courses/${id}/students`}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-red-200 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
               <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200 transition-colors group-hover:bg-red-50 group-hover:text-[#990000] group-hover:ring-red-100">
                  <Users className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#990000]" />
              </div>
              <p className="text-sm font-bold text-slate-500 transition-colors group-hover:text-[#990000]">
                นักศึกษาทั้งหมด
              </p>
              <div className="mt-1 flex items-end gap-2">
                <h2 className="font-inter text-4xl font-black leading-none text-slate-900 transition-colors group-hover:text-[#990000]">
                  {course._count.enrollments}
                </h2>
                <span className="pb-1 text-sm font-bold text-slate-400">คน</span>
              </div>
            </Link>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                <CalendarDays className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-500">
                เปิด Session แล้ว
              </p>
              <div className="mt-1 flex items-end gap-2">
                <h2 className="font-inter text-4xl font-black leading-none text-slate-900">
                  {course._count.classSessions}
                </h2>
                <span className="pb-1 text-sm font-bold text-slate-400">ครั้ง</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${
                  sessionRows.length === 0
                    ? "bg-slate-100 text-slate-500 ring-slate-200"
                    : avgPct >= 80
                    ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                    : avgPct >= 60
                    ? "bg-amber-50 text-amber-600 ring-amber-100"
                    : "bg-red-50 text-red-600 ring-red-100"
                }`}
              >
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-500">เฉลี่ยการเข้าเรียน</p>
              <div className="mt-1 flex items-end gap-2">
                <h2
                  className={`font-inter text-4xl font-black leading-none ${
                    sessionRows.length === 0
                      ? "text-slate-900"
                      : avgPct >= 80
                      ? "text-emerald-600"
                      : avgPct >= 60
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {sessionRows.length > 0 ? `${avgPct}%` : "—"}
                </h2>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                <RefreshCw className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-500">
                อัพเดตล่าสุด
              </p>
              <div className="mt-1 flex items-end gap-2">
                <h2 className="font-inter text-3xl font-black leading-tight text-slate-900">
                  {latestSession
                    ? relativeTime(latestSession.startsAt)
                    : "ยังไม่มีข้อมูล"}
                </h2>
              </div>
            </div>
          </div>

          {/* Sessions history */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-1.5 rounded-full bg-[#990000]" />
                    <h3 className="text-xl font-black text-slate-900">
                      ประวัติคาบเรียน
                    </h3>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-slate-500">
                    คาบที่ปิดแล้วและสรุปผลการเช็คชื่อของรายวิชานี้
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-0 px-3 py-2 text-l font-bold text-slate-1000">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-1000" />
                  {sessionRows.length} คาบ
                </span>
                
              </div>
            </div>
            {sessionRows.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">ยังไม่มี Session ที่ปิดแล้ว</p>
                <p className="text-xs mt-1">
                  กด &ldquo;เปิดเช็คชื่อ&rdquo; เพื่อเริ่ม Session แรก
                </p>
                {course._count.enrollments === 0 && (
                  <Link
                    href={`/teacher/courses/${id}/students`}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Users className="h-4 w-4" />
                    เพิ่มนักศึกษาก่อนเริ่ม
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base whitespace-nowrap">
                  <thead className="text-slate-600 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-4 px-8 w-1/4 bg-slate-50 border-b border-r border-slate-200">
                        วันที่
                      </th>
                      <th className="py-4 px-6 text-center bg-slate-50 border-b border-r border-slate-200">
                        เวลาเปิด-ปิด
                      </th>
                      <th className="py-4 px-6 text-center bg-slate-50 border-b border-r border-slate-200">
                        มาเรียน
                      </th>
                      <th className="py-4 px-6 text-center bg-slate-50 border-b border-r border-slate-200">
                        สาย
                      </th>
                      <th className="py-4 px-6 text-center bg-slate-50 border-b border-r border-slate-200">
                        ลา
                      </th>
                      <th className="py-4 px-6 text-center bg-slate-50 border-b border-r border-slate-200">
                        ขาด
                      </th>
                      <th className="py-4 px-8 text-center bg-slate-50 border-b border-slate-200">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessionRows.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-5 px-8 font-bold text-slate-800 border-r border-slate-100">
                          {formatDate(s.startsAt)}
                        </td>
                        <td className="py-5 px-6 text-center text-slate-600 font-inter border-r border-slate-100">
                          {formatTime(s.startsAt)} - {formatTime(s.endsAt)}
                        </td>
                        <td className="py-5 px-6 text-center border-r border-slate-100">
                          <span
                            className={`inline-flex min-w-[92px] items-center justify-between gap-2 rounded-full px-3 py-1.5 font-inter text-xs font-black ring-1 ${
                              s.presentPct >= 80
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : s.presentPct >= 60
                                ? "bg-amber-50 text-amber-700 ring-amber-100"
                                : "bg-red-50 text-red-700 ring-red-100"
                            }`}
                          >
                            <span className="text-sm">{s.presentPct}%</span>
                            <span className="font-sans text-sm font-bold opacity-75">
                              {s.present} คน
                            </span>
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center text-slate-600 font-inter border-r border-slate-100">
                          {s.late}
                        </td>
                        <td className="py-5 px-6 text-center text-slate-600 font-inter border-r border-slate-100">
                          {s.excused}
                        </td>
                        <td className="py-5 px-6 text-center text-slate-600 font-inter border-r border-slate-100">
                          {s.absent}
                        </td>
                        <td className="py-5 px-8 text-center">
                          <Link
                            href={`/teacher/sessions/${s.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-base  font-semibold hover:bg-red-50 hover:text-[#990000] hover:border-red-200 transition-colors shadow-sm"
                          >
                            <History className="w-4 h-4" />
                            ดูประวัติ
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
