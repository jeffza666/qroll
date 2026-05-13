-- DropForeignKey
ALTER TABLE "ClassSession" DROP CONSTRAINT "ClassSession_scheduleId_fkey";

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "roomSnapshot" TEXT;

-- Backfill roomSnapshot จาก schedule ปัจจุบัน — เพื่อให้ session เก่ายังมีห้องโชว์
UPDATE "ClassSession" cs
SET "roomSnapshot" = s."room"
FROM "Schedule" s
WHERE cs."scheduleId" = s."id" AND s."room" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
