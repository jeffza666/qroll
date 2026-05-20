"use client";

import { useState, useTransition } from "react";
import { MapPin, Loader2, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

import {
  saveCourseGeofence,
  clearCourseGeofence,
} from "@/app/actions/course";
import {
  GEOLOCATION_OPTIONS,
  TEACHER_ACCURACY_GOOD_M,
  TEACHER_ACCURACY_POOR_M,
} from "@/lib/geo/constants";

type Props = {
  courseId: string;
  initial: { lat: number | null; lng: number | null };
};

function formatCoord(value: number) {
  return value.toFixed(6);
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("เบราว์เซอร์นี้ไม่รองรับการขอตำแหน่ง"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
  });
}

export default function CourseGeofenceSection({ courseId, initial }: Props) {
  const [savedLat, setSavedLat] = useState(initial.lat);
  const [savedLng, setSavedLng] = useState(initial.lng);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const hasSaved = savedLat !== null && savedLng !== null;

  async function handleCapture() {
    setError(null);
    setInfo(null);
    setRequesting(true);

    try {
      const position = await getPosition();
      const { latitude, longitude, accuracy } = position.coords;
      const acc = Math.round(accuracy);

      // Block ถ้า accuracy แย่เกินไป — กัน anchor ผิดทำให้ block ทั้งห้อง
      if (acc > TEACHER_ACCURACY_POOR_M) {
        setError(
          `ความแม่นยำต่ำเกินไป (~${acc}m) — มักเกิดจาก laptop ที่ไม่มี GPS chip` +
            ` กรุณาทำขั้นตอนนี้บนมือถือในห้องเรียนจริง`
        );
        return;
      }

      // เตือนถ้า accuracy ปานกลาง — ให้ user confirm
      if (acc > TEACHER_ACCURACY_GOOD_M) {
        const confirmed = window.confirm(
          `ความแม่นยำของ GPS อยู่ที่ ~${acc}m (แนะนำ ≤${TEACHER_ACCURACY_GOOD_M}m)\n\n` +
            `ถ้าทำบนมือถือในห้องจริงควรแม่นกว่านี้ ต้องการบันทึกพิกัดนี้หรือไม่?`
        );
        if (!confirmed) return;
      }

      startTransition(async () => {
        const result = await saveCourseGeofence(courseId, {
          lat: latitude,
          lng: longitude,
        });
        if (result?.error) {
          setError(result.error);
          return;
        }
        setSavedLat(latitude);
        setSavedLng(longitude);
        setInfo(`บันทึกตำแหน่งแล้ว (ความแม่นยำ ~${acc}m)`);
      });
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
          setError(
            "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — กรุณาเปิด permission ในเบราว์เซอร์"
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("ไม่สามารถระบุตำแหน่งได้ — ลองอีกครั้งใกล้หน้าต่างหรือกลางแจ้ง");
        } else if (err.code === err.TIMEOUT) {
          setError("ระบบขอตำแหน่งนานเกินไป — ลองใหม่อีกครั้ง");
        } else {
          setError("เกิดข้อผิดพลาดขณะขอตำแหน่ง");
        }
      } else {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    } finally {
      setRequesting(false);
    }
  }

  function handleClear() {
    if (!window.confirm("ลบตำแหน่งห้องเรียนที่บันทึกไว้?")) return;

    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = (await clearCourseGeofence(courseId)) as
        | { success: true }
        | { error: string };
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSavedLat(null);
      setSavedLng(null);
      setInfo("ลบตำแหน่งแล้ว");
    });
  }

  const busy = isPending || requesting;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            ตำแหน่งห้องเรียน (Geofence anchor)
            <span className="text-xs font-normal text-slate-400">— ไม่บังคับ</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            บันทึกพิกัดห้องเรียน เพื่อตรวจว่านักศึกษาอยู่ในห้องจริงตอนเช็คชื่อ —
            <strong className="text-amber-600"> แนะนำให้ตั้งจากมือถือในห้องเรียนจริง</strong>
            {" "}(ความแม่นยำสูงกว่า laptop)
          </p>
        </div>
      </header>

      <div
        className={
          hasSaved
            ? "rounded-2xl border border-slate-200 bg-slate-50 p-4"
            : "rounded-2xl border border-amber-200 bg-amber-50 p-4"
        }
      >
        {hasSaved ? (
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                บันทึกแล้ว
              </p>
              <p className="font-inter text-slate-600 mt-1">
                {formatCoord(savedLat!)}, {formatCoord(savedLng!)}
              </p>
              <a
                href={`https://maps.google.com/?q=${savedLat},${savedLng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-700 hover:underline mt-1 inline-block"
              >
                เปิดดูใน Google Maps
              </a>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบตำแหน่ง
            </button>
          </div>
        ) : (
          <p className="text-sm text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            ยังไม่ได้บันทึกตำแหน่ง — เปิดคาบจะตรวจตำแหน่งไม่ได้ (จะเปิดแบบไม่มี geofence)
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error}
        </p>
      )}
      {info && !error && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 border border-emerald-100">
          {info}
        </p>
      )}

      <div className="flex justify-center">
      <button
        type="button"
        onClick={handleCapture}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 !text-white text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-colors disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            กำลังขอตำแหน่ง...
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4" />
            {hasSaved ? "บันทึกตำแหน่งใหม่" : "ใช้ตำแหน่งปัจจุบัน"}
          </>
        )}
      </button>
      </div>
    </section>
  );
}
