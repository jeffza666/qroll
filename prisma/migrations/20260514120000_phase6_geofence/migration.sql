-- Phase 6 — Geofence / Location Verification
-- ตามดีไซน์: docs/prps/08-geofence.md
--
-- 1. AnchorSource enum (source ของ anchor ตอนเปิด session)
-- 2. Course: เพิ่ม saved anchor (lat/lng)
-- 3. ClassSession: snapshot anchor + source ตอนเปิด
-- 4. Attendance: distance/accuracy (ไม่เก็บพิกัดนักศึกษาเพื่อ privacy)

-- CreateEnum
CREATE TYPE "AnchorSource" AS ENUM ('COURSE_SAVED', 'TEACHER_CURRENT');

-- AlterTable: Course saved anchor
ALTER TABLE "Course"
    ADD COLUMN "geofenceLat" DOUBLE PRECISION,
    ADD COLUMN "geofenceLng" DOUBLE PRECISION;

-- AlterTable: ClassSession anchor snapshot
ALTER TABLE "ClassSession"
    ADD COLUMN "anchorLat"    DOUBLE PRECISION,
    ADD COLUMN "anchorLng"    DOUBLE PRECISION,
    ADD COLUMN "anchorSource" "AnchorSource";

-- AlterTable: Attendance distance/accuracy audit
ALTER TABLE "Attendance"
    ADD COLUMN "distanceM" INTEGER,
    ADD COLUMN "accuracyM" INTEGER;
