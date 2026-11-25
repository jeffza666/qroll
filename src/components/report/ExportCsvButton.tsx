"use client";

import { Download } from "lucide-react";

import { buildAttendanceCsv } from "@/lib/report-csv";
import type { MatrixSession, MatrixStudent } from "./AttendanceMatrixTable";

type Props = {
  filename: string;
  sessions: MatrixSession[];
  students: MatrixStudent[];
};

export default function ExportCsvButton({ filename, sessions, students }: Props) {
  const disabled = sessions.length === 0 || students.length === 0;

  const onClick = () => {
    const csv = buildAttendanceCsv(sessions, students);
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-bold antialiased text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      aria-label={disabled ? "ยังไม่มีข้อมูลให้ส่งออก" : "ส่งออกเป็นไฟล์ CSV"}
      title={disabled ? "ยังไม่มีข้อมูลให้ส่งออก" : "ส่งออกเป็นไฟล์ CSV (เปิดใน Excel ได้)"}
    >
      <Download className="h-4 w-4" />
      ส่งออก CSV
    </button>
  );
}
