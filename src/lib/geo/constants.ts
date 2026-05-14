// Phase 6 — Geofence configuration constants
// ดีไซน์เต็มอยู่ที่ docs/prps/08-geofence.md (Decisions Summary)

/**
 * รัศมีพื้นฐานที่นักศึกษาต้องอยู่จาก anchor (เมตร)
 * คงที่ทั้งระบบเพื่อให้ defendable; เปิด config per-course ทีหลังได้
 */
export const GEOFENCE_RADIUS_M = 150;

/**
 * Accuracy threshold ฝั่งอาจารย์ตอนเลือก "ใช้ตำแหน่งปัจจุบัน" เป็น anchor
 * - <= GOOD_M = ผ่านไม่มีคำเตือน
 * - <= POOR_M = ผ่านพร้อมเตือน (laptop GPS เพี้ยน, แนะนำ saved)
 * - >  POOR_M = block ไม่ให้ใช้เป็น anchor (กัน anchor ผิดจะ block ทั้งห้อง)
 */
export const TEACHER_ACCURACY_GOOD_M = 50;
export const TEACHER_ACCURACY_POOR_M = 150;

/**
 * เพดาน accuracy ของนักศึกษาที่ยอมรับเข้า distance check
 * ถ้า accuracy แย่กว่านี้ = บอก client retry แทนที่จะใช้ buffer จนรัศมีบาน
 */
export const STUDENT_ACCURACY_MAX_M = 200;

/**
 * Geolocation API options ตอนขอจาก browser
 */
export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};
