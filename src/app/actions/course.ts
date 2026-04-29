"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTeacher, requireCourseOwner } from "@/lib/auth-helpers";

const courseSchema = z.object({
  code: z.string().min(1, "กรุณาระบุรหัสวิชา").max(50),
  name: z.string().min(1, "กรุณาระบุชื่อวิชา").max(200),
  semester: z.string().min(1, "กรุณาระบุภาคการศึกษา").max(20),
});

export async function createCourse(formData: FormData) {
  const user = await requireTeacher();

  const parsed = courseSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    semester: formData.get("semester"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  }

  const { code, name, semester } = parsed.data;

  const course = await db.course.create({
    data: { code, name, semester, teacherId: user.id },
  });

  revalidatePath("/teacher/courses");
  redirect(`/teacher/courses/${course.id}`);
}

export async function deleteCourse(courseId: string) {
  await requireCourseOwner(courseId);

  await db.course.delete({ where: { id: courseId } });

  revalidatePath("/teacher/courses");
  redirect("/teacher/courses");
}
