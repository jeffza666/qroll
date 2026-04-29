-- CreateTable
CREATE TABLE "DemoCheckIn" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoCheckIn_classSessionId_idx" ON "DemoCheckIn"("classSessionId");

-- CreateIndex
CREATE INDEX "DemoCheckIn_checkedInAt_idx" ON "DemoCheckIn"("checkedInAt");

-- AddForeignKey
ALTER TABLE "DemoCheckIn" ADD CONSTRAINT "DemoCheckIn_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
