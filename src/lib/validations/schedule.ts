import { z } from "zod";

export const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createScheduleSchema = z
  .object({
    courseId: z.string().cuid("courseId ไม่ถูกต้อง"),
    dayOfWeek: z.coerce
      .number()
      .int()
      .min(0, "dayOfWeek ต้องอยู่ระหว่าง 0-6")
      .max(6, "dayOfWeek ต้องอยู่ระหว่าง 0-6"),
    startTime: z
      .string()
      .regex(TIME_HHMM, "รูปแบบเวลาต้องเป็น HH:MM (24 ชั่วโมง)"),
    endTime: z
      .string()
      .regex(TIME_HHMM, "รูปแบบเวลาต้องเป็น HH:MM (24 ชั่วโมง)"),
    room: z
      .string()
      .max(50, "ชื่อห้องยาวเกิน 50 ตัวอักษร")
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "เวลาเริ่มต้องอยู่ก่อนเวลาจบ",
    path: ["endTime"],
  });

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
