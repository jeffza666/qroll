"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertCircle, Clock, MapPin } from "lucide-react";

import CheckedInSidebar from "@/components/sessions/CheckedInSidebar";
import type {
  AttendanceListItem,
  DemoCheckInListItem,
} from "@/components/sessions/CheckedInSidebar";
import EntryCodeCard from "@/components/sessions/EntryCodeCard";
import FullscreenButton from "@/components/sessions/FullscreenButton";
import QrDisplay from "@/components/sessions/QrDisplay";

type SessionInfo = {
  courseCode: string;
  courseName: string;
  semester: string;
  dayLabel: string;
  timeLabel: string;
  room: string | null;
  openedAtLabel: string;
};

type Props = {
  sessionId: string;
  initialIsOpen: boolean;
  initialClosedAtLabel: string | null;
  initialAttendanceCount: number;
  initialDemoCount: number;
  initialAttendances: AttendanceListItem[];
  initialDemoCheckIns: DemoCheckInListItem[];
  demoEnabled: boolean;
  sessionInfo: SessionInfo;
};

type QrResponse =
  | {
      isOpen: true;
      token: string | null;
      entryCode: string | null;
      expiresAt: string | null;
      refreshedAt: string | null;
      refreshIntervalMs: number;
    }
  | {
      isOpen: false;
      closedAt: string | null;
    };

function formatBangkokTime(value: string): string {
  return new Date(value).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function SessionView({
  sessionId,
  initialIsOpen,
  initialClosedAtLabel,
  initialAttendanceCount,
  initialDemoCount,
  initialAttendances,
  initialDemoCheckIns,
  demoEnabled,
  sessionInfo,
}: Props) {
  const presenterRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<string | null>(null);
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [closedAtLabel, setClosedAtLabel] = useState(initialClosedAtLabel);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [demoQrDataUrl, setDemoQrDataUrl] = useState<string | null>(null);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [entryCode, setEntryCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [generation, setGeneration] = useState(0);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(30_000);
  const [isLoading, setIsLoading] = useState(initialIsOpen);
  const [error, setError] = useState<string | null>(null);

  const fetchQr = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/qr`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("QR refresh failed");

      const data = (await response.json()) as QrResponse;
      if (!data.isOpen) {
        setIsOpen(false);
        setQrDataUrl(null);
        setDemoQrDataUrl(null);
        setDemoUrl(null);
        setEntryCode(null);
        setExpiresAt(null);
        setClosedAtLabel(data.closedAt ? formatBangkokTime(data.closedAt) : null);
        return;
      }

      if (!data.token || !data.expiresAt) throw new Error("QR token missing");

      const payload = new URL("/checkin", window.location.origin);
      payload.searchParams.set("t", data.token);
      const demoPayload = new URL("/demo/checkin", window.location.origin);
      demoPayload.searchParams.set("t", data.token);
      const dataUrl = await QRCode.toDataURL(payload.toString(), {
        width: 960,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      const demoDataUrl = demoEnabled
        ? await QRCode.toDataURL(demoPayload.toString(), {
            width: 420,
            margin: 1,
            color: { dark: "#990000", light: "#ffffff" },
            errorCorrectionLevel: "M",
          })
        : null;

      setQrDataUrl(dataUrl);
      setDemoQrDataUrl(demoDataUrl);
      setDemoUrl(demoEnabled ? demoPayload.toString() : null);
      setEntryCode(data.entryCode);
      setExpiresAt(data.expiresAt);
      setRefreshIntervalMs(data.refreshIntervalMs);
      setError(null);

      if (tokenRef.current !== data.token) {
        tokenRef.current = data.token;
        setGeneration((current) => current + 1);
      }
    } catch {
      setError("รีเฟรช QR ไม่สำเร็จ ระบบจะลองใหม่อัตโนมัติ");
    } finally {
      setIsLoading(false);
    }
  }, [demoEnabled, isOpen, sessionId]);

  useEffect(() => {
    void fetchQr();
  }, [fetchQr]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setInterval(() => {
      if (!expiresAt) {
        setSecondsLeft(30);
        return;
      }

      const next = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, next));
    }, 250);

    return () => window.clearInterval(timer);
  }, [expiresAt, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setInterval(() => {
      void fetchQr();
    }, refreshIntervalMs);

    return () => window.clearInterval(timer);
  }, [fetchQr, isOpen, refreshIntervalMs]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-[#f7f8fc]">
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
        <section
          ref={presenterRef}
          className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl flex-col bg-[#f7f8fc] px-0 py-0 fullscreen:min-h-screen fullscreen:max-w-none fullscreen:justify-center fullscreen:px-10 fullscreen:py-10"
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    isOpen ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  {isOpen ? "กำลังเปิดเช็คอิน" : "ปิดเช็คอินแล้ว"}
                </p>
              </div>
              <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
                {sessionInfo.courseCode}
              </h2>
              <p className="mt-1 text-base text-slate-600">
                {sessionInfo.courseName} · เทอม {sessionInfo.semester}
              </p>
            </div>

            {isOpen && <FullscreenButton targetRef={presenterRef} />}
          </div>

          <div className="grid flex-1 items-center gap-8 lg:grid-cols-[minmax(360px,1fr)_360px]">
            {isOpen ? (
              <QrDisplay
                qrDataUrl={qrDataUrl}
                secondsLeft={secondsLeft}
                generation={generation}
                isLoading={isLoading}
              />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] bg-white text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-2xl font-black text-slate-950">ปิด session แล้ว</p>
                <p className="mt-2 text-sm text-slate-500">
                  ปิดเมื่อ {closedAtLabel ?? "ไม่ทราบเวลา"}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {isOpen && <EntryCodeCard code={entryCode} />}

              <div className="space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>
                    {sessionInfo.dayLabel} {sessionInfo.timeLabel}
                  </span>
                </div>
                {sessionInfo.room && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{sessionInfo.room}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>เปิดเมื่อ {sessionInfo.openedAtLabel}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <div className="hidden w-80 shrink-0 lg:block">
        <CheckedInSidebar
          sessionId={sessionId}
          initialAttendanceCount={initialAttendanceCount}
          initialDemoCount={initialDemoCount}
          initialAttendances={initialAttendances}
          initialDemoCheckIns={initialDemoCheckIns}
          demoEnabled={demoEnabled}
          demoUrl={demoUrl}
          demoQrDataUrl={demoQrDataUrl}
        />
      </div>
    </div>
  );
}
