import { Activity } from "lucide-react";

type Props = {
  safe: number;
  warn: number;
  danger: number;
};

export default function RiskCard({ safe, warn, danger }: Props) {
  const total = safe + warn + danger;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-500">
        <Activity className="h-4 w-4 text-[#990000]" />
        สถานะนักศึกษา (ความเสี่ยง)
      </h3>

      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center shadow-sm">
          <p className="mb-1 font-inter text-3xl font-black leading-none text-emerald-600">{safe}</p>
          <p className="text-xs font-bold leading-tight text-emerald-700">ปกติ (≥80%)</p>
        </div>
        <div className="flex-1 rounded-xl border border-amber-100 bg-amber-50 p-3 text-center shadow-sm">
          <p className="mb-1 font-inter text-3xl font-black leading-none text-amber-600">{warn}</p>
          <p className="text-xs font-bold leading-tight text-amber-700">เฝ้าระวัง</p>
        </div>
        <div className="flex-1 rounded-xl border border-red-100 bg-red-50 p-3 text-center shadow-sm">
          <p className="mb-1 font-inter text-3xl font-black leading-none text-red-600">{danger}</p>
          <p className="text-xs font-bold leading-tight text-red-700">เสี่ยง (&lt;60%)</p>
        </div>
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
        <div style={{ width: `${pct(safe)}%` }} className="bg-emerald-500 transition-all duration-1000" />
        <div style={{ width: `${pct(warn)}%` }} className="bg-amber-400 transition-all duration-1000" />
        <div style={{ width: `${pct(danger)}%` }} className="bg-red-500 transition-all duration-1000" />
      </div>

      {total === 0 && (
        <p className="mt-3 text-center text-xs text-slate-400">ยังไม่มีข้อมูลพอจะคำนวณ</p>
      )}
    </div>
  );
}
