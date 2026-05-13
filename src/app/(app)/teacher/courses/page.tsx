import { requireTeacher } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import Link from "next/link";
import { Archive, ArrowLeft, BookOpen, Clock, MapPin, Plus, ArrowRight, Users } from "lucide-react";

const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

type Props = {
  searchParams: Promise<{ show?: string }>;
};

export default async function CoursesPage({ searchParams }: Props) {
  const user = await requireTeacher();
  const { show } = await searchParams;
  // ?show=archived → ดูเฉพาะ archived; default → ดู active
  const showArchived = show === "archived";

  const [courses, archivedCount] = await Promise.all([
    db.course.findMany({
      where: {
        teacherId: user.id,
        archivedAt: showArchived ? { not: null } : null,
      },
      include: {
        _count: { select: { enrollments: { where: { droppedAt: null } } } },
        schedules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.course.count({
      where: { teacherId: user.id, archivedAt: { not: null } },
    }),
  ]);

  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {/* ArrowLeft กลับไปวิชา active — เฉพาะตอนดู archived (pattern เดียวกับหน้าอื่น) */}
          {showArchived && (
            <Link
              href="/teacher/courses"
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {showArchived ? "Archive" : "รายวิชาของฉัน"}
            </h1>
            <p className="text-sm text-slate-500">{courses.length} รายวิชา</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle ไป archived — เฉพาะตอนดู active และมี archived อยู่ */}
          {!showArchived && archivedCount > 0 && (
            <Link
              href="/teacher/courses?show=archived"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Archive className="h-4 w-4" />
              Archive ({archivedCount})
            </Link>
          )}
          {!showArchived && (
            <Link
              href="/teacher/courses/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#990000] px-5 py-3 text-sm font-bold leading-none !text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#990000] whitespace-nowrap"
            >
              <Plus className="h-4 w-4 !text-white" />
              สร้างวิชาใหม่
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-7xl mx-auto animate-fade-in">
          {/* section title bar */}
          <div className="flex items-center gap-3 mb-6 ml-1">
            <div className="w-2 h-8 bg-[#990000] rounded-full shadow-md"></div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none pt-1">
              รายวิชาทั้งหมด
            </h2>
          </div>

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
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {courses.map((course) => {
                // build schedule chip: รวมวันที่มี + เวลาของแถวแรก
                const firstSchedule = course.schedules[0];
                const scheduleText = firstSchedule
                  ? `${course.schedules
                      .map((s) => DAYS[s.dayOfWeek])
                      .filter((d, i, arr) => arr.indexOf(d) === i)
                      .join(", ")} ${firstSchedule.startTime}-${firstSchedule.endTime}`
                  : "";
                const firstRoom = course.schedules.find((s) => s.room)?.room ?? "";

                return (
                  <Link
                    key={course.id}
                    href={`/teacher/courses/${course.id}`}
                    className="group bg-white rounded-3xl border border-slate-200 p-6 cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-xl relative overflow-hidden flex flex-col h-full shadow-sm"
                  >
                    {/* decorative circle */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-12 -mt-12 rounded-full transition-all group-hover:scale-150 group-hover:bg-red-50 duration-700 ease-out pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col h-full">
                      {/* icon + sec badge */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-[#990000] group-hover:bg-[#990000] group-hover:text-white transition-all duration-500 shadow-sm ring-4 ring-red-50/50 group-hover:ring-[#990000]/10">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        {course.section && (
                          <span className="px-3 py-1 bg-[#990000] !text-white text-[10px] font-black uppercase rounded-lg border border-[#990000] shadow-md transition-transform group-hover:scale-110">
                            Sec {course.section}
                          </span>
                        )}
                      </div>

                      {/* code + name */}
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-slate-900 font-inter group-hover:text-[#990000] transition-colors tracking-tight leading-tight mb-1.5">
                          {course.code}
                        </h3>
                        <p className="text-slate-500 font-bold text-sm mb-4 line-clamp-2 leading-relaxed min-h-[2.5rem] group-hover:text-slate-600">
                          {course.name}
                        </p>

                        {/* schedule + room/semester */}
                        <div className="flex flex-col gap-1.5 mt-2 mb-5">
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500">
                            <Clock className="w-4 h-4 text-slate-400 group-hover:text-[#990000] transition-colors shrink-0" />
                            <span className="truncate">
                              {scheduleText || "ยังไม่ระบุเวลาเรียน"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500">
                            <MapPin className="w-4 h-4 text-slate-400 group-hover:text-[#990000] transition-colors shrink-0" />
                            <span className="truncate">
                              {firstRoom || "ยังไม่ระบุห้อง"}
                              <span className="mx-1.5 text-slate-300 font-light">|</span>
                              เทอม {course.semester}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* footer: students + arrow */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-xl font-bold text-slate-700 font-inter">
                            {course._count.enrollments}
                          </span>
                          <span className="text-sm font-semibold text-slate-400">คน</span>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-[#990000] group-hover:!text-white group-hover:border-[#990000] group-hover:translate-x-1.5 transition-all duration-300 shadow-sm">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* dashed "create" card — ซ่อนใน archived view */}
              {!showArchived && (
              <Link
                href="/teacher/courses/new"
                className="bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-[#990000] group transition-all duration-500 h-full min-h-[260px] shadow-sm hover:shadow-xl"
              >
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-[#990000] group-hover:border-[#990000] group-hover:scale-110 transition-all mb-4 shadow-sm">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-lg font-black text-slate-500 group-hover:text-[#990000] tracking-tight transition-colors">
                  สร้างรายวิชาใหม่
                </span>
              </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
