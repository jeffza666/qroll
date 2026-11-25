import { riskBand } from "@/lib/attendance-summary";

const BAND = {
  none: {
    label: "ยังไม่มีคาบที่ปิด",
    bar: "bg-slate-200",
    text: "text-slate-400",
  },
  safe: {
    label: "เข้าเรียนดี",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  },
  warn: {
    label: "เฝ้าระวัง",
    bar: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    label: "ต่ำกว่าเกณฑ์ 60%",
    bar: "bg-red-500",
    text: "text-red-700",
  },
} as const;

export default function AttendanceStanding({ pct }: { pct: number | null }) {
  const meta = BAND[riskBand(pct)];
  const width = pct === null ? 0 : Math.min(Math.max(pct, 0), 100);

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">อัตราเข้าเรียน</p>
        <p className={`font-inter text-sm font-black ${meta.text}`}>
          {pct === null ? "—" : `${pct}%`}
          <span className="ml-2 font-sans text-xs font-bold">{meta.label}</span>
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
