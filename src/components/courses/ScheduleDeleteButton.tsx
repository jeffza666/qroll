"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteSchedule } from "@/app/actions/schedule";

type Props = { scheduleId: string };

export default function ScheduleDeleteButton({ scheduleId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("ลบตารางสอนนี้? (ถ้ามี session แล้วจะลบไม่ได้)")) return;
    startTransition(async () => {
      const result = await deleteSchedule(scheduleId);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="ลบตารางสอน"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
