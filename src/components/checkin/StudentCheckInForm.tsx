"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, History, Loader2, MapPin, ScanFace, UserRound } from "lucide-react";

import {
  checkInWithQrToken,
  type CheckInActionResult,
  type CheckInFaceInput,
  type CheckInLocationInput,
} from "@/app/actions/checkin";
import StatusPanel from "@/components/checkin/StatusPanel";
import FaceScanModal from "@/components/face/FaceScanModal";
import { GEOLOCATION_OPTIONS } from "@/lib/geo/constants";
import { FACE_MAX_RETRY } from "@/lib/face/constants";

type Props = {
  token: string;
  courseId: string;
  /** ถ้า session เปิด geofence ต้องขอ browser geolocation ก่อน submit */
  requiresLocation: boolean;
  /** user ที่ seed face แล้วต้องสแกนหน้าก่อน submit */
  requiresFace: boolean;
  student: {
    name: string;
    email: string;
    studentId: string | null;
  };
  /** ถ้านศ. เคยเช็คอินคาบนี้แล้ว — โชว์ panel เลยโดยไม่ต้องกด submit */
  existingAttendance: {
    status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
    checkedInAt: string;
    distanceM: number | null;
    accuracyM: number | null;
    faceVerified: boolean;
  } | null;
};

function formatBangkokTime(value: string) {
  return new Date(value).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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

function ResultPanel({ result }: { result: CheckInActionResult }) {
  if (result.ok) {
    const title = result.duplicate
      ? "เช็คชื่อไว้แล้ว"
      : result.status === "LATE"
        ? "เช็คชื่อสำเร็จ - มาสาย"
        : "เช็คชื่อสำเร็จ";

    const baseMessage = result.duplicate
      ? "ระบบพบข้อมูลเช็คชื่อเดิม จึงไม่บันทึกซ้ำ"
      : "ระบบบันทึกเวลาเข้าเรียนด้วยเวลาจากเซิร์ฟเวอร์แล้ว";

    const locationLine = result.locationVerified
      ? ` • ตรวจตำแหน่งแล้ว (ห่างจากห้อง ~${result.locationVerified.distanceM}m)`
      : "";
    const faceLine = result.faceVerified ? " • ยืนยันใบหน้าแล้ว" : "";

    return (
      <StatusPanel
        tone={result.status === "LATE" ? "warning" : "success"}
        title={title}
        message={`${baseMessage}${locationLine}${faceLine}`}
        meta={`เวลา ${formatBangkokTime(result.checkedInAt)} น.`}
      />
    );
  }

  type FailureReason = Extract<CheckInActionResult, { ok: false }>["reason"];
  const copy: Record<FailureReason, { title: string; message: string; tone: "danger" | "warning" | "neutral" }> = {
    invalid: {
      title: "QR ไม่ถูกต้อง",
      message: "กรุณาสแกน QR จากหน้าคาบเรียนล่าสุดอีกครั้ง",
      tone: "danger",
    },
    expired: {
      title: "QR หมดอายุแล้ว",
      message: "QR เปลี่ยนทุก 30 วินาที กรุณาสแกนรอบล่าสุดบนจออาจารย์",
      tone: "warning",
    },
    closed: {
      title: "ปิดการเช็คชื่อแล้ว",
      message: "คาบเรียนนี้ไม่รับการเช็คชื่อเพิ่มเติม",
      tone: "neutral",
    },
    not_enrolled: {
      title: "ยังไม่ได้อยู่ในรายชื่อนักศึกษา",
      message: "บัญชีนี้ไม่ได้ถูก enroll ในรายวิชานี้ จึงเช็คชื่อไม่ได้",
      tone: "danger",
    },
    wrong_role: {
      title: "บัญชีนี้ไม่ใช่นักศึกษา",
      message: "กรุณาเข้าสู่ระบบด้วยบัญชีนักศึกษา",
      tone: "danger",
    },
    unauthorized: {
      title: "กรุณาเข้าสู่ระบบ",
      message: "ต้องเข้าสู่ระบบก่อนเช็คชื่อ",
      tone: "neutral",
    },
    location_required: {
      title: "ต้องเปิดตำแหน่งก่อนเช็คชื่อ",
      message: "คาบนี้ตรวจสอบตำแหน่ง — กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงตำแหน่งแล้วลองใหม่",
      tone: "warning",
    },
    location_invalid: {
      title: "ข้อมูลตำแหน่งไม่ถูกต้อง",
      message: "ระบบไม่สามารถอ่านพิกัดได้ ลองรีเฟรชหน้านี้และกดยืนยันใหม่",
      tone: "danger",
    },
    location_inaccurate: {
      title: "ความแม่นยำของ GPS ต่ำเกินไป",
      message: result.accuracyM
        ? `ความแม่นยำที่วัดได้ ~${result.accuracyM}m — ลองออกใกล้หน้าต่างหรือใช้มือถือเครื่องอื่น`
        : "ลองออกใกล้หน้าต่างหรือใช้มือถือเครื่องอื่น",
      tone: "warning",
    },
    out_of_range: {
      title: "อยู่นอกพื้นที่ห้องเรียน",
      message:
        result.distanceM !== undefined
          ? `วัดได้ห่างจากห้อง ~${result.distanceM}m (ความแม่นยำ ~${result.accuracyM ?? "?"}m) — เช็คชื่อได้เฉพาะในห้องเรียนเท่านั้น`
          : "เช็คชื่อได้เฉพาะในห้องเรียนเท่านั้น",
      tone: "danger",
    },
    face_required: {
      title: "ต้องยืนยันใบหน้าก่อน",
      message: "บัญชีนี้เปิดยืนยันใบหน้า — กรุณาให้กล้องเห็นหน้าและทำตามคำสั่งบนจอ",
      tone: "warning",
    },
    face_invalid: {
      title: "ข้อมูลใบหน้าไม่ถูกต้อง",
      message: "ระบบรับ descriptor ไม่ครบ ลองสแกนใหม่อีกครั้ง",
      tone: "danger",
    },
    face_mismatch: {
      title: "ใบหน้าไม่ตรงกับบัญชีนี้",
      message:
        result.faceDistance !== undefined
          ? `distance=${result.faceDistance.toFixed(2)} (threshold สำหรับ tune) — ลองในแสงสว่างกว่าเดิม หรือ seed รูปใหม่`
          : "หากคุณคือเจ้าของบัญชี กรุณาลองในแสงสว่างกว่าเดิม หรือติดต่ออาจารย์",
      tone: "danger",
    },
  };

  const selected = copy[result.reason];
  return <StatusPanel tone={selected.tone} title={selected.title} message={selected.message} />;
}

export default function StudentCheckInForm({
  token,
  courseId,
  student,
  requiresLocation,
  requiresFace,
  existingAttendance,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckInActionResult | null>(
    existingAttendance
      ? {
          ok: true,
          status: existingAttendance.status,
          checkedInAt: existingAttendance.checkedInAt,
          duplicate: true,
          locationVerified:
            existingAttendance.distanceM !== null
              ? {
                  distanceM: existingAttendance.distanceM,
                  accuracyM: existingAttendance.accuracyM ?? 0,
                }
              : undefined,
          faceVerified: existingAttendance.faceVerified || undefined,
        }
      : null
  );
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [faceRetry, setFaceRetry] = useState(0);
  const [pendingLocation, setPendingLocation] = useState<CheckInLocationInput | undefined>(undefined);

  const initials = useMemo(() => {
    return student.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [student.name]);

  async function handleSubmit() {
    setResult(null);
    setLocationError(null);

    let location: CheckInLocationInput | undefined;
    if (requiresLocation) {
      setLocating(true);
      try {
        const pos = await getPosition();
        location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: Math.round(pos.coords.accuracy),
        };
      } catch (err) {
        // map error → ข้อความเฉพาะแต่ละกรณี (permission / unavailable / timeout)
        if (err instanceof GeolocationPositionError) {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationError(
              "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — กรุณาเปิด permission ในเบราว์เซอร์แล้วลองใหม่"
            );
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setLocationError(
              "ไม่สามารถระบุตำแหน่งได้ — ลองออกใกล้หน้าต่างหรือเปิด WiFi/GPS"
            );
          } else if (err.code === err.TIMEOUT) {
            setLocationError("ระบบขอตำแหน่งนานเกินไป — กดยืนยันอีกครั้ง");
          } else {
            setLocationError("เกิดข้อผิดพลาดขณะขอตำแหน่ง");
          }
        } else {
          setLocationError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        }
        setLocating(false);
        return;
      }
      setLocating(false);
    }

    if (requiresFace) {
      // เปิด FaceScanModal → ได้ descriptor แล้วค่อย submit (handleFaceResult)
      setPendingLocation(location);
      setFaceModalOpen(true);
      return;
    }

    startTransition(async () => {
      const next = await checkInWithQrToken(token, location);
      setResult(next);
    });
  }

  function handleFaceResult(descriptor: number[]) {
    setFaceModalOpen(false);
    const location = pendingLocation;
    startTransition(async () => {
      const next = await checkInWithQrToken(token, location, descriptor as CheckInFaceInput);
      setResult(next);
      if (!next.ok && next.reason === "face_mismatch") {
        setFaceRetry((n) => n + 1);
      }
    });
  }

  function handleFaceCancel() {
    setFaceModalOpen(false);
  }

  const busy = isPending || locating;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-qroll-red-dark to-red-800 text-sm font-black text-white shadow-lg shadow-red-900/20">
            {initials || <UserRound className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-slate-950">{student.name}</p>
            <p className="truncate text-sm text-slate-500">{student.email}</p>
            {student.studentId && (
              <p className="mt-0.5 text-xs font-bold text-slate-400">
                รหัสนักศึกษา {student.studentId}
              </p>
            )}
          </div>
        </div>
      </div>

      {requiresLocation && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="font-medium">
            คาบนี้ตรวจสอบตำแหน่ง — เมื่อกดยืนยัน เบราว์เซอร์จะขออนุญาตเข้าถึงตำแหน่งของคุณ
          </p>
        </div>
      )}

      {requiresFace && (
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">
          <ScanFace className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="font-medium">
            บัญชีนี้ตั้งค่ายืนยันใบหน้า — เมื่อกดยืนยัน เบราว์เซอร์จะขอเปิดกล้องเพื่อสแกนใบหน้า
          </p>
        </div>
      )}

      {faceRetry >= FACE_MAX_RETRY && (
        <StatusPanel
          tone="warning"
          title="ลองหลายครั้งแล้วไม่ผ่าน"
          message="กรุณาติดต่ออาจารย์เพื่อช่วยตรวจสอบตัวตน"
        />
      )}

      {locationError && (
        <StatusPanel tone="warning" title="ขอตำแหน่งไม่สำเร็จ" message={locationError} />
      )}

      {result && <ResultPanel result={result} />}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={busy || Boolean(result?.ok)}
        className="font-inter flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-qroll-red-dark px-4 text-base font-extrabold text-white shadow-lg shadow-red-900/20 transition-all hover:-translate-y-px hover:bg-qroll-red-darker disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
      >
        {locating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังขอตำแหน่ง...
          </>
        ) : isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังเช็คชื่อ...
          </>
        ) : result?.ok ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            บันทึกแล้ว
          </>
        ) : (
          <>
            ยืนยันเข้าเรียน
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      {result?.ok && (
        <Link
          href={`/student/courses/${courseId}`}
          className="font-inter flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-base font-extrabold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <History className="h-5 w-5 text-slate-500" />
          ดูประวัติเช็คชื่อวิชานี้
        </Link>
      )}

      {faceModalOpen && (
        <FaceScanModal
          mode="verify"
          onResult={(r) => handleFaceResult(r.descriptor)}
          onCancel={handleFaceCancel}
        />
      )}
    </div>
  );
}
