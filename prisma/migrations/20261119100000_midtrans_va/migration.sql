-- AlterTable
ALTER TABLE "MembershipOrder" ADD COLUMN "gatewayOrderId" TEXT;
ALTER TABLE "MembershipOrder" ADD COLUMN "vaBank" TEXT;
ALTER TABLE "MembershipOrder" ADD COLUMN "vaBillerCode" TEXT;
ALTER TABLE "MembershipOrder" ADD COLUMN "vaExpiresAt" DATETIME;
ALTER TABLE "MembershipOrder" ADD COLUMN "vaNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MembershipOrder_gatewayOrderId_key" ON "MembershipOrder"("gatewayOrderId");

