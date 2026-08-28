import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-time migration of the hardcoded price list (from
// SalesScript_Olympus_2026_v1.pdf) into the new Package table now that
// pricing is DB-managed at /leads/packages. Safe to re-run — skips if any
// Package rows already exist.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PRESETS = [
  { name: "Bootcamp 1 Bulan Unlimited", price: 699_000 },
  { name: "Bootcamp 2 Bulan Unlimited", price: 1_299_000 },
  { name: "Bootcamp 3 Bulan Unlimited", price: 1_799_000 },
  { name: "Bootcamp 4x Sesi", price: 349_000 },
  { name: "Bootcamp 8x Sesi", price: 599_000 },
  { name: "Private Training 8x Visit", price: 2_415_000 },
  { name: "Private Training 16x Visit", price: 4_686_000 },
  { name: "Private Training 24x Visit", price: 6_819_000 },
  { name: "Couple Training 8x Visit", price: 3_185_000 },
  { name: "Couple Training 16x Visit", price: 6_198_000 },
  { name: "Couple Training 24x Visit", price: 8_970_000 },
  { name: "Private Group Class 8x Sesi", price: 3_925_000 },
  { name: "Private Group Class 16x Sesi", price: 6_624_000 },
  { name: "Private Group Class 24x Sesi", price: 9_660_000 },
];

async function main() {
  const existing = await prisma.package.count();
  if (existing > 0) {
    console.log(`Package table already has ${existing} row(s), skipping seed.`);
    return;
  }
  for (let i = 0; i < PRESETS.length; i++) {
    await prisma.package.create({ data: { ...PRESETS[i], sortOrder: i } });
  }
  console.log(`Seeded ${PRESETS.length} packages.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
