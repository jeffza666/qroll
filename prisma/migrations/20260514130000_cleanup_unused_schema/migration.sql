-- Cleanup unused schema (post Phase 6)
-- เหตุผล: ลบของที่ไม่ได้ใช้จริงเพื่อให้ schema สะท้อนระบบจริงในรายงานจบ
--
-- 1. NextAuth adapter tables — ระบบใช้ JWT strategy, ไม่เคยถูกเขียน
-- 2. forensics columns (ipAddress, userAgent) — เขียนแต่ไม่มีโค้ดอ่าน
-- 3. AnchorSource.TEACHER_CURRENT — ถูก deprecate กลาง Phase 6 (verified 0 rows)

-- 1. Drop NextAuth adapter tables (no code references PrismaAdapter)
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";

-- 2. Drop forensics columns (no code reads these)
ALTER TABLE "Attendance"
    DROP COLUMN "ipAddress",
    DROP COLUMN "userAgent";

ALTER TABLE "DemoCheckIn"
    DROP COLUMN "ipAddress",
    DROP COLUMN "userAgent";

-- 3. Remove TEACHER_CURRENT from AnchorSource enum
-- Postgres pattern: create new type, swap column, drop old type, rename
CREATE TYPE "AnchorSource_new" AS ENUM ('COURSE_SAVED');
ALTER TABLE "ClassSession"
    ALTER COLUMN "anchorSource" TYPE "AnchorSource_new"
    USING ("anchorSource"::text::"AnchorSource_new");
DROP TYPE "AnchorSource";
ALTER TYPE "AnchorSource_new" RENAME TO "AnchorSource";
