function l2Normalize(v: number[]): number[] {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum);
  if (norm === 0) return v.slice();
  const out = new Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

// Human faceres embedding ไม่ normalized ต้อง L2 ก่อนเทียบ
// หลัง normalize ค่าจะอยู่ในช่วง [0, 2]
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`descriptor length mismatch: ${a.length} vs ${b.length}`);
  }
  const na = l2Normalize(a);
  const nb = l2Normalize(b);
  let sum = 0;
  for (let i = 0; i < na.length; i++) {
    const diff = na[i] - nb[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
