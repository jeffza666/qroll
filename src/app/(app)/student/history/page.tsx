import { Clock } from "lucide-react";

import { requireStudent } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

function formatBangkokDateTime(date: Date) {
  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function StudentHistoryPage() {
  const user = await requireStudent();

  const attendances = await db.attendance.findMany({
    where: { studentId: user.id },
    orderBy: { checkedInAt: "desc" },
    include: {
      classSession: {
        include: { course: { select: { code: true, name: true } } },
      },
    },
  });

  return (
    <>
      <header className="sticky top-0 z-10 flex h-20 items-center border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md lg:px-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ประวัติเข้าเรียน</h1>
          <p className="text-sm text-slate-500">{attendances.length} รายการ</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {attendances.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400">
              <Clock className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">ยังไม่มีประวัติเข้าเรียน</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {attendance.classSession.course.code}
                    </p>
                    <p className="text-sm text-slate-500">
                      {attendance.classSession.course.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                        attendance.status === "LATE"
                          ? "bg-amber-50 text-amber-700"
                          : attendance.status === "ABSENT"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {attendance.status === "LATE"
                        ? "มาสาย"
                        : attendance.status === "ABSENT"
                          ? "ขาด"
                          : "ทันเวลา"}
                    </span>
                    <span className="text-slate-500">
                      {formatBangkokDateTime(attendance.checkedInAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
