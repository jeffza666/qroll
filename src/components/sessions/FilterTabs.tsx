"use client";

import { useState } from "react";
import type { AttendanceStatus } from "@prisma/client";
import RosterTable from "@/components/sessions/RosterTable";
import type { SessionReportRow } from "@/components/sessions/RosterTable";

type Filter = AttendanceStatus | "ALL";

const TABS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "PRESENT", label: "ทันเวลา" },
  { value: "LATE", label: "มาสาย" },
  { value: "ABSENT", label: "ขาดเรียน" },
  { value: "EXCUSED", label: "ลา" },
];

type Props = { rows: SessionReportRow[] };

export default function FilterTabs({ rows }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const counts: Record<Filter, number> = {
    ALL: rows.length,
    PRESENT: rows.filter((r) => r.attendance?.status === "PRESENT").length,
    LATE: rows.filter((r) => r.attendance?.status === "LATE").length,
    ABSENT: rows.filter((r) => r.attendance?.status === "ABSENT").length,
    EXCUSED: rows.filter((r) => r.attendance?.status === "EXCUSED").length,
  };

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              filter === tab.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                filter === tab.value ? "bg-slate-100 text-slate-700" : "text-slate-400"
              }`}
            >
              {counts[tab.value]}
            </span>
          </button>
        ))}
      </div>
      <RosterTable rows={rows} filter={filter} searchQuery="" />
    </div>
  );
}
