import { createCourse } from "@/app/actions/course";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewCoursePage() {
  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-10 sticky top-0 z-10 gap-4">
        <Link href="/teacher/courses" className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">สร้างวิชาใหม่</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-lg">
          <form action={createCourse} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                รหัสวิชา + กลุ่มเรียน
              </label>
              <input
                name="code"
                required
                placeholder="เช่น CS311 Sec 650001"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#990000]/30 focus:border-[#990000] transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">รวม section ไว้ในรหัสได้เลย เช่น &ldquo;CS311 Sec 650001&rdquo;</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ชื่อวิชา
              </label>
              <input
                name="name"
                required
                placeholder="เช่น Operating Systems"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#990000]/30 focus:border-[#990000] transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ภาคการศึกษา
              </label>
              <input
                name="semester"
                required
                placeholder="เช่น 1/2569"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#990000]/30 focus:border-[#990000] transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/teacher/courses"
                className="flex-1 py-3 text-center text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                className="flex-1 py-3 text-sm font-semibold text-white bg-[#990000] rounded-xl hover:bg-red-800 shadow-lg shadow-red-900/20 transition-all"
              >
                สร้างวิชา
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
