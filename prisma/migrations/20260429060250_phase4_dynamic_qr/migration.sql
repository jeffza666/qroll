-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "entryCode" TEXT,
ADD COLUMN     "entryCodePrev" TEXT,
ADD COLUMN     "qrPrevToken" TEXT,
ADD COLUMN     "qrPrevTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ClassSession_qrPrevToken_idx" ON "ClassSession"("qrPrevToken");

-- CreateIndex
CREATE INDEX "ClassSession_entryCode_idx" ON "ClassSession"("entryCode");
