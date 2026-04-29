"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Loader2, UserRound } from "lucide-react";

import { checkInWithQrToken, type CheckInActionResult } from "@/app/actions/checkin";
import StatusPanel from "@/components/checkin/StatusPanel";

type Props = {
  token: string;
  student: {
    name: string;
    email: string;
    studentId: string | null;
  };
};

function formatBangkokTime(value: string) {
  return new Date(value).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ResultPanel({ result }: { result: CheckInActionResult }) {
  if (result.ok) {
    const title = result.duplicate
      ? "เช็คชื่อไว้แล้ว"
      : result.status === "LATE"
        ? "เช็คชื่อสำเร็จ - มาสาย"
        : "เช็คชื่อสำเร็จ";

    return (
      <StatusPanel
        tone={result.status === "LATE" ? "warning" : "success"}
        title={title}
        message={
          result.duplicate
            ? "ระบบพบข้อมูลเช็คชื่อเดิม จึงไม่บันทึกซ้ำ"
            : "ระบบบันทึกเวลาเข้าเรียนด้วยเวลาจากเซิร์ฟเวอร์แล้ว"
        }
        meta={`เวลา ${formatBangkokTime(result.checkedInAt)} น.`}
      />
    );
  }

  type FailureReason = Extract<CheckInActionResult, { ok: false }>["reason"];
  const copy: Record<FailureReason, { title: string; message: string; tone: "danger" | "warning" | "neutral" }> = {
    invalid: {
      title: "QR ไม่ถูกต้อง",
      message: "กรุณาสแกน QR จากหน้าคาบเรียนล่าสุดอีกครั้ง",
      tone: "danger",
    },
    expired: {
      title: "QR หมดอายุแล้ว",
      message: "QR เปลี่ยนทุก 30 วินาที กรุณาสแกนรอบล่าสุดบนจออาจารย์",
      tone: "warning",
    },
    closed: {
      title: "ปิดการเช็คชื่อแล้ว",
      message: "คาบเรียนนี้ไม่รับการเช็คชื่อเพิ่มเติม",
      tone: "neutral",
    },
    not_enrolled: {
      title: "ยังไม่ได้อยู่ในรายชื่อนักศึกษา",
      message: "บัญชีนี้ไม่ได้ถูก enroll ในรายวิชานี้ จึงเช็คชื่อไม่ได้",
      tone: "danger",
    },
    wrong_role: {
      title: "บัญชีนี้ไม่ใช่นักศึกษา",
      message: "กรุณาเข้าสู่ระบบด้วยบัญชีนักศึกษา",
      tone: "danger",
    },
    unauthorized: {
      title: "กรุณาเข้าสู่ระบบ",
      message: "ต้องเข้าสู่ระบบก่อนเช็คชื่อ",
      tone: "neutral",
    },
  };

  const selected = copy[result.reason];
  return <StatusPanel tone={selected.tone} title={selected.title} message={selected.message} />;
}

export default function StudentCheckInForm({ token, student }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckInActionResult | null>(null);

  const initials = useMemo(() => {
    return student.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [student.name]);

  function handleSubmit() {
    startTransition(async () => {
      const next = await checkInWithQrToken(token);
      setResult(next);
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-black text-[#990000]">
            {initials || <UserRound className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-slate-950">{student.name}</p>
            <p className="truncate text-sm text-slate-500">{student.email}</p>
            {student.studentId && (
              <p className="mt-0.5 text-xs font-bold text-slate-400">
                รหัสนักศึกษา {student.studentId}
              </p>
            )}
          </div>
        </div>
      </div>

      {result && <ResultPanel result={result} />}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || Boolean(result?.ok && !result.duplicate)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#990000] px-4 text-base font-extrabold text-white shadow-[0_14px_28px_rgba(127,29,29,0.20)] transition hover:-translate-y-px hover:bg-[#7F0000] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังเช็คชื่อ...
          </>
        ) : result?.ok && !result.duplicate ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            บันทึกแล้ว
          </>
        ) : (
          <>
            ยืนยันเข้าเรียน
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </div>
  );
}
