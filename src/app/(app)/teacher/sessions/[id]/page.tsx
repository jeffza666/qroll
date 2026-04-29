import { requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { autoCloseIfExpired } from "@/lib/session-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, QrCode, Users } from "lucide-react";
import CloseSessionButton from "@/components/courses/CloseSessionButton";

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
      schedule: { select: { dayOfWeek: true, startTime: true, endTime: true, room: true } },
      _count: { select: { attendances: true } },
    },
  });

  if (!raw) notFound();

  await requireCourseOwner(raw.courseId);

  // lazy auto-close ก่อน render
  const session = await autoCloseIfExpired(raw);

  const isOpen = session.isOpen;

  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            href={`/teacher/courses/${raw.course.id}?tab=schedule`}
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{raw.course.code}</h1>
            <p className="text-sm text-slate-500">{raw.course.name} • เทอม {raw.course.semester}</p>
          </div>
        </div>

        {isOpen && <CloseSessionButton sessionId={session.id} />}
      </header>

      <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center">
        {/* Status card */}
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-6">
          {/* Status badge */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">คาบเรียน</h2>
            {isOpen ? (
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                เปิดอยู่
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                ปิดแล้ว
              </span>
            )}
          </div>

          {/* Session info */}
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {DAYS[raw.schedule.dayOfWeek]} {raw.schedule.startTime} – {raw.schedule.endTime}
              </span>
            </div>
            {raw.schedule.room && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{raw.schedule.room}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>เปิดเมื่อ {formatBangkokTime(raw.startsAt)} น.</span>
            </div>
            {!isOpen && session.closedAt && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>ปิดเมื่อ {formatBangkokTime(session.closedAt)} น.</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span>เช็คอินแล้ว {raw._count.attendances} คน</span>
            </div>
          </div>
        </div>

        {/* QR placeholder */}
        <div className="w-full max-w-lg bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400">
          <QrCode className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm font-semibold">QR Code จะมาแสดงที่นี่</p>
          <p className="text-xs mt-1 text-center">Dynamic QR (refresh ทุก 30s) — Phase 4</p>
        </div>
      </div>
    </>
  );
}
