-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "faceVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "faceDescriptor" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "faceEnrolledAt" TIMESTAMP(3);
