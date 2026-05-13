"use client";

import type { AttendanceStatus } from "@prisma/client";

export type StatusFilter = AttendanceStatus | "ALL";

type Counts = {
  PRESENT: number;
  LATE: number;
  ABSENT: number;
  EXCUSED: number;
};

type Props = {
  counts: Counts;
  active: StatusFilter;
  onChange: (next: StatusFilter) => void;
};

type Config = {
  type: StatusFilter;
  label: string;
  /** dot color เมื่อ inactive */
  dotCls: string;
  /** bg + text เมื่อ active */
  activeCls: string;
};

const CONFIGS: Config[] = [
  {
    type: "ALL",
    label: "ทั้งหมด",
    dotCls: "bg-slate-400",
    activeCls: "bg-slate-800 text-white",
  },
  {
    type: "PRESENT",
    label: "มา",
    dotCls: "bg-emerald-500",
    activeCls: "bg-emerald-600 text-white",
  },
  {
    type: "LATE",
    label: "สาย",
    dotCls: "bg-amber-500",
    activeCls: "bg-amber-600 text-white",
  },
  {
    type: "EXCUSED",
    label: "ลา",
    dotCls: "bg-blue-500",
    activeCls: "bg-blue-600 text-white",
  },
  {
    type: "ABSENT",
    label: "ขาด",
    dotCls: "bg-red-500",
    activeCls: "bg-red-600 text-white",
  },
];

/**
 * Segmented pill bar — ปุ่มกรองทั้งหมดใน container เดียว
 * ใช้แทน 4 cards แยก เพราะ:
 * - filter = control ไม่ใช่ stat (ตัวเลขใหญ่หลายอันแย่ง attention จากตาราง)
 * - เป็น pattern มาตรฐานของ filter toolbar (segmented control)
 */
export default function FilterButtonGroup({
  counts,
  active,
  onChange,
}: Props) {
  const total = counts.PRESENT + counts.LATE + counts.ABSENT + counts.EXCUSED;

  function countFor(type: StatusFilter): number {
    if (type === "ALL") return total;
    return counts[type];
  }

  return (
    <div className="inline-flex items-center divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {CONFIGS.map((cfg) => {
        const isActive = active === cfg.type;
        const count = countFor(cfg.type);
        return (
          <button
            key={cfg.type}
            type="button"
            onClick={() => onChange(cfg.type)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors ${
              isActive
                ? cfg.activeCls
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
            aria-pressed={isActive}
          >
            {/* dot ทำหน้าที่เป็นสี indicator เมื่อ inactive */}
            {!isActive && (
              <span className={`h-2 w-2 rounded-full ${cfg.dotCls}`} />
            )}
            <span>{cfg.label}</span>
            <span
              className={`font-inter font-black ${
                isActive ? "text-white/90" : "text-slate-800"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
