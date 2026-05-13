"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

import { deleteEnrollment } from "@/actions/enrollment";

type Props = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
};

/**
 * ปุ่มลบ enrollment ถาวร — ใช้ใน view "นศ. ที่ถอน" เท่านั้น
 *
 * Pattern เดียวกับ delete session: modal + acknowledge checkbox
 */
export default function DeleteEnrollmentButton({
  enrollmentId,
  studentId,
  studentName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setOpen(false);
    setAcknowledged(false);
    setError(null);
  }

  function handleDelete() {
    if (!acknowledged) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteEnrollment(enrollmentId);
      if (!result.ok) {
        const messages: Record<typeof result.reason, string> = {
          not_found: "ไม่พบข้อมูลนักศึกษา",
          forbidden: "ไม่มีสิทธิ์ลบ",
          not_dropped: "ต้องถอนก่อนถึงจะลบได้",
        };
        setError(messages[result.reason]);
        return;
      }
      handleClose();
      router.refresh();
    });
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={handleClose}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-red-50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h2 className="text-lg font-bold text-red-900">
                    ยืนยันการลบถาวร
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-bold text-slate-800">{studentName}</p>
                  <p className="font-mono text-slate-500">{studentId}</p>
                </div>

                <p className="text-sm text-slate-700">
                  ลบรายการลงทะเบียนของนศ. คนนี้
                  <strong className="font-bold text-red-700"> อย่างถาวร </strong>
                  — ไม่สามารถกู้คืนได้ ถ้าจะเพิ่มกลับต้องใช้
                  &ldquo;เพิ่มรายบุคคล&rdquo; ใหม่
                </p>

                <p className="text-xs text-slate-500">
                  หมายเหตุ: ประวัติการเช็คชื่อในคาบที่ผ่านมา (Session Reports)
                  ยังเก็บไว้ — ไม่ได้ลบ
                </p>

                <button
                  type="button"
                  onClick={() => setAcknowledged((v) => !v)}
                  disabled={isPending}
                  className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-colors disabled:opacity-50 ${
                    acknowledged
                      ? "border-red-500 bg-red-50 text-red-800"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      acknowledged
                        ? "border-red-500 bg-red-500"
                        : "border-slate-400 bg-white"
                    }`}
                  >
                    {acknowledged && (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3 w-3 text-white"
                      >
                        <path
                          d="M3 8l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span>ฉันเข้าใจว่าการลบนี้ไม่สามารถกู้คืนได้</span>
                </button>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!acknowledged || isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold !text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin !text-white" />
                  ) : (
                    <Trash2 className="h-4 w-4 !text-white" />
                  )}
                  {isPending ? "กำลังลบ..." : "ลบถาวร"}
                </button>
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
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-base font-semibold text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50 hover:ring-red-300"
      >
        <Trash2 className="h-4 w-4" />
        ลบถาวร
      </button>
      {modal}
    </>
  );
}
