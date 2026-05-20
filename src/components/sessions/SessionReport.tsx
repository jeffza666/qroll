"use client";

import { useState } from "react";
import { Search, XCircle } from "lucide-react";
import SessionMetaBar from "@/components/sessions/SessionMetaBar";
import FilterButtonGroup, {
  type StatusFilter,
} from "@/components/sessions/FilterButtonGroup";
import RosterTable, {
  type SessionReportRow,
} from "@/components/sessions/RosterTable";
import SessionMoreMenu from "@/components/sessions/SessionMoreMenu";

type Props = {
  sessionId: string;
  sessionMeta: {
    courseCode: string;
    section?: string | null;
    courseName: string;
    semester: string;
    dayLabel: string;
    timeLabel: string;
    room: string | null;
    openedAtLabel: string;
    closedAtLabel: string | null;
  };
  rows: SessionReportRow[];
};

export default function SessionReport({ sessionId, sessionMeta, rows }: Props) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // นับสถานะ — ใช้ทั้งใน FilterButtonGroup และคำนวณ avg
  const counts = {
    PRESENT: rows.filter((r) => r.attendance?.status === "PRESENT").length,
    LATE: rows.filter((r) => r.attendance?.status === "LATE").length,
    ABSENT: rows.filter((r) => r.attendance?.status === "ABSENT").length,
    EXCUSED: rows.filter((r) => r.attendance?.status === "EXCUSED").length,
  };

  const totalEnrolled = rows.filter((r) => !r.isDropped).length;

  const counted = totalEnrolled - counts.EXCUSED;
  const avgAttendancePct =
    counted > 0
      ? Math.round(((counts.PRESENT + counts.LATE * 0.5) / counted) * 100)
      : null;

  const hasActiveFilter = filter !== "ALL" || searchQuery.trim() !== "";

  function clearFilters() {
    setFilter("ALL");
    setSearchQuery("");
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
      {/* Meta bar with donut chart on right */}
      <SessionMetaBar
        {...sessionMeta}
        totalEnrolled={totalEnrolled}
        avgAttendancePct={avgAttendancePct}
        actions={
          <SessionMoreMenu
            sessionId={sessionId}
            courseCode={sessionMeta.courseCode}
            dayLabel={sessionMeta.dayLabel}
            timeLabel={sessionMeta.timeLabel}
          />
        }
      />

      {/* Filter toolbar — proximity กับตาราง:
          filter buttons (ซ้าย) + search + clear (ขวา) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterButtonGroup
          counts={counts}
          active={filter}
          onChange={setFilter}
        />

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ รหัสนักศึกษา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm transition-shadow focus:border-[#990000] focus:outline-none focus:ring-1 focus:ring-[#990000]"
            />
          </div>
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-500 shadow-sm transition-colors hover:text-[#990000]"
            >
              <XCircle className="h-4 w-4" />
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Roster table */}
      <RosterTable rows={rows} filter={filter} searchQuery={searchQuery} />

      </div>
    </div>
  );
}
