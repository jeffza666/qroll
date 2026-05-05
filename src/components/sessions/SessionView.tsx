"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertCircle, Clock, MapPin } from "lucide-react";

import CloseSessionButton from "@/components/courses/CloseSessionButton";
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
  startsAtIso: string;
  endsAtIso: string;
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
      endsAt: string;
    }
  | {
      isOpen: false;
      closedAt: string | null;
    };

const AUTO_CLOSE_GRACE_SECONDS = 30 * 60;

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
  const autoCloseRequestedRef = useRef(false);
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [closedAtLabel, setClosedAtLabel] = useState(initialClosedAtLabel);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [demoQrDataUrl, setDemoQrDataUrl] = useState<string | null>(null);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [entryCode, setEntryCode] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState(sessionInfo.endsAtIso);
  const [isPresenterMode, setIsPresenterMode] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(() =>
    Math.ceil((new Date(sessionInfo.endsAtIso).getTime() - Date.now()) / 1000)
  );
  const [isLoading, setIsLoading] = useState(initialIsOpen);
  const [error, setError] = useState<string | null>(null);

  const totalSeconds = Math.max(
    1,
    Math.ceil(
      (new Date(endsAt).getTime() -
        new Date(sessionInfo.startsAtIso).getTime()) /
        1000
    )
  );

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
        setClosedAtLabel(data.closedAt ? formatBangkokTime(data.closedAt) : null);
        return;
      }

      if (!data.token) throw new Error("QR token missing");

      const payload = new URL("/checkin", window.location.origin);
      payload.searchParams.set("t", data.token);
      const demoPayload = new URL("/demo/checkin", window.location.origin);
      demoPayload.searchParams.set("t", data.token);

      const dataUrl = await QRCode.toDataURL(payload.toString(), {
        width: 1200,
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
      setEndsAt(data.endsAt);
      setError(null);

      if (tokenRef.current !== data.token) {
        tokenRef.current = data.token;
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
      const next = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000);
      setTimeLeftSeconds(next);

      if (next > -AUTO_CLOSE_GRACE_SECONDS) {
        autoCloseRequestedRef.current = false;
        return;
      }

      if (!autoCloseRequestedRef.current) {
        autoCloseRequestedRef.current = true;
        void fetchQr();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endsAt, fetchQr, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setInterval(() => {
      void fetchQr();
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [fetchQr, isOpen]);

  function handleClosed() {
    setIsOpen(false);
    setQrDataUrl(null);
    setDemoQrDataUrl(null);
    setDemoUrl(null);
    setEntryCode(null);
    setClosedAtLabel(formatBangkokTime(new Date().toISOString()));
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-[#f7f8fc]">
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
        <section
          ref={presenterRef}
          className={`mx-auto flex min-h-[calc(100vh-9rem)] flex-col bg-[#f7f8fc] px-0 py-0 fullscreen:min-h-screen fullscreen:max-w-none ${
            isPresenterMode
              ? "max-w-none px-8 py-6"
              : "max-w-6xl fullscreen:justify-center fullscreen:px-10 fullscreen:py-10"
          }`}
        >
          <div
            className={
              isPresenterMode
                ? "mb-4 flex items-start justify-between gap-4"
                : "mb-8 flex items-start justify-between gap-4"
            }
          >
            <div>
              <div className={isPresenterMode ? "hidden" : "flex items-center gap-3"}>
                <span
                  className={`h-3 w-3 rounded-full ${
                    isOpen ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  {isOpen ? "กำลังเปิดเช็คอิน" : "ปิดเช็คอินแล้ว"}
                </p>
              </div>
              <h2
                className={
                  isPresenterMode
                    ? "text-2xl font-black text-slate-950"
                    : "mt-3 text-3xl font-black text-slate-950 sm:text-4xl"
                }
              >
                {sessionInfo.courseCode}
              </h2>
              <p
                className={
                  isPresenterMode
                    ? "mt-0.5 text-sm text-slate-500"
                    : "mt-1 text-base text-slate-600"
                }
              >
                {sessionInfo.courseName} • เทอม {sessionInfo.semester}
              </p>
            </div>

            {isOpen && (
              <div className="flex items-center gap-2">
                {!isPresenterMode && (
                  <CloseSessionButton sessionId={sessionId} onClosed={handleClosed} />
                )}
                <FullscreenButton
                  targetRef={presenterRef}
                  onFullscreenChange={setIsPresenterMode}
                />
              </div>
            )}
          </div>

          <div
            className={
              isPresenterMode
                ? "grid flex-1 place-items-center gap-4"
                : "grid flex-1 items-center gap-8 lg:grid-cols-[minmax(360px,1fr)_360px]"
            }
          >
            {isOpen ? (
              <QrDisplay
                qrDataUrl={qrDataUrl}
                timeLeftSeconds={timeLeftSeconds}
                totalSeconds={totalSeconds}
                isLoading={isLoading}
                presenterMode={isPresenterMode}
              />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] bg-white text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-2xl font-black text-slate-950">ปิด session แล้ว</p>
                <p className="mt-2 text-sm text-slate-500">
                  ปิดเมื่อ {closedAtLabel ?? "ไม่ทราบเวลา"}
                </p>
              </div>
            )}

            <div className={isPresenterMode ? "w-full max-w-md" : "space-y-6"}>
              {isOpen && <EntryCodeCard code={entryCode} />}

              <div
                className={
                  isPresenterMode
                    ? "hidden"
                    : "space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-700"
                }
              >
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

              {error && !isPresenterMode && (
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
