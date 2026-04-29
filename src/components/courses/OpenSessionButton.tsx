"use client";

import { useTransition } from "react";
import { QrCode } from "lucide-react";
import { openSession } from "@/app/actions/session";

type Props = { scheduleId: string };

export default function OpenSessionButton({ scheduleId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    startTransition(async () => {
      const result = await openSession(scheduleId);
      // result จะมีค่าเฉพาะตอน error — กรณี success จะ redirect ที่ server
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      onClick={handleOpen}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
    >
      <QrCode className="w-3.5 h-3.5" />
      {isPending ? "กำลังเปิด..." : "เปิด session"}
    </button>
  );
}
