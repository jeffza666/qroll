import assert from "node:assert/strict";
import test from "node:test";

import {
  attendanceRate,
  averageRate,
  cellForSession,
  riskBand,
  statusForCheckIn,
  studentRates,
  summarizeClosedSession,
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

const early = new Date("2026-11-02T02:00:00.000Z");
const late = new Date("2026-11-20T02:00:00.000Z");
const roster = [
  { studentId: "a", enrolledAt: enrolled },
  { studentId: "b", enrolledAt: new Date("2026-11-10T00:00:00.000Z") },
];
const sessions = [
  {
    startsAt: early,
    attendances: [
      { studentId: "a", status: "PRESENT" as const },
      { studentId: "dropped", status: "PRESENT" as const },
    ],
  },
  { startsAt: late, attendances: [{ studentId: "b", status: "PRESENT" as const }] },
];

test("a student who joined later is not marked absent for earlier sessions", () => {
  assert.deepEqual(studentRates(roster, sessions), [50, 100]);
});

test("rows from students no longer on the roster are ignored", () => {
  const summary = summarizeClosedSession(roster, sessions[0]);
  assert.equal(summary.present, 1);
  assert.equal(summary.applicable, 1);
  assert.equal(summary.pct, 100);
});

test("course average is the mean of each student's rate", () => {
  assert.equal(averageRate([50, 100]), 75);
  assert.equal(averageRate([null, 80]), 80);
  assert.equal(averageRate([]), null);
});
