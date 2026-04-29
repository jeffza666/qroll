import { UsersRound } from "lucide-react";

type Props = {
  count: number;
};

export default function CheckedInSidebar({ count }: Props) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-slate-200 bg-white/70 px-6 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
          <UsersRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">เช็คอินแล้ว</p>
          <p className="text-3xl font-black tabular-nums text-slate-950">{count}</p>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-sm font-bold text-slate-900">รายชื่อล่าสุด</p>
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-24 rounded-full bg-slate-100" />
                <div className="h-2 w-16 rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          รายชื่อเช็คอินสดจะเชื่อมต่อใน Phase 4.5
        </p>
      </div>
    </aside>
  );
}
