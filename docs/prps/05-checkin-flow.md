# PRP 05 - Student Check-in Flow

> **Phase:** 4.5 (after Phase 4 - Dynamic QR Display)
> **Status:** Approved scope
> **Demo gate:** teacher opens a class session -> QR appears on the projector -> student scans with phone -> if not logged in, login and return to the same check-in URL -> student confirms attendance -> `Attendance` appears in Supabase. For public showcase, visitors use a separate demo route and write to `DemoCheckIn`, never to real attendance.

---

## Goal

Phase 4.5 completes the first end-to-end attendance loop:

1. Teacher opens a class session and displays the dynamic QR from Phase 4.
2. Student scans the QR with a phone.
3. System verifies the QR token, student login, and course enrollment.
4. System records attendance in Supabase using server time.
5. Teacher can see check-ins on the active session screen.

This phase also adds a public demo mode for project showcase. Demo mode lets visitors scan and type a name without a TU student account, but it is deliberately separated from real attendance data.

The important design principle:

> Real attendance must prove identity. Demo check-in must prove the product experience. These are related, but they are not the same data.

---

## User-Facing Result

### Real Student Flow

```text
Scan QR
  -> /checkin?t=<token>
  -> login if needed
  -> return to /checkin?t=<token>
  -> see own student identity from login
  -> tap confirm
  -> see success / late / duplicate / expired / not enrolled
```

### Public Demo Flow

```text
Scan demo QR or open demo URL
  -> /demo/checkin?t=<token>
  -> type display name
  -> tap check in
  -> see demo success
  -> teacher screen shows this under "Demo check-ins"
```

---

## Decisions Summary

| # | Decision | Choice | Why |
| - | -------- | ------ | --- |
| 1 | Real student identity | Use logged-in Auth.js user only | Prevents students from choosing another person's name. Easy to explain: login proves the person. |
| 2 | Real route | `/checkin?t=<token>` | Matches the QR payload prepared in Phase 4. |
| 3 | Demo route | `/demo/checkin?t=<token>` | Keeps public showcase behavior separate from the real student flow. |
| 4 | Demo storage | New `DemoCheckIn` table | Demo visitors must not create fake users, enrollments, or real attendance rows. |
| 5 | Demo availability | `DEMO_CHECKIN_ENABLED=true` | Demo can be enabled for showcase and disabled for real production use without deleting code. |
| 6 | Teacher display | Show real attendance and demo check-ins in separate sections | Good for presentation while keeping data meaning clear. |
| 7 | Mobile priority | Student and demo check-in pages are mobile-first | Students usually scan QR codes with phones. |
| 8 | Mutation pattern | Server Actions | Internal UI mutation fits the project rule; Route Handlers stay for external/API-style callers. |
| 9 | Attendance time | Server time only | Client phone time can be wrong or tampered with. |
| 10 | Duplicate handling | Existing unique `(classSessionId, studentId)` + upsert/unique handling | Prevents double check-in and race conditions. |

---

## Scope

### In Scope

- Real check-in page: `/checkin?t=<token>`
- Demo check-in page: `/demo/checkin?t=<token>`
- Real attendance Server Action
- Demo check-in Server Action
- `DemoCheckIn` Prisma model and migration
- Mobile-first UI states
- Middleware/login return URL fix so query string is preserved
- Teacher session sidebar/list showing:
  - real attendance
  - demo check-ins, clearly labeled
- Supabase-backed smoke test with real rows

### Out Of Scope

- Geofencing
- Face scan
- Manual attendance edit
- Export CSV/PDF
- Student history dashboard polish
- Rate limiting beyond basic validation
- Public unauthenticated writes to real `Attendance`
- Student name picker in the real flow

---

## Why Real Flow Does Not Have "Choose Your Name"

The real system should not ask students to choose their name from a list.

Reason:

- A selected name is not identity proof.
- A logged-in account is identity proof.
- Enrollment proves that the logged-in student belongs to the course.

This makes the system easier to defend in the final presentation:

> The QR identifies the class session, the login identifies the student, and the enrollment table decides whether that student is allowed to check in.

The page can still show the student's name, email, and student ID after login, but those fields are read-only.

---

## Schema Touch Points

### New: `DemoCheckIn`

```prisma
model DemoCheckIn {
  id             String   @id @default(cuid())
  classSessionId String
  displayName    String
  checkedInAt    DateTime @default(now())
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  classSession ClassSession @relation(fields: [classSessionId], references: [id], onDelete: Cascade)

  @@index([classSessionId])
  @@index([checkedInAt])
}
```

### Modify: `ClassSession`

Add relation field:

```prisma
demoCheckIns DemoCheckIn[]
```

