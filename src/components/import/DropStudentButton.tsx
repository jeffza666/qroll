"use client";

import { useState } from "react";
import { UserMinus } from "lucide-react";
import { dropEnrollment } from "@/actions/enrollment";

type Props = { enrollmentId: string };

export default function DropStudentButton({ enrollmentId }: Props) {
  const [isPending, setIsPending] = useState(false);

  async function handleDrop() {
    if (!confirm("ถอนนักศึกษาออกจากวิชานี้? การกระทำนี้ไม่สามารถยกเลิกได้จากหน้านี้")) return;

    setIsPending(true);
    const result = await dropEnrollment(enrollmentId);
    setIsPending(false);

    if (!result.ok) {
      alert(
        result.reason === "already_dropped"
          ? "นักศึกษาถูกถอนออกไปแล้ว"
          : "เกิดข้อผิดพลาด กรุณาลองใหม่"
      );
    }
  }

  return (
    <button
      onClick={handleDrop}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-red-50 hover:text-red-700 hover:ring-red-200 disabled:opacity-50"
    >
      <UserMinus className="h-4 w-4" />
      ถอน
    </button>
  );
}
