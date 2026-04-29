import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import Link from "next/link";
import { BookOpen, Users, ChevronRight, Plus } from "lucide-react";

export default async function CoursesPage() {
  const user = await requireTeacher();

  const courses = await db.course.findMany({
    where: { teacherId: user.id },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800">รายวิชาของฉัน</h1>
          <p className="text-sm text-slate-500">{courses.length} รายวิชา</p>
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
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <BookOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-semibold">ยังไม่มีวิชา</p>
            <p className="text-sm mt-1 mb-6">เริ่มต้นด้วยการสร้างวิชาแรกของคุณ</p>
            <Link
              href="/teacher/courses/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#990000] px-5 py-3 text-sm font-bold leading-none !text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#990000] whitespace-nowrap"
            >
              <Plus className="h-4 w-4 !text-white" />
              สร้างวิชาใหม่
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/teacher/courses/${course.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:bg-red-50 group-hover:border-red-100 transition-colors">
                    <BookOpen className="w-5 h-5 text-slate-400 group-hover:text-[#990000]" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#990000] transition-colors" />
                </div>
                <p className="text-lg font-extrabold text-slate-900 leading-tight">{course.code}</p>
                <p className="text-sm text-slate-500 mt-1 truncate">{course.name}</p>
                <p className="text-xs text-slate-400 mt-1">เทอม {course.semester}</p>
                <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-100">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {course._count.enrollments} นักศึกษา
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
