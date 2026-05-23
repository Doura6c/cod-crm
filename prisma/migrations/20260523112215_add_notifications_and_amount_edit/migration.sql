-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN "amountEditNote" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "amountEditedAt" DATETIME;
ALTER TABLE "Delivery" ADD COLUMN "amountEditedById" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "originalAmount" REAL;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
