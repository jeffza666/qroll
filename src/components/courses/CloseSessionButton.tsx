"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

import { closeSession } from "@/app/actions/session";

type Props = { sessionId: string };

export default function CloseSessionButton({ sessionId }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    if (!confirm("ปิด session นี้? นักศึกษาจะเช็คอินไม่ได้อีก")) {
      return;
    }

    startTransition(async () => {
      await closeSession(sessionId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClose}
      disabled={isPending}
      className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
    >
      <XCircle className="h-4 w-4" />
      {isPending ? "กำลังปิด..." : "ปิด session"}
    </button>
  );
}
