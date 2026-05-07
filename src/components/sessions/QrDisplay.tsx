import { Loader2, QrCode } from "lucide-react";

type Props = {
  qrDataUrl: string | null;
  timeLeftSeconds: number;
  totalSeconds: number;
  isLoading: boolean;
  presenterMode?: boolean;
};

export default function QrDisplay({
  qrDataUrl,
  timeLeftSeconds,
  totalSeconds,
  isLoading,
  presenterMode = false,
}: Props) {
  const isOverTime = timeLeftSeconds < 0;
  const displaySeconds = Math.abs(timeLeftSeconds);
  const progress = isOverTime
    ? 1
    : Math.max(0, Math.min(1, timeLeftSeconds / Math.max(1, totalSeconds)));
  const dashOffset = 1 - progress;
  const timeLabel = formatDuration(displaySeconds);

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={`relative flex aspect-square w-full items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 ${
          presenterMode
            ? "max-w-[min(76vh,760px)] p-20"
            : "max-w-[min(68vh,560px)] p-16"
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#fee2e2"
            strokeWidth="3"
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#cc0000"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>

        <div className="relative z-10 flex aspect-square w-full max-w-[78%] items-center justify-center rounded-[1.5rem] bg-white p-1">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR code สำหรับเช็คอิน"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              {isLoading ? (
                <Loader2 className="h-12 w-12 animate-spin" />
              ) : (
                <QrCode className="h-14 w-14" />
              )}
              <span className="text-sm font-semibold">กำลังโหลด QR</span>
            </div>
          )}
        </div>
      </div>

      <div className={presenterMode ? "mt-5 text-center" : "mt-6 text-center"}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cc0000]">
          {isOverTime ? "เลยเวลา" : "เวลาเหลือ"}
        </p>
        <p
          className={`font-black tabular-nums text-slate-950 ${
            presenterMode ? "text-5xl" : "text-4xl"
          }`}
        >
          {isOverTime ? `+${timeLabel}` : timeLabel}
        </p>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;

  if (hh > 0) {
    return `${hh.toString().padStart(2, "0")}:${mm
      .toString()
      .padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  }

  return `${mm.toString().padStart(2, "0")}:${ss
    .toString()
    .padStart(2, "0")}`;
}
