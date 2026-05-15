import { AlertCircle, CheckCircle2, Clock, LockKeyhole, XCircle } from "lucide-react";

type Tone = "success" | "danger" | "warning" | "neutral";

type Props = {
  tone: Tone;
  title: string;
  message: string;
  meta?: string;
};

const toneClasses: Record<Tone, { panel: string; iconWrap: string; title: string }> = {
  success: {
    panel: "border-emerald-200 bg-emerald-50 text-emerald-800",
    iconWrap: "bg-white text-emerald-600 ring-1 ring-emerald-200",
    title: "text-emerald-800",
  },
  danger: {
    panel: "border-red-200 bg-red-50 text-red-800",
    iconWrap: "bg-white text-red-600 ring-1 ring-red-200",
    title: "text-red-800",
  },
  warning: {
    panel: "border-amber-200 bg-amber-50 text-amber-800",
    iconWrap: "bg-white text-amber-600 ring-1 ring-amber-200",
    title: "text-amber-800",
  },
  neutral: {
    panel: "border-slate-200 bg-slate-50 text-slate-700",
    iconWrap: "bg-white text-slate-500 ring-1 ring-slate-200",
    title: "text-slate-800",
  },
};

function Icon({ tone }: { tone: Tone }) {
  if (tone === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (tone === "danger") return <XCircle className="h-5 w-5" />;
  if (tone === "warning") return <AlertCircle className="h-5 w-5" />;
  return <LockKeyhole className="h-5 w-5" />;
}

export default function StatusPanel({ tone, title, message, meta }: Props) {
  const styles = toneClasses[tone];
  return (
    <div className={`animate-fade-in rounded-2xl border px-4 py-4 ${styles.panel}`}>
      <div className="flex gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconWrap}`}>
          <Icon tone={tone} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-inter text-base font-black ${styles.title}`}>{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-90">{message}</p>
          {meta && (
            <p className="mt-3 flex items-center gap-2 text-xs font-bold opacity-80">
              <Clock className="h-3.5 w-3.5" />
              {meta}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
