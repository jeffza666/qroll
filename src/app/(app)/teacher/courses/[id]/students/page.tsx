import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, PieChart, UserMinus, Users } from "lucide-react";
import AddStudentDialog from "@/components/import/AddStudentDialog";
import DeleteEnrollmentButton from "@/components/import/DeleteEnrollmentButton";
import DropStudentButton from "@/components/import/DropStudentButton";
import EditStudentDialog from "@/components/import/EditStudentDialog";
import RosterImport from "@/components/import/RosterImport";
import StudentsSearchInput from "@/components/import/StudentsSearchInput";
import PageHeader from "@/components/shell/PageHeader";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

const DROPPED_AT_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; show?: string }>;
};

export default async function CourseStudentsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { q, show } = await searchParams;
  const user = await requireTeacher();
  const query = q?.trim() ?? "";
  const showDropped = show === "dropped";

  // นับ total + dropped แยกจาก list ที่ filter — เห็น "filtered/total" + toggle count
  const [course, totalCount, droppedCount] = await Promise.all([
    db.course.findFirst({
      where: { id, teacherId: user.id },
      include: {
        schedules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        enrollments: {
          where: {
            droppedAt: showDropped ? { not: null } : null,
            ...(query
              ? {
                  student: {
                    OR: [
                      { name: { contains: query, mode: "insensitive" } },
                      { studentId: { contains: query } },
                    ],
                  },
                }
              : {}),
          },
          include: { student: true },
          orderBy: showDropped
            ? { droppedAt: "desc" }
            : { createdAt: "asc" },
        },
      },
    }),
    db.enrollment.count({
      where: { courseId: id, droppedAt: null, course: { teacherId: user.id } },
    }),
    db.enrollment.count({
      where: {
        courseId: id,
        droppedAt: { not: null },
        course: { teacherId: user.id },
      },
    }),
  ]);

  if (!course) notFound();

  const filteredCount = course.enrollments.length;
  const firstRoom = course.schedules.find((s) => s.room)?.room ?? "";

  return (
    <>
      <PageHeader className="justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href={
              showDropped
                ? `/teacher/courses/${id}/students`
                : `/teacher/courses/${id}`
            }
            className="shrink-0 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black text-slate-900">รายละเอียดรายวิชา</h1>
            <p className="truncate text-sm text-slate-500">
              {course.name} • เทอม {course.semester}
            </p>
          </div>
        </div>
        <Link
          href={`/teacher/courses/${id}/report`}
          aria-label="ดูรายงานสรุป"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-bold text-slate-700 antialiased shadow-sm transition-colors hover:bg-slate-50 sm:px-5"
        >
          <PieChart className="w-4 h-4" />
          <span className="hidden lg:inline">ดูรายงานสรุป</span>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {/* CourseHeader card — pattern เดียวกับหน้า detail */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-7 bg-[#990000] rounded-full shadow-sm"></div>
                <h2 className="text-2xl md:text-[28px] font-extrabold text-slate-800 tracking-wide">
                  {showDropped ? "นักศึกษาที่ถอนออกจากรายวิชา" : "จัดการรายชื่อนักศึกษา"}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 font-inter tracking-tight leading-none">
                  {course.code}
                </h3>
                {course.section && (
                  <span className="px-3 py-1 bg-[#990000] text-white text-xs font-bold uppercase rounded-lg shadow-sm font-inter tracking-wider">
                    Sec {course.section}
                  </span>
                )}
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-slate-600 mb-6">
                {course.name}
                <span className="text-slate-400 font-medium text-base ml-2">
                  เทอม {course.semester}
                </span>
              </h4>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-[14px] font-bold text-slate-600 bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100 w-fit">
                {course.schedules.map((s) => (
                  <span key={s.id} className="flex items-center gap-2.5 text-slate-500 font-bold">
                    <Clock className="w-5 h-5 text-[#990000]" />
                    {DAYS[s.dayOfWeek]} {s.startTime} - {s.endTime}
                  </span>
                ))}
                {firstRoom && (
                  <span className="flex items-center gap-2.5 text-slate-500 font-bold">
                    <MapPin className="w-5 h-5 text-[#990000]" />
                    {firstRoom}
                  </span>
                )}
              </div>
            </div>
            {/* total count card ฝั่งขวา */}
            <div className="bg-slate-50 px-5 sm:px-7 py-5 sm:py-6 rounded-2xl text-center shadow-sm shrink-0 w-full md:w-auto md:min-w-[160px] flex flex-col items-center border border-slate-100">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-slate-200 mb-2">
                <Users className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-1">
                {showDropped ? "ถอนแล้ว" : "นักศึกษา"}
              </p>
              <p className="text-4xl font-black text-slate-900 font-inter leading-none">
                {showDropped ? droppedCount : totalCount}
                <span className="text-sm font-medium text-slate-400 ml-1.5">คน</span>
              </p>
              {!showDropped && droppedCount > 0 && (
                <p className="mt-3 pt-3 border-t border-slate-200 text-[11px] font-semibold text-slate-400 w-full">
                  ถอนแล้ว <span className="text-slate-600 font-bold">{droppedCount}</span> คน
                </p>
              )}
            </div>
          </div>

          {/* Toolbar: search + action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
            <StudentsSearchInput />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!showDropped ? (
                <>
                  {droppedCount > 0 && (
                    <Link
                      href={`/teacher/courses/${id}/students?show=dropped`}
                      className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 antialiased shadow-sm transition-all hover:bg-slate-50"
                    >
                      <UserMinus className="h-4 w-4" />
                      รายชื่อถอน ({droppedCount})
                    </Link>
                  )}
                  <AddStudentDialog courseId={course.id} />
                  <RosterImport courseId={course.id} />
                </>
              ) : (
                <Link
                  href={`/teacher/courses/${id}/students`}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 antialiased shadow-sm transition-all hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  กลับรายชื่อปัจจุบัน
                </Link>
              )}
            </div>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-semibold">
                แสดงผล <strong className="text-slate-800">{filteredCount}</strong> จาก{" "}
                {showDropped ? droppedCount : totalCount} รายการ
              </span>
            </div>

            {filteredCount === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                {query ? (
                  <>
                    <p className="text-sm font-semibold">ไม่พบรายชื่อตรงกับ &ldquo;{query}&rdquo;</p>
                    <p className="text-xs mt-1">ลองค้นด้วยคำอื่นหรือเคลียร์ search</p>
                  </>
                ) : showDropped ? (
                  <>
                    <p className="text-sm">ยังไม่มีนักศึกษาที่ถอน</p>
                    <p className="text-xs mt-1">
                      เมื่อกดถอนนักศึกษาจะมาแสดงที่หน้านี้
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm">ยังไม่มีนักศึกษา</p>
                    <p className="text-xs mt-1">
                      กด &ldquo;Import รายชื่อ&rdquo; เพื่อ upload ไฟล์ CSV/Excel หรือเพิ่มรายบุคคล
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead className="text-slate-600 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 text-center w-12 bg-slate-50 border-b border-r border-slate-200">
                        #
                      </th>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 font-inter w-44 bg-slate-50 border-b border-r border-slate-200">
                        รหัสนักศึกษา
                      </th>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 bg-slate-50 border-b border-r border-slate-200">
                        ชื่อ-นามสกุล
                      </th>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 w-44 text-center bg-slate-50 border-b border-r border-slate-200">
                        {showDropped ? "ถอนเมื่อ" : "สถานะ"}
                      </th>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 w-48 text-center bg-slate-50 border-b border-slate-200">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {course.enrollments.map((enrollment, i) => (
                      <tr
                        key={enrollment.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-3 sm:py-4 sm:px-6 text-center text-slate-400 font-medium border-r border-slate-100">
                          {i + 1}
                        </td>
                        <td className="py-3 px-3 sm:py-4 sm:px-6 font-mono font-semibold text-slate-700 border-r border-slate-100">
                          {enrollment.student.studentId ?? "—"}
                        </td>
                        <td className="py-3 px-3 sm:py-4 sm:px-6 font-medium text-slate-900 border-r border-slate-100">
                          {enrollment.student.name}
                        </td>
                        <td className="py-3 px-3 sm:py-4 sm:px-6 text-center border-r border-slate-100">
                          {showDropped ? (
                            <span className="text-sm font-semibold text-slate-500">
                              {enrollment.droppedAt
                                ? DROPPED_AT_FORMATTER.format(enrollment.droppedAt)
                                : "—"}
                            </span>
                          ) : enrollment.student.email ? (
                            <span className="inline-flex min-w-28 items-center justify-center rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
                              เชื่อมบัญชีแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex min-w-28 items-center justify-center rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                              ยังไม่เข้าสู่ระบบ
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 sm:py-4 sm:px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {showDropped ? (
                              <DeleteEnrollmentButton
                                enrollmentId={enrollment.id}
                                studentId={enrollment.student.studentId ?? "—"}
                                studentName={enrollment.student.name ?? "—"}
                              />
                            ) : (
                              <>
                                <EditStudentDialog
                                  enrollmentId={enrollment.id}
                                  studentId={enrollment.student.studentId ?? ""}
                                  currentName={enrollment.student.name ?? ""}
                                />
                                <DropStudentButton enrollmentId={enrollment.id} />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
