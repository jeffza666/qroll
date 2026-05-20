"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, ScanFace, X } from "lucide-react";

import {
  detectFromImage,
  detectFromVideo,
  getDescriptor,
  getRealScore,
  getYawDeg,
  loadHuman,
} from "@/lib/face/human";
import {
  FACE_LIVENESS_THRESHOLD,
  FACE_LIVENESS_TIMEOUT_MS,
  FACE_YAW_CENTER_DEG,
  FACE_YAW_THRESHOLD_DEG,
} from "@/lib/face/constants";
import type { FaceScanMode, FaceScanResult } from "@/lib/face/types";

type Props = {
  mode: FaceScanMode;
  onResult: (result: FaceScanResult) => void;
  onCancel: () => void;
};

type Phase =
  | "idle"
  | "loading-model"
  | "requesting-camera"
  | "scanning"
  | "challenge-turn"
  | "challenge-center"
  | "captured"
  | "error";

type ChallengeStep = "turn" | "center";

const TURN_PROMPT = "หันหน้าไปทางขวา/ซ้ายช้า ๆ";
const CENTER_PROMPT = "กลับมามองตรง";

export default function FaceScanModal({ mode, onResult, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const challengeStepRef = useRef<ChallengeStep>("turn");

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("กำลังเตรียมระบบ...");
  const [seedBusy, setSeedBusy] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const finish = useCallback(
    (result: FaceScanResult) => {
      stopCamera();
      setPhase("captured");
      onResult(result);
    },
    [onResult, stopCamera],
  );

  const fail = useCallback(
    (msg: string) => {
      stopCamera();
      setPhase("error");
      setErrorMsg(msg);
    },
    [stopCamera],
  );

  // verify: เปิดกล้อง → loop detect → ผ่าน challenge → capture
  useEffect(() => {
    if (mode !== "verify") return;
    let cancelled = false;

    (async () => {
      try {
        setPhase("loading-model");
        setPrompt("กำลังโหลดโมเดล...");
        await loadHuman();
        if (cancelled) return;

        setPhase("requesting-camera");
        setPrompt("กำลังขอกล้อง...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        setPhase("scanning");
        setPrompt("วางใบหน้าให้อยู่ในกรอบ");
        challengeStepRef.current = "turn";
        startTimeRef.current = performance.now();

        const tick = async () => {
          if (cancelled) return;
          if (!videoRef.current) return;

          const elapsed = performance.now() - startTimeRef.current;
          if (elapsed > FACE_LIVENESS_TIMEOUT_MS) {
            fail("หมดเวลา — กรุณาลองใหม่");
            return;
          }

          try {
            const faces = await detectFromVideo(videoRef.current);

            if (faces.length === 0) {
              setPrompt("ไม่พบใบหน้า — ขยับเข้าใกล้กล้องอีก");
            } else if (faces.length > 1) {
              setPrompt("พบหลายใบหน้า — กรุณาให้มีคนเดียวในกล้อง");
            } else {
              const face = faces[0];
              const yawDeg = getYawDeg(face);
              const realScore = getRealScore(face);

              if (challengeStepRef.current === "turn") {
                setPhase("challenge-turn");
                if (Math.abs(yawDeg) > FACE_YAW_THRESHOLD_DEG) {
                  challengeStepRef.current = "center";
                  setPrompt(CENTER_PROMPT);
                } else {
                  setPrompt(TURN_PROMPT);
                }
              } else {
                setPhase("challenge-center");
                if (Math.abs(yawDeg) < FACE_YAW_CENTER_DEG) {
                  // ผ่าน challenge แล้ว — เช็ค passive liveness ก่อน capture
                  // eslint-disable-next-line no-console
                  console.log(
                    `[face] capture liveness=${realScore.toFixed(4)} threshold=${FACE_LIVENESS_THRESHOLD} yaw=${yawDeg.toFixed(1)}`,
                  );
                  if (realScore < FACE_LIVENESS_THRESHOLD) {
                    fail(
                      `ตรวจพบว่าอาจเป็นรูปถ่าย ไม่ใช่หน้าจริง (score=${realScore.toFixed(2)})`,
                    );
                    return;
                  }
                  const descriptor = getDescriptor(face);
                  if (!descriptor) {
                    fail("ไม่สามารถสร้าง descriptor — ลองใหม่");
                    return;
                  }
                  finish({ descriptor, livenessOk: true });
                  return;
                } else {
                  setPrompt(CENTER_PROMPT);
                }
              }
            }
          } catch (err) {
            console.error("face detect tick", err);
          }

          rafRef.current = requestAnimationFrame(() => {
            void tick();
          });
        };

        void tick();
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        const name = (err as { name?: string })?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          fail("ไม่ได้รับอนุญาตให้ใช้กล้อง — กรุณาเปิด permission แล้วลองใหม่");
        } else if (name === "NotFoundError") {
          fail("ไม่พบกล้องในอุปกรณ์นี้");
        } else {
          fail("เปิดกล้องไม่สำเร็จ");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, fail, finish, stopCamera]);

  async function handleFileForSeed(file: File) {
    setSeedBusy(true);
    setErrorMsg(null);
    setPrompt("กำลังโหลดโมเดล...");
    setPhase("loading-model");
    try {
      await loadHuman();
      setPrompt("กำลังประมวลผลรูป...");
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
      });
      const faces = await detectFromImage(img);
      URL.revokeObjectURL(img.src);

      if (faces.length === 0) {
        setPhase("error");
        setErrorMsg("ไม่พบใบหน้าในรูป — ลองรูปที่ชัดกว่านี้");
        return;
      }
      if (faces.length > 1) {
        setPhase("error");
        setErrorMsg("พบหลายใบหน้าในรูป — ใช้รูปที่มีคนเดียว");
        return;
      }
      const descriptor = getDescriptor(faces[0]);
      if (!descriptor) {
        setPhase("error");
        setErrorMsg("ไม่สามารถสร้าง descriptor จากรูปนี้");
        return;
      }
      onResult({ descriptor, livenessOk: false });
      setPhase("captured");
    } catch (err) {
      console.error(err);
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSeedBusy(false);
    }
  }

  function handleCancel() {
    stopCamera();
    onCancel();
  }

  function handleRetry() {
    setErrorMsg(null);
    setPhase("idle");
    // ปิด modal แล้วเปิดใหม่จาก parent (ง่ายกว่า reset state เอง)
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-qroll-red-dark" />
            <h2 className="text-base font-extrabold text-slate-900">
              {mode === "verify" ? "ยืนยันตัวตนด้วยใบหน้า" : "บันทึกรูปจากระบบทะเบียน"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {mode === "verify" ? (
            <>
              <div className="relative overflow-hidden rounded-xl bg-slate-900 aspect-[4/3]">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full scale-x-[-1] object-cover"
                />
                <div className="pointer-events-none absolute inset-6 rounded-full border-4 border-white/40" />
              </div>
              <p className="text-center text-sm font-bold text-slate-800">{prompt}</p>
              {phase === "error" && errorMsg && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {errorMsg}
                </div>
              )}
              <div className="flex gap-2">
                {phase === "error" ? (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-qroll-red-dark px-4 py-3 font-bold text-white hover:bg-qroll-red-darker"
                  >
                    <RefreshCw className="h-4 w-4" />
                    ลองใหม่
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <Camera className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                <p className="mb-3 text-sm text-slate-600">
                  เลือกรูปนักศึกษา (จากระบบทะเบียน TU)
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-qroll-red-dark px-4 py-2 font-bold text-white hover:bg-qroll-red-darker">
                  {seedBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  เลือกไฟล์รูป
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={seedBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFileForSeed(file);
                    }}
                  />
                </label>
              </div>
              {phase === "loading-model" && (
                <p className="text-center text-sm text-slate-600">{prompt}</p>
              )}
              {phase === "error" && errorMsg && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {errorMsg}
                </div>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
