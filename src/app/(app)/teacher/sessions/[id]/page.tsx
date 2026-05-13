import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PieChart, Users } from "lucide-react";

import SessionReport from "@/components/sessions/SessionReport";
import SessionView from "@/components/sessions/SessionView";
import { requireCourseOwner } from "@/lib/auth-helpers";
import { isDemoCheckInEnabled } from "@/lib/checkin";
import { db } from "@/lib/db";
import { autoCloseIfExpired } from "@/lib/session-helpers";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
};

function formatBangkokTime(date: Date): string {
  return date.toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatBangkokDate(date: Date): string {
  const bkk = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return DAYS[bkk.getDay()];
}

export default async function SessionDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { view } = await searchParams;
  // ?view=live → force SessionView (ใช้ตอนเพิ่งกดปิดในหน้า — กัน Next.js auto-refresh
  // หลัง server action จาก swap ไป SessionReport ทันที)
  const forceLiveView = view === "live";

  const minimal = await db.classSession.findUnique({
    where: { id },
    select: { courseId: true, isOpen: true },
  });

  if (!minimal) notFound();

  await requireCourseOwner(minimal.courseId);

  const [raw, enrollments] = await Promise.all([
    db.classSession.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, code: true, section: true, name: true, semester: true } },
        schedule: {
          select: { dayOfWeek: true, startTime: true, endTime: true, room: true },
        },
        attendances: {
          orderBy: { checkedInAt: "asc" },
          include: { student: { select: { id: true, name: true, studentId: true } } },
        },
        demoCheckIns: {
          orderBy: { checkedInAt: "desc" },
          take: 8,
          select: { id: true, displayName: true, checkedInAt: true },
        },
        _count: { select: { attendances: true, demoCheckIns: true } },
      },
    }),
    db.enrollment.findMany({
      where: { courseId: minimal.courseId },
      select: {
        id: true,
        droppedAt: true,
        student: { select: { id: true, name: true, studentId: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!raw) notFound();

  const session = await autoCloseIfExpired(raw);

  const sessionMeta = {
    courseCode: raw.course.code,
    section: raw.course.section,
    courseName: raw.course.name,
    semester: raw.course.semester,
    dayLabel: raw.schedule ? DAYS[raw.schedule.dayOfWeek] : formatBangkokDate(raw.startsAt),
    timeLabel: raw.schedule
      ? `${raw.schedule.startTime} - ${raw.schedule.endTime}`
      : `${formatBangkokTime(raw.startsAt)} - ${formatBangkokTime(raw.endsAt)}`,
    // ใช้ roomSnapshot ก่อน (freeze ตอนเปิด session) → fallback schedule.room
    room: raw.roomSnapshot ?? raw.schedule?.room ?? null,
    openedAtLabel: formatBangkokTime(raw.startsAt),
    closedAtLabel: session.closedAt ? formatBangkokTime(session.closedAt) : null,
  };

  const attendanceMap = new Map(raw.attendances.map((a) => [a.student.id, a]));

  const reportRows = enrollments.map((en) => {
    const att = attendanceMap.get(en.student.id);
    return {
      enrollmentId: en.id,
      student: en.student,
      isDropped: en.droppedAt !== null,
      attendance: att
        ? {
            id: att.id,
            status: att.status,
            checkedInAtLabel: formatBangkokTime(att.checkedInAt),
          }
        : null,
    };
  });

  const showLiveView = session.isOpen || forceLiveView;
  const headerTitle = showLiveView ? "Session QR" : "รายงาน Session";

  return (
    <>
      <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/85 px-6 backdrop-blur-md lg:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={`/teacher/courses/${raw.course.id}?tab=schedule`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="กลับไปรายวิชา"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black text-slate-900">รายละเอียดรายวิชา</h1>
            <p className="truncate text-sm text-slate-500">{raw.course.name} • เทอม {raw.course.semester}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/courses/${raw.course.id}/students`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-base font-bold antialiased hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Users className="w-4 h-4" />
            จัดการนักศึกษา
          </Link>
          <Link
            href={`/teacher/courses/${raw.course.id}/report`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-base font-bold antialiased hover:bg-slate-50 transition-colors shadow-sm"
          >
            <PieChart className="w-4 h-4" />
            ดูรายงานสรุป
          </Link>
        </div>
      </header>

      {showLiveView ? (
        <SessionView
          sessionId={session.id}
          initialIsOpen={session.isOpen}
          initialClosedAtLabel={null}
          initialAttendanceCount={raw._count.attendances}
          initialDemoCount={raw._count.demoCheckIns}
          initialAttendances={raw.attendances.map((attendance) => ({
            id: attendance.id,
            name: attendance.student.name,
            studentId: attendance.student.studentId,
            status: attendance.status,
            checkedInAt: attendance.checkedInAt.toISOString(),
          }))}
          initialDemoCheckIns={raw.demoCheckIns.map((demoCheckIn) => ({
            id: demoCheckIn.id,
            displayName: demoCheckIn.displayName,
            checkedInAt: demoCheckIn.checkedInAt.toISOString(),
          }))}
          demoEnabled={isDemoCheckInEnabled()}
          sessionInfo={{
            courseCode: sessionMeta.courseCode,
            courseName: sessionMeta.courseName,
            semester: sessionMeta.semester,
            dayLabel: sessionMeta.dayLabel,
            timeLabel: sessionMeta.timeLabel,
            room: sessionMeta.room,
            openedAtLabel: sessionMeta.openedAtLabel,
            startsAtIso: raw.startsAt.toISOString(),
            endsAtIso: raw.endsAt.toISOString(),
            durationMinutes: raw.durationMinutes,
            graceMinutes: raw.graceMinutes ?? null,
            lateAfterIso: raw.lateAfter?.toISOString() ?? null,
            enrollmentCount: enrollments.filter((e) => !e.droppedAt).length,
          }}
        />
      ) : (
        <SessionReport
          sessionId={session.id}
          sessionMeta={sessionMeta}
          rows={reportRows}
        />
      )}
    </>
  );
}
