import { BookOpen, CalendarClock, MapPin } from "lucide-react";

type Props = {
  courseCode: string;
  courseName: string;
  semester: string;
  timeLabel: string;
  room: string | null;
};

export default function SessionSummary({
  courseCode,
  courseName,
  semester,
  timeLabel,
  room,
}: Props) {
  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#990000] shadow-sm ring-1 ring-slate-200">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black leading-tight text-slate-950">{courseCode}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{courseName}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">เทอม {semester}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <span>{timeLabel}</span>
        </div>
        {room && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{room}</span>
          </div>
        )}
      </div>
    </div>
  );
}
