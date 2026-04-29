import { BookOpen, Users } from "lucide-react";

import { requireStudent } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function StudentCoursesPage() {
  const user = await requireStudent();

  const enrollments = await db.enrollment.findMany({
    where: { studentId: user.id },
    include: {
      course: {
        include: { _count: { select: { enrollments: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <header className="sticky top-0 z-10 flex h-20 items-center border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md lg:px-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800">วิชาที่ลงเรียน</h1>
          <p className="text-sm text-slate-500">{enrollments.length} รายวิชา</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
        {enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-slate-400">
            <BookOpen className="mb-4 h-14 w-14 opacity-30" />
            <p className="text-sm font-semibold">ยังไม่มีรายวิชาที่ลงเรียน</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {enrollments.map((enrollment) => (
              <article
                key={enrollment.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-[#990000]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="text-lg font-extrabold text-slate-900">
                  {enrollment.course.code}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {enrollment.course.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  เทอม {enrollment.course.semester}
                </p>
                <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-sm text-slate-500">
                  <Users className="h-4 w-4 text-slate-400" />
                  {enrollment.course._count.enrollments} นักศึกษา
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
