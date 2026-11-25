import assert from "node:assert/strict";
import test from "node:test";

import { buildAttendanceCsv, escapeCsvCell } from "./report-csv.ts";

test("csv cells quote commas, quotes, and newlines", () => {
  assert.equal(escapeCsvCell("plain"), "plain");
  assert.equal(escapeCsvCell('say "hi", now'), '"say ""hi"", now"');
  assert.equal(escapeCsvCell("line\nbreak"), '"line\nbreak"');
});

test("attendance csv marks a missing session as a dash and a no-show as absent", () => {
  const csv = buildAttendanceCsv(
    [{ label: "จ 23 พ.ย." }],
    [
      {
        studentId: "6500000001",
        name: "นักศึกษา, ทดสอบ",
        cells: ["ABSENT"],
        presentCount: 0,
        lateCount: 0,
        absentCount: 1,
        excusedCount: 0,
        pct: 0,
      },
      {
        studentId: null,
        name: "ก่อนลงทะเบียน",
        cells: [null],
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
        pct: null,
      },
    ],
  );

  assert.match(csv, /"นักศึกษา, ทดสอบ",ขาด,0,0,1,0,0%/);
  assert.match(csv, /-,ก่อนลงทะเบียน,-,0,0,0,0,-/);
});
