import { ArrowLeft, PieChart, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import CourseForm from "@/components/courses/CourseForm";
import CourseGeofenceSection from "@/components/courses/CourseGeofenceSection";
import PageHeader from "@/components/shell/PageHeader";
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
      <PageHeader className="justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href={`/teacher/courses/${id}`}
            className="shrink-0 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-800">แก้ไขรายวิชา</h1>
            <p className="truncate text-sm text-slate-500">{course.code}{course.section ? ` • ${course.section}` : ""} • {course.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/teacher/courses/${id}/students`}
            aria-label="จัดการนักศึกษา"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-bold text-slate-700 antialiased shadow-sm transition-colors hover:bg-slate-50 sm:px-5"
          >
            <Users className="w-4 h-4" />
            <span className="hidden lg:inline">จัดการนักศึกษา</span>
          </Link>
          <Link
            href={`/teacher/courses/${id}/report`}
            aria-label="ดูรายงานสรุป"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-bold text-slate-700 antialiased shadow-sm transition-colors hover:bg-slate-50 sm:px-5"
          >
            <PieChart className="w-4 h-4" />
            <span className="hidden lg:inline">ดูรายงานสรุป</span>
          </Link>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
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
            belowFields={
              <CourseGeofenceSection
                courseId={id}
                initial={{
                  lat: course.geofenceLat ?? null,
                  lng: course.geofenceLng ?? null,
                }}
              />
            }
          />
        </div>
      </div>
    </>
  );
}
