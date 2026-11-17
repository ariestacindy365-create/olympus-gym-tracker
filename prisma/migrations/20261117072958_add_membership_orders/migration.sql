-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "userId" TEXT;

-- CreateTable
CREATE TABLE "MembershipOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "packageName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "credits" INTEGER,
    "durationDays" INTEGER,
    "durationMonths" INTEGER,
    "uniqueCode" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "waNumber" TEXT,
    "senderName" TEXT,
    "proofImageFileId" TEXT,
    "proofImageData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MembershipOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MembershipOrder_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GymPaymentInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "bankName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL DEFAULT '',
    "qrisImage" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "importedMemberId" TEXT,
    "packageName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "canBook" BOOLEAN NOT NULL,
    "credits" INTEGER,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "sourceRef" TEXT,
    "orderId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Membership_importedMemberId_fkey" FOREIGN KEY ("importedMemberId") REFERENCES "ImportedMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MembershipOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Membership" ("canBook", "createdAt", "credits", "creditsUsed", "expiresAt", "id", "importedMemberId", "kind", "packageName", "sourceRef", "startsAt", "updatedAt", "userId") SELECT "canBook", "createdAt", "credits", "creditsUsed", "expiresAt", "id", "importedMemberId", "kind", "packageName", "sourceRef", "startsAt", "updatedAt", "userId" FROM "Membership";
DROP TABLE "Membership";
ALTER TABLE "new_Membership" RENAME TO "Membership";
CREATE UNIQUE INDEX "Membership_sourceRef_key" ON "Membership"("sourceRef");
CREATE UNIQUE INDEX "Membership_orderId_key" ON "Membership"("orderId");
CREATE INDEX "Membership_userId_expiresAt_idx" ON "Membership"("userId", "expiresAt");
CREATE INDEX "Membership_importedMemberId_idx" ON "Membership"("importedMemberId");
CREATE TABLE "new_Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "durationDays" INTEGER,
    "durationMonths" INTEGER,
    "kind" TEXT,
    "credits" INTEGER,
    "showInApp" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "fineprint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Package" ("createdAt", "durationDays", "id", "isActive", "name", "price", "sortOrder", "updatedAt") SELECT "createdAt", "durationDays", "id", "isActive", "name", "price", "sortOrder", "updatedAt" FROM "Package";
DROP TABLE "Package";
ALTER TABLE "new_Package" RENAME TO "Package";
CREATE INDEX "Package_isActive_idx" ON "Package"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MembershipOrder_status_idx" ON "MembershipOrder"("status");

-- CreateIndex
CREATE INDEX "MembershipOrder_userId_idx" ON "MembershipOrder"("userId");


-- Data: the 2026 price list, sold in the member app (the owner can edit or hide them).
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-bc-unl-1','Bootcamp Unlimited 1 Bulan',699000,30,1,'BOOTCAMP_UNLIMITED',NULL,true,'Bootcamp Class','Unlimited sesi, 1x latihan per hari.',true,101,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-bc-unl-2','Bootcamp Unlimited 2 Bulan',1299000,60,2,'BOOTCAMP_UNLIMITED',NULL,true,'Bootcamp Class','Unlimited sesi, 1x latihan per hari. Bisa freeze 1 minggu, 1x.',true,102,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-bc-unl-3','Bootcamp Unlimited 3 Bulan',1799000,90,3,'BOOTCAMP_UNLIMITED',NULL,true,'Bootcamp Class','Unlimited sesi, 1x latihan per hari. Bisa freeze 1 minggu, 2x.',true,103,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-bc-4x','Bootcamp 4x Sesi',349000,NULL,NULL,'NO_EXPIRY',4,true,'Bootcamp Class','Paket sesi, tidak hangus.',true,104,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-bc-8x','Bootcamp 8x Sesi',599000,NULL,NULL,'NO_EXPIRY',8,true,'Bootcamp Class','Paket sesi, tidak hangus.',true,105,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-pg-8x','Private Group 8x Sesi',3925000,35,NULL,'PT',8,true,'Private Group Class','Berlaku 5 minggu. Harga untuk satu kelas, maksimal 5 orang.',true,111,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-pg-16x','Private Group 16x Sesi',6624000,70,NULL,'PT',16,true,'Private Group Class','Berlaku 10 minggu. Harga untuk satu kelas, maksimal 5 orang. Bisa freeze 1 minggu, 1x.',true,112,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-pg-24x','Private Group 24x Sesi',9660000,105,NULL,'PT',24,true,'Private Group Class','Berlaku 15 minggu. Harga untuk satu kelas, maksimal 5 orang. Bisa freeze 1 minggu, 2x.',true,113,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-pt-8x','Private Training 8x Visit',2415000,28,NULL,'PT',8,true,'Private Training','Berlaku 4 minggu. Latihan 1 on 1 bareng pelatih.',true,121,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-pt-16x','Private Training 16x Visit',4686000,56,NULL,'PT',16,true,'Private Training','Berlaku 8 minggu. Latihan 1 on 1 bareng pelatih. Bisa freeze 1 minggu, 1x.',true,122,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-pt-24x','Private Training 24x Visit',6819000,98,NULL,'PT',24,true,'Private Training','Berlaku 14 minggu. Latihan 1 on 1 bareng pelatih. Bisa freeze 1 minggu, 2x.',true,123,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-ct-8x','Couple Training 8x Visit',3185000,28,NULL,'PT',8,true,'Couple Training','Berlaku 4 minggu. Untuk 2 orang (tidak harus suami-istri).',true,131,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-ct-16x','Couple Training 16x Visit',6198000,56,NULL,'PT',16,true,'Couple Training','Berlaku 8 minggu. Untuk 2 orang (tidak harus suami-istri).',true,132,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Package" ("id","name","price","durationDays","durationMonths","kind","credits","showInApp","category","fineprint","isActive","sortOrder","createdAt","updatedAt") VALUES ('pl-ct-24x','Couple Training 24x Visit',8970000,98,NULL,'PT',24,true,'Couple Training','Berlaku 14 minggu. Untuk 2 orang (tidak harus suami-istri).',true,133,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- Data: where members transfer to (the owner can change it).
INSERT OR IGNORE INTO "GymPaymentInfo" ("id","bankName","accountNumber","accountName","updatedAt") VALUES (1,'BCA','045-093-5247','Rian Ardiansyah',CURRENT_TIMESTAMP);
