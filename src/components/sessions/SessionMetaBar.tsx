import { Clock, MapPin, Users, BookOpen } from "lucide-react";

type Props = {
  courseCode: string;
  section?: string | null;
  courseName: string;
  semester: string;
  dayLabel: string;
  timeLabel: string;
  room: string | null;
  openedAtLabel: string;
  closedAtLabel: string | null;
  totalEnrolled: number;
  avgAttendancePct: number | null;
  actions?: React.ReactNode;
};

/**
 * Donut chart แบบ pure SVG — ไม่พึ่ง lib เลย
 * เลือกใช้ stroke-dasharray trick เพราะมีแค่ 1 segment
 * (ไม่ต้องคำนวณ arc path ซับซ้อน, bundle เล็กกว่า chart lib)
 */
function AttendanceDonut({ pct }: { pct: number | null }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  // สีตาม % — เขียวถ้า >= 80, เหลืองถ้า 60-79, แดงถ้าต่ำกว่า
  const tone =
    pct === null
      ? "stroke-slate-300"
      : pct >= 80
        ? "stroke-emerald-500"
        : pct >= 60
          ? "stroke-amber-500"
          : "stroke-red-500";

  const textTone =
    pct === null
      ? "text-slate-400"
      : pct >= 80
        ? "text-emerald-600"
        : pct >= 60
          ? "text-amber-600"
          : "text-red-600";

  const offset =
    pct === null ? circumference : circumference * (1 - pct / 100);

  return (
    <div className="relative flex h-48 w-48 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-48 w-48 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className="stroke-slate-100"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className={`${tone} transition-all duration-700 ease-out`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {pct === null ? (
          <span className="text-sm font-bold text-slate-400">ยังไม่มีข้อมูล</span>
        ) : (
          <>
            <span className={`font-inter text-5xl font-black ${textTone}`}>
              {pct}
              <span className="text-2xl">%</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              เข้าเรียน
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function SessionMetaBar({
  courseCode,
  section,
  courseName,
  semester,
  dayLabel,
  timeLabel,
  room,
  openedAtLabel,
  closedAtLabel,
  totalEnrolled,
  avgAttendancePct,
  actions,
}: Props) {
  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      {actions && <div className="absolute right-5 top-5">{actions}</div>}
      <div className="flex flex-col gap-6 pr-10 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-7 w-2 rounded-full bg-qroll-red-dark shadow-sm"></div>
            <h2 className="text-2xl font-extrabold tracking-wide text-slate-800 md:text-[28px]">
              รายงาน Session
            </h2>
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-4">
            <h3 className="font-inter text-4xl font-black leading-none tracking-tight text-slate-900 md:text-5xl">
              {courseCode}
            </h3>
            {section && (
              <span className="font-inter rounded-lg bg-qroll-red-dark px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                Sec {section}
              </span>
            )}
          </div>
          <h4 className="mb-6 text-xl font-bold text-slate-600 md:text-2xl">
            {courseName}
            <span className="ml-2 text-base font-medium text-slate-400">
              เทอม {semester}
            </span>
          </h4>

          <div className="flex w-fit flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-600">
            <span className="flex items-center gap-2.5 text-slate-500">
              <Clock className="h-5 w-5 text-qroll-red-dark" />
              {dayLabel} {timeLabel}
            </span>
            {room && (
              <span className="flex items-center gap-2.5 text-slate-500">
                <MapPin className="h-5 w-5 text-qroll-red-dark" />
                {room}
              </span>
            )}
            <span className="flex items-center gap-2.5 text-slate-500">
              <BookOpen className="h-5 w-5 text-qroll-red-dark" />
              เปิด {openedAtLabel}
              {closedAtLabel && ` · ปิด ${closedAtLabel}`}
            </span>
            <span className="flex items-center gap-2.5 text-slate-500">
              <Users className="h-5 w-5 text-qroll-red-dark" />
              {totalEnrolled} คนในรายวิชา
            </span>
          </div>
        </div>

        <div className="mt-4 shrink-0 md:mt-0">
          <AttendanceDonut pct={avgAttendancePct} />
        </div>
      </div>
    </div>
  );
}
