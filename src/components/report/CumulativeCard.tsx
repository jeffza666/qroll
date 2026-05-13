import { PieChart, CalendarCheck, UserX, Clock } from "lucide-react";

type Props = {
  totalSessions: number;
  totalAbsent: number;
  totalLate: number;
};

function Row({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2.5 text-base font-semibold text-slate-600">
        {icon}
        {label}
      </span>
      <span className="font-inter text-xl font-black text-slate-800">
        {value} <span className="text-xs font-medium text-slate-400">{unit}</span>
      </span>
    </div>
  );
}

export default function CumulativeCard({ totalSessions, totalAbsent, totalLate }: Props) {
  return (
    <div className="flex flex-col justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-500">
        <PieChart className="h-4 w-4 text-purple-500" />
        สถิติรวมทั้งเทอม (สะสม)
      </h3>
      <div className="space-y-4">
        <Row
          icon={
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50">
              <CalendarCheck className="h-3.5 w-3.5 text-indigo-500" />
            </div>
          }
          label="คาบเรียนทั้งหมด"
          value={totalSessions}
          unit="ครั้ง"
        />
        <Row
          icon={
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50">
              <UserX className="h-3.5 w-3.5 text-red-500" />
            </div>
          }
          label="ขาดเรียนรวม"
          value={totalAbsent}
          unit="ครั้ง"
        />
        <Row
          icon={
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
          }
          label="สายรวม"
          value={totalLate}
          unit="ครั้ง"
        />
      </div>
    </div>
  );
}
