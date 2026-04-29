"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setState({ type: "idle" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    const fd = new FormData();
    fd.append("file", selectedFile);

    setState({ type: "loading" });
    startTransition(async () => {
      try {
        const result = await importRoster(courseId, fd);
        setState({ type: "done", result });
      } catch (err) {
        setState({
          type: "error",
          message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
        });
      }
    });
  }

  function handleClose() {
    setOpen(false);
    setState({ type: "idle" });
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center">
          <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Import รายชื่อนักศึกษา</h2>
                <p className="text-xs text-slate-500 mt-0.5">รองรับไฟล์ .csv และ .xlsx ขนาดไม่เกิน 1MB</p>
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-6">
              {/* Column guide */}
              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700 mb-2">คอลัมน์ที่ต้องมีในไฟล์:</p>
                <p>• <code className="bg-white px-1 rounded">รหัสนักศึกษา</code> หรือ <code className="bg-white px-1 rounded">studentId</code> — เลข 10 หลัก</p>
                <p>• <code className="bg-white px-1 rounded">อีเมล</code> หรือ <code className="bg-white px-1 rounded">email</code> — @dome.tu.ac.th</p>
                <p>• <code className="bg-white px-1 rounded">ชื่อ-สกุล</code> หรือ <code className="bg-white px-1 rounded">name</code></p>
              </div>

              {state.type !== "done" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Dropzone */}
                  <label className="flex flex-col items-center justify-center gap-3 px-4 py-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#990000]/40 hover:bg-red-50/30 transition-all">
                    <Upload className="w-8 h-8 text-slate-300" />
                    {selectedFile ? (
                      <span className="text-sm font-semibold text-slate-700">{selectedFile.name}</span>
                    ) : (
                      <span className="text-sm text-slate-500">คลิกหรือลากไฟล์มาวางที่นี่</span>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {state.type === "error" && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {state.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedFile || isPending || state.type === "loading"}
                    className="w-full py-3 text-sm font-semibold text-white bg-[#990000] rounded-xl hover:bg-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {(isPending || state.type === "loading") && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isPending || state.type === "loading" ? "กำลัง Import..." : "เริ่ม Import"}
                  </button>
                </form>
              )}

              {/* Result summary */}
              {state.type === "done" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    Import เสร็จสิ้น
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-emerald-600">{state.result.ok}</p>
                      <p className="text-xs text-slate-600 mt-0.5">เพิ่มใหม่</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-slate-500">{state.result.skippedExisting}</p>
                      <p className="text-xs text-slate-600 mt-0.5">ซ้ำ (ข้าม)</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-red-600">{state.result.errors.length}</p>
                      <p className="text-xs text-slate-600 mt-0.5">ผิดพลาด</p>
                    </div>
                  </div>

                  {state.result.errors.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4 max-h-40 overflow-y-auto space-y-1">
                      <p className="text-xs font-semibold text-red-700 mb-2">แถวที่มีปัญหา:</p>
                      {state.result.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600">
                          แถว {e.row}: {e.reason}
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    ปิด
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
          document.body,
        )
      : null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
      >
        <Upload className="w-4 h-4 text-slate-500" />
        Import รายชื่อ
      </button>

      {modal}

    </>
  );
}
