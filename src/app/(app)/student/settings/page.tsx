import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth-helpers";
import FaceStatusInfo from "@/components/face/FaceStatusInfo";
import PageHeader from "@/components/shell/PageHeader";

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage() {
  const user = await requireStudent();

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      studentId: true,
      faceDescriptor: true,
      faceEnrolledAt: true,
    },
  });

  return (
    <>
    <PageHeader>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-black text-slate-900">ตั้งค่า</h1>
        <p className="truncate text-sm text-slate-500">ข้อมูลบัญชีและการยืนยันตัวตน</p>
      </div>
    </PageHeader>
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-extrabold text-slate-900">ข้อมูลบัญชี</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">ชื่อ</dt>
            <dd className="font-bold text-slate-900">{profile?.name ?? "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">รหัส นศ.</dt>
            <dd className="font-bold text-slate-900">{profile?.studentId ?? "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">อีเมล</dt>
            <dd className="font-bold text-slate-900">{profile?.email ?? "-"}</dd>
          </div>
        </dl>
      </section>

      <FaceStatusInfo
        hasFace={(profile?.faceDescriptor.length ?? 0) > 0}
        enrolledAt={profile?.faceEnrolledAt ? profile.faceEnrolledAt.toISOString() : null}
      />
      </div>
    </div>
    </>
  );
}
