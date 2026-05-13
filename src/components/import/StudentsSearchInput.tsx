"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

/**
 * Search input ที่ debounce update URL `?q=...` แล้วให้ server filter ที่ DB
 *
 * ทำไม server-side filter (ไม่ใช่ client filter):
 * - รายชื่อนศ. อาจเกิน 100 คน → ส่ง full list ลง client เปลือง bandwidth
 * - Filter ใน Postgres เร็วกว่า + ใช้ index ได้
 */
export default function StudentsSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  // Debounce 300ms → update URL → page re-fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      const next = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${next ? `?${next}` : ""}`);
      });
    }, 300);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:w-80">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ค้นหาชื่อ หรือ รหัสนักศึกษา..."
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm shadow-sm transition-shadow focus:border-[#990000] focus:outline-none focus:ring-1 focus:ring-[#990000]"
      />
      {isPending && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      )}
    </div>
  );
}
