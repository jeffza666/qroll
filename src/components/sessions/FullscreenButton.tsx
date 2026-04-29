"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

type Props = {
  targetRef: RefObject<HTMLElement | null>;
};

export default function FullscreenButton({ targetRef }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    }

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [targetRef]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await targetRef.current?.requestFullscreen();
  }

  const Icon = isFullscreen ? Minimize2 : Maximize2;

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      title={isFullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
