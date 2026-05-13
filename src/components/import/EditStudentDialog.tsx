"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle, Loader2, Pencil, X } from "lucide-react";

import { updateStudentName } from "@/app/actions/roster";

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "done" }
  | { type: "error"; message: string };

type Props = {
  enrollmentId: string;
  studentId: string; // 10-digit (display only — disabled in form)
  currentName: string;
};

/**
 * Dialog แก้ไขข้อมูลนักศึกษา
 *
 * แก้ได้แค่ name — studentId disabled (immutable identity)
 */
export default function EditStudentDialog({
  enrollmentId,
  studentId,
  currentName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [state, setState] = useState<State>({ type: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setOpen(false);
    setName(currentName);
    setState({ type: "idle" });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState({ type: "loading" });

    startTransition(async () => {
      const result = await updateStudentName(enrollmentId, { name: name.trim() });

      if (!result.ok) {
        setState({ type: "error", message: result.message });
        return;
      }

      setState({ type: "done" });
      // ปิด dialog หลัง 0.8s เพื่อให้ user เห็น success state
      setTimeout(() => setOpen(false), 800);
    });
  }

  const hasChanges = name.trim() !== currentName && name.trim().length > 0;

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
            onClick={handleClose}
          >
            <div
              className="my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    แก้ไขข้อมูลนักศึกษา
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    แก้ไขชื่อได้ — รหัสนักศึกษาไม่สามารถเปลี่ยนได้
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    รหัสนักศึกษา
                  </span>
                  <input
                    value={studentId}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold text-slate-500"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    ชื่อ-นามสกุล
                  </span>
                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (state.type !== "idle") setState({ type: "idle" });
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-[#990000] focus:ring-4 focus:ring-red-100"
                    placeholder="ชื่อนักศึกษา"
                    autoFocus
                  />
                </label>

                {state.type === "error" && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {state.message}
                  </div>
                )}

                {state.type === "done" && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    บันทึกสำเร็จ
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isPending ||
                      state.type === "loading" ||
                      state.type === "done" ||
                      !hasChanges
                    }
                    className="flex items-center gap-2 rounded-xl bg-[#990000] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {(isPending || state.type === "loading") && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {isPending || state.type === "loading"
                      ? "กำลังบันทึก..."
                      : "บันทึกข้อมูล"}
                  </button>
                </div>
              </form>
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
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
      >
        <Pencil className="h-4 w-4" />
        แก้ไข
      </button>
      {modal}
    </>
  );
}
