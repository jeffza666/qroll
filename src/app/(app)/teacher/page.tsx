import PageHeader from "@/components/shell/PageHeader";
import { attendanceRate } from "@/lib/attendance-summary";
import { requireTeacher } from "@/lib/auth-helpers";
import { bangkokParts, formatBangkokTime } from "@/lib/datetime";
import { db } from "@/lib/db";
import {
  BookOpen,
  CalendarDays,
  Users,
  TrendingUp,
  Plus,
  Clock,
  Radio,
  MonitorPlay,
  FileText,
  PieChart,
  ChevronRight,
  CheckCircle2,
  AlarmClock,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const MONTHS_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatSessionDate(date: Date) {
  const parts = bangkokParts(date);
  return `${parts.day} ${MONTHS_TH[parts.month - 1]} ${parts.year + 543}`;
}

export default async function TeacherDashboard() {
  const user = await requireTeacher();

  const today = bangkokParts(new Date());
  const todayDow = today.dayOfWeek;
  const todayLabel = `${DAYS[todayDow]}ที่ ${today.day} ${MONTHS_TH[today.month - 1]} ${today.year + 543}`;

  const [courseCount, enrollmentCount, todaySchedules, offScheduleSessions, closedSessionsForAvg, latestClosedSession] =
    await Promise.all([
      // Filter เฉพาะ active courses (ไม่นับ archived) — archived = "จบเทอม" ไม่ควรเด้งใน today's schedule
      db.course.count({ where: { teacherId: user.id, archivedAt: null } }),
      db.enrollment.count({
        where: {
          course: { teacherId: user.id, archivedAt: null },
          droppedAt: null,
        },
      }),
      db.schedule.findMany({
        where: {
          dayOfWeek: todayDow,
          course: { teacherId: user.id, archivedAt: null },
        },
        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              _count: { select: { enrollments: { where: { droppedAt: null } } } },
            },
          },
          classSessions: {
            where: { isOpen: true },
            select: {
              id: true,
              roomSnapshot: true,
              _count: { select: { attendances: true } },
            },
            take: 1,
          },
        },
        orderBy: { startTime: "asc" },
      }),
      db.classSession.findMany({
        where: {
          isOpen: true,
          course: { teacherId: user.id, archivedAt: null },
          OR: [
            { scheduleId: null },
            { schedule: { dayOfWeek: { not: todayDow } } },
          ],
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          roomSnapshot: true,
          _count: { select: { attendances: true } },
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              _count: { select: { enrollments: { where: { droppedAt: null } } } },
              schedules: {
                select: { room: true },
                where: { room: { not: null } },
                take: 1,
              },
            },
          },
        },
      }),
      // archivedAt: null — ไม่นับคลาสจบเทอม เพราะ % ควรสะท้อนคลาส active
      db.classSession.findMany({
        where: { isOpen: false, course: { teacherId: user.id, archivedAt: null } },
        select: {
          attendances: { select: { status: true } },
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              _count: { select: { enrollments: { where: { droppedAt: null } } } },
            },
          },
        },
      }),
      db.classSession.findFirst({
        where: { isOpen: false, course: { teacherId: user.id, archivedAt: null } },
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          startsAt: true,
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              _count: { select: { enrollments: { where: { droppedAt: null } } } },
            },
          },
          attendances: { select: { status: true } },
        },
      }),
    ]);

  let totalPresent = 0;
  let totalLate = 0;
  let totalExpected = 0;
  const courseTotals = new Map<
    string,
    { id: string; code: string; name: string; present: number; late: number; expected: number }
  >();
  for (const s of closedSessionsForAvg) {
    let p = 0;
    let l = 0;
    let e = 0;
    for (const a of s.attendances) {
      if (a.status === "PRESENT") p++;
      else if (a.status === "LATE") l++;
      else if (a.status === "EXCUSED") e++;
    }
    totalPresent += p;
    totalLate += l;
    totalExpected += s.course._count.enrollments - e;

    const course = courseTotals.get(s.course.id) ?? {
      id: s.course.id,
      code: s.course.code,
      name: s.course.name,
      present: 0,
      late: 0,
      expected: 0,
    };
    course.present += p;
    course.late += l;
    course.expected += s.course._count.enrollments - e;
    courseTotals.set(s.course.id, course);
  }
  const avgPct = attendanceRate({
    present: totalPresent,
    late: totalLate,
    counted: totalExpected,
  });
  const coursesToWatch = [...courseTotals.values()]
    .flatMap((course) => {
      const pct = attendanceRate({
        present: course.present,
        late: course.late,
        counted: course.expected,
      });
      if (pct === null || pct >= 80) return [];
      return [{ ...course, pct }];
    })
    .sort((a, b) => a.pct - b.pct);
  const activeScheduleCount = todaySchedules.filter((s) => s.classSessions.length > 0).length;
  const todayClassCount = todaySchedules.length + offScheduleSessions.length;
  const activeClassCount = activeScheduleCount + offScheduleSessions.length;

  const latestStats = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  const latestEnrolled = latestClosedSession?.course._count.enrollments ?? 0;
  if (latestClosedSession) {
    for (const a of latestClosedSession.attendances) latestStats[a.status]++;
    const unmarked =
      latestEnrolled -
      latestStats.PRESENT -
      latestStats.LATE -
      latestStats.ABSENT -
      latestStats.EXCUSED;
    if (unmarked > 0) latestStats.ABSENT += unmarked;
  }
  const latestTotal =
    latestStats.PRESENT + latestStats.LATE + latestStats.ABSENT + latestStats.EXCUSED;
  const latestCheckedIn = latestStats.PRESENT + latestStats.LATE;
  const latestPct = attendanceRate({
    present: latestStats.PRESENT,
    late: latestStats.LATE,
    counted: Math.max(0, latestEnrolled - latestStats.EXCUSED),
  });
  const segments: Array<{
    id: string;
    label: string;
    count: number;
    color: string;
    bg: string;
    border: string;
    text: string;
    icon: LucideIcon;
  }> = [
    { id: "present", label: "มาเรียน", count: latestStats.PRESENT, color: "#10B981", bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
    { id: "late", label: "มาสาย", count: latestStats.LATE, color: "#F59E0B", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", icon: AlarmClock },
    { id: "excused", label: "ลา", count: latestStats.EXCUSED, color: "#3B82F6", bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700", icon: FileText },
    { id: "absent", label: "ขาดเรียน", count: latestStats.ABSENT, color: "#EF4444", bg: "bg-red-50", border: "border-red-100", text: "text-red-700", icon: XCircle },
  ];

  const dashArray = 251.2;
  let cumulativePercent = 0;
  const donutSegments = segments.map((s) => {
    const percent = latestEnrolled > 0 ? s.count / latestEnrolled : 0;
    const dashOffset = dashArray - percent * dashArray;
    const angle = cumulativePercent * 360 - 90;
    cumulativePercent += percent;
    return { ...s, dashArray, dashOffset, angle };
  });

  function fmtBkk(d: Date) {
    return formatBangkokTime(d);
  }

  const latestDateLabel = latestClosedSession
    ? `${formatSessionDate(latestClosedSession.startsAt)} • ${formatBangkokTime(latestClosedSession.startsAt)} น.`
    : null;

  return (
    <>
      <PageHeader className="justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-slate-900">ภาพรวมการเรียนการสอน</h1>
          <p className="truncate text-sm text-slate-500">มหาวิทยาลัยธรรมศาสตร์</p>
        </div>
        <Link
          href="/teacher/courses/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-qroll-red-dark px-5 py-3 text-sm font-bold leading-none !text-white shadow-lg shadow-qroll-red-dark/20 transition-all hover:bg-qroll-red-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-qroll-red-dark whitespace-nowrap"
        >
          <Plus className="h-4 w-4 text-white" />
          <span className="hidden sm:inline">สร้างวิชาใหม่</span>
          <span className="sm:hidden">วิชาใหม่</span>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="animate-fade-in pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <Link
              href="/teacher/courses"
              className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <p className="text-xl font-bold text-slate-500">วิชาที่รับผิดชอบ</p>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <h2 className="text-4xl font-black text-slate-800 font-inter">{courseCount}</h2>
                <span className="text-sm font-bold text-slate-400">รายวิชา</span>
              </div>
            </Link>

            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-qroll-red-dark to-red-800 flex items-center justify-center shadow-lg shadow-red-900/20">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-500">คาบสอนวันนี้</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    {activeClassCount > 0 ? `กำลังเช็คชื่อ ${activeClassCount} คาบ` : "ยังไม่มีคาบที่เปิดอยู่"}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <h2 className="text-4xl font-black text-slate-800 font-inter">{todayClassCount}</h2>
                <span className="text-sm font-bold text-slate-400">คาบ</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <p className="text-xl font-bold text-slate-500">นักศึกษาทั้งหมด</p>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <h2 className="text-4xl font-black text-slate-800 font-inter">{enrollmentCount}</h2>
                <span className="text-sm font-bold text-slate-400">คน</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg ${
                    avgPct === null
                      ? "from-slate-400 to-slate-500 shadow-slate-500/30"
                      : avgPct >= 80
                        ? "from-emerald-500 to-emerald-600 shadow-emerald-500/30"
                        : avgPct >= 60
                          ? "from-amber-500 to-amber-600 shadow-amber-500/30"
                          : "from-red-500 to-red-600 shadow-red-500/30"
                  }`}
                >
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-500">อัตราเข้าเรียนเฉลี่ย</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    จากคาบที่บันทึกแล้วทั้งหมด
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                {avgPct !== null ? (
                  <h2
                    className={`text-4xl font-black font-inter ${
                      avgPct >= 80
                        ? "text-emerald-600"
                        : avgPct >= 60
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {avgPct}%
                  </h2>
                ) : (
                  <h2 className="text-4xl font-black text-slate-400 font-inter">—</h2>
                )}
              </div>
            </div>
          </div>

          {coursesToWatch.length > 0 && (
            <section
              aria-label="วิชาที่ควรติดตาม"
              className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-amber-950">วิชาที่ควรติดตาม</h2>
                  <p className="mt-1 text-sm font-medium text-amber-800">
                    อัตราเข้าเรียนเฉลี่ยต่ำกว่า 80% จากคาบที่ปิดแล้ว
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 font-inter text-sm font-black text-amber-700">
                  {coursesToWatch.length}
                </span>
              </div>
              <ul className="grid gap-3 md:grid-cols-2">
                {coursesToWatch.slice(0, 4).map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`/teacher/courses/${course.id}/report`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-white px-4 py-3 transition hover:border-amber-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                    >
                      <span className="min-w-0">
                        <span className="block font-inter text-sm font-black text-slate-900">
                          {course.code}
                        </span>
                        <span className="block truncate text-xs font-semibold text-slate-500">
                          {course.name}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 font-inter text-lg font-black ${
                          course.pct >= 60 ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {course.pct}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {coursesToWatch.length > 4 && (
                <p className="mt-3 text-xs font-semibold text-amber-800">
                  และอีก {coursesToWatch.length - 4} วิชาในหน้ารายวิชา
                </p>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 xl:gap-8">
            <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-5 sm:px-8 sm:py-7 border-b border-slate-100 flex justify-between items-center bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-qroll-red-dark" />
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    ตารางสอนวันนี้{" "}
                    <span className="text-slate-400 font-medium ml-1">(Today&apos;s Schedule)</span>
                  </h3>
                  <p className="text-base text-slate-500 mt-1 font-medium">{todayLabel}</p>
                </div>
              </div>

              {todaySchedules.length === 0 && offScheduleSessions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex-1 flex flex-col items-center justify-center">
                  <Clock className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-semibold">ไม่มีคาบสอนวันนี้</p>
                  <p className="text-xs mt-1">
                    ไปที่{" "}
                    <Link href="/teacher/courses" className="text-qroll-red-dark underline underline-offset-2 font-semibold">
                      รายวิชา
                    </Link>{" "}
                    เพื่อเพิ่มตารางสอน
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1 p-2">
                  <table className="w-full border-separate border-spacing-y-2">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="px-6 py-2 text-left text-[14px] font-bold uppercase tracking-wider w-[40%]">
                          รายวิชา
                        </th>
                        <th className="px-4 py-2 text-left text-[14px] font-bold uppercase tracking-wider w-[20%]">
                          เวลา / ห้อง
                        </th>
                        <th className="px-4 py-2 text-left text-[14px] font-bold uppercase tracking-wider w-[20%]">
                          สถานะคาบเรียน
                        </th>
                        <th className="px-6 py-2 text-center text-[14px] font-bold uppercase tracking-wider w-[20%]">
                          จัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {offScheduleSessions.map((sess) => {
                        const checkedIn = sess._count.attendances;
                        const totalEnrolled = sess.course._count.enrollments;
                        const pct = totalEnrolled > 0 ? Math.round((checkedIn / totalEnrolled) * 100) : 0;
                        return (
                          <tr key={sess.id} className="bg-emerald-50/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all duration-300">
                            <td className="px-3 py-4 sm:px-6 sm:py-5 border-l-4 border-l-emerald-500">
                              <div className="flex items-center gap-4">
                                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white shadow-sm">
                                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                                  </span>
                                  <Radio className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-inter text-base font-black leading-tight text-emerald-700">
                                    {sess.course.code}
                                  </p>
                                  <p className="mt-1 max-w-[220px] truncate text-xs font-bold text-slate-500">
                                    {sess.course.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 sm:px-4 sm:py-5 align-middle">
                              <p className="w-fit rounded-md bg-slate-100 px-2 py-0.5 font-inter text-base font-bold text-slate-700">
                                {fmtBkk(sess.startsAt)}–{fmtBkk(sess.endsAt)}
                              </p>
                              {(sess.roomSnapshot ?? sess.course.schedules[0]?.room) && (
                                <p className="mt-1.5 text-[11px] font-bold text-slate-400">
                                  {sess.roomSnapshot ?? sess.course.schedules[0]?.room}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-4 sm:px-4 sm:py-5 align-middle">
                              <div className="flex w-full max-w-[150px] flex-col gap-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-black uppercase tracking-wide text-emerald-700">กำลังเช็คชื่อ</span>
                                  <span className="font-inter font-black text-emerald-800">
                                    {checkedIn}<span className="font-bold text-emerald-500/70">/{totalEnrolled}</span>
                                  </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 shadow-inner">
                                  <div
                                    className="relative h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  >
                                    <div className="absolute bottom-0 right-0 top-0 w-4 animate-pulse rounded-full bg-white/40 blur-[1px]" />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 sm:px-6 sm:py-5 text-center align-middle">
                              <Link
                                href={`/teacher/sessions/${sess.id}`}
                                className="inline-flex w-full max-w-[160px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold !text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-600"
                              >
                                <MonitorPlay className="h-4 w-4 !text-white" />
                                <span>แสดง QR ขึ้นจอ</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                      {todaySchedules.map((s) => {
                        const activeSession = s.classSessions[0];
                        const isActive = !!activeSession;
                        const checkedIn = activeSession?._count.attendances ?? 0;
                        const totalEnrolled = s.course._count.enrollments;
                        const pct = totalEnrolled > 0 ? Math.round((checkedIn / totalEnrolled) * 100) : 0;
                        return (
                          <tr
                            key={s.id}
                            className={`transition-all duration-300 ${
                              isActive
                                ? "bg-emerald-50/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                : "hover:bg-slate-50 group rounded-2xl"
                            }`}
                          >
                            <td
                              className={`px-3 py-4 sm:px-6 sm:py-5 ${
                                isActive
                                  ? "border-l-4 border-l-emerald-500"
                                  : "border-l-4 border-transparent rounded-l-2xl"
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                {isActive ? (
                                  <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 shadow-sm flex items-center justify-center flex-shrink-0 relative">
                                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                                    </span>
                                    <Radio className="w-5 h-5 text-emerald-600" />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:bg-red-50 group-hover:border-red-200 transition-colors">
                                    <BookOpen className="w-5 h-5 text-slate-400 group-hover:text-qroll-red-dark" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p
                                    className={`text-base font-black leading-tight font-inter ${
                                      isActive
                                        ? "text-emerald-700"
                                        : "text-slate-800 group-hover:text-qroll-red-dark transition-colors"
                                    }`}
                                  >
                                    {s.course.code}
                                  </p>
                                  <p className="text-xs font-bold text-slate-500 mt-1 truncate max-w-[220px]">
                                    {s.course.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 sm:px-4 sm:py-5 align-middle">
                              <p className="text-base font-bold text-slate-700 font-inter bg-slate-100 w-fit px-2 py-0.5 rounded-md">
                                {s.startTime}–{s.endTime}
                              </p>
                              {(activeSession?.roomSnapshot ?? s.room) && (
                                <p className="text-[11px] font-bold text-slate-400 mt-1.5">
                                  {activeSession?.roomSnapshot ?? s.room}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-4 sm:px-4 sm:py-5 align-middle">
                              {isActive ? (
                                <div className="flex flex-col gap-2 w-full max-w-[150px]">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-black text-emerald-700 uppercase tracking-wide">
                                      กำลังเช็คชื่อ
                                    </span>
                                    <span className="font-black text-emerald-800 font-inter">
                                      {checkedIn}
                                      <span className="text-emerald-500/70 font-bold">/{totalEnrolled}</span>
                                    </span>
                                  </div>
                                  <div className="w-full bg-emerald-100 rounded-full h-2 shadow-inner overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full relative"
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    >
                                      <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/40 rounded-full animate-pulse blur-[1px]" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold shadow-sm">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" /> รอเปิดเช็คชื่อ
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-4 sm:px-6 sm:py-5 align-middle text-center rounded-r-2xl">
                              {isActive ? (
                                <Link
                                  href={`/teacher/sessions/${activeSession.id}`}
                                  className="inline-flex justify-center items-center gap-2 w-full max-w-[160px] px-4 py-2.5 bg-emerald-500 !text-white rounded-xl text-sm font-bold hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                                >
                                  <MonitorPlay className="w-4 h-4 !text-white" />
                                  <span>แสดง QR ขึ้นจอ</span>
                                </Link>
                              ) : (
                                <Link
                                  href={`/teacher/courses/${s.course.id}`}
                                  className="inline-flex justify-center items-center gap-2 w-full max-w-[160px] px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>รายละเอียด</span>
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="self-start overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-28">
              <div className="h-28 sm:h-32 bg-qroll-red-dark p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-10 -mb-10 blur-lg" />
                <h3 className="text-2xl font-black text-white relative z-10 tracking-wide flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-red-200" /> สรุปคลาสเรียนล่าสุด
                </h3>
                <p className="text-[16px] font-medium text-red-100/80 mt-1.5 relative z-10">
                  {latestDateLabel ?? "ยังไม่มีคาบที่ปิดแล้ว"}
                </p>
              </div>
              <div className="p-5 sm:p-6 flex flex-col flex-1 bg-white relative">
                {latestClosedSession ? (
                  <Link
                    href={`/teacher/sessions/${latestClosedSession.id}`}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-lg shadow-slate-200/50 -mt-12 relative z-20 mb-8 flex items-center gap-4 cursor-pointer hover:shadow-xl hover:border-red-200 transition-all group/card"
                  >
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center border border-red-100 flex-shrink-0 group-hover/card:bg-red-100 transition-colors">
                      <BookOpen className="w-6 h-6 text-qroll-red-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-slate-800 leading-snug group-hover/card:text-qroll-red-dark transition-colors truncate font-inter">
                        {latestClosedSession.course.code}
                      </h4>
                      <p className="text-sm text-slate-500 truncate">{latestClosedSession.course.name}</p>
                    </div>
                    {latestPct !== null && (
                      <span
                        className={`rounded-full px-2.5 py-1 font-inter text-xs font-black ${
                          latestPct >= 80
                            ? "bg-emerald-50 text-emerald-700"
                            : latestPct >= 60
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {latestPct}%
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover/card:text-qroll-red-dark group-hover/card:translate-x-0.5 transition-all" />
                  </Link>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-lg shadow-slate-200/50 -mt-12 relative z-20 mb-8 flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-slate-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-500">ยังไม่มีคาบเรียน</h4>
                      <p className="text-xs text-slate-400">เปิดเช็คชื่อคาบแรกเพื่อดูสรุป</p>
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 mb-8 drop-shadow-sm">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                      {donutSegments.map((s) =>
                        s.count > 0 ? (
                          <circle
                            key={s.id}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={s.color}
                            strokeWidth="16"
                            strokeDasharray={s.dashArray}
                            strokeDashoffset={s.dashOffset}
                            transform={`rotate(${s.angle} 50 50)`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        ) : null
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-full m-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] border border-slate-50">
                      {latestEnrolled === 0 ? (
                        <>
                          <PieChart className="w-9 h-9 text-slate-200 mb-1" strokeWidth={1.5} />
                          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                            ไม่มีข้อมูล
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-inter font-black text-slate-800 leading-none">
                            <span className="text-4xl">{latestCheckedIn}</span>
                            <span className="text-lg font-bold text-slate-400">/{latestEnrolled}</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                            เข้าเรียน
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-3">
                    {segments.map((s) => {
                      const Icon = s.icon;
                      const isEmpty = latestTotal === 0;
                      return (
                        <div
                          key={s.id}
                          className="bg-white border-slate-100 rounded-2xl px-3 py-3 border flex items-center gap-3 transition-all hover:scale-[1.03] hover:shadow-md cursor-default shadow-sm"
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-50 border border-slate-100">
                            <Icon
                              className={`w-[18px] h-[18px] ${isEmpty ? "text-slate-300" : "text-slate-500"}`}
                              strokeWidth={2.25}
                            />
                          </div>
                          <div className="flex flex-col items-start leading-tight">
                            <span
                              className={`text-xl font-black font-inter leading-none ${
                                isEmpty ? "text-slate-300" : "text-slate-800"
                              }`}
                            >
                              {s.count}
                            </span>
                            <span
                              className={`text-[11px] font-bold mt-1 ${
                                isEmpty ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {latestTotal === 0 && (
                    <p className="mt-5 text-center text-sm text-slate-400 leading-5 max-w-[280px]">
                      {latestClosedSession
                        ? "คาบล่าสุดยังไม่มีรายการเช็คชื่อ — สรุปจะแสดงเมื่อมีข้อมูล"
                        : "ยังไม่มีคาบที่ปิดแล้ว — เปิดและปิดคาบแรกเพื่อดูสรุปการเข้าเรียน"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
