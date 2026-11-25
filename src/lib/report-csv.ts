export type CsvStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export type CsvStudent = {
  studentId: string | null;
  name: string;
  cells: (CsvStatus | null)[];
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  pct: number | null;
};

const STATUS_TEXT: Record<CsvStatus, string> = {
  PRESENT: "มา",
  LATE: "สาย",
  ABSENT: "ขาด",
  EXCUSED: "ลา",
};

export function escapeCsvCell(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildAttendanceCsv(
  sessions: readonly { label: string }[],
  students: readonly CsvStudent[],
) {
  const headers = [
    "ลำดับ",
    "รหัสนักศึกษา",
    "ชื่อ-สกุล",
    ...sessions.map((session) => session.label),
    "มา",
    "สาย",
    "ขาด",
    "ลา",
    "% เข้าเรียน",
  ];

  const rows = students.map((student, index) => [
    index + 1,
    student.studentId ?? "-",
    student.name,
    ...student.cells.map((cell) => (cell ? STATUS_TEXT[cell] : "-")),
    student.presentCount,
    student.lateCount,
    student.absentCount,
    student.excusedCount,
    student.pct !== null ? `${student.pct}%` : "-",
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}
