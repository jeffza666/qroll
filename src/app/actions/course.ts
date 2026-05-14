"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTeacher, requireCourseOwner } from "@/lib/auth-helpers";
import { TIME_HHMM } from "@/lib/validations/schedule";

// Schedule row schema สำหรับ batch input ใน CourseForm
// id: ถ้ามี = update แถวเดิม / ถ้าไม่มี = create แถวใหม่
const scheduleRowSchema = z
  .object({
    id: z.string().optional().nullable(),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_HHMM, "รูปแบบเวลาต้องเป็น HH:MM"),
    endTime: z.string().regex(TIME_HHMM, "รูปแบบเวลาต้องเป็น HH:MM"),
    room: z.string().max(50).optional().nullable(),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "เวลาเริ่มต้องอยู่ก่อนเวลาจบ",
  });

const courseSchema = z.object({
  code: z.string().min(1, "กรุณาระบุรหัสวิชา").max(50),
  section: z.string().max(20).optional().nullable(),
  name: z.string().min(1, "กรุณาระบุชื่อวิชา").max(200),
  semester: z.string().min(1, "กรุณาระบุภาคการศึกษา").max(20),
  schedules: z.array(scheduleRowSchema).default([]),
  // Phase 6: optional ตอนสร้าง — ถ้ายังไม่อยู่ห้องจริง ให้ข้ามแล้วตั้งทีหลังในหน้า edit
  geofenceLat: z.number().min(-90).max(90).optional().nullable(),
  geofenceLng: z.number().min(-180).max(180).optional().nullable(),
});

function parseCourseFormData(formData: FormData) {
  const rawSection = formData.get("section");
  const rawSchedules = formData.get("schedules");
  let schedulesParsed: unknown = [];
  if (typeof rawSchedules === "string" && rawSchedules.trim() !== "") {
    try {
      schedulesParsed = JSON.parse(rawSchedules);
    } catch {
      throw new Error("ข้อมูลตารางสอนไม่ถูกต้อง");
    }
  }

  // Phase 6: geofenceLat/Lng เป็น optional — empty string → null, ไม่งั้นแปลงเป็น float
  const rawLat = formData.get("geofenceLat");
  const rawLng = formData.get("geofenceLng");
  const parseCoord = (raw: FormDataEntryValue | null) => {
    if (raw === null) return null;
    const s = String(raw).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const parsed = courseSchema.safeParse({
    code: formData.get("code"),
    section:
      rawSection && String(rawSection).trim() !== "" ? rawSection : null,
    name: formData.get("name"),
    semester: formData.get("semester"),
    schedules: schedulesParsed,
    geofenceLat: parseCoord(rawLat),
    geofenceLng: parseCoord(rawLng),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  }
  return parsed.data;
}

export async function createCourse(formData: FormData) {
  const user = await requireTeacher();
  const { code, section, name, semester, schedules, geofenceLat, geofenceLng } =
    parseCourseFormData(formData);

  // กัน partial geofence (ต้องมาคู่กันเสมอ) — ถ้าขาดอันใดอันหนึ่ง = ไม่บันทึก anchor
  const hasAnchor = geofenceLat != null && geofenceLng != null;

  const course = await db.course.create({
    data: {
      code,
      section: section ?? null,
      name,
      semester,
      teacherId: user.id,
      geofenceLat: hasAnchor ? geofenceLat : null,
      geofenceLng: hasAnchor ? geofenceLng : null,
      schedules: {
        create: schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room && s.room.trim() !== "" ? s.room : null,
        })),
      },
    },
  });

  revalidatePath("/teacher/courses");
  redirect(`/teacher/courses/${course.id}`);
}

export async function updateCourse(courseId: string, formData: FormData) {
  await requireCourseOwner(courseId);
  const { code, section, name, semester, schedules } =
    parseCourseFormData(formData);

  // Upsert pattern: match แถวเดิมด้วย id → update in place
  // แถวที่ไม่มี id → create ใหม่
  // แถวเดิมที่ไม่ได้อยู่ใน payload → delete (FK เป็น SetNull แล้ว จึงปลอดภัย —
  //   session ที่ผูกอยู่จะกลายเป็น ad-hoc แต่ roomSnapshot ยังอยู่)
  const existing = await db.schedule.findMany({
    where: { courseId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((s) => s.id));
  const incomingIds = new Set(
    schedules.map((s) => s.id).filter((id): id is string => Boolean(id))
  );
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

  const toCreate = schedules.filter((s) => !s.id);
  const toUpdate = schedules.filter(
    (s): s is typeof s & { id: string } => Boolean(s.id) && existingIds.has(s.id!)
  );

  const normalizeRoom = (room: string | null | undefined) =>
    room && room.trim() !== "" ? room : null;

  await db.$transaction([
    // 1. ลบแถวที่ user ลบออก
    ...(toDelete.length > 0
      ? [db.schedule.deleteMany({ where: { id: { in: toDelete } } })]
      : []),
    // 2. อัปเดต course fields + create แถวใหม่
    db.course.update({
      where: { id: courseId },
      data: {
        code,
        section: section ?? null,
        name,
        semester,
        schedules: {
          create: toCreate.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            room: normalizeRoom(s.room),
          })),
        },
      },
    }),
    // 3. อัปเดตแถวเดิมทีละ row (รักษา id ไว้ → session ที่ผูกอยู่ไม่หลุด link)
    ...toUpdate.map((s) =>
      db.schedule.update({
        where: { id: s.id },
        data: {
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: normalizeRoom(s.room),
        },
      })
    ),
  ]);

  revalidatePath(`/teacher/courses/${courseId}`);
  revalidatePath("/teacher/courses");
  redirect(`/teacher/courses/${courseId}`);
}

