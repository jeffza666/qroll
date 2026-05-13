import { BarChart2 } from "lucide-react";

type Props = {
  sessions: { label: string; shortLabel?: string; pct: number | null }[];
};

const BAR_MIN_W = 48; // px per bar — keeps bars readable at any session count

export default function TrendCard({ sessions }: Props) {
  const hasData = sessions.some((s) => s.pct !== null);
  const chartWidth = Math.max(sessions.length * BAR_MIN_W, 200);

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex shrink-0 items-center gap-2 text-base font-bold text-slate-500">
        <BarChart2 className="h-4 w-4 text-blue-500" />
        แนวโน้มการเข้าเรียนรายคาบ
      </h3>

      {!hasData ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <p className="text-xs text-slate-400">ยังไม่มีคาบที่บันทึก</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="relative flex items-end gap-1 pb-1 pt-8"
            style={{ width: chartWidth, minHeight: 100 }}
          >
            {/* grid lines */}
            <div className="pointer-events-none absolute inset-0 bottom-5 flex flex-col justify-between opacity-40">
              <div className="w-full border-b border-dashed border-slate-200" />
              <div className="w-full border-b border-dashed border-slate-200" />
              <div className="w-full border-b border-dashed border-slate-200" />
            </div>

            {sessions.map((s, idx) => {
              const h = s.pct ?? 0;
              const color =
                s.pct === null
                  ? "bg-slate-200"
                  : h >= 80
                    ? "bg-emerald-400"
                    : h >= 60
                      ? "bg-amber-400"
                      : "bg-red-400";
              return (
                <div
                  key={idx}
                  className="group relative z-10 flex flex-1 flex-col items-center gap-1"
                  style={{ minWidth: BAR_MIN_W }}
                >
                  <div className="relative flex h-[72px] w-full items-end justify-center rounded-t-sm bg-slate-50/50 transition-colors hover:bg-slate-100/50">
                    <div
                      style={{ height: `${h}%` }}
                      className={`relative w-full rounded-t-sm transition-all duration-700 group-hover:brightness-110 ${color}`}
                    >
                      <span className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded border border-slate-100 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 opacity-0 shadow-sm transition-all group-hover:opacity-100">
                        {s.pct === null ? "—" : `${Math.round(h)}%`}
                      </span>
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-[11px] font-bold text-slate-400">
                    {s.shortLabel ?? s.label.split(" ").slice(1).join(" ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
