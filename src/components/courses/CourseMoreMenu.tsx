"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Info,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";

import { archiveCourse, deleteCourse, unarchiveCourse } from "@/app/actions/course";

type Props = {
  courseId: string;
  courseCode: string;
  courseName: string;
  isArchived: boolean;
  sessionCount: number;
};

export default function CourseMoreMenu({
  courseId,
  courseCode,
  courseName,
  isArchived,
  sessionCount,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const canDelete = sessionCount === 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function resetModal() {
    setArchiveOpen(false);
    setDeleteOpen(false);
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
      resetModal();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!acknowledged) return;
    startTransition(async () => {
      const result = await deleteCourse(courseId);
      if ("error" in result && result.error) { setError(result.error); return; }
      router.push("/teacher/courses");
    });
  }

  return (
    <>
      <div className="absolute top-5 right-5" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900"
          title="ตัวเลือก"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <Link
              href={`/teacher/courses/${courseId}/edit`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4 text-slate-400" />
              แก้ไขรายวิชา
            </Link>
            <div className="my-1 h-px bg-slate-100" />
            <button
              type="button"
              onClick={() => { setMenuOpen(false); setArchiveOpen(true); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50"
            >
              {isArchived
                ? <ArchiveRestore className="h-4 w-4" />
                : <Archive className="h-4 w-4" />}
              {isArchived ? "คืนสถานะวิชา" : "เก็บเข้าคลัง"}
            </button>
            <button
              type="button"
              onClick={() => canDelete && (setMenuOpen(false), setDeleteOpen(true))}
              disabled={!canDelete}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              ลบรายวิชา
            </button>
            {!canDelete && (
              <div className="mx-3 mb-2 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                มี {sessionCount} session — ไม่สามารถลบได้ ใช้ &ldquo;เก็บเข้าคลัง&rdquo; แทน
              </div>
            )}
          </div>
        )}
      </div>

      {/* Archive modal */}
      {archiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={resetModal}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50 px-6 py-4">
              <div className="flex items-center gap-2">
                {isArchived ? <ArchiveRestore className="h-5 w-5 text-amber-600" /> : <Archive className="h-5 w-5 text-amber-600" />}
                <h2 className="text-lg font-bold text-amber-900">
                  {isArchived ? "คืนสถานะรายวิชา" : "เก็บเข้าคลัง"}
                </h2>
              </div>
              <button onClick={resetModal} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-bold text-slate-800">{courseCode}</p>
                <p className="text-slate-500">{courseName}</p>
              </div>
              <p className="text-sm text-slate-700">
                {isArchived
                  ? "วิชาจะกลับมา active — เปิด session ใหม่ได้ปกติ"
                  : "วิชาจะถูกซ่อนจาก dashboard และไม่สามารถเปิด session ใหม่ได้ — แต่ข้อมูลทั้งหมดยังคงอยู่และคืนสถานะได้ตลอด"}
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button onClick={resetModal} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50">ยกเลิก</button>
              <button onClick={handleArchive} disabled={isPending} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60">
                {isPending ? "กำลังดำเนินการ..." : isArchived ? "คืนสถานะ" : "เก็บเข้าคลัง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={resetModal}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-red-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold text-red-900">ยืนยันการลบรายวิชา</h2>
              </div>
              <button onClick={resetModal} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-bold text-slate-800">{courseCode}</p>
                <p className="text-slate-500">{courseName}</p>
              </div>
              <p className="text-sm text-slate-700">
                การลบจะลบรายวิชา + ข้อมูลนักศึกษาทั้งหมด
                <strong className="font-bold text-red-700"> อย่างถาวร </strong>— ไม่สามารถกู้คืนได้
              </p>
              <button
                type="button"
                onClick={() => setAcknowledged((v) => !v)}
                disabled={isPending}
                className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-colors disabled:opacity-50 ${acknowledged ? "border-red-500 bg-red-50 text-red-800" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${acknowledged ? "border-red-500 bg-red-500" : "border-slate-400 bg-white"}`}>
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
              <button onClick={resetModal} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50">ยกเลิก</button>
              <button onClick={handleDelete} disabled={!acknowledged || isPending} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
                <Trash2 className="h-4 w-4" />
                {isPending ? "กำลังลบ..." : "ลบถาวร"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
