"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_ROWS = 500;

const rosterRowSchema = z.object({
  studentId: z
    .string()
    .regex(/^\d{10}$/, "รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อ"),
});

const manualStudentSchema = rosterRowSchema;

type RosterRow = z.infer<typeof rosterRowSchema> & {
  sourceRow: number;
};

type RawCell = string | number | boolean | null | undefined;

export type ImportResult = {
  created: number;
  enrolledExisting: number;
  skippedAlreadyEnrolled: number;
  errors: { row: number; reason: string }[];
};

export type AddStudentResult =
  | { ok: true; status: "created" | "enrolled_existing" | "already_enrolled" }
  | { ok: false; message: string };

function normalizeHeaderKey(value: RawCell): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_.\-()]/g, "");
}

function normalizeCell(value: RawCell): string {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value.toFixed(0);
  }

  return String(value ?? "").trim().replace(/\.0$/, "");
}

function columnKind(value: RawCell): "studentId" | "name" | null {
  const key = normalizeHeaderKey(value);

  if (
    [
      "studentid",
      "id",
      "รหัสนักศึกษา",
      "เลขทะเบียน",
      "เลขที่",
      "รหัสประจำตัว",
      "รหัสประจำตัวนักศึกษา",
    ].includes(key)
  ) {
    return "studentId";
  }

  if (
    [
      "name",
      "fullname",
      "studentname",
      "ชื่อ",
      "ชื่อสกุล",
      "ชื่อนามสกุล",
      "ชื่อ-นามสกุล",
    ].includes(key)
  ) {
    return "name";
  }

  return null;
}

function findHeader(cells: RawCell[][]) {
  for (let rowIndex = 0; rowIndex < cells.length; rowIndex++) {
    const mapping = new Map<"studentId" | "name", number>();

    cells[rowIndex].forEach((cell, colIndex) => {
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

function rowsFromCells(cells: RawCell[][]): RosterRow[] {
  const header = findHeader(cells);
  if (!header) {
    throw new Error("ไม่พบคอลัมน์รหัสนักศึกษาและชื่อในไฟล์");
  }

  return cells
    .slice(header.rowIndex + 1)
    .map((row, index) => ({
      studentId: normalizeCell(row[header.studentIdColumn]),
      name: normalizeCell(row[header.nameColumn]),
      sourceRow: header.rowIndex + index + 2,
    }))
    .filter((row) => row.studentId || row.name);
}

async function parseFile(
  buffer: ArrayBuffer,
  filename: string
): Promise<RosterRow[]> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    const Papa = (await import("papaparse")).default;
    const text = new TextDecoder("utf-8").decode(buffer);
    const result = Papa.parse<RawCell[]>(text, {
      header: false,
      skipEmptyLines: true,
    });
    return rowsFromCells(result.data);
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const cells = XLSX.utils.sheet_to_json<RawCell[]>(ws, {
      header: 1,
      defval: "",
      blankrows: false,
    });
    return rowsFromCells(cells);
  }

  throw new Error("รองรับเฉพาะไฟล์ .csv, .xlsx และ .xls");
}

async function enrollStudent(
  courseId: string,
  data: z.infer<typeof rosterRowSchema>
): Promise<"created" | "enrolled_existing" | "already_enrolled"> {
  return db.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { studentId: data.studentId },
      select: { id: true, role: true },
    });

    if (existingUser && existingUser.role !== Role.STUDENT) {
      throw new Error("รหัสนักศึกษานี้ผูกกับบัญชีที่ไม่ใช่นักศึกษา");
    }

    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          email: null,
          name: data.name,
          studentId: data.studentId,
          role: Role.STUDENT,
        },
        select: { id: true },
      }));

    const existingEnrollment = await tx.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
      select: { id: true },
    });

    if (existingEnrollment) return "already_enrolled";

    await tx.enrollment.create({
      data: { studentId: user.id, courseId },
    });

    return existingUser ? "enrolled_existing" : "created";
  });
}

export async function importRoster(
  courseId: string,
  formData: FormData
): Promise<ImportResult> {
  await requireCourseOwner(courseId);

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("กรุณาเลือกไฟล์");
  if (file.size > MAX_FILE_SIZE) throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 1MB");

  const rawRows = await parseFile(await file.arrayBuffer(), file.name);
  if (rawRows.length > MAX_ROWS) {
    throw new Error(`ไฟล์มีข้อมูลเกิน ${MAX_ROWS} แถว`);
  }

  const result: ImportResult = {
    created: 0,
    enrolledExisting: 0,
    skippedAlreadyEnrolled: 0,
    errors: [],
  };

  for (const row of rawRows) {
    const parsed = rosterRowSchema.safeParse(row);
    if (!parsed.success) {
      result.errors.push({
        row: row.sourceRow,
        reason: parsed.error.issues[0]?.message ?? "ข้อมูลแถวนี้ไม่ถูกต้อง",
      });
      continue;
    }

    try {
      const status = await enrollStudent(courseId, parsed.data);
      if (status === "created") result.created++;
      if (status === "enrolled_existing") result.enrolledExisting++;
      if (status === "already_enrolled") result.skippedAlreadyEnrolled++;
    } catch (error) {
      result.errors.push({
        row: row.sourceRow,
        reason: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
      });
    }
  }

  revalidatePath(`/teacher/courses/${courseId}`);
  return result;
}

export async function addStudentManually(
  courseId: string,
  input: z.infer<typeof manualStudentSchema>
): Promise<AddStudentResult> {
  await requireCourseOwner(courseId);

  const parsed = manualStudentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "ข้อมูลนักศึกษาไม่ถูกต้อง",
    };
  }

  try {
    const status = await enrollStudent(courseId, parsed.data);
    revalidatePath(`/teacher/courses/${courseId}`);
    return { ok: true, status };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
    };
  }
}
