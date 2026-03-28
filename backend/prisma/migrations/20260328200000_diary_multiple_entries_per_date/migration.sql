-- DropUnique: allow multiple diary rows per user per calendar date (each submit = new row)
DROP INDEX IF EXISTS "DiaryEntry_userId_entryDate_key";

-- CreateIndex
CREATE INDEX "DiaryEntry_userId_entryDate_idx" ON "DiaryEntry"("userId", "entryDate");
