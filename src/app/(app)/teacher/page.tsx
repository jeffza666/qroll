import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { BookOpen, Users, TrendingUp, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";

export default async function TeacherDashboard() {
  const user = await requireTeacher();

  const [courseCount, enrollmentCount] = await Promise.all([
    db.course.count({ where: { teacherId: user.id } }),
    db.enrollment.count({
      where: { course: { teacherId: user.id } },
    }),
  ]);

  return (
    <>
      {/* Top header */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ภาพรวมการจัดการเรียนการสอน</h1>
          <p className="text-sm text-slate-500">มหาวิทยาลัยธรรมศาสตร์</p>
        </div>
        <Link
          href="/teacher/courses/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#990000] px-5 py-3 text-sm font-bold leading-none !text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#990000] whitespace-nowrap"
        >
          <Plus className="h-4 w-4 !text-white" />
          สร้างวิชาใหม่
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-500">วิชาที่รับผิดชอบ</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-800">{courseCount}</span>
              <span className="text-sm text-slate-500">รายวิชา</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-slate-500">นักศึกษาทั้งหมด</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-800">{enrollmentCount}</span>
              <span className="text-sm text-slate-500">คน</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-slate-500">อัตราเข้าเรียนเฉลี่ย</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-400">—</span>
              <span className="text-sm text-slate-400">พร้อม Phase 5</span>
            </div>
          </div>
        </div>

        {/* Today's schedule placeholder */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-slate-100 flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-bold text-slate-800">ตารางสอนวันนี้</h3>
            <span className="text-sm text-slate-400">(จะแสดงข้อมูลเมื่อเพิ่มตารางสอนใน Phase 3.5)</span>
          </div>
          <div className="p-10 text-center text-slate-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">ยังไม่มีตารางสอน</p>
            <p className="text-xs mt-1">สร้างวิชาและเพิ่มตารางสอนเพื่อเริ่มต้น</p>
          </div>
        </div>
      </div>
    </>
  );
}
