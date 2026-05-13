"use client";

import { useMemo, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  LayoutGrid,
  Lock,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import QRollLogo from "@/components/brand/QRollLogo";

const GENERIC_ERROR =
  "Username หรือ password ไม่ถูกต้อง / บัญชีไม่อยู่ในสถานะปกติ";

type LoginFormProps = {
  initialError: boolean;
  redirectTo: string;
  isDevMode: boolean;
};

function Spinner() {
  return (
    <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/35 border-t-white" />
  );
}

export function LoginForm({
  initialError,
  redirectTo,
  isDevMode,
}: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ? GENERIC_ERROR : "");

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.length > 0 && !loading,
    [username, password, loading],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError(GENERIC_ERROR);
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      redirectTo,
    });

    setLoading(false);

    if (!result || result.error) {
      setError(GENERIC_ERROR);
      return;
    }

    router.push(result.url || redirectTo);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen grid-cols-[256px_minmax(0,1fr)] bg-[#F7F8FC] text-slate-900 max-[900px]:grid-cols-1">
      <aside className="z-10 flex flex-col justify-between border-r border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] max-[900px]:hidden">
        <div>
          <div className="flex h-20 items-center border-b border-slate-100 px-6">
            <QRollLogo />
          </div>

          <nav className="flex flex-col gap-2 px-4 py-8">
            <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#990000]">
              <LayoutGrid size={19} />
              เข้าสู่ระบบ
            </div>
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500">
              <BookOpen size={19} />
              รายวิชาของฉัน
            </div>
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500">
              <Users size={19} />
              รายชื่อนักศึกษา
            </div>
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500">
              <ShieldCheck size={19} />
              ความปลอดภัยข้อมูล
            </div>
          </nav>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-red-50 font-sans font-extrabold text-[#990000]">
              TU
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-slate-900">
                Thammasat University
              </div>
              <div className="mt-0.5 text-xs text-slate-500">QRoll v1.0</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col overflow-hidden">
        <header className="sticky top-0 z-[1] flex h-20 items-center justify-between border-b border-slate-200 bg-white/85 px-10 backdrop-blur-xl max-[900px]:px-5 max-[560px]:h-auto max-[560px]:min-h-[76px] max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-2 max-[560px]:px-[18px] max-[560px]:py-4">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight text-slate-800">
              เข้าสู่ระบบ QRoll
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              ระบบเช็กชื่ออัจฉริยะ มหาวิทยาลัยธรรมศาสตร์
            </p>
          </div>
          <div className="flex items-center gap-2.5 text-[13px] font-bold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-green-600" />
            System Online
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center overflow-y-auto p-10 max-[900px]:p-6 max-[560px]:block max-[560px]:p-[18px]">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-[30px] shadow-[0_14px_28px_rgba(15,23,42,0.08)] max-[560px]:rounded-[14px] max-[560px]:p-[22px]"
          >
            <div className="mb-6 flex items-start gap-3.5 max-[560px]:flex-col">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#990000] text-white shadow-[0_12px_26px_rgba(127,29,29,0.20)]">
                <Lock size={22} />
              </div>
              <div>
                <h2 className="text-[26px] font-extrabold leading-tight text-slate-900">
                  ยินดีต้อนรับ
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
                  กรอกบัญชีผู้ใช้เพื่อจัดการรายวิชา QR Code และรายงานการเข้าเรียน
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {isDevMode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-bold text-amber-800">
                  DEV MODE — TU API bypassed
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-bold text-red-800">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="username"
                  className="text-[13px] font-extrabold text-slate-700"
                >
                  ชื่อผู้ใช้ / รหัสนักศึกษา
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="username"
                    className="h-12 w-full rounded-xl border-[1.5px] border-slate-200 bg-white py-3 pl-11 pr-4 text-[15px] text-slate-900 outline-none transition focus:border-[#990000] focus:ring-4 focus:ring-red-900/10"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="กรอกชื่อผู้ใช้หรือรหัสนักศึกษา"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="password"
                  className="text-[13px] font-extrabold text-slate-700"
                >
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="password"
                    className="h-12 w-full rounded-xl border-[1.5px] border-slate-200 bg-white py-3 pl-11 pr-12 text-[15px] text-slate-900 outline-none transition focus:border-[#990000] focus:ring-4 focus:ring-red-900/10"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="กรอกรหัสผ่าน"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="flex w-fit items-center gap-2.5 bg-transparent text-sm font-semibold text-slate-500"
                onClick={() => setRemember((value) => !value)}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-[7px] border-2 ${
                    remember
                      ? "border-[#990000] bg-[#990000] text-white"
                      : "border-slate-300 bg-white text-transparent"
                  }`}
                >
                  <Check size={13} />
                </span>
                จดจำการเข้าสู่ระบบ
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-1 flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#990000] px-4 text-base font-extrabold text-white shadow-[0_14px_28px_rgba(127,29,29,0.20)] transition hover:-translate-y-px hover:bg-[#7F0000] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Spinner />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    เข้าสู่ระบบ
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
