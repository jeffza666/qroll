type Props = {
  code: string | null;
};

export default function EntryCodeCard({ code }: Props) {
  const digits = (code ?? "------").split("");

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>รหัสเข้าเรียน</span>
        <span>6 หลัก</span>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {digits.map((digit, index) => (
          <div
            key={`${digit}-${index}`}
            className="flex aspect-square items-center justify-center rounded-lg bg-slate-950 text-2xl font-black tabular-nums text-white sm:text-3xl"
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
}
