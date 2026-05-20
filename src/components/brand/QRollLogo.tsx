type QRollLogoProps = {
  size?: "sm" | "md";
  showTagline?: boolean;
};

export default function QRollLogo({
  size = "md",
  showTagline = true,
}: QRollLogoProps) {
  const markSize = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const wordSize = size === "sm" ? "text-xl" : "text-2xl";
  const taglineSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${markSize} flex shrink-0 items-center justify-center rounded-xl bg-qroll-red-dark text-white shadow-md`}
        aria-hidden="true"
      >
        <svg
          className={`${iconSize} text-white`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <path d="M9 9h.01" />
          <path d="M15 9h.01" />
        </svg>
      </div>
      <div className="min-w-0">
        <div
          className={`${wordSize} font-inter font-bold leading-none tracking-tight text-slate-900`}
        >
          QRoll<span className="text-qroll-red-dark">.</span>
        </div>
        {showTagline && (
          <div
            className={`${taglineSize} -mt-0.5 font-inter font-medium uppercase tracking-wider text-slate-500`}
          >
            Smart Attendance
          </div>
        )}
      </div>
    </div>
  );
}
