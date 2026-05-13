-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "graceMinutes" INTEGER,
ALTER COLUMN "scheduleId" DROP NOT NULL;
