import { CheckCircle2, Clock, History as HistoryIcon, XCircle } from "lucide-react";
import Link from "next/link";

import AttendanceRow from "@/components/student/AttendanceRow";
import PageHeader from "@/components/shell/PageHeader";
import { requireStudent } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function StudentHistoryPage() {
  const user = await requireStudent();

  const attendances = await db.attendance.findMany({
    where: { studentId: user.id },
    orderBy: { checkedInAt: "desc" },
    include: {
      classSession: {
        select: {
          startsAt: true,
          roomSnapshot: true,
          schedule: { select: { room: true } },
          course: { select: { code: true, name: true } },
        },
      },
    },
  });

  const total = attendances.length;
  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const late = attendances.filter((a) => a.status === "LATE").length;
  const absent = attendances.filter((a) => a.status === "ABSENT").length;

  return (
    <>
      <PageHeader>
        <div className="min-w-0">
          <h1 className="truncate font-inter text-2xl font-black text-slate-900">ประวัติเข้าเรียน</h1>
          <p className="truncate text-sm text-slate-500">{total} รายการ</p>
        </div>
      </PageHeader>

      <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
        <div className="animate-fade-in pb-8">
          {total > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/20">
                    <HistoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">ทั้งหมด</p>
                    <p className="font-inter text-2xl font-black text-slate-800">{total}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">ทันเวลา</p>
                    <p className="font-inter text-2xl font-black text-emerald-700">{present}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">มาสาย</p>
                    <p className="font-inter text-2xl font-black text-amber-700">{late}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-500/20">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">ขาด</p>
                    <p className="font-inter text-2xl font-black text-red-700">{absent}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden border-b border-slate-100 px-6 py-5">
              <div className="absolute top-0 left-0 h-full w-1.5 bg-qroll-red-dark" />
              <div className="flex items-center gap-3 pl-2">
                <HistoryIcon className="h-5 w-5 text-slate-400" />
                <h2 className="font-inter text-xl font-black text-slate-800">
                  ประวัติทั้งหมด{" "}
                  <span className="ml-1 font-medium text-slate-400">(All Check-ins)</span>
                </h2>
              </div>
            </div>

            {total === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-slate-400">
                <Clock className="mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-semibold">ยังไม่มีประวัติเข้าเรียน</p>
                <Link
                  href="/student"
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  กลับหน้าหลัก
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attendances.map((attendance) => (
                  <AttendanceRow
                    key={attendance.id}
                    status={attendance.status}
                    checkedInAt={attendance.checkedInAt}
                    sessionStartsAt={attendance.classSession.startsAt}
                    courseCode={attendance.classSession.course.code}
                    courseName={attendance.classSession.course.name}
                    room={
                      attendance.classSession.roomSnapshot ??
                      attendance.classSession.schedule?.room ??
                      null
                    }
                    distanceM={attendance.distanceM}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
