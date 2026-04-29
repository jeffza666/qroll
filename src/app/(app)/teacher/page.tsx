import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { BookOpen, Users, TrendingUp, CalendarDays, Plus, Clock, MapPin, ExternalLink } from "lucide-react";
import Link from "next/link";
import OpenSessionButton from "@/components/courses/OpenSessionButton";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export default async function TeacherDashboard() {
  const user = await requireTeacher();

  const todayDow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  ).getDay();

  const [courseCount, enrollmentCount, todaySchedules] = await Promise.all([
    db.course.count({ where: { teacherId: user.id } }),
    db.enrollment.count({ where: { course: { teacherId: user.id } } }),
    db.schedule.findMany({
      where: {
        dayOfWeek: todayDow,
        course: { teacherId: user.id },
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        classSessions: {
          where: { isOpen: true },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { startTime: "asc" },
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

        {/* Today's schedule — ข้อมูลจริงจาก DB */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-slate-100 flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-bold text-slate-800">ตารางสอนวันนี้</h3>
            <span className="text-sm font-medium text-slate-500">
              {DAYS[todayDow]}
            </span>
          </div>

          {todaySchedules.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">ไม่มีคาบสอนวันนี้</p>
              <p className="text-xs mt-1">
                ไปที่{" "}
                <Link href="/teacher/courses" className="text-[#2E3192] underline underline-offset-2">
                  รายวิชา
                </Link>{" "}
                เพื่อเพิ่มตารางสอน
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todaySchedules.map((s) => {
                const activeSession = s.classSessions[0];
                return (
                  <div key={s.id} className="px-7 py-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-5">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{s.course.code}</p>
                        <p className="text-xs text-slate-500">{s.course.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {s.startTime} – {s.endTime}
                      </div>
                      {s.room && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {s.room}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSession ? (
                        <>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            เปิดอยู่
                          </span>
                          <Link
                            href={`/teacher/sessions/${activeSession.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            ดู session
                          </Link>
                        </>
                      ) : (
                        <OpenSessionButton scheduleId={s.id} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
