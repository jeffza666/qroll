import { Role } from "@prisma/client";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth-helpers";
import { isFaceSeedEnabled } from "@/lib/face/constants";

import FaceSeedClient from "./FaceSeedClient";

export const dynamic = "force-dynamic";

export default async function FaceSeedPage() {
  // production จะปิด flag — sync ผ่าน TU API ไม่ใช่หน้านี้
  if (!isFaceSeedEnabled()) notFound();
  await requireTeacher();

  const students = await db.user.findMany({
    where: { role: Role.STUDENT },
    orderBy: [{ studentId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      studentId: true,
      faceEnrolledAt: true,
      faceDescriptor: true,
    },
  });

  const items = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    studentId: s.studentId,
    faceEnrolledAt: s.faceEnrolledAt ? s.faceEnrolledAt.toISOString() : null,
    hasFace: s.faceDescriptor.length > 0,
  }));

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-xl font-extrabold text-slate-900">
            Face Seed (จำลอง TU Photo Sync)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            หน้านี้จำลองการดึงรูปจากระบบทะเบียน TU
            ในระบบจริงจะ sync ผ่าน API; ใน prototype นี้อาจารย์อัปโหลดรูปแทน
            ระบบจะแปลงรูปเป็น descriptor (~1024 ตัวเลข) แล้วเก็บแค่ตัวเลข
            <strong> ไม่เก็บรูปต้นฉบับ</strong>
          </p>
        </header>

        <FaceSeedClient students={items} />
      </div>
    </div>
  );
}
