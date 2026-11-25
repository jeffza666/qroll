import assert from "node:assert/strict";
import test from "node:test";

import { findHeader, normalizeStudentIdCell, rowsFromCells } from "./roster-import.ts";

test("roster headers match Thai and English column names", () => {
  const header = findHeader([
    ["วิชา", "CS101"],
    ["รหัสนักศึกษา", "ชื่อ-นามสกุล"],
  ]);
  assert.deepEqual(header, { rowIndex: 1, studentIdColumn: 0, nameColumn: 1 });
});

test("rows keep the source spreadsheet row and collapse spacing", () => {
  const rows = rowsFromCells([
    ["Student ID", "Full Name"],
    [6500000001, "  สมชาย   ใจดี  "],
    ["", ""],
    ["6500000002", "สมหญิง ใจดี"],
  ]);

  assert.equal(normalizeStudentIdCell(6500000001), "6500000001");
  assert.deepEqual(rows, [
    { studentId: "6500000001", name: "สมชาย ใจดี", sourceRow: 2 },
    { studentId: "6500000002", name: "สมหญิง ใจดี", sourceRow: 4 },
  ]);
});

test("a sheet without both columns fails loudly", () => {
  assert.throws(() => rowsFromCells([["ชื่อ"], ["สมชาย"]]), /ไม่พบคอลัมน์/);
});
