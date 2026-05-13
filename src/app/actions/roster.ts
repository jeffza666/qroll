"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { rowsFromCells, type RawCell, type RosterRow } from "@/lib/roster-import";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 500;

const rosterRowSchema = z.object({
  studentId: z.string().regex(/^\d{10}$/, "รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อ"),
});

const manualStudentSchema = rosterRowSchema;

export type ImportResult = {
  created: number;
  enrolledExisting: number;
  skippedAlreadyEnrolled: number;
  errors: { row: number; reason: string }[];
};

export type AddStudentResult =
  | { ok: true; status: "created" | "enrolled_existing" | "already_enrolled" }
  | { ok: false; message: string };

async function parseCsv(buffer: ArrayBuffer): Promise<RosterRow[]> {
  const Papa = (await import("papaparse")).default;
  const candidates = ["utf-8", "windows-874"];
  let lastError: Error | null = null;

  for (const encoding of candidates) {
    try {
      const text = new TextDecoder(encoding).decode(buffer);
      const result = Papa.parse<RawCell[]>(text, {
        header: false,
        skipEmptyLines: true,
      });

      return rowsFromCells(result.data);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("ไม่สามารถอ่านไฟล์ CSV ได้");
    }
  }

  throw (
    lastError ??
    new Error("ไม่สามารถอ่านไฟล์ CSV ได้ กรุณาบันทึกไฟล์เป็น UTF-8 หรือใช้ Excel")
  );
}

async function parseExcel(buffer: ArrayBuffer): Promise<RosterRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellText: true,
    cellDates: false,
  });

  let lastError: Error | null = null;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    try {
      const cells = XLSX.utils.sheet_to_json<RawCell[]>(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
        raw: false,
      });

      const rows = rowsFromCells(cells);
      if (rows.length > 0) return rows;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("ไม่สามารถอ่านไฟล์ Excel ได้");
    }
  }

  throw (
    lastError ??
    new Error("ไม่พบข้อมูลรายชื่อที่ใช้งานได้ในทุก sheet ของไฟล์ Excel")
  );
}

async function parseFile(
  buffer: ArrayBuffer,
  filename: string
): Promise<RosterRow[]> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    return parseCsv(buffer);
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseExcel(buffer);
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
  if (file.size > MAX_FILE_SIZE) throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 5MB");

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

const updateStudentSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อ").max(200),
});

export type UpdateStudentResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "invalid"; message: string };

export async function updateStudentName(
  enrollmentId: string,
  input: z.infer<typeof updateStudentSchema>
): Promise<UpdateStudentResult> {
  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { courseId: true, studentId: true },
  });
  if (!enrollment) {
    return { ok: false, reason: "not_found", message: "ไม่พบนักศึกษา" };
  }

  try {
    await requireCourseOwner(enrollment.courseId);
  } catch {
    return { ok: false, reason: "forbidden", message: "ไม่มีสิทธิ์แก้ไข" };
  }

  await db.user.update({
    where: { id: enrollment.studentId },
    data: { name: parsed.data.name },
  });

  revalidatePath(`/teacher/courses/${enrollment.courseId}/students`);
  return { ok: true };
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
