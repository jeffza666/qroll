"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle, Loader2, Upload, X } from "lucide-react";

import { importRoster, type ImportResult } from "@/app/actions/roster";

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "done"; result: ImportResult }
  | { type: "error"; message: string };

export default function RosterImport({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ type: "idle" });
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function reset() {
    setState({ type: "idle" });
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

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center">
            <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Import รายชื่อ
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    รองรับไฟล์ .csv, .xlsx และ .xls ขนาดไม่เกิน 1MB
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
                <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                  <p className="mb-2 font-semibold text-slate-700">
                    คอลัมน์ที่ต้องมี
                  </p>
                  <p>
                    รหัสนักศึกษา: <code className="rounded bg-white px-1">เลขทะเบียน</code>,{" "}
                    <code className="rounded bg-white px-1">รหัสนักศึกษา</code> หรือ{" "}
                    <code className="rounded bg-white px-1">studentId</code>
                  </p>
                  <p>
                    ชื่อ: <code className="rounded bg-white px-1">ชื่อ</code>,{" "}
                    <code className="rounded bg-white px-1">ชื่อ-นามสกุล</code> หรือ{" "}
                    <code className="rounded bg-white px-1">name</code>
                  </p>
                </div>

                {state.type !== "done" && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 transition-all hover:border-[#990000]/40 hover:bg-red-50/30">
                      <Upload className="h-8 w-8 text-slate-300" />
                      <span className="text-center text-sm font-semibold text-slate-700">
                        {selectedFile?.name ?? "เลือกหรือลากไฟล์รายชื่อมาวาง"}
                      </span>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(event) => {
                          setSelectedFile(event.target.files?.[0] ?? null);
                          setState({ type: "idle" });
                        }}
                        className="hidden"
                      />
                    </label>

                    {state.type === "error" && (
                      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {state.message}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!selectedFile || isPending || state.type === "loading"}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#990000] py-3 text-sm font-semibold text-white transition-all hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {(isPending || state.type === "loading") && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {isPending || state.type === "loading"
                        ? "กำลัง Import..."
                        : "เริ่ม Import"}
                    </button>
                  </form>
                )}

                {state.type === "done" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-emerald-600">
                      <CheckCircle className="h-5 w-5" />
                      Import สำเร็จ
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <SummaryTile label="สร้างใหม่" value={state.result.created} tone="emerald" />
                      <SummaryTile
                        label="ลงทะเบียน"
                        value={state.result.enrolledExisting}
                        tone="slate"
                      />
                      <SummaryTile
                        label="ข้าม"
                        value={state.result.skippedAlreadyEnrolled}
                        tone="slate"
                      />
                      <SummaryTile
                        label="ผิดพลาด"
                        value={state.result.errors.length}
                        tone="red"
                      />
                    </div>

                    {state.result.errors.length > 0 && (
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-red-50 p-4">
                        <p className="mb-2 text-xs font-semibold text-red-700">
                          แถวที่มีปัญหา
                        </p>
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
                      className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200"
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
        className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
      >
        <Upload className="h-4 w-4 text-slate-500" />
        Import รายชื่อ
      </button>
      {modal}
    </>
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
  const styles = {
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-50 text-slate-500",
  }[tone];

  return (
    <div className={`rounded-xl p-3 ${styles}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-slate-600">{label}</p>
    </div>
  );
}
