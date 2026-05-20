"use client";

// Human library client singleton
// Lazy-load model on first call เพื่อกัน load TF.js ทุกครั้งเปิด page

import type Human from "@vladmandic/human";
import type { Config, Result } from "@vladmandic/human";

type HumanFace = Result["face"][number];

let humanInstance: Human | null = null;
let loadPromise: Promise<Human> | null = null;

const humanConfig: Partial<Config> = {
  // ใช้ CDN ของ Human เพื่อไม่ต้อง host models เอง
  modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models/",
  backend: "webgl",
  warmup: "none",
  cacheSensitivity: 0,
  face: {
    enabled: true,
    detector: { rotation: true, maxDetected: 2, minConfidence: 0.5, return: false },
    mesh: { enabled: true },
    iris: { enabled: false },
    description: { enabled: true }, // embedding ~1024 dim
    emotion: { enabled: false },
    antispoof: { enabled: true }, // → face.real
    liveness: { enabled: true }, // → face.live (optional secondary signal)
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
};

export async function loadHuman(): Promise<Human> {
  if (humanInstance) return humanInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const mod = await import("@vladmandic/human");
    const HumanClass = (mod as { default: typeof Human }).default;
    const instance = new HumanClass(humanConfig);
    await instance.load();
    humanInstance = instance;
    return instance;
  })();

  return loadPromise;
}

export async function detectFromVideo(
  video: HTMLVideoElement,
): Promise<HumanFace[]> {
  const human = await loadHuman();
  const result = await human.detect(video);
  return result.face;
}

export async function detectFromImage(
  img: HTMLImageElement | HTMLCanvasElement,
): Promise<HumanFace[]> {
  const human = await loadHuman();
  const result = await human.detect(img);
  return result.face;
}

export function getDescriptor(face: HumanFace): number[] | null {
  if (!face.embedding || face.embedding.length === 0) return null;
  return Array.from(face.embedding);
}

export function getYawDeg(face: HumanFace): number {
  // Human gives yaw in radians (rotation.angle.yaw)
  const yawRad = face.rotation?.angle?.yaw ?? 0;
  return (yawRad * 180) / Math.PI;
}

export function getRealScore(face: HumanFace): number {
  return face.real ?? 0;
}
