-- AlterTable
ALTER TABLE "User" ADD COLUMN "memberCode" TEXT;

-- CreateTable
CREATE TABLE "ClassBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "classDate" DATETIME NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "membershipId" TEXT,
    "checkedInAt" DATETIME,
    "addedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassBooking_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClassBooking_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "quota" INTEGER NOT NULL DEFAULT 12,
    "cancelHours" INTEGER NOT NULL DEFAULT 2,
    "daysAhead" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ClassBooking_classDate_sessionId_status_idx" ON "ClassBooking"("classDate", "sessionId", "status");

-- CreateIndex
CREATE INDEX "ClassBooking_userId_classDate_idx" ON "ClassBooking"("userId", "classDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClassBooking_userId_classDate_sessionId_key" ON "ClassBooking"("userId", "classDate", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_memberCode_key" ON "User"("memberCode");

