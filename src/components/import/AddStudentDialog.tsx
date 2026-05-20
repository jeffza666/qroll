"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle, Loader2, UserPlus, UserRoundCheck, X } from "lucide-react";

import {
  addStudentManually,
  type AddStudentResult,
} from "@/app/actions/roster";

type State =
  | { type: "idle" }
  | { type: "loading" }
  | {
      type: "done";
      result: AddStudentResult;
      student: { studentId: string; name: string };
    }
  | { type: "error"; message: string };

export default function AddStudentDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<State>({ type: "idle" });
  const [isPending, startTransition] = useTransition();
  const trimmedStudentId = studentId.trim();
  const showStudentIdNote = trimmedStudentId.length === 10;

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
      const nextStudent = {
        studentId: studentId.trim(),
        name: name.trim(),
      };

      try {
        const result = await addStudentManually(courseId, nextStudent);

        if (!result.ok) {
          setState({ type: "error", message: result.message });
          return;
        }

        setState({ type: "done", result, student: nextStudent });
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
            <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
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

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                {state.type !== "done" && (
                  <>
                    <label className="block space-y-2">
                      <span className="text-sm font-bold text-slate-700">
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-mono text-sm font-semibold text-slate-900 outline-none transition-colors placeholder:font-sans placeholder:text-slate-400 focus:border-qroll-red-dark focus:ring-4 focus:ring-red-100"
                        placeholder="ตัวเลข 10 หลัก"
                      />
                    </label>

                    {showStudentIdNote && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm font-medium text-amber-800">
                          * กรุณาตรวจรหัสนักศึกษาให้ถูกต้อง เนื่องจากไม่สามารถแก้ไขภายหลังได้
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          ชื่อ-นามสกุลสามารถแก้ไขภายหลังได้
                        </p>
                      </div>
                    )}

                    <label className="block space-y-2">
                      <span className="text-sm font-bold text-slate-700">
                        ชื่อ-นามสกุล
                      </span>
                      <input
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          setState({ type: "idle" });
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-qroll-red-dark focus:ring-4 focus:ring-red-100"
                        placeholder="ชื่อนักศึกษา"
                      />
                    </label>
                  </>
                )}

                {state.type === "error" && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {state.message}
                  </div>
                )}

                {state.type === "done" && state.result.ok && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      {state.result.status === "created" && "เพิ่มนักศึกษาสำเร็จ"}
                      {state.result.status === "enrolled_existing" &&
                        "เพิ่มนักศึกษาจากบัญชีเดิมสำเร็จ"}
                      {state.result.status === "already_enrolled" &&
                        "นักศึกษาคนนี้อยู่ในรายวิชาแล้ว"}
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                          <UserRoundCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            รหัสนักศึกษา
                          </p>
                          <p className="mt-1 font-mono text-base font-black text-slate-900">
                            {state.student.studentId}
                          </p>
                          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            ชื่อ-นามสกุล
                          </p>
                          <p className="mt-1 truncate text-sm font-bold text-slate-800">
                            {state.student.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {state.type === "done" ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex w-full items-center justify-center rounded-xl bg-qroll-red-dark py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/10 transition-all hover:bg-qroll-red-darker"
                  >
                    ปิด
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      isPending ||
                      state.type === "loading" ||
                      studentId.trim().length === 0 ||
                      name.trim().length === 0
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-qroll-red-dark py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/10 transition-all hover:bg-qroll-red-darker disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                  >
                    {(isPending || state.type === "loading") && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {isPending || state.type === "loading" ? "กำลังเพิ่ม..." : "เพิ่มนักศึกษา"}
                  </button>
                )}
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
        className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 antialiased shadow-sm transition-all hover:bg-slate-50"
      >
        <UserPlus className="h-4 w-4" />
        เพิ่มรายบุคคล
      </button>
      {modal}
    </>
  );
}
