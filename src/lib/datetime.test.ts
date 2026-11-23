import assert from "node:assert/strict";
import test from "node:test";

import { bangkokDayOfWeek, bangkokParts, formatBangkokTime } from "./datetime.ts";

test("Bangkok calendar does not follow the server timezone", () => {
  const justBeforeMidnight = new Date("2026-11-22T16:59:00.000Z");
  const justAfterMidnight = new Date("2026-11-22T17:30:00.000Z");

  const sunday = bangkokParts(justBeforeMidnight);
  assert.equal(sunday.day, 22);
  assert.equal(sunday.month, 11);
  assert.equal(sunday.year, 2026);
  assert.equal(sunday.hour, 23);
  assert.equal(sunday.minute, 59);
  assert.equal(sunday.dayOfWeek, 0);

  const monday = bangkokParts(justAfterMidnight);
  assert.equal(monday.day, 23);
  assert.equal(monday.dayOfWeek, 1);
  assert.equal(bangkokDayOfWeek(justAfterMidnight), 1);
  assert.equal(formatBangkokTime(justAfterMidnight), "00:30");
});
