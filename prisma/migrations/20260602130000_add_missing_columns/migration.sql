-- AlterTable: User — add isSuperAdmin, assignedCityId, subZone, boutiqueId
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "assignedCityId" TEXT;
ALTER TABLE "User" ADD COLUMN "subZone" TEXT;
ALTER TABLE "User" ADD COLUMN "boutiqueId" TEXT;

-- AlterTable: Customer — add blacklist fields
ALTER TABLE "Customer" ADD COLUMN "blacklisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "blacklistReason" TEXT;
ALTER TABLE "Customer" ADD COLUMN "blacklistedAt" DATETIME;

-- AlterTable: Order — add delivery scheduling fields
ALTER TABLE "Order" ADD COLUMN "deliveryScheduledAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "deliveryPaidByClient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Notification — add userId for per-user targeting
ALTER TABLE "Notification" ADD COLUMN "userId" TEXT;

-- CreateTable: TeamRequest
CREATE TABLE "TeamRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetName" TEXT,
    "requestData" TEXT,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Customer_blacklisted_idx" ON "Customer"("blacklisted");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "TeamRequest_status_idx" ON "TeamRequest"("status");
