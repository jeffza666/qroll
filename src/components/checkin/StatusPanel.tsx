import { AlertCircle, CheckCircle2, Clock, LockKeyhole, XCircle } from "lucide-react";

type Tone = "success" | "danger" | "warning" | "neutral";

type Props = {
  tone: Tone;
  title: string;
  message: string;
  meta?: string;
};

const toneClasses: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

function Icon({ tone }: { tone: Tone }) {
  if (tone === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (tone === "danger") return <XCircle className="h-5 w-5" />;
  if (tone === "warning") return <AlertCircle className="h-5 w-5" />;
  return <LockKeyhole className="h-5 w-5" />;
}

export default function StatusPanel({ tone, title, message, meta }: Props) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${toneClasses[tone]}`}>
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon tone={tone} />
        </div>
        <div className="min-w-0">
          <p className="text-base font-extrabold">{title}</p>
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
