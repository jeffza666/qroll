"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, UserRound } from "lucide-react";

import {
  demoCheckInWithQrToken,
  type DemoCheckInActionResult,
} from "@/app/actions/checkin";
import StatusPanel from "@/components/checkin/StatusPanel";

type Props = {
  token: string;
};

function formatBangkokTime(value: string) {
  return new Date(value).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ResultPanel({ result }: { result: DemoCheckInActionResult }) {
  if (result.ok) {
    return (
      <StatusPanel
        tone="success"
        title="Demo check-in สำเร็จ"
        message={`${result.displayName} ถูกบันทึกในตาราง DemoCheckIn แล้ว`}
        meta={`เวลา ${formatBangkokTime(result.checkedInAt)} น.`}
      />
    );
  }

  type FailureReason = Extract<DemoCheckInActionResult, { ok: false }>["reason"];
  const copy: Record<FailureReason, { title: string; message: string; tone: "danger" | "warning" | "neutral" }> = {
    disabled: {
      title: "Demo mode ปิดอยู่",
      message: "การเช็คชื่อแบบ demo ต้องเปิด DEMO_CHECKIN_ENABLED ก่อน",
      tone: "neutral",
    },
    invalid: {
      title: "QR ไม่ถูกต้อง",
      message: "กรุณาสแกน QR ล่าสุดอีกครั้ง",
      tone: "danger",
    },
    expired: {
      title: "QR หมดอายุแล้ว",
      message: "QR เปลี่ยนทุก 30 วินาที กรุณาสแกนรอบล่าสุด",
      tone: "warning",
    },
    closed: {
      title: "ปิดการเช็คชื่อแล้ว",
      message: "คาบเรียนนี้ไม่รับ demo check-in เพิ่ม",
      tone: "neutral",
    },
    validation: {
      title: "ข้อมูลยังไม่ครบ",
      message: result.message ?? "กรุณากรอกชื่อก่อนเช็คชื่อ",
      tone: "warning",
    },
  };

  const selected = copy[result.reason];
  return <StatusPanel tone={selected.tone} title={selected.title} message={selected.message} />;
}

export default function DemoCheckInForm({ token }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [result, setResult] = useState<DemoCheckInActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const next = await demoCheckInWithQrToken(token, displayName);
      setResult(next);
      if (next.ok) setDisplayName("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="displayName" className="text-sm font-extrabold text-slate-700">
          ชื่อสำหรับ demo
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="h-12 w-full rounded-xl border-[1.5px] border-slate-200 bg-white py-3 pl-11 pr-4 text-[15px] text-slate-900 outline-none transition focus:border-[#990000] focus:ring-4 focus:ring-red-900/10"
            placeholder="พิมพ์ชื่อของคุณ"
            maxLength={80}
          />
        </div>
      </div>

      {result && <ResultPanel result={result} />}

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#990000] px-4 text-base font-extrabold text-white shadow-[0_14px_28px_rgba(127,29,29,0.20)] transition hover:-translate-y-px hover:bg-[#7F0000] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังบันทึก...
          </>
        ) : result?.ok ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            บันทึกอีกชื่อ
          </>
        ) : (
          <>
            Check in demo
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </form>
  );
}
