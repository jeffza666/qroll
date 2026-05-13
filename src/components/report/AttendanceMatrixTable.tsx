"use client";

import { Calendar, Check, Clock, FileText, X } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";

export type MatrixSession = {
  sessionId: string;
  label: string;
};

export type MatrixStudent = {
  enrollmentId: string;
  studentId: string | null;
  name: string;
  cells: (AttendanceStatus | null)[];
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  pct: number | null;
};

function StatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <span className="text-slate-300">—</span>;
  if (status === "PRESENT")
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-600">
        <Check className="h-3.5 w-3.5" /> มา
      </span>
    );
  if (status === "LATE")
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-100 bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-600">
        <Clock className="h-3.5 w-3.5" /> สาย
      </span>
    );
  if (status === "EXCUSED")
    return (
      <span className="inline-flex items-center gap-1 rounded border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-600">
        <FileText className="h-3.5 w-3.5" /> ลา
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded border border-red-100 bg-red-50 px-2.5 py-1 text-sm font-medium text-red-600">
      <X className="h-3.5 w-3.5" /> ขาด
    </span>
  );
}

type Props = { sessions: MatrixSession[]; students: MatrixStudent[] };

export default function AttendanceMatrixTable({ sessions, students }: Props) {
  return (
    <div className="relative max-h-[600px] overflow-auto">
      <table className="w-full whitespace-nowrap text-left text-base" style={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
        <colgroup>
          <col style={{ width: 64 }} />
          <col style={{ width: 160 }} />
          <col style={{ width: 240 }} />
          <col style={{ width: 130 }} />
          {sessions.map((s) => (
            <col key={s.sessionId} style={{ width: 120 }} />
          ))}
        </colgroup>
        <thead className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          <tr>
            <th className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-4 py-4 text-center">
              #
            </th>
            <th
              className="sticky top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-6 py-4 font-inter"
              style={{ left: 64 }}
            >
              รหัสนักศึกษา
            </th>
            <th
              className="sticky top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-6 py-4"
              style={{ left: 224 }}
            >
              ชื่อ-นามสกุล
            </th>
            <th
              className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-6 py-4 text-center"
              style={{ left: 464, boxShadow: "inset -1px 0 0 #e2e8f0" }}
            >
              % มาเรียน
            </th>
            {sessions.map((s) => (
              <th
                key={s.sessionId}
                className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-6 py-4 text-center last:border-r-0"
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{s.label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td
                colSpan={sessions.length + 4}
                className="py-12 text-center font-bold text-slate-400"
              >
                ไม่พบรายชื่อนักศึกษา
              </td>
            </tr>
          ) : (
            students.map((student, i) => (
              <tr key={student.enrollmentId} className="group transition-colors">
                <td className="sticky left-0 z-[5] border-b border-r border-slate-100 bg-white px-4 py-4 text-center font-medium text-slate-400 group-hover:bg-slate-50/50">
                  {i + 1}
                </td>
                <td
                  className="sticky z-[5] border-b border-r border-slate-100 bg-white px-6 py-4 font-inter font-medium text-slate-700 group-hover:bg-slate-50/50"
                  style={{ left: 64 }}
                >
                  {student.studentId ?? "—"}
                </td>
                <td
                  className="sticky z-[5] border-b border-r border-slate-100 bg-white px-6 py-4 font-medium text-slate-900 group-hover:bg-slate-50/50"
                  style={{ left: 224 }}
                >
                  {student.name}
                </td>
                <td
                  className="sticky z-[5] border-b border-slate-100 bg-white px-6 py-4 text-center group-hover:bg-slate-50/50"
                  style={{ left: 464, boxShadow: "inset -1px 0 0 #e2e8f0" }}
                >
                  {student.pct !== null ? (
                    <span
                      className={`font-inter font-bold ${
                        student.pct >= 80
                          ? "text-emerald-600"
                          : student.pct >= 60
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {student.pct}%
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                {student.cells.map((status, ci) => (
                  <td key={ci} className="border-b border-r border-slate-100 px-6 py-4 text-center last:border-r-0 group-hover:bg-slate-50/50">
                    <StatusBadge status={status} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
