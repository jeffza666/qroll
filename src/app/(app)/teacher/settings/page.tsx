import { requireTeacher } from "@/lib/auth-helpers";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireTeacher();

  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-10 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-lg">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-5 h-5 text-slate-400" />
              <h2 className="text-base font-bold text-slate-800">ข้อมูลผู้ใช้</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ชื่อ</label>
              <p className="text-sm font-medium text-slate-900 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                {user.name ?? "—"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">อีเมล</label>
              <p className="text-sm font-medium text-slate-900 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                {user.email}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">บทบาท</label>
              <p className="text-sm font-medium text-slate-900 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                อาจารย์ (Teacher)
              </p>
            </div>

            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              การตั้งค่าเพิ่มเติม (เปลี่ยนรหัส, การแจ้งเตือน, ธีม) จะพร้อมใช้ใน Phase 7
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
