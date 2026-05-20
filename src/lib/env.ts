// Environment detection helpers.
//
// ใช้ตัดสินว่ารันอยู่ใน "production deployment จริง" ที่ต้องล็อก feature
// อันตราย (face-seed admin tool, BYPASS_TU_AUTH) ไม่ให้เปิดได้
//
// เลือกใช้ NODE_ENV เป็นหลักแทน VERCEL_ENV เพื่อให้ guard ทำงาน
// บน platform อื่นด้วย (Railway, Netlify, self-host) — VERCEL_ENV จะ
// มีค่าก็ต่อเมื่อ deploy บน Vercel เท่านั้น
//
// ข้อยกเว้นเดียว: Vercel preview build จะตั้ง NODE_ENV=production
// แต่ VERCEL_ENV=preview เราอนุญาตเคสนี้เพื่อให้ใช้ preview deployment
// ทำ demo (seed รูปอาจารย์/นักศึกษาวันโชว์งาน) ได้
export function isProductionDeployment() {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.VERCEL_ENV === "preview") return false;
  return true;
}
