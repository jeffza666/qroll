"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Play, QrCode, X } from "lucide-react";
import { openSession } from "@/app/actions/session";

type Props = { courseId: string; variant?: "default" | "large" };

const QUICK_OPTIONS = [5, 10, 15];

export default function OpenSessionButton({ courseId, variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(10);
  // "quick" = ใช้ปุ่มลัด, "custom" = พิมพ์เอง
  const [durationSource, setDurationSource] = useState<"quick" | "custom">("quick");
  const [customInput, setCustomInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [splitLate, setSplitLate] = useState(false);
  const [grace, setGrace] = useState(5);
  const [graceInput, setGraceInput] = useState("5");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    if (isPending) return;
    setOpen(false);
    setError(null);
    setDuration(10);
    setDurationSource("quick");
    setCustomInput("");
    setShowAdvanced(false);
    setSplitLate(false);
    setGrace(5);
    setGraceInput("5");
  }

  function selectQuick(m: number) {
    setDuration(m);
    setDurationSource("quick");
    setCustomInput("");
    if (grace >= m) {
      const nextGrace = Math.max(1, m - 1);
      setGrace(nextGrace);
      setGraceInput(String(nextGrace));
    }
  }

  function handleCustomInput(val: string) {
    setCustomInput(val);
    setDurationSource("custom");
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed > 0) {
      setDuration(parsed);
      if (grace >= parsed) {
        const nextGrace = Math.max(1, parsed - 1);
        setGrace(nextGrace);
        setGraceInput(String(nextGrace));
      }
    }
  }

  function handleGraceInput(val: string) {
    if (!/^\d*$/.test(val)) return;
    setGraceInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < duration) {
      setGrace(parsed);
    }
  }

  function handleGraceBlur() {
    const parsed = parseInt(graceInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setError("กรุณาระบุเวลาที่ถือว่ามาสาย");
      return;
    }

    if (parsed >= duration) {
      setError("เวลาแยกผู้มาสายต้องน้อยกว่าเวลาเปิด");
      return;
    }

    setError(null);
    setGrace(parsed);
    setGraceInput(String(parsed));
  }

  function getValidatedGraceMinutes() {
    const parsed = parseInt(graceInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setError("กรุณาระบุเวลาที่ถือว่ามาสาย");
      return null;
    }

    if (parsed >= duration) {
      setError("เวลาแยกผู้มาสายต้องน้อยกว่าเวลาเปิด");
      return null;
    }

    setGrace(parsed);
    setGraceInput(String(parsed));
    return parsed;
  }

  function handleSubmit() {
    setError(null);
    if (duration < 1 || duration > 180) {
      setError("ระยะเวลาต้องอยู่ระหว่าง 1-180 นาที");
      return;
    }
    const graceMinutes = splitLate ? getValidatedGraceMinutes() : null;
    if (splitLate && graceMinutes === null) return;

    startTransition(async () => {
      const result = await openSession({
        courseId,
        durationMinutes: duration,
        graceMinutes,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      {/* Trigger button */}
      {variant === "large" ? (
        <button
          onClick={() => setOpen(true)}
          className="group relative inline-flex items-center gap-3 px-7 py-3.5 bg-gradient-to-br from-emerald-500 to-emerald-700 !text-white rounded-2xl font-bold hover:from-emerald-600 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-900/25 hover:shadow-xl hover:shadow-emerald-900/35 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 overflow-hidden"
        >
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></span>
          <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm">
            <QrCode className="w-6 h-6 !text-white" strokeWidth={2.2} />
          </span>
          <span className="text-2xl tracking-wide !text-white">เปิดเช็คชื่อ</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 !text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
        >
          <QrCode className="w-3.5 h-3.5 !text-white" />
          เปิดเช็คชื่อ
        </button>
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={resetAndClose}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                ตั้งเวลาเปิดรับเช็คชื่อ
              </h2>
              <button
                onClick={resetAndClose}
                disabled={isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8">
              <label className="mb-4 block text-center text-sm font-bold text-slate-700">
                เวลาเปิดรับสแกน
              </label>

              {/* Quick duration buttons */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                {QUICK_OPTIONS.map((m) => {
                  const isActive = durationSource === "quick" && duration === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => selectQuick(m)}
                      className={`rounded-2xl border py-3 text-sm font-bold transition-colors ${
                        isActive
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m} นาที
                    </button>
                  );
                })}
              </div>

              {/* Custom duration input */}
              <div className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                durationSource === "custom" ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200 bg-slate-50"
              }`}>
                <span className="flex-1 text-center text-sm font-semibold text-slate-600">
                  กำหนดเอง
                </span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customInput}
                  placeholder="—"
                  onChange={(e) => handleCustomInput(e.target.value)}
                  className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-center font-inter font-bold text-slate-800 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-slate-500">นาที</span>
              </div>

              {/* Advanced toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="mb-3 flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                <span>ตัวเลือกขั้นสูง</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                />
              </button>

              {showAdvanced && (
                <div className={`mb-6 space-y-3 rounded-2xl border p-4 transition-colors ${
                  splitLate ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200 bg-slate-50/50"
                }`}>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={splitLate}
                      onChange={(e) => setSplitLate(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    แยกผู้มาสาย
                  </label>
                  <p className="text-xs text-slate-500">
                    {splitLate ? (
                      <>
                        เช็คใน {grace} นาทีแรก ={" "}
                        <span className="font-bold text-emerald-600">ทันเวลา</span>
                        {" · "}นาทีที่ {grace + 1 === duration ? duration : `${grace + 1}–${duration}`} ={" "}
                        <span className="font-bold text-amber-500">สาย</span>
                      </>
                    ) : (
                      `ทุกคนที่เช็คภายใน ${duration} นาที = ทันเวลา ไม่แยกสาย`
                    )}
                  </p>

                  {splitLate && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        ถือว่ามาสายหลังจากเปิด
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={duration - 1}
                          value={graceInput}
                          onChange={(e) => handleGraceInput(e.target.value)}
                          onBlur={handleGraceBlur}
                          className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center font-inter font-bold text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-500">นาที</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-lg font-bold !text-white shadow-lg shadow-emerald-900/20 transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                <Play className="h-5 w-5 !text-white" />
                {isPending ? "กำลังเปิด..." : "เริ่มเปิดรับเช็คชื่อ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
