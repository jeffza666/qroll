"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock, UsersRound } from "lucide-react";

export type AttendanceListItem = {
  id: string;
  name: string;
  studentId: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  checkedInAt: string;
};

export type DemoCheckInListItem = {
  id: string;
  displayName: string;
  checkedInAt: string;
};

type Props = {
  sessionId: string;
  initialAttendanceCount: number;
  initialDemoCount: number;
  initialAttendances: AttendanceListItem[];
  initialDemoCheckIns: DemoCheckInListItem[];
  demoEnabled: boolean;
  demoUrl: string | null;
  demoQrDataUrl: string | null;
  totalEnrolled: number;
  onAttendanceCountChange?: (count: number) => void;
};

type CheckInsResponse = {
  attendanceCount: number;
  demoCount: number;
  attendances: AttendanceListItem[];
  demoCheckIns: DemoCheckInListItem[];
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StatusBadge({ status }: { status: AttendanceListItem["status"] }) {
  const label =
    status === "LATE" ? "สาย" :
    status === "ABSENT" ? "ขาด" :
    status === "EXCUSED" ? "ลา" : "ทันเวลา";
  const tone =
    status === "LATE" ? "bg-amber-50 text-amber-700 ring-amber-200" :
    status === "ABSENT" ? "bg-red-50 text-red-700 ring-red-200" :
    status === "EXCUSED" ? "bg-blue-50 text-blue-700 ring-blue-200" :
    "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <span className={`rounded-md px-2 py-1 text-[11px] font-bold ring-1 ${tone}`}>
      {label}
    </span>
  );
}

export default function CheckedInSidebar({
  sessionId,
  initialAttendanceCount,
  initialDemoCount,
  initialAttendances,
  initialDemoCheckIns,
  demoEnabled,
  demoUrl,
  demoQrDataUrl,
  totalEnrolled,
  onAttendanceCountChange,
}: Props) {
  const [attendanceCount, setAttendanceCount] = useState(initialAttendanceCount);
  const [demoCount, setDemoCount] = useState(initialDemoCount);
  const [attendances, setAttendances] = useState(initialAttendances);
  const [demoCheckIns, setDemoCheckIns] = useState(initialDemoCheckIns);
  const attendancePct =
    totalEnrolled > 0 ? Math.round((attendanceCount / totalEnrolled) * 100) : 0;

  useEffect(() => {
    let cancelled = false;

    async function fetchCheckIns() {
      const response = await fetch(`/api/sessions/${sessionId}/checkins`, {
        cache: "no-store",
      });
      if (!response.ok || cancelled) return;

      const data = (await response.json()) as CheckInsResponse;
      setAttendanceCount(data.attendanceCount);
      onAttendanceCountChange?.(data.attendanceCount);
      setDemoCount(data.demoCount);
      setAttendances(data.attendances);
      setDemoCheckIns(data.demoCheckIns);
    }

    const timer = window.setInterval(() => {
      void fetchCheckIns();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionId, onAttendanceCountChange]);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-white/80 px-6 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
          <UsersRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">เช็คชื่อจริง</p>
          <p className="text-3xl font-black tabular-nums text-slate-950">
            <span className="text-emerald-600">{attendanceCount}</span> / {totalEnrolled} ({attendancePct}%)
          </p>
          <p className="text-xs font-black tabular-nums text-slate-950">
            ยังไม่เช็คชื่อ {totalEnrolled - attendanceCount} คน
          </p>
        </div>
      </div>

      <section className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-sm font-bold text-slate-900">รายชื่อนักศึกษาล่าสุด</p>
        <div className="mt-4 space-y-3">
          {attendances.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
              ยังไม่มีนักศึกษาเช็คชื่อ
            </p>
          ) : (
            attendances.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {item.studentId ?? "ไม่มีรหัสนักศึกษา"} · {formatTime(item.checkedInAt)} น.
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {demoEnabled && (
        <section className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Demo check-ins</p>
              <p className="text-xs text-slate-500">แยกจาก Attendance จริง</p>
            </div>
            <p className="text-2xl font-black tabular-nums text-slate-950">{demoCount}</p>
          </div>

          {demoQrDataUrl && demoUrl && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50/60 p-3">
              <Image
                src={demoQrDataUrl}
                alt="Demo check-in QR"
                width={128}
                height={128}
                unoptimized
                className="mx-auto h-32 w-32 rounded-lg bg-white p-2"
              />
              <p className="mt-2 break-all text-center text-[11px] font-semibold text-qroll-red-dark">
                {demoUrl}
              </p>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {demoCheckIns.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                ยังไม่มี demo check-in
              </p>
            ) : (
              demoCheckIns.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-qroll-red-dark">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {item.displayName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTime(item.checkedInAt)} น.
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </aside>
  );
}
