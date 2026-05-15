"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Loader2, QrCode, X } from "lucide-react";

import { resolveEntryCode } from "@/app/actions/checkin";

type Mode = null | "scan" | "code";

function parseTokenFromQrText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const t = url.searchParams.get("t");
    if (t) return t;
  } catch {
    // not a URL — fall through
  }
  // raw token fallback (teacher screen may encode just the token)
  if (/^[A-Za-z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

function ScannerModal({ onClose, onResult }: { onClose: () => void; onResult: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !containerRef.current) return;

        const elementId = "qroll-qr-reader";
        containerRef.current.id = elementId;

        const instance = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            const token = parseTokenFromQrText(decodedText);
            if (!token) return;
            instance
              .stop()
              .catch(() => {})
              .finally(() => {
                instance.clear();
                onResult(token);
              });
          },
          () => {
            // ignore decode errors per frame
          }
        );
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? `ไม่สามารถเปิดกล้องได้: ${err.message}`
            : "ไม่สามารถเปิดกล้องได้ — ลองอนุญาตสิทธิ์กล้องในเบราว์เซอร์"
        );
      }
    })();

    return () => {
      cancelled = true;
      const inst = scannerRef.current;
      if (inst) {
        inst
          .stop()
          .catch(() => {})
          .finally(() => inst.clear());
        scannerRef.current = null;
      }
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 sm:items-center sm:justify-center">
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <p className="font-inter text-base font-black">สแกน QR Code</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
          <div ref={containerRef} className="aspect-square w-full" />
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
            {error}
          </p>
        ) : (
          <p className="text-center text-sm text-white/70">
            จัดให้ QR Code อยู่ในกรอบ — ระบบจะเช็คอัตโนมัติ
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckInLauncher() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleScannerResult(token: string) {
    setMode(null);
    router.push(`/checkin?t=${encodeURIComponent(token)}`);
  }

  function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    const clean = code.trim();
    if (!/^\d{6}$/.test(clean)) {
      setCodeError("กรอกตัวเลข 6 หลัก");
      return;
    }
    startTransition(async () => {
      const result = await resolveEntryCode(clean);
      if (result.ok) {
        router.push(`/checkin?t=${encodeURIComponent(result.token)}`);
        return;
      }
      const messages: Record<typeof result.reason, string> = {
        invalid: "รหัสไม่ถูกต้อง — ต้องเป็นตัวเลข 6 หลัก",
        not_found: "ไม่พบคาบที่เปิดอยู่ตามรหัสนี้ — ลองตรวจอีกครั้งหรือสแกน QR แทน",
        unauthorized: "กรุณาเข้าสู่ระบบก่อนเช็คชื่อ",
        wrong_role: "บัญชีนี้ไม่ใช่นักศึกษา",
      };
      setCodeError(messages[result.reason]);
    });
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-24 bg-[#990000] p-5 sm:h-28 sm:p-6">
        <div className="absolute right-0 top-0 -mr-10 -mt-10 h-40 w-40 rounded-full bg-white opacity-5 blur-xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-32 w-32 rounded-full bg-white opacity-10 blur-lg" />
        <div className="relative z-10 flex items-center gap-2.5 text-white">
          <QrCode className="h-5 w-5 text-red-100 sm:h-6 sm:w-6" />
          <h2 className="font-inter text-lg font-black tracking-wide sm:text-xl">
            เช็คชื่อเข้าเรียน
          </h2>
        </div>
        <p className="relative z-10 mt-1 text-xs font-medium text-red-100/80 sm:text-sm">
          สแกน QR หรือกรอกรหัส 6 หลักจากหน้าจออาจารย์
        </p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMode("scan");
              setCodeError(null);
            }}
            className="font-inter group flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-[#990000] px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-red-900/20 transition-all hover:-translate-y-0.5 hover:bg-red-800 sm:text-base"
          >
            <Camera className="h-4 w-4 transition-transform group-hover:scale-110 sm:h-5 sm:w-5" />
            สแกน QR
          </button>
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "code" ? null : "code"));
              setCodeError(null);
            }}
            className={`font-inter flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-extrabold shadow-sm transition-all hover:-translate-y-0.5 sm:text-base ${
              mode === "code"
                ? "border-[#990000] bg-red-50 text-[#990000]"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
            กรอกรหัส
          </button>
        </div>

        {mode === "code" && (
          <form onSubmit={handleSubmitCode} className="animate-fade-in mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-500">รหัสเข้าเรียน (6 หลัก)</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="\d{6}"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  setCodeError(null);
                }}
                placeholder="000000"
                className="font-inter mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.5em] text-slate-900 shadow-sm outline-none transition-all focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
              />
            </label>
            {codeError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {codeError}
              </p>
            )}
            <button
              type="submit"
              disabled={isPending || code.length !== 6}
              className="font-inter flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#990000] px-4 text-sm font-extrabold text-white shadow-lg shadow-red-900/20 transition-all hover:-translate-y-px hover:bg-red-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังตรวจรหัส...
                </>
              ) : (
                <>ยืนยันรหัส</>
              )}
            </button>
          </form>
        )}
      </div>

      {mode === "scan" && (
        <ScannerModal onClose={() => setMode(null)} onResult={handleScannerResult} />
      )}
    </section>
  );
}
