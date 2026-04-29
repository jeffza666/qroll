import { Loader2, QrCode } from "lucide-react";

type Props = {
  qrDataUrl: string | null;
  secondsLeft: number;
  generation: number;
  isLoading: boolean;
};

export default function QrDisplay({
  qrDataUrl,
  secondsLeft,
  generation,
  isLoading,
}: Props) {
  const progress = Math.max(0, Math.min(1, secondsLeft / 30));
  const dashOffset = 283 - 283 * progress;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative flex aspect-square w-full max-w-[min(68vh,520px)] items-center justify-center rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Dynamic check-in QR code"
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

      <div className="mt-6 flex items-center gap-5">
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#cc0000"
              strokeLinecap="round"
              strokeWidth="10"
              strokeDasharray="283"
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums text-slate-900">
            {Math.max(0, secondsLeft)}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            รอบที่
          </p>
          <p className="text-4xl font-black tabular-nums text-slate-950">
            #{generation || 1}
          </p>
        </div>
      </div>
    </div>
  );
}
