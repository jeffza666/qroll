import { ArrowLeft, PieChart, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import CourseForm from "@/components/courses/CourseForm";
type Props = { params: Promise<{ id: string }> };

export default async function EditCoursePage({ params }: Props) {
  const { id } = await params;
  const user = await requireTeacher();

  const course = await db.course.findFirst({
    where: { id, teacherId: user.id },
    include: {
      schedules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!course) notFound();

  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            href={`/teacher/courses/${id}`}
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">รายละเอียดรายวิชา</h1>
            <p className="text-sm text-slate-500">{course.name} • เทอม {course.semester}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/courses/${id}/students`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-base font-bold antialiased hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Users className="w-4 h-4" />
            จัดการนักศึกษา
          </Link>
          <Link
            href={`/teacher/courses/${id}/report`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-base font-bold antialiased hover:bg-slate-50 transition-colors shadow-sm"
          >
            <PieChart className="w-4 h-4" />
            ดูรายงานสรุป
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-2xl mx-auto">
          <CourseForm
            mode="edit"
            courseId={id}
            initial={{
              code: course.code,
              section: course.section ?? "",
              name: course.name,
              semester: course.semester,
              schedules: course.schedules.map((s) => ({
                id: s.id, // ส่ง id ไปด้วย → server รู้ว่าเป็นแถวเดิม (update in place)
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                room: s.room ?? "",
              })),
            }}
          />

        </div>
      </div>
    </>
  );
}
