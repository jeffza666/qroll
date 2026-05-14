"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { createCourse, updateCourse } from "@/app/actions/course";
import {
  GEOLOCATION_OPTIONS,
  TEACHER_ACCURACY_GOOD_M,
  TEACHER_ACCURACY_POOR_M,
} from "@/lib/geo/constants";

const DAYS = [
  { value: 0, label: "อาทิตย์" },
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัสบดี" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
];

type ScheduleRow = {
  // id: undefined = แถวใหม่ที่ user เพิ่ม / มีค่า = แถวเดิมจาก DB
  // ส่งไป server เพื่อให้รู้ว่า update หรือ create (รักษา link กับ session)
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
};

export type CourseFormInitial = {
  code: string;
  section: string;
  name: string;
  semester: string;
  schedules: ScheduleRow[];
};

type Props = {
  mode: "create" | "edit";
  courseId?: string; // required เมื่อ mode = edit
  initial?: CourseFormInitial;
  // edit mode: slot สำหรับ CourseGeofenceSection ระหว่าง form-card กับปุ่ม action
  belowFields?: React.ReactNode;
};

const EMPTY_SCHEDULE: ScheduleRow = {
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "12:00",
  room: "",
};

export default function CourseForm({ mode, courseId, initial, belowFields }: Props) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [section, setSection] = useState(initial?.section ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [semester, setSemester] = useState(initial?.semester ?? "1/2569");
  const [schedules, setSchedules] = useState<ScheduleRow[]>(
    initial?.schedules && initial.schedules.length > 0
      ? initial.schedules
      : [EMPTY_SCHEDULE]
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Phase 6: pending anchor — เฉพาะ create mode (edit mode ใช้ CourseGeofenceSection แยก)
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [pendingAccuracy, setPendingAccuracy] = useState<number | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  async function handleCaptureLocation() {
    setLocationError(null);
    setRequestingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (typeof window === "undefined" || !navigator.geolocation) {
          reject(new Error("เบราว์เซอร์นี้ไม่รองรับการขอตำแหน่ง"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
      });
      const acc = Math.round(position.coords.accuracy);

      // กัน laptop GPS เพี้ยน — ถ้า accuracy แย่เกินไป → block (anchor ผิด = ห้องโดน block ทั้งห้อง)
      if (acc > TEACHER_ACCURACY_POOR_M) {
        setLocationError(
          `ความแม่นยำต่ำเกินไป (~${acc}m) — แนะนำตั้งจากมือถือในห้องเรียนจริง หรือข้ามขั้นนี้แล้วตั้งทีหลังที่หน้าแก้ไข`
        );
        return;
      }

      if (acc > TEACHER_ACCURACY_GOOD_M) {
        const confirmed = window.confirm(
          `ความแม่นยำของ GPS อยู่ที่ ~${acc}m (แนะนำ ≤${TEACHER_ACCURACY_GOOD_M}m)\n\n` +
            `ถ้าทำบนมือถือในห้องจริงควรแม่นกว่านี้ ต้องการใช้พิกัดนี้หรือไม่?`
        );
        if (!confirmed) return;
      }

      setPendingLat(position.coords.latitude);
      setPendingLng(position.coords.longitude);
      setPendingAccuracy(acc);
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — กรุณาเปิด permission ในเบราว์เซอร์");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError("ไม่สามารถระบุตำแหน่งได้ — ลองอีกครั้งใกล้หน้าต่างหรือกลางแจ้ง");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("ระบบขอตำแหน่งนานเกินไป — ลองใหม่อีกครั้ง");
        } else {
          setLocationError("เกิดข้อผิดพลาดขณะขอตำแหน่ง");
        }
      } else {
        setLocationError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    } finally {
      setRequestingLocation(false);
    }
  }

  function handleClearLocation() {
    setPendingLat(null);
    setPendingLng(null);
    setPendingAccuracy(null);
    setLocationError(null);
  }

  function updateRow<K extends keyof ScheduleRow>(
    idx: number,
    key: K,
    value: ScheduleRow[K]
  ) {
    setSchedules((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );
  }

  function addRow() {
    setSchedules((prev) => [...prev, EMPTY_SCHEDULE]);
  }

  function removeRow(idx: number) {
    setSchedules((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // validate ฝั่ง client เบา ๆ ก่อน
    for (const s of schedules) {
      if (s.startTime >= s.endTime) {
        setError("เวลาเริ่มต้องอยู่ก่อนเวลาจบในทุกแถวตารางสอน");
        return;
      }
    }

    const fd = new FormData();
    fd.set("code", code);
    fd.set("section", section);
    fd.set("name", name);
    fd.set("semester", semester);
    fd.set("schedules", JSON.stringify(schedules));

    // Phase 6: send pending anchor (create mode เท่านั้น) — edit mode ใช้ standalone section
    if (mode === "create" && pendingLat !== null && pendingLng !== null) {
      fd.set("geofenceLat", String(pendingLat));
      fd.set("geofenceLng", String(pendingLng));
    }

    startTransition(async () => {
      try {
        if (mode === "edit" && courseId) {
          await updateCourse(courseId, fd);
        } else {
          await createCourse(fd);
        }
      } catch (err) {
        // redirect() throws NEXT_REDIRECT — ปล่อยให้ไปต่อ
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  return (
    <div className="space-y-4">
    <form
      onSubmit={handleSubmit}
      id="course-form"
      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6"
    >
      {/* code + section */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            รหัสวิชา <span className="text-red-500">*</span>
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            placeholder="เช่น CS311"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-[#990000]/30 focus:border-[#990000] transition-all"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Section
          </label>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="650001"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-[#990000]/30 focus:border-[#990000] transition-all"
          />
        </div>
      </div>

      {/* name */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          ชื่อวิชา <span className="text-red-500">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="เช่น Operating Systems"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#990000]/30 focus:border-[#990000] transition-all"
        />
      </div>

      {/* semester */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          ภาคการศึกษา <span className="text-red-500">*</span>
        </label>
        <input
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          required
          placeholder="1/2569"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-[#990000]/30 focus:border-[#990000] transition-all"
        />
      </div>

      {/* schedules */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-slate-700">
            วันเวลาเรียน
          </label>
          <button
            type="button"
            onClick={addRow}
            className="text-xs font-bold text-[#990000] hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            เพิ่มเวลาเรียน
          </button>
        </div>

        <div className="space-y-3">
          {schedules.map((row, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200"
            >
              <select
                value={row.dayOfWeek}
                onChange={(e) =>
                  updateRow(idx, "dayOfWeek", Number(e.target.value))
                }
                className="w-28 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:border-[#990000]"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-4 h-4" />
              </div>
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => updateRow(idx, "startTime", e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-inter font-semibold focus:outline-none focus:border-[#990000]"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => updateRow(idx, "endTime", e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-inter font-semibold focus:outline-none focus:border-[#990000]"
              />
              <div className="flex items-center gap-1.5 text-slate-400 ml-2">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={row.room}
                onChange={(e) => updateRow(idx, "room", e.target.value)}
                placeholder="ห้อง (ไม่บังคับ)"
                className="flex-1 min-w-[120px] px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#990000]"
              />
              {schedules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error}
        </p>
      )}
    </form>

    {/* Phase 6: geofence anchor card (create mode only — edit mode ใช้ CourseGeofenceSection แยก) */}
    {mode === "create" && (
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
        <header>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            ตำแหน่งห้องเรียน (Geofence anchor)
            <span className="text-xs font-normal text-slate-400">— ไม่บังคับ</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            บันทึกพิกัดเพื่อตรวจว่านักศึกษาอยู่ในห้องจริงตอนเช็คชื่อ —
            <strong className="text-amber-600"> แนะนำตั้งจากมือถือในห้องเรียนจริง</strong>
            {" "}ถ้าตอนนี้ยังไม่อยู่ห้อง ข้ามขั้นนี้แล้วตั้งทีหลังในหน้าแก้ไขได้
          </p>
        </header>

        <div
          className={
            pendingLat !== null && pendingLng !== null
              ? "rounded-2xl border border-slate-200 bg-slate-50 p-4"
              : "rounded-2xl border border-amber-200 bg-amber-50 p-4"
          }
        >
          {pendingLat !== null && pendingLng !== null ? (
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  พร้อมบันทึก
                  {pendingAccuracy !== null && (
                    <span className="text-xs font-normal text-slate-500">
                      (ความแม่นยำ ~{pendingAccuracy}m)
                    </span>
                  )}
                </p>
                <p className="font-inter text-slate-600 mt-1">
                  {pendingLat.toFixed(6)}, {pendingLng.toFixed(6)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-white border border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ลบ
              </button>
            </div>
          ) : (
            <p className="text-sm text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              ยังไม่ได้บันทึกตำแหน่ง — จะสร้างวิชาโดยไม่มี geofence
            </p>
          )}
        </div>

        {locationError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            {locationError}
          </p>
        )}

        <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCaptureLocation}
          disabled={requestingLocation}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 !text-white text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-colors disabled:opacity-60"
        >
          {requestingLocation ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              กำลังขอตำแหน่ง...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              {pendingLat !== null ? "บันทึกตำแหน่งใหม่" : "ใช้ตำแหน่งปัจจุบัน"}
            </>
          )}
        </button>
        </div>
      </section>
    )}

    {belowFields}

    <div className="flex gap-3 pt-2">
      <a
        href={mode === "edit" && courseId ? `/teacher/courses/${courseId}` : "/teacher/courses"}
        className="flex-1 py-3 text-center text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
      >
        ยกเลิก
      </a>
      <button
        type="submit"
        form="course-form"
        disabled={isPending}
        className="flex-1 py-3 text-sm font-semibold !text-white bg-[#990000] rounded-xl hover:bg-red-800 shadow-lg shadow-red-900/20 transition-all disabled:opacity-60"
      >
        {isPending
          ? "กำลังบันทึก..."
          : mode === "edit"
          ? "บันทึกการแก้ไข"
          : "สร้างวิชา"}
      </button>
    </div>
    </div>
  );
}
