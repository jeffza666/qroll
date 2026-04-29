import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import RosterImport from "@/components/import/RosterImport";

type Props = { params: Promise<{ id: string }> };

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireTeacher();

  const course = await db.course.findFirst({
    where: { id, teacherId: user.id },
    include: {
      enrollments: {
        include: { student: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) notFound();

  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/teacher/courses" className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{course.code}</h1>
            <p className="text-sm text-slate-500">{course.name} • เทอม {course.semester}</p>
          </div>
        </div>
        <RosterImport courseId={course.id} />
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        {/* Roster table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              <h3 className="text-base font-bold text-slate-800">รายชื่อนักศึกษา</h3>
            </div>
            <span className="text-sm text-slate-500">{course._count.enrollments} คน</span>
          </div>

          {course.enrollments.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">ยังไม่มีนักศึกษา</p>
              <p className="text-xs mt-1">กด &ldquo;Import รายชื่อ&rdquo; เพื่อ upload ไฟล์ CSV หรือ Excel</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-7 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">รหัสนักศึกษา</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อ-สกุล</th>
                    <th className="px-7 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">อีเมล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {course.enrollments.map((enrollment, i) => (
                    <tr key={enrollment.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-7 py-4 text-sm text-slate-400">{i + 1}</td>
                      <td className="px-4 py-4 text-sm font-mono font-semibold text-slate-700">
                        {enrollment.student.studentId ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">{enrollment.student.name}</td>
                      <td className="px-7 py-4 text-sm text-slate-500">{enrollment.student.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
