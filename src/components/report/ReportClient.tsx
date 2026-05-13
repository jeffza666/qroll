"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Filter, Search } from "lucide-react";

import AttendanceMatrixTable, {
  type MatrixSession,
  type MatrixStudent,
} from "./AttendanceMatrixTable";
import RiskCard from "./RiskCard";
import TrendCard from "./TrendCard";
import CumulativeCard from "./CumulativeCard";

type RiskFilter = "ALL" | "SAFE" | "WARN" | "DANGER";

const FILTER_OPTIONS: { value: RiskFilter; label: string; color: string }[] = [
  { value: "ALL", label: "ดูแสดงทั้งหมด", color: "text-slate-600" },
  { value: "SAFE", label: "เข้าเรียนดี (≥ 80%)", color: "text-emerald-600" },
  { value: "WARN", label: "เฝ้าระวัง (60-79%)", color: "text-amber-600" },
  { value: "DANGER", label: "เสี่ยงหมดสิทธิ์สอบ (< 60%)", color: "text-red-600" },
];

type Props = {
  sessions: MatrixSession[];
  students: MatrixStudent[];
  sessionStats: { label: string; pct: number | null }[];
  totalSessions: number;
  totalAbsent: number;
  totalLate: number;
  riskBuckets: { safe: number; warn: number; danger: number };
};

export default function ReportClient({
  sessions,
  students,
  sessionStats,
  totalSessions,
  totalAbsent,
  totalLate,
  riskBuckets,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (riskFilter === "SAFE") {
        if (s.pct === null || s.pct < 80) return false;
      } else if (riskFilter === "WARN") {
        if (s.pct === null || s.pct >= 80 || s.pct < 60) return false;
      } else if (riskFilter === "DANGER") {
        if (s.pct === null || s.pct >= 60) return false;
      }
      if (!q) return true;
      const name = (s.name ?? "").toLowerCase();
      const sid = (s.studentId ?? "").toLowerCase();
      return name.includes(q) || sid.includes(q);
    });
  }, [students, searchQuery, riskFilter]);

  const activeOption = FILTER_OPTIONS.find((o) => o.value === riskFilter)!;
  const isFiltering = riskFilter !== "ALL";
  const hasActiveSearch = searchQuery.trim().length > 0;
  const showFilteredEmptyState = sessions.length > 0 && filtered.length === 0;

  function resetFilters() {
    setSearchQuery("");
    setRiskFilter("ALL");
    setDropdownOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <RiskCard {...riskBuckets} />
        <TrendCard sessions={sessionStats} />
        <CumulativeCard
          totalSessions={totalSessions}
          totalAbsent={totalAbsent}
          totalLate={totalLate}
        />
      </div>

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ รหัสนักศึกษา..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm transition-shadow focus:border-[#990000] focus:outline-none focus:ring-1 focus:ring-[#990000]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className={`relative inline-flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition-all sm:w-auto sm:justify-center ${
              isFiltering
                ? riskFilter === "DANGER"
                  ? "border-red-400 bg-red-50 text-red-700"
                  : riskFilter === "WARN"
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            } sm:min-w-[220px]`}
          >
            <Filter className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left sm:flex-none">{activeOption.label}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            {isFiltering && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${riskFilter === "DANGER" ? "bg-red-400" : riskFilter === "WARN" ? "bg-amber-400" : "bg-emerald-400"}`} />
                <span className={`relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white ${riskFilter === "DANGER" ? "bg-red-500" : riskFilter === "WARN" ? "bg-amber-500" : "bg-emerald-500"}`} />
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setRiskFilter(opt.value);
                    setDropdownOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-slate-50 ${
                    riskFilter === opt.value ? "bg-slate-50" : ""
                  } ${opt.color}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      opt.value === "ALL"
                        ? "bg-slate-300"
                        : opt.value === "SAFE"
                          ? "bg-emerald-400"
                          : opt.value === "WARN"
                            ? "bg-amber-400"
                            : "bg-red-500"
                    }`}
                  />
                  {opt.label}
                  {riskFilter === opt.value && (
                    <span className="ml-auto text-xs font-bold text-slate-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm [overflow:clip]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm">
          <span className="font-semibold text-slate-500">
            แสดงผล <strong className="text-slate-800">{filtered.length}</strong> จาก {students.length} รายการ
          </span>
        </div>
        {sessions.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <p className="text-sm">ยังไม่มีคาบที่ปิดแล้ว</p>
            <p className="mt-1 text-xs">รายงานจะแสดงเมื่อมีคาบที่ปิด session แล้ว</p>
          </div>
        ) : showFilteredEmptyState ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="mt-4 text-lg font-bold text-slate-500">
              ยังไม่มีนักศึกษาที่ตรงกับการค้นหานี้
            </p>
            {(hasActiveSearch || isFiltering) && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                ล้างการค้นหาและตัวกรอง
              </button>
            )}
          </div>
        ) : (
          <AttendanceMatrixTable sessions={sessions} students={filtered} />
        )}
      </div>
    </div>
  );
}
