import { requireTeacher } from "@/lib/auth-helpers";
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
} from "lucide-react";
import Link from "next/link";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const MONTHS_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export default async function TeacherDashboard() {
  const user = await requireTeacher();

  const bangkokNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const todayDow = bangkokNow.getDay();
  const todayLabel = `${DAYS[todayDow]}ที่ ${bangkokNow.getDate()} ${MONTHS_TH[bangkokNow.getMonth()]} ${bangkokNow.getFullYear() + 543}`;

  const [courseCount, enrollmentCount, todaySchedules, offScheduleSessions, attendanceStats, latestClosedSession] =
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
      // open sessions ที่ไม่ได้อยู่ในตารางวันนี้ — เช่น เปิดวิชาพุธในวันจันทร์
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
      db.attendance.groupBy({
        by: ["status"],
        where: { classSession: { course: { teacherId: user.id } } },
        _count: { status: true },
      }),
      db.classSession.findFirst({
        where: { isOpen: false, course: { teacherId: user.id } },
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

  const statMap = Object.fromEntries(attendanceStats.map((s) => [s.status, s._count.status]));
  const present = statMap["PRESENT"] ?? 0;
  const late = statMap["LATE"] ?? 0;
  const absent = statMap["ABSENT"] ?? 0;
  const counted = present + late + absent;
  const avgPct = counted > 0 ? Math.round(((present + late * 0.5) / counted) * 100) : null;
  const activeScheduleCount = todaySchedules.filter((s) => s.classSessions.length > 0).length;
  const todayClassCount = todaySchedules.length + offScheduleSessions.length;
  const activeClassCount = activeScheduleCount + offScheduleSessions.length;

  // Donut data = latest closed session breakdown (not overall)
  const latestStats = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  if (latestClosedSession) {
    for (const a of latestClosedSession.attendances) latestStats[a.status]++;
  }
  const latestTotal =
    latestStats.PRESENT + latestStats.LATE + latestStats.ABSENT + latestStats.EXCUSED;
  const latestCounted = latestStats.PRESENT + latestStats.LATE + latestStats.ABSENT;
  const latestPct =
    latestCounted > 0
      ? Math.round(((latestStats.PRESENT + latestStats.LATE * 0.5) / latestCounted) * 100)
      : null;
  const latestEnrolled = latestClosedSession?.course._count.enrollments ?? 0;
  const segments = [
    { id: "present", label: "มาเรียน", count: latestStats.PRESENT, color: "#10B981", bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700" },
    { id: "late", label: "มาสาย", count: latestStats.LATE, color: "#F59E0B", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700" },
    { id: "excused", label: "ลา", count: latestStats.EXCUSED, color: "#3B82F6", bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700" },
    { id: "absent", label: "ขาดเรียน", count: latestStats.ABSENT, color: "#EF4444", bg: "bg-red-50", border: "border-red-100", text: "text-red-700" },
  ];

  const dashArray = 251.2;
  let cumulativePercent = 0;
  const donutSegments = segments.map((s) => {
    const percent = latestTotal > 0 ? s.count / latestTotal : 0;
    const dashOffset = dashArray - percent * dashArray;
    const angle = cumulativePercent * 360 - 90;
    cumulativePercent += percent;
    return { ...s, dashArray, dashOffset, angle };
  });

  function fmtBkk(d: Date) {
    return d.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false });
  }

  const latestDateLabel = latestClosedSession
    ? `${latestClosedSession.startsAt.getDate()} ${MONTHS_TH[latestClosedSession.startsAt.getMonth()]} ${latestClosedSession.startsAt.getFullYear() + 543} • ${latestClosedSession.startsAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })} น.`
    : null;

  return (
    <>
      {/* Top header */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black text-slate-900">ภาพรวมการเรียนการสอน</h1>
          <p className="text-sm text-slate-500">มหาวิทยาลัยธรรมศาสตร์</p>
        </div>
        <Link
          href="/teacher/courses/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#990000] px-5 py-3 text-sm font-bold leading-none !text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#990000] whitespace-nowrap"
        >
          <Plus className="h-4 w-4 !text-white" />
          สร้างวิชาใหม่
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="animate-fade-in pb-8">
          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <Link
              href="/teacher/courses"
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
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

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#990000] to-red-800 flex items-center justify-center shadow-lg shadow-red-900/20">
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

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
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

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
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
                  <h2 className="text-4xl font-black text-emerald-600 font-inter">{avgPct}%</h2>
                ) : (
                  <h2 className="text-4xl font-black text-slate-400 font-inter">—</h2>
                )}
              </div>
            </div>
          </div>

          {/* Two-column: schedule table + attendance donut */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Schedule table */}
            <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-8 py-7 border-b border-slate-100 flex justify-between items-center bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#990000]" />
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
                    <Link href="/teacher/courses" className="text-[#990000] underline underline-offset-2 font-semibold">
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
                            <td className="px-6 py-5 border-l-4 border-l-emerald-500">
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
                            <td className="px-4 py-5 align-middle">
                              <p className="w-fit rounded-md bg-slate-100 px-2 py-0.5 font-inter text-base font-bold text-slate-700">
                                {fmtBkk(sess.startsAt)}–{fmtBkk(sess.endsAt)}
                              </p>
                              {(sess.roomSnapshot ?? sess.course.schedules[0]?.room) && (
                                <p className="mt-1.5 text-[11px] font-bold text-slate-400">
                                  {sess.roomSnapshot ?? sess.course.schedules[0]?.room}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-5 align-middle">
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
                            <td className="px-6 py-5 text-center align-middle">
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
                              className={`px-6 py-5 ${
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
                                    <BookOpen className="w-5 h-5 text-slate-400 group-hover:text-[#990000]" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p
                                    className={`text-base font-black leading-tight font-inter ${
                                      isActive
                                        ? "text-emerald-700"
                                        : "text-slate-800 group-hover:text-[#990000] transition-colors"
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
                            <td className="px-4 py-5 align-middle">
                              <p className="text-base font-bold text-slate-700 font-inter bg-slate-100 w-fit px-2 py-0.5 rounded-md">
                                {s.startTime}–{s.endTime}
                              </p>
                              {(activeSession?.roomSnapshot ?? s.room) && (
                                <p className="text-[11px] font-bold text-slate-400 mt-1.5">
                                  {activeSession?.roomSnapshot ?? s.room}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-5 align-middle">
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
                            <td className="px-6 py-5 align-middle text-center rounded-r-2xl">
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

            {/* Latest class summary donut */}
            <div className="self-start overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-28">
              <div className="h-32 bg-[#990000] p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-10 -mb-10 blur-lg" />
                <h3 className="text-2xl font-black text-white relative z-10 tracking-wide flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-red-200" /> สรุปคลาสเรียนล่าสุด
                </h3>
                <p className="text-[16px] font-medium text-red-100/80 mt-1.5 flex items-center gap-1.5 relative z-10">
                  <Clock className="w-3.5 h-3.5" /> {latestDateLabel ?? "ยังไม่มีคาบที่ปิดแล้ว"}
                </p>
              </div>
              <div className="p-6 flex flex-col flex-1 bg-white relative">
                {latestClosedSession ? (
                  <Link
                    href={`/teacher/sessions/${latestClosedSession.id}`}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-lg shadow-slate-200/50 -mt-12 relative z-20 mb-8 flex items-center gap-4 cursor-pointer hover:shadow-xl hover:border-red-200 transition-all group/card"
                  >
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center border border-red-100 flex-shrink-0 group-hover/card:bg-red-100 transition-colors">
                      <BookOpen className="w-6 h-6 text-[#990000]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-slate-800 leading-snug group-hover/card:text-[#990000] transition-colors truncate font-inter">
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
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover/card:text-[#990000] group-hover/card:translate-x-0.5 transition-all" />
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
                  {latestTotal === 0 ? (
                    <div className="w-full">
                      <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                        <p className="text-base font-black text-slate-700">
                          {latestClosedSession ? "คาบล่าสุดยังไม่มีข้อมูลเช็คชื่อ" : "ยังไม่มีคาบที่ปิดแล้ว"}
                        </p>
                        <p className="mx-auto mt-1 max-w-[280px] text-sm leading-5 text-slate-400">
                          {latestClosedSession
                            ? "ระบบจะแสดงสัดส่วนเข้าเรียนเมื่อมีรายการเช็คชื่อในคาบนี้"
                            : "เริ่มเปิดรับเช็คชื่อและปิดคาบแรกเพื่อดูสรุปการเข้าเรียนล่าสุด"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                          <p className="font-inter text-3xl font-black text-slate-800">
                            {latestTotal}
                            {latestClosedSession && (
                              <span className="text-base font-bold text-slate-400">/{latestEnrolled}</span>
                            )}
                          </p>
                          <p className="mt-1 text-[14px] font-bold text-slate-500">เช็คชื่อแล้ว</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                          <p className="font-inter text-3xl font-black text-slate-800">
                            {latestPct !== null ? `${latestPct}%` : "—"}
                          </p>
                          <p className="mt-1 text-[14px] font-bold text-slate-500">เข้าเรียน</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
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
                          <span className="text-4xl font-black text-slate-800 font-inter">{latestTotal}</span>
                          <span className="text-[14px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            คนทั้งหมด
                          </span>
                        </div>
                      </div>
                      <div className="w-full grid grid-cols-2 gap-3">
                        {segments.map((s) => (
                          <div
                            key={s.id}
                            className={`${s.bg} rounded-2xl p-3 ${s.border} border flex flex-col items-center text-center transition-transform hover:scale-105 cursor-default shadow-sm`}
                          >
                            <span className={`text-2xl font-black ${s.text} mb-0.5 font-inter drop-shadow-sm leading-none`}>
                              {s.count}
                            </span>
                            <span className={`text-[11px] font-bold ${s.text} opacity-80 mt-1`}>{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
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
