-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "paymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Membership_paymentId_key" ON "Membership"("paymentId");


-- Packages bought in the app already know their payment through the order.
UPDATE "Membership" SET "paymentId" = (SELECT "paymentId" FROM "MembershipOrder" WHERE "MembershipOrder"."id" = "Membership"."orderId")
WHERE "orderId" IS NOT NULL AND "paymentId" IS NULL;
