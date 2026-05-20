// Face scan configuration constants
// ดีไซน์เต็มอยู่ที่ docs/prps/09-face-scan.md

// L2-normalized Euclidean ระหว่าง descriptor ใน DB กับที่ scan
// ต่ำ = strict (false-reject เยอะ), สูง = หลวม (false-accept เยอะ)
//
// ที่เทสบน iPhone 13:
//   ตัวเอง รูปปัจจุบัน: 0.52, 0.54, 0.52, 0.52, 0.68
//   ตัวเอง รูปบัตร นศ. (~4 ปี): 0.80, 0.82
//   พี่ชาย vs รูปปัจจุบัน: 0.91, 0.95
//   พี่ชาย vs รูปบัตร: 1.13
//   อาจารย์: 1.10, 1.12
//
// ลอง 0.6 / 0.8 / 1.0 มาแล้ว 0.8 ตัด self+รูปบัตรทิ้ง, 1.0 หลวมเกินพี่ชายผ่าน
// 0.85 พอดี — รูปบัตรยังผ่าน, พี่ชายไม่ผ่าน
export const FACE_MATCH_THRESHOLD = 0.85;

// face.real score จาก Human — > THRESHOLD = หน้าจริง ไม่ใช่รูปถ่าย/หน้าจอ
// ลด 0.7 → 0.6 หลังเทสกับใบหน้าสูงอายุ + แสงปกติ score มักอยู่ 0.6-0.7 false-reject เยอะ
// active liveness (yaw challenge) ยังกันรูปแบนได้อยู่
export const FACE_LIVENESS_THRESHOLD = 0.6;

/**
 * Active liveness — มุม yaw (องศา) ที่ใช้สั่ง "หันซ้าย/ขวา"
 * |yaw| > YAW_THRESHOLD_DEG = หันสำเร็จ
 * |yaw| < YAW_CENTER_DEG = กลับมาตรงพร้อม capture
 */
export const FACE_YAW_THRESHOLD_DEG = 20;
export const FACE_YAW_CENTER_DEG = 10;

/**
 * Timeout ของ active liveness ทั้ง flow (ms) — กันค้าง
 */
export const FACE_LIVENESS_TIMEOUT_MS = 15_000;

/**
 * จำนวน retry สูงสุดต่อ check-in
 */
export const FACE_MAX_RETRY = 3;

/**
 * ความยาว descriptor ที่ Human ให้กลับมา — ใช้ validate input ฝั่ง server
 */
export const FACE_DESCRIPTOR_LENGTH = 1024;

// admin seed page = mock layer แทน TU photo API
// production จริงปิด flag — sync ผ่าน TU API ไม่ใช่อัพเอง
// pattern เดียวกับ DEMO_CHECKIN_ENABLED
export function isFaceSeedEnabled() {
  return process.env.ENABLE_FACE_SEED === "true";
}
