import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import CloseSessionButton from "@/components/courses/CloseSessionButton";
import SessionView from "@/components/sessions/SessionView";
import { requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { autoCloseIfExpired } from "@/lib/session-helpers";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

type Props = { params: Promise<{ id: string }> };

function formatBangkokTime(date: Date): string {
  return date.toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;

  const raw = await db.classSession.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, code: true, name: true, semester: true } },
      schedule: {
        select: { dayOfWeek: true, startTime: true, endTime: true, room: true },
      },
      _count: { select: { attendances: true } },
    },
  });

  if (!raw) notFound();

  await requireCourseOwner(raw.courseId);

  const session = await autoCloseIfExpired(raw);

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
            <h1 className="truncate text-xl font-black text-slate-900">
              Dynamic QR
            </h1>
            <p className="truncate text-sm text-slate-500">
              {raw.course.code} · {raw.course.name}
            </p>
          </div>
        </div>

        {session.isOpen && <CloseSessionButton sessionId={session.id} />}
      </header>

      <SessionView
        sessionId={session.id}
        initialIsOpen={session.isOpen}
        initialClosedAtLabel={session.closedAt ? formatBangkokTime(session.closedAt) : null}
        attendanceCount={raw._count.attendances}
        sessionInfo={{
          courseCode: raw.course.code,
          courseName: raw.course.name,
          semester: raw.course.semester,
          dayLabel: DAYS[raw.schedule.dayOfWeek],
          timeLabel: `${raw.schedule.startTime} - ${raw.schedule.endTime}`,
          room: raw.schedule.room,
          openedAtLabel: formatBangkokTime(raw.startsAt),
        }}
      />
    </>
  );
}
