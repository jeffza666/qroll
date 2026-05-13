"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Archive, ArchiveRestore, Trash2, X } from "lucide-react";

import {
  archiveCourse,
  deleteCourse,
  unarchiveCourse,
} from "@/app/actions/course";

type Props = {
  courseId: string;
  courseCode: string;
  courseName: string;
  isArchived: boolean;
  /** จำนวน ClassSession ทั้งหมด — ใช้เช็คว่า delete ได้มั้ย (ต้อง 0) */
  sessionCount: number;
};

/**
 * Course Danger Zone — 2 destructive actions
 *   - Archive/Unarchive (always available, reversible)
 *   - Delete (only if sessionCount === 0, irreversible)
 *
 * เหตุผลที่ delete ต้อง sessionCount === 0:
 * เมื่อมี session แล้ว = มีบันทึก attendance ของนักศึกษา (academic record)
 * → ไม่ควรลบ user ต้องเลือก archive แทน (ตาม LMS pattern เช่น Canvas, Moodle)
 */
export default function CourseDangerZone({
  courseId,
  courseCode,
  courseName,
  isArchived,
  sessionCount,
}: Props) {
  const router = useRouter();
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canDelete = sessionCount === 0;

  function resetModals() {
    setArchiveModalOpen(false);
    setDeleteModalOpen(false);
    setAcknowledged(false);
    setError(null);
  }

  function handleArchive() {
    startTransition(async () => {
      if (isArchived) {
        await unarchiveCourse(courseId);
      } else {
        await archiveCourse(courseId);
      }
      resetModals();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!acknowledged) return;
    startTransition(async () => {
      const result = await deleteCourse(courseId);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.push("/teacher/courses");
    });
  }

  return (
    <>
      {/* 2 actions ใน flex row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {/* Archive button */}
        <button
          onClick={() => setArchiveModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-sm transition-colors hover:bg-amber-600 hover:!text-white"
        >
          {isArchived ? (
            <>
              <ArchiveRestore className="h-4 w-4" />
              คืนสถานะวิชา
            </>
          ) : (
            <>
              <Archive className="h-4 w-4" />
              Archive วิชา
            </>
          )}
        </button>

        {/* Delete button — disabled ถ้ามี session */}
        <button
          onClick={() => canDelete && setDeleteModalOpen(true)}
          disabled={!canDelete}
          title={
            !canDelete
              ? "ลบไม่ได้: รายวิชานี้มี session แล้ว — ใช้ Archive แทน"
              : undefined
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-colors hover:bg-red-600 hover:!text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:!text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          ลบรายวิชา
        </button>
      </div>

      {/* Archive modal */}
      {archiveModalOpen && (
        <ConfirmModal
          title={isArchived ? "คืนสถานะรายวิชา" : "Archive รายวิชา"}
          tone="amber"
          icon={isArchived ? ArchiveRestore : Archive}
          courseCode={courseCode}
          courseName={courseName}
          description={
            isArchived
              ? "วิชาจะกลับมา active — เปิด session ใหม่ได้ปกติ และโผล่ใน dashboard อีกครั้ง"
              : "วิชาจะถูกซ่อนจาก dashboard และไม่สามารถเปิด session ใหม่ได้ — แต่ข้อมูลทั้งหมดยังคงอยู่และคืนสถานะได้ตลอด"
          }
          confirmLabel={isArchived ? "คืนสถานะ" : "Archive"}
          isPending={isPending}
          error={error}
          onClose={resetModals}
          onConfirm={handleArchive}
        />
      )}

      {/* Delete modal — มี checkbox acknowledge */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={resetModals}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-red-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold text-red-900">
                  ยืนยันการลบรายวิชา
                </h2>
              </div>
              <button
                onClick={resetModals}
                disabled={isPending}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-bold text-slate-800">{courseCode}</p>
                <p className="text-slate-500">{courseName}</p>
              </div>

              <p className="text-sm text-slate-700">
                การลบจะลบรายวิชา + นักศึกษาที่ลงทะเบียน + ตารางสอนทั้งหมด
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
                onClick={resetModals}
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
                <Trash2 className="h-4 w-4 !text-white" />
                {isPending ? "กำลังลบ..." : "ลบถาวร"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Modal กลาง ๆ สำหรับ archive/unarchive — ไม่ต้องมี acknowledge เพราะ reversible */
function ConfirmModal({
  title,
  tone,
  icon: Icon,
  courseCode,
  courseName,
  description,
  confirmLabel,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  tone: "amber" | "red";
  icon: React.ComponentType<{ className?: string }>;
  courseCode: string;
  courseName: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const headerBg = tone === "amber" ? "bg-amber-50" : "bg-red-50";
  const headerText = tone === "amber" ? "text-amber-900" : "text-red-900";
  const headerIcon = tone === "amber" ? "text-amber-600" : "text-red-600";
  const btnBg =
    tone === "amber" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between border-b border-slate-200 px-6 py-4 ${headerBg}`}
        >
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${headerIcon}`} />
            <h2 className={`text-lg font-bold ${headerText}`}>{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-bold text-slate-800">{courseCode}</p>
            <p className="text-slate-500">{courseName}</p>
          </div>
          <p className="text-sm text-slate-700">{description}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold !text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${btnBg}`}
          >
            {isPending ? "กำลังดำเนินการ..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
