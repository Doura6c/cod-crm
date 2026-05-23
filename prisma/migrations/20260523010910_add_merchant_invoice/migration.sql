-- CreateTable
CREATE TABLE "MerchantInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "totalGross" REAL NOT NULL DEFAULT 0,
    "totalProducts" REAL NOT NULL DEFAULT 0,
    "fraisHMP" REAL NOT NULL DEFAULT 0,
    "netMarchand" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "paidAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MerchantInvoice_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantInvoice_reference_key" ON "MerchantInvoice"("reference");