### Why A Separate Demo Table

- `Attendance` remains trustworthy academic data.
- Demo visitors do not become fake `User` records.
- Demo visitors do not need `Enrollment`.
- Teacher dashboard can show demo data only where it is useful.
- Reports can ignore demo data by default.

Migration:

```bash
npx prisma migrate dev --name phase45_checkin_flow
```

---

## Environment

Add to `.env.example`:

```env
DEMO_CHECKIN_ENABLED=false
```

Recommended values:

- Local development: `true`
- Showcase deployment: `true`
- Real production use: `false`

If the flag is not set, treat demo mode as disabled.

---

## Route Behavior

### `/checkin?t=<token>`

Access:

- Requires login.
- Student role only for final confirmation.
- If unauthenticated, middleware redirects to login and must preserve full return URL:

```text
/login?from=/checkin?t=<token>
```

Important middleware fix:

- Current middleware preserves only `pathname`.
- Phase 4.5 must preserve `pathname + search`.

Expected page states:

| State | UI |
| ----- | -- |
| Missing token | Invalid QR message |
| Expired token | QR expired, scan the latest code |
| Closed session | Session closed |
| Not logged in | Redirect to login |
| Wrong role | Teacher account cannot check in as student |
| Not enrolled | Not enrolled in this course |
| Ready | Show course + student identity + confirm button |
| Success | Checked in as present |
| Late | Checked in as late |
| Duplicate | Already checked in |

### `/demo/checkin?t=<token>`

Access:

- Public route.
- Only works when `DEMO_CHECKIN_ENABLED=true`.
- Requires valid active QR token.
- Does not require login.

Expected page states:

| State | UI |
| ----- | -- |
| Demo disabled | Demo check-in unavailable |
| Missing token | Invalid demo QR |
| Expired token | QR expired, scan latest code |
| Closed session | Session closed |
| Ready | Name input + check-in button |
| Success | Demo check-in saved with timestamp |

---

## Server Actions

### `checkInWithQrToken(token)`

Responsibilities:

1. Call `requireStudent()`.
2. Validate token with `verifyQrToken(token)`.
3. Load class session with course data.
4. Confirm session is still open.
5. Check `Enrollment` for `studentId` and `courseId`.
6. Compute status:
   - `PRESENT` if `now <= lateAfter` or no `lateAfter`
   - `LATE` if `now > lateAfter`
7. Upsert/create `Attendance`.
8. Return a typed result for the UI.

Suggested result shape:

```ts
type CheckInResult =
  | { ok: true; status: "PRESENT" | "LATE"; checkedInAt: string; duplicate: boolean }
  | { ok: false; reason: "invalid" | "expired" | "closed" | "not_enrolled" | "unauthorized" };
```

### `demoCheckInWithQrToken(token, displayName)`

Responsibilities:

1. Check `DEMO_CHECKIN_ENABLED`.
2. Validate token with `verifyQrToken(token)`.
3. Validate display name with Zod.
4. Insert `DemoCheckIn`.
5. Return success timestamp and course/session context.

Suggested validation:

```ts
const demoCheckInSchema = z.object({
  token: z.string().trim().min(1),
  displayName: z.string().trim().min(1).max(80),
});
```

---

## Data Fetching For Pages

Both pages should show session context before mutation:

- course code
- course name
- room, if available through schedule
- session start/end time
- whether the QR is still valid

Do not expose raw token details beyond what is already in the URL.

---

## Teacher Session Screen

Phase 4 already has `CheckedInSidebar` as a placeholder. Phase 4.5 should connect it to real data.

Recommended display:

```text
Checked in
  12 real students
  - Student A    PRESENT    09:03
  - Student B    LATE       09:21

Demo check-ins
  5 visitors
  - Mint         09:05
  - Bank         09:06
```

Why separate sections:

- Real attendance is for academic records.
- Demo check-ins are for presentation/testing.
- The teacher can still see that public demo scans are reaching Supabase.

Polling:

- Use simple polling from the teacher session page.
- Reuse the MVP approach from Phase 4.
- SSE/WebSocket is not needed in this phase.

---

## Mobile UI Requirements

Student and demo check-in pages must be designed mobile-first:

- Content fits comfortably at 360px width.
- Primary action is reachable without horizontal scrolling.
- Status messages are clear and large enough to read on a phone.
- Avoid dense teacher-dashboard layout on student pages.
- Use short labels and obvious states.

Recommended layout:

```text
[Qroll]
[Course code + name]
[Session time]
[Identity / Name input]
[Primary button]
[Result state]
```

---

## Security Checklist

### Real Attendance

