"use client";

import { useTransition } from "react";
import type { AttendanceStatus } from "@prisma/client";
import { Check, ChevronDown, Clock, FileText, MapPin, Minus, X } from "lucide-react";
import { updateAttendanceStatus } from "@/actions/attendance";
import type { StatusFilter } from "@/components/sessions/FilterButtonGroup";

export type SessionReportRow = {
  enrollmentId: string;
  student: { id: string; name: string; studentId: string | null };
  isDropped: boolean;
  attendance: {
    id: string;
    status: AttendanceStatus;
    checkedInAtLabel: string;
    /** null = session ไม่เปิด geofence หรือเป็นการเช็คก่อนเปิด feature */
    locationVerified?: { distanceM: number } | null;
  } | null;
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "มาเรียน",
  LATE: "มาสาย",
  ABSENT: "ขาดเรียน",
  EXCUSED: "ลา",
};

// สีของ select แต่ละสถานะ (พื้น + border + text)
const STATUS_TONE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
  LATE: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
  ABSENT: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
  EXCUSED: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
};

const STATUS_ICONS: Record<AttendanceStatus, React.ComponentType<{ className?: string }>> = {
  PRESENT: Check,
  LATE: Clock,
  ABSENT: X,
  EXCUSED: FileText,
};

function StatusSelect({
  attendanceId,
  currentStatus,
}: {
  attendanceId: string;
  currentStatus: AttendanceStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const Icon = STATUS_ICONS[currentStatus];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as AttendanceStatus;
    startTransition(async () => {
      await updateAttendanceStatus(attendanceId, next);
    });
  }

  return (
    <div className="relative inline-block w-[140px]">
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={isPending}
        className={`w-full cursor-pointer appearance-none rounded-lg border py-2 pl-9 pr-7 text-sm font-bold shadow-sm outline-none transition-colors disabled:opacity-50 ${STATUS_TONE[currentStatus]}`}
      >
        {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as AttendanceStatus[]).map((s) => (
          <option key={s} value={s} className="bg-white text-slate-800">
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
    </div>
  );
}

type Props = {
  rows: SessionReportRow[];
  filter: StatusFilter;
  searchQuery: string;
};

export default function RosterTable({ rows, filter, searchQuery }: Props) {
  const q = searchQuery.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (filter !== "ALL") {
      if (r.attendance?.status !== filter) return false;
    }
    if (q) {
      const idMatch = (r.student.studentId ?? "").toLowerCase().includes(q);
      const nameMatch = r.student.name.toLowerCase().includes(q);
      if (!idMatch && !nameMatch) return false;
    }
    return true;
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-6 sm:py-4 text-sm">
        <span className="font-semibold text-slate-500">
          แสดงผล <strong className="text-slate-800">{visible.length}</strong> จาก{" "}
          {rows.length} รายการ
          {(filter !== "ALL" || q) && (
            <span className="ml-2 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-qroll-red-dark">
              กำลังกรองข้อมูล
            </span>
          )}
        </span>
      </div>

      <div className="relative max-h-[600px] overflow-x-auto overflow-y-auto">
        <table className="w-full whitespace-nowrap text-left text-base">
          <thead className="sticky top-0 z-10 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
            <tr>
              <th className="w-12 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 sm:px-6 sm:py-4 text-center">#</th>
              <th className="w-40 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 sm:px-6 sm:py-4 font-inter">
                รหัสนักศึกษา
              </th>
              <th className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 sm:px-6 sm:py-4">
                ชื่อ-นามสกุล
              </th>
              <th className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 sm:px-6 sm:py-4 text-center">
                เวลาเช็คชื่อ
              </th>
              <th className="w-44 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-6 sm:py-4 text-center">
                สถานะ (คลิกเพื่อแก้ไข)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  ไม่พบข้อมูลที่ค้นหา หรือไม่พบสถานะนี้
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr
                  key={row.enrollmentId}
                  className="transition-colors hover:bg-slate-50/50"
                >
                  <td className="border-r border-slate-100 px-3 py-3 sm:px-6 sm:py-4 text-center font-medium text-slate-400">
                    {i + 1}
                  </td>
                  <td className="border-r border-slate-100 px-3 py-3 sm:px-6 sm:py-4 font-inter font-bold text-slate-700">
                    {row.student.studentId ?? "—"}
                  </td>
                  <td className="border-r border-slate-100 px-3 py-3 sm:px-6 sm:py-4 font-medium text-slate-800">
                    {row.student.name}
                    {row.isDropped && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                        ถอนแล้ว
                      </span>
                    )}
                  </td>
                  <td className="border-r border-slate-100 px-3 py-3 sm:px-6 sm:py-4 text-center font-inter font-medium text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <span>{row.attendance?.checkedInAtLabel ?? "—"}</span>
                      {row.attendance?.locationVerified && (
                        <span
                          title={`ตรวจตำแหน่งแล้ว ห่างห้อง ~${row.attendance.locationVerified.distanceM}m`}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100"
                        >
                          <MapPin className="h-3 w-3" />
                          {row.attendance.locationVerified.distanceM}m
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center">
                    {row.attendance ? (
                      <StatusSelect
                        attendanceId={row.attendance.id}
                        currentStatus={row.attendance.status}
                      />
                    ) : (
                      <span className="relative inline-flex w-[140px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-7 text-sm font-bold text-slate-400 shadow-sm">
                        <Minus className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                        ไม่มีข้อมูล
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
