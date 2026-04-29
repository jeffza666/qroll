/*
  Warnings:

  - Added the required column `scheduleId` to the `ClassSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "scheduleId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Schedule_courseId_idx" ON "Schedule"("courseId");

-- CreateIndex
CREATE INDEX "Schedule_dayOfWeek_idx" ON "Schedule"("dayOfWeek");

-- CreateIndex
CREATE INDEX "ClassSession_scheduleId_idx" ON "ClassSession"("scheduleId");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique index: กัน double-open session ต่อ course (DB-level enforcement)
-- Prisma DSL ไม่รองรับ WHERE clause ใน @@unique จึงต้องเขียน raw SQL ที่นี่
CREATE UNIQUE INDEX "ClassSession_one_open_per_course"
  ON "ClassSession" ("courseId")
  WHERE "isOpen" = true;