- [ ] Auth checked server-side with `requireStudent()`.
- [ ] QR token verified server-side on every confirm.
- [ ] Enrollment checked before writing `Attendance`.
- [ ] Status computed with server time.
- [ ] Duplicate check-in handled by DB uniqueness.
- [ ] `ipAddress` and `userAgent` stored when possible.
- [ ] No name picker or manual student selection.
- [ ] No unauthenticated write to `Attendance`.

### Demo Check-in

- [ ] Demo route checks `DEMO_CHECKIN_ENABLED`.
- [ ] Demo token must be valid and active.
- [ ] Demo name is validated with Zod.
- [ ] Demo writes only to `DemoCheckIn`.
- [ ] Demo section is clearly labeled on teacher screen.
- [ ] Demo data is excluded from real attendance counts.

---

## Edge Cases

| Case | Expected Behavior |
| ---- | ----------------- |
| Student scans old QR | Show expired state |
| QR rotates while page is open | Confirm action re-verifies token and may ask student to rescan |
| Student scans twice | Show already checked in |
| Student is not enrolled | Show not enrolled; do not write attendance |
| Teacher account opens `/checkin` | Show forbidden/wrong role |
| Session closes before confirm | Show closed state |
| Demo mode disabled | `/demo/checkin` shows unavailable state |
| Visitor submits empty name | Show validation error |
| Visitor submits same name twice | Allow it unless later rate limiting is added; demo names are not identity |

---

## Test Strategy

### A. Real Student Happy Path

1. Enable BYPASS login.
2. Login as teacher.
3. Open a course session and display QR.
4. Login as `test.student@dome.tu.ac.th` in another browser/session.
5. Ensure the student is enrolled in that course.
6. Open `/checkin?t=<current-token>`.
7. Confirm check-in.
8. Verify `Attendance` row appears in Supabase.
9. Verify teacher session screen shows the student.

### B. Real Student Safety

1. Scan the same QR twice -> duplicate state.
2. Use expired token -> expired state.
3. Use a student not enrolled in the course -> not enrolled state.
4. Use teacher account -> wrong role/forbidden state.
5. Close session before confirm -> closed state.

### C. Public Demo

1. Set `DEMO_CHECKIN_ENABLED=true`.
2. Open `/demo/checkin?t=<current-token>`.
3. Type a visitor name.
4. Submit.
5. Verify `DemoCheckIn` row appears in Supabase.
6. Verify no `Attendance`, `User`, or `Enrollment` row is created for that visitor.
7. Verify teacher session screen shows the demo name under "Demo check-ins".

### D. Demo Disabled

1. Set `DEMO_CHECKIN_ENABLED=false`.
2. Open `/demo/checkin?t=<current-token>`.
3. Verify the page refuses demo check-in.

### E. Mobile

1. Test `/checkin` at 360px width.
2. Test `/demo/checkin` at 360px width.
3. Confirm no horizontal scrolling.
4. Confirm primary action and result state are visible and readable.

---

## Tradeoffs

| Decision | Tradeoff Accepted | Why It Is Acceptable |
| -------- | ----------------- | -------------------- |
| Add demo mode in Phase 4.5 | More code now | It supports the required public showcase and proves Supabase writes with real phones. |
| Separate `DemoCheckIn` table | One extra migration/model | Keeps real attendance clean and makes the separation easy to explain. |
| Env flag for demo | One extra configuration value | Allows demo to be disabled without deleting functionality. |
| No student name picker | Less flexible for edge cases | Correct identity is more important than convenience in real attendance. |
| Poll teacher sidebar | Slight delay before teacher sees updates | Simple, Vercel-friendly, and consistent with Phase 4. |
| Allow duplicate demo names | Demo names are not identity | The purpose is visitor experience, not academic tracking. |

---

## Definition Of Done

- [ ] `DemoCheckIn` model and migration added.
- [ ] `.env.example` includes `DEMO_CHECKIN_ENABLED=false`.
- [ ] Middleware preserves query string in login return URL.
- [ ] `/checkin?t=<token>` works after login.
- [ ] Real check-in uses logged-in student identity only.
- [ ] Real check-in checks enrollment before writing attendance.
- [ ] Real check-in writes `Attendance` with server time.
- [ ] Duplicate real check-in returns friendly duplicate state.
- [ ] Expired, closed, wrong role, and not enrolled states are handled.
- [ ] `/demo/checkin?t=<token>` works when demo mode is enabled.
- [ ] Demo check-in writes only to `DemoCheckIn`.
- [ ] Teacher session screen shows real attendance and demo check-ins separately.
- [ ] Student/demo pages are usable on phone-width screens.
- [ ] `npm run build` passes.
- [ ] `STATE.md` is updated with Phase 4.5 result and next step.
