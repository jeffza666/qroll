import { ScanFace } from "lucide-react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function CheckInShell({ eyebrow, title, subtitle, children }: Props) {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#990000] text-white shadow-[0_10px_24px_rgba(127,29,29,0.18)]">
              <ScanFace className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none text-slate-950">
                QRoll<span className="text-[#990000]">.</span>
              </p>
              <p className="mt-0.5 text-[11px] font-bold uppercase text-slate-500">
                Smart Attendance
              </p>
            </div>
          </div>
          {eyebrow && (
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500">
              {eyebrow}
            </span>
          )}
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:p-7">
          <div className="mb-6">
            <h1 className="text-[28px] font-black leading-tight text-slate-950">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
