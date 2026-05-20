import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import QRollLogo from "@/components/brand/QRollLogo";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  /** แสดงปุ่มกลับหน้านักศึกษา — เปิดเฉพาะหน้าเช็คอินจริง (ไม่โชว์ใน invalid/expired/closed/login state) */
  showBack?: boolean;
  children: React.ReactNode;
};

export default function CheckInShell({ eyebrow, title, subtitle, showBack = false, children }: Props) {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {showBack && (
              <Link
                href="/student"
                aria-label="กลับหน้านักศึกษา"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            <QRollLogo />
          </div>
          {eyebrow && (
            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-qroll-red-dark">
              {eyebrow}
            </span>
          )}
        </header>

        <section className="animate-fade-in overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
          <div className="h-1.5 w-full bg-qroll-red-dark" />
          <div className="p-5 sm:p-7">
            <div className="mb-6">
              <h1 className="font-inter text-2xl font-black leading-tight text-slate-900 sm:text-[28px]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
