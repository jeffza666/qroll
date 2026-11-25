/** Late counts as half a presence. Excused sessions are left out of the rate. */
export const LATE_WEIGHT = 0.5;
export const ATTENDANCE_SAFE_PCT = 80;
export const ATTENDANCE_WARN_PCT = 60;

export type AttendanceMark = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type RiskBand = "none" | "safe" | "warn" | "danger";

export type SessionMark = {
  startsAt: Date;
  status: AttendanceMark | null;
};

export type AttendanceTotals = {
  present: number;
  late: number;
  absent: number;
  excused: number;
  applicable: number;
  counted: number;
  pct: number | null;
  band: RiskBand;
};

export function statusForCheckIn(now: Date, lateAfter: Date | null): "PRESENT" | "LATE" {
  if (lateAfter && now.getTime() >= lateAfter.getTime()) return "LATE";
  return "PRESENT";
}

export function attendanceRate(input: {
  present: number;
  late: number;
  counted: number;
}): number | null {
  if (input.counted <= 0) return null;
  return Math.round(
    ((input.present + input.late * LATE_WEIGHT) / input.counted) * 100,
  );
}

export function riskBand(pct: number | null): RiskBand {
  if (pct === null) return "none";
  if (pct >= ATTENDANCE_SAFE_PCT) return "safe";
  if (pct >= ATTENDANCE_WARN_PCT) return "warn";
  return "danger";
}

/**
 * Closed sessions that started before the student joined stay blank.
 * A closed session with no attendance row counts as absent.
 */
export function cellForSession(
  enrolledAt: Date,
  session: SessionMark,
): AttendanceMark | null {
  if (session.startsAt.getTime() < enrolledAt.getTime()) return null;
  return session.status ?? "ABSENT";
}

export function summarizeMarks(marks: readonly (AttendanceMark | null)[]): AttendanceTotals {
  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;

  for (const mark of marks) {
    if (mark === "PRESENT") present += 1;
    else if (mark === "LATE") late += 1;
    else if (mark === "ABSENT") absent += 1;
    else if (mark === "EXCUSED") excused += 1;
  }

  const applicable = present + late + absent + excused;
  const counted = applicable - excused;
  const pct = attendanceRate({ present, late, counted });

  return {
    present,
    late,
    absent,
    excused,
    applicable,
    counted,
    pct,
    band: riskBand(pct),
  };
}

export function summarizeEnrollment(enrolledAt: Date, sessions: readonly SessionMark[]) {
  return summarizeMarks(sessions.map((session) => cellForSession(enrolledAt, session)));
}

/**
 * Students who joined after the session are excluded.
 * Everyone else with no row is absent.
 */
export function summarizeSession(input: {
  startsAt: Date;
  students: readonly { enrolledAt: Date; status: AttendanceMark | null }[];
}) {
  return summarizeMarks(
    input.students.map((student) =>
      cellForSession(student.enrolledAt, {
        startsAt: input.startsAt,
        status: student.status,
      }),
    ),
  );
}

export type RosterEntry = { studentId: string; enrolledAt: Date };

export type ClosedSession = {
  startsAt: Date;
  attendances: readonly { studentId: string; status: AttendanceMark }[];
};

function statusOf(session: ClosedSession, studentId: string) {
  return session.attendances.find((row) => row.studentId === studentId)?.status ?? null;
}

/** Rows from students who are no longer on the roster are ignored. */
export function summarizeClosedSession(roster: readonly RosterEntry[], session: ClosedSession) {
  return summarizeSession({
    startsAt: session.startsAt,
    students: roster.map((entry) => ({
      enrolledAt: entry.enrolledAt,
      status: statusOf(session, entry.studentId),
    })),
  });
}

/** Mean of each student's own rate. Students with nothing counted yet are skipped. */
export function averageRate(pcts: readonly (number | null)[]): number | null {
  const values = pcts.filter((pct): pct is number => pct !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, pct) => sum + pct, 0) / values.length);
}

export function studentRates(
  roster: readonly RosterEntry[],
  sessions: readonly ClosedSession[],
): (number | null)[] {
  return roster.map(
    (entry) =>
      summarizeEnrollment(
        entry.enrolledAt,
        sessions.map((session) => ({
          startsAt: session.startsAt,
          status: statusOf(session, entry.studentId),
        })),
      ).pct,
  );
}
