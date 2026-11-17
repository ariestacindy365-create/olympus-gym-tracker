-- CreateTable
CREATE TABLE "ImportedMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'FITQUARTER',
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "birthDate" DATETIME,
    "joinedAt" DATETIME,
    "userId" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportedMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Membership" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Membership_importedMemberId_fkey" FOREIGN KEY ("importedMemberId") REFERENCES "ImportedMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportedMember_externalId_key" ON "ImportedMember"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedMember_userId_key" ON "ImportedMember"("userId");

-- CreateIndex
CREATE INDEX "ImportedMember_email_idx" ON "ImportedMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_sourceRef_key" ON "Membership"("sourceRef");

-- CreateIndex
CREATE INDEX "Membership_userId_expiresAt_idx" ON "Membership"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Membership_importedMemberId_idx" ON "Membership"("importedMemberId");
