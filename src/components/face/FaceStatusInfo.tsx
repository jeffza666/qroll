import { CheckCircle2, Info, ScanFace } from "lucide-react";

type Props = {
  hasFace: boolean;
  enrolledAt: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FaceStatusInfo({ hasFace, enrolledAt }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ScanFace className="h-5 w-5 text-qroll-red-dark" />
        <h2 className="text-base font-extrabold text-slate-900">การยืนยันตัวตนด้วยใบหน้า</h2>
      </div>

      {hasFace ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">พร้อมใช้งาน</p>
              <p className="mt-0.5 text-xs">
                ระบบใช้รูปจากระบบทะเบียน TU สำหรับยืนยันตัวตน
                <br />
                Sync ล่าสุด: {formatDate(enrolledAt)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            เมื่อเช็คชื่อ ระบบจะขอเปิดกล้องเพื่อเทียบใบหน้ากับรูปต้นทาง
            <strong> ระบบไม่เก็บรูปของคุณ</strong> เก็บเพียง descriptor (ค่าตัวเลข) ที่ใช้เทียบเท่านั้น
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">ยังไม่ได้ sync รูปจากระบบทะเบียน</p>
              <p className="mt-0.5 text-xs">
                ระบบจะข้ามการตรวจสอบใบหน้า ใช้ QR + ตำแหน่งเท่านั้น
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            หากต้องการให้ระบบยืนยันใบหน้า กรุณาติดต่ออาจารย์เพื่อ sync รูปจากระบบทะเบียน TU
          </p>
        </div>
      )}
    </section>
  );
}