/**
 * Hard delete course — ลบเฉพาะเมื่อยังไม่มี ClassSession ใด ๆ
 * เหตุผล: ถ้ามี session แล้ว = มีบันทึก attendance ของนักศึกษา
 * เป็น academic record ที่ไม่ควรลบ user ต้องใช้ archive แทน
 */
export async function deleteCourse(courseId: string) {
  await requireCourseOwner(courseId);

  const counts = await db.course.findUnique({
    where: { id: courseId },
    select: { _count: { select: { classSessions: true } } },
  });
  if (!counts) return { error: "ไม่พบรายวิชา" };

  if (counts._count.classSessions > 0) {
    return {
      error:
        "ลบไม่ได้: รายวิชานี้มี session แล้ว — กรุณาใช้ Archive แทนเพื่อเก็บ academic record",
    };
  }

  // Schedule.courseId มี onDelete: Restrict (กัน schedule หลุดโดยไม่ตั้งใจตอน update)
  // → ต้องลบ schedule ก่อนใน transaction เดียวกัน
  // Enrollment ใช้ Cascade อยู่แล้วเลยลบเองอัตโนมัติ
  await db.$transaction([
    db.schedule.deleteMany({ where: { courseId } }),
    db.course.delete({ where: { id: courseId } }),
  ]);

  revalidatePath("/teacher/courses");
  revalidatePath("/teacher");
  return { success: true };
}

/** Archive course — soft hide: ซ่อนจาก default view, เปิด session ใหม่ไม่ได้ */
export async function archiveCourse(courseId: string) {
  await requireCourseOwner(courseId);

  await db.course.update({
    where: { id: courseId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/teacher/courses");
  revalidatePath(`/teacher/courses/${courseId}`);
  revalidatePath("/teacher");
  return { success: true };
}

/** Unarchive — กลับสู่สถานะ active */
export async function unarchiveCourse(courseId: string) {
  await requireCourseOwner(courseId);

  await db.course.update({
    where: { id: courseId },
    data: { archivedAt: null },
  });

  revalidatePath("/teacher/courses");
  revalidatePath(`/teacher/courses/${courseId}`);
  revalidatePath("/teacher");
  return { success: true };
}

// ============================================
// Phase 6 — Course geofence anchor
// ดีไซน์: docs/prps/08-geofence.md
// ============================================

const courseGeofenceSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * บันทึก anchor ของห้องเรียน — อาจารย์ตั้งครั้งเดียวด้วยมือถือในห้องจริง
 * ไม่ตรวจ accuracy ฝั่ง server เพราะ accuracy ตรวจที่ client (UI เตือน/บล็อก) — server เก็บแค่พิกัด
 */
export async function saveCourseGeofence(
  courseId: string,
  input: { lat: number; lng: number }
) {
  await requireCourseOwner(courseId);

  const parsed = courseGeofenceSchema.safeParse(input);
  if (!parsed.success) return { error: "พิกัดไม่ถูกต้อง" };

  await db.course.update({
    where: { id: courseId },
    data: {
      geofenceLat: parsed.data.lat,
      geofenceLng: parsed.data.lng,
    },
  });

  revalidatePath(`/teacher/courses/${courseId}/edit`);
  revalidatePath(`/teacher/courses/${courseId}`);
  return { success: true };
}

export async function clearCourseGeofence(courseId: string) {
  await requireCourseOwner(courseId);

  await db.course.update({
    where: { id: courseId },
    data: { geofenceLat: null, geofenceLng: null },
  });

  revalidatePath(`/teacher/courses/${courseId}/edit`);
  revalidatePath(`/teacher/courses/${courseId}`);
  return { success: true };
}
