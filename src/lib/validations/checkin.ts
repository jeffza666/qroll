import { z } from "zod";

export const qrTokenSchema = z.string().trim().min(1);

export const demoCheckInSchema = z.object({
  token: qrTokenSchema,
  displayName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(80, "ชื่อยาวเกินไป"),
});
