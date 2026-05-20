"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { importRoster, type ImportResult } from "@/app/actions/roster";
import { rowsFromCells, type RawCell } from "@/lib/roster-import";

type SubmitState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "done"; result: ImportResult }
  | { type: "error"; message: string };

type PreviewState =
  | { type: "idle" }
  | { type: "loading" }
  | {
      type: "ready";
      source: "csv" | "excel";
      sheetName?: string;
      rowCount: number;
      rows: { studentId: string; name: string; sourceRow: number }[];
    }
  | { type: "error"; message: string };

type PreviewResult = Extract<PreviewState, { type: "ready" }>;

export default function RosterImport({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>({ type: "idle" });
  const [preview, setPreview] = useState<PreviewState>({ type: "idle" });
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function reset() {
    setState({ type: "idle" });
    setPreview({ type: "idle" });
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile) return;
    if (preview.type === "loading") return;
    if (preview.type === "error") {
      setState({ type: "error", message: preview.message });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setState({ type: "loading" });
    startTransition(async () => {
      try {
        const result = await importRoster(courseId, formData);
        setState({ type: "done", result });
      } catch (error) {
        setState({
          type: "error",
          message: error instanceof Error ? error.message : "Import ไม่สำเร็จ",
        });
      }
    });
  }

  async function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setState({ type: "idle" });

    if (!file) {
      setPreview({ type: "idle" });
      return;
    }

    setPreview({ type: "loading" });

    try {
      const nextPreview = await buildPreview(file);
      setPreview(nextPreview);
    } catch (error) {
      setPreview({
        type: "error",
        message: error instanceof Error ? error.message : "อ่านตัวอย่างไฟล์ไม่สำเร็จ",
      });
    }
  }

  async function handleDownloadTemplate() {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["รหัสนักศึกษา", "ชื่อ-นามสกุล"],
      ["0123456789", "สมชาย ใจดี"],
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "qroll-roster-template.xlsx");
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center">
            <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">อัปโหลดรายชื่อ</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    รองรับไฟล์ .csv, .xlsx และ .xls ขนาดไม่เกิน 5MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="ปิดหน้าต่าง Import"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto p-6">
                {state.type !== "done" && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-qroll-red-dark"
                    >
                      <Download className="h-3.5 w-3.5" />
                      ดาวน์โหลดไฟล์ตัวอย่าง
                    </button>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-xs font-semibold text-slate-700">
                        ไฟล์ต้องมีคอลัมน์อย่างน้อย 2 ช่อง
                      </p>

                      <div className="space-y-2.5">
                        <HeaderExamples
                          label="รหัสนักศึกษา"
                          values={["เลขทะเบียน", "รหัสนักศึกษา", "studentId", "studentNo", "studentCode"]}
                        />
                        <HeaderExamples
                          label="ชื่อ-นามสกุล"
                          values={["ชื่อ", "ชื่อ-นามสกุล", "name", "fullName", "fullNameTh"]}
                        />
                      </div>
                    </div>
                  </>
                )}

                {state.type !== "done" && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 transition-all hover:border-qroll-red-dark/40 hover:bg-red-50/30">
                      <Upload className="h-8 w-8 text-slate-300" />
                      <span className="text-center text-sm font-semibold text-slate-700">
                        {selectedFile?.name ?? "เลือกหรือลากไฟล์รายชื่อมาวาง"}
                      </span>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(event) => {
                          void handleFileChange(event.target.files?.[0] ?? null);
                        }}
                        className="hidden"
                      />
                    </label>

                    <PreviewPanel preview={preview} />

                    {preview.type === "ready" && (
                      <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm font-medium text-amber-800">
                          * กรุณาตรวจรหัสนักศึกษาให้ถูกต้องก่อน import เนื่องจากไม่สามารถแก้ไขภายหลังได้
                        </p>
                        <p className="text-xs text-slate-600">
                          ชื่อ-นามสกุลสามารถแก้ไขภายหลังได้
                        </p>
                      </div>
                    )}

                    {state.type === "error" && (
                      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {state.message}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        !selectedFile ||
                        isPending ||
                        state.type === "loading" ||
                        preview.type === "loading" ||
                        preview.type === "error"
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-qroll-red-dark py-3 text-sm font-semibold text-white transition-all hover:bg-qroll-red-darker disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {(isPending || state.type === "loading") && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {isPending || state.type === "loading" ? "กำลัง Import..." : "เริ่ม Import"}
                    </button>
                  </form>
                )}

                {state.type === "done" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-emerald-600">
                      <CheckCircle className="h-5 w-5" />
                      อัปโหลดสำเร็จ
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <SummaryTile label="สร้างใหม่" value={state.result.created} tone="emerald" />
                      <SummaryTile label="ลงทะเบียน" value={state.result.enrolledExisting} tone="slate" />
                      <SummaryTile label="ข้าม" value={state.result.skippedAlreadyEnrolled} tone="slate" />
                      <SummaryTile label="ผิดพลาด" value={state.result.errors.length} tone="red" />
                    </div>

                    {state.result.errors.length > 0 && (
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-red-50 p-4">
                        <p className="mb-2 text-xs font-semibold text-red-700">แถวที่มีปัญหา</p>
                        {state.result.errors.map((error) => (
                          <p
                            key={`${error.row}-${error.reason}`}
                            className="text-xs text-red-600"
                          >
                            แถว {error.row}: {error.reason}
                          </p>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full rounded-xl bg-qroll-red-dark py-3 text-sm font-semibold text-white transition-all hover:bg-qroll-red-darker"
                    >
                      ปิด
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-base font-bold !text-white antialiased shadow-md shadow-emerald-900/10 transition-all hover:bg-emerald-700"
      >
        <Upload className="h-4 w-4 !text-white" />
        อัปโหลดรายชื่อ
      </button>
      {modal}
    </>
  );
}

function HeaderExamples({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <code
            key={value}
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700"
          >
            {value}
          </code>
        ))}
      </div>
    </div>
  );
}

function PreviewPanel({ preview }: { preview: PreviewState }) {
  if (preview.type === "idle") return null;

  if (preview.type === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        กำลังอ่านตัวอย่างไฟล์...
      </div>
    );
  }

  if (preview.type === "error") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {preview.message}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FileSpreadsheet className="h-4 w-4 text-qroll-red-dark" />
          ตัวอย่างก่อน Import
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            {preview.source === "csv" ? "CSV" : "Excel"}
          </span>
          {preview.sheetName && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              sheet: {preview.sheetName}
            </span>
          )}
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            {preview.rowCount} แถว
          </span>
        </div>
      </div>

      <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full text-base">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-3 py-2">แถว</th>
              <th className="px-3 py-2">รหัสนักศึกษา</th>
              <th className="px-3 py-2">ชื่อ-นามสกุล</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={`${row.sourceRow}-${row.studentId}-${row.name}`} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500">{row.sourceRow}</td>
                <td className="px-3 py-2 font-mono text-slate-700">{row.studentId || "-"}</td>
                <td className="px-3 py-2 text-slate-700">{row.name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">เลื่อนดูข้อมูลทั้งหมด {preview.rowCount} แถวได้ในตารางนี้</p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "red" | "slate";
}) {
  const stylesByTone = {
    emerald:
      value > 0
        ? "bg-emerald-50 text-emerald-600"
        : "bg-slate-50 text-slate-400",
    red:
      value > 0
        ? "bg-red-50 text-red-600"
        : "bg-slate-50 text-slate-400",
    slate:
      value > 0
        ? "bg-slate-100 text-slate-600"
        : "bg-slate-50 text-slate-400",
  } as const;
  const styles = stylesByTone[tone];

  return (
    <div className={`rounded-xl p-3 ${styles}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className={`mt-0.5 text-xs ${value > 0 ? "text-slate-600" : "text-slate-400"}`}>{label}</p>
    </div>
  );
}

async function buildPreview(file: File): Promise<PreviewResult> {
  const lower = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (lower.endsWith(".csv")) {
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
        const rows = rowsFromCells(result.data);
        return {
          type: "ready",
          source: "csv",
          rowCount: rows.length,
          rows,
        };
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("ไม่สามารถอ่านตัวอย่างไฟล์ CSV ได้");
      }
    }

    throw (
      lastError ??
      new Error("ไม่สามารถอ่านตัวอย่างไฟล์ CSV ได้ กรุณาตรวจ encoding หรือใช้ template")
    );
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
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
        if (rows.length === 0) continue;

        return {
          type: "ready",
          source: "excel",
          sheetName,
          rowCount: rows.length,
          rows,
        };
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("ไม่สามารถอ่านตัวอย่างไฟล์ Excel ได้");
      }
    }

    throw (
      lastError ??
      new Error("ไม่พบข้อมูลรายชื่อที่ใช้งานได้ในทุก sheet ของไฟล์ Excel")
    );
  }

  throw new Error("รองรับเฉพาะไฟล์ .csv, .xlsx และ .xls");
}
