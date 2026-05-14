// Phase 6 — Haversine great-circle distance
// คำนวณระยะห่างระหว่าง 2 พิกัด lat/lng บนพื้นโลก (ทรงกลม)
// ใช้สำหรับ server-side distance check ตอน student check-in
// อ้างอิงสูตร: https://en.wikipedia.org/wiki/Haversine_formula

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export type LatLng = { lat: number; lng: number };

/** ระยะห่างเป็นเมตร (ปัดเศษเป็นจำนวนเต็มเพื่อเก็บ DB) */
export function haversineDistanceM(a: LatLng, b: LatLng): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.round(EARTH_RADIUS_M * c);
}

/**
 * Validate lat/lng range — กัน garbage จาก client
 */
export function isValidLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== "object") return false;
  const v = value as { lat?: unknown; lng?: unknown };
  return (
    typeof v.lat === "number" &&
    typeof v.lng === "number" &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng) &&
    v.lat >= -90 &&
    v.lat <= 90 &&
    v.lng >= -180 &&
    v.lng <= 180
  );
}
