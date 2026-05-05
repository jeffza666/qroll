-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "ClassSession_qrPrevToken_idx";

-- AlterTable
ALTER TABLE "ClassSession"
DROP COLUMN IF EXISTS "entryCodePrev",
DROP COLUMN IF EXISTS "qrPrevToken",
DROP COLUMN IF EXISTS "qrPrevTokenExpiresAt",
DROP COLUMN IF EXISTS "qrRefreshedAt",
DROP COLUMN IF EXISTS "qrTokenExpiresAt";
