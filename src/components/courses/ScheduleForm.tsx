"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X, Clock, MapPin } from "lucide-react";
import { createSchedule } from "@/app/actions/schedule";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

type Props = { courseId: string };

export default function ScheduleForm({ courseId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSchedule(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setOpen(false);
      }
    });
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E3192] text-white text-sm font-semibold hover:bg-[#252680] transition-colors"
        >
          <Plus className="w-4 h-4" />
          เพิ่มตาราง
        </button>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-800">เพิ่มตารางสอน</h4>
            <button onClick={() => { setOpen(false); setError(null); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form ref={formRef} action={handleSubmit} className="space-y-4">
            <input type="hidden" name="courseId" value={courseId} />

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">วันในสัปดาห์</label>
              <select
                name="dayOfWeek"
                defaultValue="1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E3192]/30"
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  <Clock className="w-3 h-3 inline mr-1" />เวลาเริ่ม
                </label>
                <input
                  type="time"
                  name="startTime"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  <Clock className="w-3 h-3 inline mr-1" />เวลาจบ
                </label>
                <input
                  type="time"
                  name="endTime"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />ห้องเรียน (optional)
              </label>
              <input
                type="text"
                name="room"
                placeholder="เช่น SC-3001"
                maxLength={50}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]/30"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-[#2E3192] text-white text-sm font-semibold hover:bg-[#252680] transition-colors disabled:opacity-60"
              >
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
