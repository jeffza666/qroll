import { BookOpen, Clock, History, QrCode } from "lucide-react";

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

export default async function StudentHomePage() {
  const user = await requireStudent();

  const [enrollmentCount, recentAttendances] = await Promise.all([
    db.enrollment.count({ where: { studentId: user.id } }),
    db.attendance.findMany({
      where: { studentId: user.id },
      orderBy: { checkedInAt: "desc" },
      take: 5,
      include: {
        classSession: {
          include: {
            course: { select: { code: true, name: true } },
          },
        },
      },
    }),
  ]);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md lg:px-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800">หน้าหลักนักศึกษา</h1>
          <p className="text-sm text-slate-500">สแกน QR จากอาจารย์เพื่อเช็คชื่อเข้าเรียน</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#990000] text-white shadow-[0_10px_24px_rgba(127,29,29,0.18)]">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-950">พร้อมเช็คชื่อ</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  เมื่อสแกน QR ระบบจะแสดงรายวิชาและข้อมูลบัญชีของคุณก่อนกดยืนยัน
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-[#990000]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">วิชาที่ลงเรียน</p>
                <p className="text-3xl font-black tabular-nums text-slate-950">
                  {enrollmentCount}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <History className="h-5 w-5 text-slate-400" />
            <h2 className="text-base font-bold text-slate-800">ประวัติเช็คชื่อล่าสุด</h2>
          </div>

          {recentAttendances.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              <Clock className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">ยังไม่มีประวัติเช็คชื่อ</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAttendances.map((attendance) => (
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
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {attendance.status === "LATE" ? "มาสาย" : "ทันเวลา"}
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
