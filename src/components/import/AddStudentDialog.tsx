"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle, Loader2, UserPlus, X } from "lucide-react";

import {
  addStudentManually,
  type AddStudentResult,
} from "@/app/actions/roster";

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "done"; result: AddStudentResult }
  | { type: "error"; message: string };

export default function AddStudentDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<State>({ type: "idle" });
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStudentId("");
    setName("");
    setState({ type: "idle" });
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState({ type: "loading" });

    startTransition(async () => {
      try {
        const result = await addStudentManually(courseId, {
          studentId: studentId.trim(),
          name: name.trim(),
        });

        if (!result.ok) {
          setState({ type: "error", message: result.message });
          return;
        }

        setState({ type: "done", result });
        setStudentId("");
        setName("");
      } catch (error) {
        setState({
          type: "error",
          message: error instanceof Error ? error.message : "เพิ่มนักศึกษาไม่สำเร็จ",
        });
      }
    });
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center">
            <div className="my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    เพิ่มนักศึกษาทีละคน
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    ใช้เมื่อต้องการเพิ่มจากรหัสนักศึกษาและชื่อเท่านั้น
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="ปิดหน้าต่างเพิ่มนักศึกษา"
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
                    onChange={(event) => {
                      setStudentId(event.target.value);
                      setState({ type: "idle" });
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-[#990000] focus:ring-4 focus:ring-red-100"
                    placeholder="ตัวเลข 10 หลัก"
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
                      setState({ type: "idle" });
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-[#990000] focus:ring-4 focus:ring-red-100"
                    placeholder="ชื่อนักศึกษา"
                  />
                </label>

                {state.type === "error" && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {state.message}
                  </div>
                )}

                {state.type === "done" && state.result.ok && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    {state.result.status === "created" && "สร้างและลงทะเบียนสำเร็จ"}
                    {state.result.status === "enrolled_existing" &&
                      "ลงทะเบียนนักศึกษาที่มีอยู่แล้วสำเร็จ"}
                    {state.result.status === "already_enrolled" &&
                      "นักศึกษาคนนี้อยู่ในรายวิชาแล้ว"}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isPending ||
                    state.type === "loading" ||
                    studentId.trim().length === 0 ||
                    name.trim().length === 0
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#990000] py-3 text-sm font-semibold text-white transition-all hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {(isPending || state.type === "loading") && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {isPending || state.type === "loading" ? "กำลังเพิ่ม..." : "เพิ่มนักศึกษา"}
                </button>
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
        className="flex items-center gap-2 rounded-xl bg-[#990000] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-800"
      >
        <UserPlus className="h-4 w-4" />
        เพิ่มทีละคน
      </button>
      {modal}
    </>
  );
}
