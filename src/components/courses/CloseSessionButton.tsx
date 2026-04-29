"use client";

import { useTransition } from "react";
import { XCircle } from "lucide-react";
import { closeSession } from "@/app/actions/session";

type Props = { sessionId: string };

export default function CloseSessionButton({ sessionId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (!confirm("ปิด session นี้? นักศึกษาจะเช็คอินไม่ได้อีก")) return;
    startTransition(async () => {
      await closeSession(sessionId);
    });
  }

  return (
    <button
      onClick={handleClose}
      disabled={isPending}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
    >
      <XCircle className="w-4 h-4" />
      {isPending ? "กำลังปิด..." : "ปิด session"}
    </button>
  );
}
