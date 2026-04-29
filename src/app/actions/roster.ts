"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireCourseOwner } from "@/lib/auth-helpers";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_ROWS = 500;

const rowSchema = z.object({
  studentId: z
    .string()
    .regex(/^\d{10}$/, "รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก"),
  email: z
    .string()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .endsWith("@dome.tu.ac.th", "อีเมลต้องลงท้ายด้วย @dome.tu.ac.th"),
  name: z.string().min(1, "กรุณาระบุชื่อ"),
});

type RawRow = Record<string, string>;

function normalizeKey(key: string): string {
  const k = key.trim().toLowerCase();
  if (["รหัสนักศึกษา", "studentid", "student_id", "id"].includes(k)) return "studentId";
  if (["อีเมล", "email", "e-mail"].includes(k)) return "email";
  if (["ชื่อ-สกุล", "ชื่อ", "name", "fullname"].includes(k)) return "name";
  return k;
}

function normalizeRow(raw: RawRow): { studentId: string; email: string; name: string } {
  const normalized: RawRow = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[normalizeKey(k)] = String(v ?? "").trim();
  }
  return normalized as { studentId: string; email: string; name: string };
}

async function parseFile(
  buffer: ArrayBuffer,
  filename: string,
): Promise<RawRow[]> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    const Papa = (await import("papaparse")).default;
    const text = new TextDecoder("utf-8").decode(buffer);
    const result = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
    return result.data;
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });
  }

  throw new Error("รองรับเฉพาะไฟล์ .csv และ .xlsx");
}

export type ImportResult = {
  ok: number;
  skippedExisting: number;
  errors: { row: number; reason: string }[];
};

export async function importRoster(courseId: string, formData: FormData): Promise<ImportResult> {
  await requireCourseOwner(courseId);

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("ไม่พบไฟล์");
  if (file.size > MAX_FILE_SIZE) throw new Error("ไฟล์ใหญ่เกิน 1MB");

  const buffer = await file.arrayBuffer();
  let rawRows: RawRow[];

  try {
    rawRows = await parseFile(buffer, file.name);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "อ่านไฟล์ไม่สำเร็จ");
  }

  if (rawRows.length > MAX_ROWS) {
    throw new Error(`ไฟล์มีข้อมูลเกิน ${MAX_ROWS} แถว`);
  }

  let ok = 0;
  let skippedExisting = 0;
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // 1-indexed + header
    const normalized = normalizeRow(rawRows[i]);
    const parsed = rowSchema.safeParse(normalized);

    if (!parsed.success) {
      errors.push({ row: rowNum, reason: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" });
      continue;
    }

    const { studentId, email, name } = parsed.data;

    try {
      await db.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          where: { email },
          create: { email, name, studentId, role: Role.STUDENT },
          // ห้าม update role — เคารพ Phase 2 decision
          update: { name },
        });

        const existing = await tx.enrollment.findUnique({
          where: { studentId_courseId: { studentId: user.id, courseId } },
        });

        if (existing) {
          skippedExisting++;
          return;
        }

        await tx.enrollment.create({
          data: { studentId: user.id, courseId },
        });

        ok++;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ไม่ทราบสาเหตุ";
      errors.push({ row: rowNum, reason: msg });
    }
  }

  revalidatePath(`/teacher/courses/${courseId}`);
  return { ok, skippedExisting, errors };
}
