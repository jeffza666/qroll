"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";

import { deleteSession } from "@/app/actions/session";

type Props = {
  sessionId: string;
  courseCode: string;
  dayLabel: string;
  timeLabel: string;
  open: boolean;
  onClose: () => void;
};

export default function SessionDangerZone({
  sessionId,
  courseCode,
  dayLabel,
  timeLabel,
  open,
  onClose,
}: Props) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setAcknowledged(false);
    setError(null);
  }

  function handleClose() {
    if (isPending) return;
    onClose();
    reset();
  }

  function handleConfirm() {
    if (!acknowledged) return;
    startTransition(async () => {
      const result = await deleteSession(sessionId);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("courseId" in result && result.courseId) {
        router.push(`/teacher/courses/${result.courseId}?tab=schedule`);
      } else {
        router.push("/teacher");
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-red-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold text-red-900">ยืนยันการลบ Session</h2>
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
            <p className="font-bold text-slate-800">{courseCode}</p>
            <p className="text-slate-500">{dayLabel} · {timeLabel}</p>
          </div>

          <p className="text-sm text-slate-700">
            การลบจะลบบันทึกการเข้าเรียนของนักศึกษาทุกคนในคาบนี้
            <strong className="font-bold text-red-700"> อย่างถาวร </strong>
            — ไม่สามารถกู้คืนได้
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
                acknowledged ? "border-red-500 bg-red-500" : "border-slate-400 bg-white"
              }`}
            >
              {acknowledged && (
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-white">
                  <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
            onClick={handleConfirm}
            disabled={!acknowledged || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? "กำลังลบ..." : "ลบ Session ถาวร"}
          </button>
        </div>
      </div>
    </div>
  );
}
