"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";

import SessionDangerZone from "./SessionDangerZone";

type Props = {
  sessionId: string;
  courseCode: string;
  dayLabel: string;
  timeLabel: string;
};

export default function SessionMoreMenu({ sessionId, courseCode, dayLabel, timeLabel }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          title="เพิ่มเติม"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              ลบ Session
            </button>
          </div>
        )}
      </div>

      <SessionDangerZone
        sessionId={sessionId}
        courseCode={courseCode}
        dayLabel={dayLabel}
        timeLabel={timeLabel}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
