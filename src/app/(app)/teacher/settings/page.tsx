import Link from "next/link";

import PageHeader from "@/components/shell/PageHeader";
import { requireTeacher } from "@/lib/auth-helpers";
import { isFaceSeedEnabled } from "@/lib/face/constants";
import {
  Camera,
  ChevronDown,
  ScanFace,
  SlidersHorizontal,
  UserRound,
  Wrench,
} from "lucide-react";

function ReadonlyField({
  label,
  value,
  disabled = false,
}: {
  label: string;
  value: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-600">
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        disabled={disabled}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 font-medium text-slate-500"
            : "border-slate-200 bg-slate-50 font-bold text-slate-800"
        }`}
      />
    </div>
  );
}

function SettingRow({
  title,
  description,
  control,
  border = true,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 py-0 md:flex-row md:items-center md:justify-between ${
        border ? "border-b border-slate-100 pb-6" : ""
      }`}
    >
      <div className="max-w-2xl">
        <h4 className="mb-1 text-base font-bold text-slate-800">{title}</h4>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Toggle({ checked, disabled = false }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled
          ? "cursor-not-allowed bg-slate-200 opacity-60"
          : checked
            ? "bg-emerald-500"
            : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full border bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5 border-white" : "translate-x-0.5 border-slate-300"
        }`}
      />
    </span>
  );
}

export default async function SettingsPage() {
  const user = await requireTeacher();
  const faceSeedEnabled = isFaceSeedEnabled();

  return (
    <>
      <PageHeader>
        <h1 className="text-2xl font-black text-slate-900">ตั้งค่าระบบ</h1>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="mx-auto max-w-4xl animate-fade-in pb-12">
          <div className="mb-6 ml-1 flex items-center gap-3">
            <div className="h-8 w-2 rounded-full bg-qroll-red-dark shadow-md" />
            <h2 className="pt-1 text-2xl font-black leading-none tracking-tight text-slate-900 md:text-3xl">
              การตั้งค่าระบบ
            </h2>
          </div>

          <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-8 py-6">
              <UserRound className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-bold text-slate-800">ข้อมูลบัญชีผู้ใช้</h3>
            </div>

            <div className="p-8">
              <div className="flex flex-col items-start gap-8 sm:flex-row">
                <div className="relative shrink-0">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-50 bg-white shadow-sm">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-red-100 text-3xl font-black text-qroll-red-dark">
                      {(user.name ?? "T").trim().charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="absolute bottom-0 right-0 flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm"
                    aria-label="เปลี่ยนรูปโปรไฟล์"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-full flex-1 space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <ReadonlyField label="ชื่อ-นามสกุล" value={user.name ?? "—"} />
                    <ReadonlyField
                      label="อีเมล (มหาวิทยาลัย)"
                      value={user.email ?? "—"}
                      disabled
                    />
                  </div>

                  <ReadonlyField
                    label="บทบาท"
                    value="อาจารย์ (Teacher)"
                  />

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-xl bg-qroll-red-dark px-5 py-2.5 text-sm font-semibold text-white opacity-50 shadow-sm shadow-red-900/20"
                    >
                      บันทึกข้อมูลส่วนตัว
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-8 py-6">
              <SlidersHorizontal className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-bold text-slate-800">
                การตั้งค่าแอปพลิเคชัน
              </h3>
            </div>

            <div className="space-y-6 p-8">
              <SettingRow
                title="ระยะเวลาเปิดรับเช็คชื่อ (เริ่มต้น)"
                description="ตั้งค่าเวลามาตรฐานเมื่อกดเปิด Session ใหม่"
                control={
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value="10"
                      readOnly
                      disabled
                      className="w-20 cursor-not-allowed rounded-lg border border-slate-300 px-3 py-2 text-center font-inter font-bold text-slate-500 opacity-70"
                    />
                    <span className="text-sm font-semibold text-slate-500">นาที</span>
                  </div>
                }
              />

              <SettingRow
                title="การแจ้งเตือน (Notifications)"
                description="รับการแจ้งเตือนเมื่อมีฟีเจอร์นี้เปิดใช้งานในระบบ"
                control={<Toggle checked={true} disabled />}
              />

              <SettingRow
                title="ธีมการแสดงผล"
                description="ตัวเลือกธีมและการใช้งานเพิ่มเติมจะตามมาใน Phase 7"
                border={false}
                control={
                  <div className="relative">
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-w-[170px] cursor-not-allowed items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500 opacity-70"
                    >
                      Light
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                }
              />
            </div>
          </section>

          {faceSeedEnabled && (
            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-8 py-6">
                <Wrench className="h-5 w-5 text-slate-500" />
                <h3 className="text-lg font-bold text-slate-800">เครื่องมือ Admin (Dev)</h3>
              </div>
              <div className="space-y-4 p-8">
                <p className="text-sm text-slate-500">
                  ส่วนนี้เปิดผ่าน <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold">ENABLE_FACE_SEED=true</code> เฉพาะ dev/demo —
                  ในระบบจริงรูปจะ sync ผ่าน TU API ไม่ใช่อัปโหลดเอง
                </p>
                <Link
                  href="/teacher/face-seed"
                  className="inline-flex items-center gap-2 rounded-xl bg-qroll-red-dark px-4 py-2.5 text-sm font-bold text-white hover:bg-qroll-red-darker"
                >
                  <ScanFace className="h-4 w-4" />
                  Face Seed (จำลอง TU Photo Sync)
                </Link>
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
