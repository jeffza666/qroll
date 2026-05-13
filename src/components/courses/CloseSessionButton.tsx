"use client";

import { useTransition } from "react";
import { History, XCircle } from "lucide-react";

import { closeSession } from "@/app/actions/session";

type Props = {
  sessionId: string;
  onClosed?: () => void;
  /** หมดเวลาแล้ว (timeLeft <= 0) — เปลี่ยน label จาก "ปิด session" → "ดูประวัติคาบนี้"
   *  Action เหมือนเดิม (ปิด session) แต่ semantics ต่าง: ไม่ใช่ "ปิดก่อนเวลา"
   *  แต่เป็น "หมดแล้ว คลิกเพื่อสรุปประวัติ" */
  expired?: boolean;
};

export default function CloseSessionButton({
  sessionId,
  onClosed,
  expired = false,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    // ไม่ต้อง confirm ถ้าหมดเวลาแล้ว — แค่กำลังจะสรุปผล
    if (!expired && !confirm("ปิด session นี้? นักศึกษาจะเช็คอินไม่ได้อีก")) {
      return;
    }

    startTransition(async () => {
      await closeSession(sessionId);
      onClosed?.();
      // ไม่ทำ router.refresh() — ให้ SessionView ค้างที่ empty state
      // user ค่อยกดปุ่ม "ดูประวัติคาบนี้" เองทีหลัง
    });
  }

  const Icon = expired ? History : XCircle;
  const label = expired
    ? isPending
      ? "กำลังโหลด..."
      : "ดูประวัติคาบนี้"
    : isPending
      ? "กำลังปิด..."
      : "ปิด session";

  return (
    <button
      onClick={handleClose}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold !text-white transition-colors disabled:opacity-60 ${
        expired
          ? "bg-slate-700 hover:bg-slate-800"
          : "bg-red-600 hover:bg-red-700"
      }`}
    >
      <Icon className="h-4 w-4 !text-white" />
      {label}
    </button>
  );
}
