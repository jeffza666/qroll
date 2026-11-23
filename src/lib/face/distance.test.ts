import assert from "node:assert/strict";
import test from "node:test";

import { euclideanDistance } from "./distance.ts";

test("identical descriptors have distance 0 after L2 normalization", () => {
  assert.equal(euclideanDistance([3, 0, 0], [6, 0, 0]), 0);
});

test("orthogonal unit vectors are sqrt(2) apart", () => {
  const distance = euclideanDistance([1, 0], [0, 2]);
  assert.ok(Math.abs(distance - Math.SQRT2) < 1e-12);
});

test("different descriptor lengths are rejected", () => {
  assert.throws(() => euclideanDistance([1, 0], [1, 0, 0]), /length mismatch/);
});
