export type RawCell = string | number | boolean | null | undefined;

export type RosterRow = {
  studentId: string;
  name: string;
  sourceRow: number;
};

export type HeaderMatch = {
  rowIndex: number;
  studentIdColumn: number;
  nameColumn: number;
};

const STUDENT_ID_HEADER_KEYS = [
  "studentid",
  "id",
  "studentcode",
  "studentno",
  "รหัสนักศึกษา",
  "เลขทะเบียน",
  "เลขที่",
  "รหัสประจำตัว",
  "รหัสประจำตัวนักศึกษา",
];

const NAME_HEADER_KEYS = [
  "name",
  "fullname",
  "studentname",
  "fullnameth",
  "namesurname",
  "ชื่อ",
  "ชื่อสกุล",
  "ชื่อนามสกุล",
  "ชื่อ-นามสกุล",
];

export function normalizeHeaderKey(value: RawCell): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_.\-()]/g, "");
}

export function normalizeCell(value: RawCell): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) return value.toFixed(0);
    return String(value);
  }

  return String(value ?? "")
    .trim()
    .replace(/^'+/, "")
    .replace(/\.0$/, "");
}

export function normalizeStudentIdCell(value: RawCell): string {
  return normalizeCell(value).replace(/\s+/g, "");
}

export function normalizeNameCell(value: RawCell): string {
  return normalizeCell(value).replace(/\s+/g, " ").trim();
}

export function columnKind(value: RawCell): "studentId" | "name" | null {
  const key = normalizeHeaderKey(value);

  if (STUDENT_ID_HEADER_KEYS.includes(key)) return "studentId";
  if (NAME_HEADER_KEYS.includes(key)) return "name";

  return null;
}

export function findHeader(cells: RawCell[][]): HeaderMatch | null {
  for (let rowIndex = 0; rowIndex < cells.length; rowIndex++) {
    const mapping = new Map<"studentId" | "name", number>();

    cells[rowIndex]?.forEach((cell, colIndex) => {
      const kind = columnKind(cell);
      if (kind && !mapping.has(kind)) mapping.set(kind, colIndex);
    });

    const studentIdColumn = mapping.get("studentId");
    const nameColumn = mapping.get("name");

    if (studentIdColumn !== undefined && nameColumn !== undefined) {
      return { rowIndex, studentIdColumn, nameColumn };
    }
  }

  return null;
}

export function rowsFromCells(cells: RawCell[][]): RosterRow[] {
  const header = findHeader(cells);
  if (!header) {
    throw new Error("ไม่พบคอลัมน์รหัสนักศึกษาและชื่อในไฟล์");
  }

  return cells
    .slice(header.rowIndex + 1)
    .map((row, index) => ({
      studentId: normalizeStudentIdCell(row?.[header.studentIdColumn]),
      name: normalizeNameCell(row?.[header.nameColumn]),
      sourceRow: header.rowIndex + index + 2,
    }))
    .filter((row) => row.studentId || row.name);
}
