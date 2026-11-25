import assert from "node:assert/strict";
import test from "node:test";

import { haversineDistanceM, isValidLatLng } from "./haversine.ts";

test("haversine distance is zero at one point and about 111.2 km per degree at the equator", () => {
  const origin = { lat: 0, lng: 0 };
  assert.equal(haversineDistanceM(origin, origin), 0);
  assert.equal(haversineDistanceM(origin, { lat: 0, lng: 1 }), 111195);
});

test("lat/lng validation rejects out-of-range and non-numeric values", () => {
  assert.equal(isValidLatLng({ lat: 14.07, lng: 100.6 }), true);
  assert.equal(isValidLatLng({ lat: 91, lng: 0 }), false);
  assert.equal(isValidLatLng({ lat: 0, lng: Number.NaN }), false);
  assert.equal(isValidLatLng(null), false);
});
