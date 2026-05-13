-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'EXCUSED';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "droppedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Enrollment_droppedAt_idx" ON "Enrollment"("droppedAt");
