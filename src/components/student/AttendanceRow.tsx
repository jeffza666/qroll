import { AttendanceStatus } from "@prisma/client";
import { CalendarDays, Clock, MapPin } from "lucide-react";

import { formatBangkokDate, formatBangkokTime } from "@/lib/datetime";

type Props = {
  status: AttendanceStatus;
  checkedInAt?: Date | null;
  sessionStartsAt: Date;
  courseCode?: string;
  courseName?: string;
  room: string | null;
  distanceM: number | null;
};

const STATUS_PILL: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT: { label: "ทันเวลา", className: "bg-emerald-50 text-emerald-700" },
  LATE: { label: "มาสาย", className: "bg-amber-50 text-amber-700" },
  ABSENT: { label: "ขาด", className: "bg-red-50 text-red-700" },
  EXCUSED: { label: "ลา", className: "bg-blue-50 text-blue-700" },
};

const MONTHS_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatBkkDate(d: Date) {
  return formatBangkokDate(d, MONTHS_TH, "buddhist-short");
}

export default function AttendanceRow({
  status,
  checkedInAt,
  sessionStartsAt,
  courseCode,
  courseName,
  room,
  distanceM,
}: Props) {
  const pill = STATUS_PILL[status];

  return (
    <div className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-slate-50/60 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        {courseCode && (
          <p className="font-inter text-sm font-black text-slate-900">
            {courseCode}
            {courseName && (
              <span className="ml-2 font-medium text-slate-500">{courseName}</span>
            )}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            {formatBkkDate(sessionStartsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {checkedInAt ? `เช็คชื่อ ${formatBangkokTime(checkedInAt)} น.` : "ไม่ได้เช็คชื่อ"}
          </span>
          {room && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {room}
            </span>
          )}
          {distanceM !== null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700">
              <MapPin className="h-3 w-3" />
              ตรวจตำแหน่งแล้ว ~{distanceM}m
            </span>
          )}
        </div>
      </div>
      <span
        className={`font-inter inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-black ${pill.className}`}
      >
        {pill.label}
      </span>
    </div>
  );
}
