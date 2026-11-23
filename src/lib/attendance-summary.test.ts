import assert from "node:assert/strict";
import test from "node:test";

import {
  attendanceRate,
  cellForSession,
  riskBand,
  statusForCheckIn,
  summarizeEnrollment,
  summarizeSession,
} from "./attendance-summary.ts";

const enrolled = new Date("2026-11-01T00:00:00.000Z");
const before = new Date("2026-10-01T00:00:00.000Z");
const during = new Date("2026-11-16T02:00:00.000Z");

test("check-in is late only at or after lateAfter", () => {
  const lateAfter = new Date("2026-11-23T02:15:00.000Z");
  assert.equal(statusForCheckIn(new Date("2026-11-23T02:14:59.000Z"), lateAfter), "PRESENT");
  assert.equal(statusForCheckIn(lateAfter, lateAfter), "LATE");
  assert.equal(statusForCheckIn(lateAfter, null), "PRESENT");
});

test("late counts as half and excused sessions drop out of the rate", () => {
  assert.equal(attendanceRate({ present: 1, late: 1, counted: 2 }), 75);
  assert.equal(attendanceRate({ present: 0, late: 0, counted: 0 }), null);
});

test("risk bands follow the 80 and 60 thresholds", () => {
  assert.equal(riskBand(null), "none");
  assert.equal(riskBand(80), "safe");
  assert.equal(riskBand(60), "warn");
  assert.equal(riskBand(59), "danger");
});

test("a closed session with no row is absent, and earlier sessions stay blank", () => {
  const summary = summarizeEnrollment(enrolled, [
    { startsAt: before, status: null },
    { startsAt: during, status: null },
    { startsAt: during, status: "PRESENT" },
    { startsAt: during, status: "EXCUSED" },
  ]);

  assert.equal(cellForSession(enrolled, { startsAt: before, status: null }), null);
  assert.equal(summary.absent, 1);
  assert.equal(summary.present, 1);
  assert.equal(summary.excused, 1);
  assert.equal(summary.counted, 2);
  assert.equal(summary.pct, 50);
});

test("session totals ignore students who joined later", () => {
  const summary = summarizeSession({
    startsAt: during,
    students: [
      { enrolledAt: enrolled, status: null },
      { enrolledAt: new Date("2026-12-01T00:00:00.000Z"), status: null },
      { enrolledAt: enrolled, status: "LATE" },
    ],
  });

  assert.equal(summary.absent, 1);
  assert.equal(summary.late, 1);
  assert.equal(summary.applicable, 2);
  assert.equal(summary.pct, 25);
});
