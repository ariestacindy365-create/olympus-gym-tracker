import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Idempotent — only upserts the CRM accounts by email. Never deletes or
// touches existing COACH/MEMBER rows (unlike seed.ts, which wipes the DB).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const pinHash = (pin: string) => bcrypt.hash(pin, 10);

  const sekar = await prisma.user.upsert({
    where: { email: "sekar@olympus.gym" },
    update: {},
    create: { name: "Sekar", email: "sekar@olympus.gym", pinHash: await pinHash("1010"), role: "ADMIN" },
  });

  const esti = await prisma.user.upsert({
    where: { email: "esti@olympus.gym" },
    update: {},
    create: { name: "Esti", email: "esti@olympus.gym", pinHash: await pinHash("2020"), role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "owner@olympus.gym" },
    update: {},
    create: { name: "Owner", email: "owner@olympus.gym", pinHash: await pinHash("9999"), role: "OWNER" },
  });

  await prisma.target.upsert({
    where: { adminId: sekar.id },
    update: {},
    create: { adminId: sekar.id, targetCapture: 5, targetFollowup: 10 },
  });
  await prisma.target.upsert({
    where: { adminId: esti.id },
    update: {},
    create: { adminId: esti.id, targetCapture: 5, targetFollowup: 10 },
  });

  console.log("CRM seed complete.");
  console.log("  Admin: sekar@olympus.gym / 1010");
  console.log("  Admin: esti@olympus.gym  / 2020");
  console.log("  Owner: owner@olympus.gym / 9999");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
