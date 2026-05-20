"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, RotateCcw, ScanFace, Trash2, XCircle } from "lucide-react";

import FaceScanModal from "@/components/face/FaceScanModal";
import { clearFaceForStudent, seedFaceForStudent } from "@/app/actions/face-seed";

type Student = {
  id: string;
  name: string;
  email: string | null;
  studentId: string | null;
  faceEnrolledAt: string | null;
  hasFace: boolean;
};

type Props = {
  students: Student[];
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FaceSeedClient({ students }: Props) {
  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);
  const [, startTransition] = useTransition();

  const filtered = students.filter((s) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.email?.toLowerCase().includes(q) ?? false) ||
      (s.studentId?.toLowerCase().includes(q) ?? false)
    );
  });

  function showToast(tone: "ok" | "err", msg: string) {
    setToast({ tone, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSeedResult(descriptor: number[]) {
    if (!targetId) return;
    setBusy(true);
    try {
      const res = await seedFaceForStudent(targetId, descriptor);
      if (res.ok) {
        showToast("ok", "บันทึก descriptor แล้ว");
      } else {
        showToast("err", res.message ?? `ผิดพลาด: ${res.reason}`);
      }
    } finally {
      setBusy(false);
      setTargetId(null);
    }
  }

  function handleClear(student: Student) {
    if (!confirm(`ลบ descriptor ของ ${student.name} ใช่หรือไม่?`)) return;
    startTransition(async () => {
      const res = await clearFaceForStudent(student.id);
      if (res.ok) {
        showToast("ok", "ลบ descriptor แล้ว");
      } else {
        showToast("err", `ผิดพลาด: ${res.reason}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-bold ${
            toast.tone === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ค้นหา ชื่อ / รหัส นศ. / email"
        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-qroll-red-dark focus:outline-none"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">นักศึกษา</th>
              <th className="px-4 py-2">สถานะ</th>
              <th className="px-4 py-2 text-right">การกระทำ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  ไม่พบนักศึกษา
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.studentId ?? "-"} • {s.email ?? "-"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {s.hasFace ? (
                    <div className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-bold">
                        sync แล้ว ({formatDate(s.faceEnrolledAt)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-500">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs font-bold">ยังไม่ sync</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setTargetId(s.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-qroll-red-dark px-3 py-1.5 text-xs font-bold text-white hover:bg-qroll-red-darker disabled:opacity-50"
                    >
                      {s.hasFace ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          sync ใหม่
                        </>
                      ) : (
                        <>
                          <ScanFace className="h-3.5 w-3.5" />
                          sync รูป
                        </>
                      )}
                    </button>
                    {s.hasFace && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleClear(s)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ลบ
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {targetId && (
        <FaceScanModal
          mode="seed-from-file"
          onResult={(r) => void handleSeedResult(r.descriptor)}
          onCancel={() => setTargetId(null)}
        />
      )}
    </div>
  );
}
