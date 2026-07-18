import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function epley1RM(weight: number, reps: number): number {
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}

function dateKey(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function recordTopSet(params: {
  memberId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  daysAgo: number;
  note?: string;
}) {
  const { memberId, exerciseId, weight, reps, daysAgo, note } = params;
  const estimated1RM = epley1RM(weight, reps);
  const workoutDate = dateKey(daysAgo);

  const setEntry = await prisma.setEntry.create({
    data: { memberId, exerciseId, workoutDate, setNumber: 1, weight, reps, estimated1RM, note },
  });

  let isPR = false;

  const currentMaxWeight = await prisma.personalRecord.findUnique({
    where: { memberId_exerciseId_type: { memberId, exerciseId, type: "MAX_WEIGHT" } },
  });
  if (!currentMaxWeight || weight > currentMaxWeight.weight) {
    await prisma.personalRecord.upsert({
      where: { memberId_exerciseId_type: { memberId, exerciseId, type: "MAX_WEIGHT" } },
      create: { memberId, exerciseId, type: "MAX_WEIGHT", weight, reps, estimated1RM, setEntryId: setEntry.id, achievedAt: workoutDate },
      update: { weight, reps, estimated1RM, setEntryId: setEntry.id, achievedAt: workoutDate },
    });
    isPR = true;
  }

  const currentMax1RM = await prisma.personalRecord.findUnique({
    where: { memberId_exerciseId_type: { memberId, exerciseId, type: "MAX_1RM" } },
  });
  if (!currentMax1RM || estimated1RM > currentMax1RM.estimated1RM) {
    await prisma.personalRecord.upsert({
      where: { memberId_exerciseId_type: { memberId, exerciseId, type: "MAX_1RM" } },
      create: { memberId, exerciseId, type: "MAX_1RM", weight, reps, estimated1RM, setEntryId: setEntry.id, achievedAt: workoutDate },
      update: { weight, reps, estimated1RM, setEntryId: setEntry.id, achievedAt: workoutDate },
    });
    isPR = true;
  }

  if (isPR) {
    await prisma.setEntry.update({ where: { id: setEntry.id }, data: { isPR: true } });
  }
}

async function main() {
  // Fresh slate: this is a local demo DB, safe to wipe and reseed.
  await prisma.personalRecord.deleteMany();
  await prisma.setEntry.deleteMany();
  await prisma.dailyWorkout.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.user.deleteMany();

  const pinHash = (pin: string) => bcrypt.hash(pin, 10);

  const coachCindy = await prisma.user.create({
    data: { name: "Coach Cindy", email: "cindy@olympus.gym", pinHash: await pinHash("1234"), role: "COACH" },
  });
  await prisma.user.create({
    data: { name: "Coach Ari", email: "ari@olympus.gym", pinHash: await pinHash("5678"), role: "COACH" },
  });
  const alex = await prisma.user.create({
    data: { name: "Alex Stone", email: "alex@olympus.gym", pinHash: await pinHash("1111"), role: "MEMBER" },
  });
  await prisma.user.create({
    data: { name: "Jamie Cruz", email: "jamie@olympus.gym", pinHash: await pinHash("2222"), role: "MEMBER" },
  });
  await prisma.user.create({
    data: { name: "Sam Reyes", email: "sam@olympus.gym", pinHash: await pinHash("3333"), role: "MEMBER" },
  });

  const exerciseNames = [
    "Back Squat",
    "Front Squat",
    "Barbell Bench Press",
    "Incline Dumbbell Press",
    "Overhead Press",
    "Deadlift",
    "BB Stiff Leg Deadlift",
    "Romanian Deadlift",
    "Barbell Row",
    "Pull-up",
    "Lat Pulldown",
    "Leg Press",
    "Calf Raise",
    "Barbell Curl",
    "Triceps Pushdown",
    "Cable Row",
    "Dumbbell Shoulder Press",
    "Leg Extension",
  ];

  const exerciseIds = new Map<string, string>();
  for (const name of exerciseNames) {
    const exercise = await prisma.exercise.create({ data: { name } });
    exerciseIds.set(name, exercise.id);
  }
  const exId = (name: string) => exerciseIds.get(name)!;

  // Today's movement, broadcast to every member by the coach.
  await prisma.dailyWorkout.create({
    data: {
      workoutDate: dateKey(0),
      exerciseId: exId("BB Stiff Leg Deadlift"),
      coachId: coachCindy.id,
    },
  });

  // Backfill a few days of history for Alex so History/PRs/Records aren't empty.
  await recordTopSet({ memberId: alex.id, exerciseId: exId("Back Squat"), weight: 90, reps: 6, daysAgo: 6 });
  await recordTopSet({
    memberId: alex.id,
    exerciseId: exId("Barbell Bench Press"),
    weight: 60,
    reps: 8,
    daysAgo: 5,
    note: "form rapi",
  });
  await recordTopSet({ memberId: alex.id, exerciseId: exId("Deadlift"), weight: 110, reps: 5, daysAgo: 4 });
  await recordTopSet({ memberId: alex.id, exerciseId: exId("Overhead Press"), weight: 35, reps: 8, daysAgo: 3 });
  await recordTopSet({
    memberId: alex.id,
    exerciseId: exId("Back Squat"),
    weight: 95,
    reps: 6,
    daysAgo: 2,
    note: "PR!",
  });
  await recordTopSet({ memberId: alex.id, exerciseId: exId("Barbell Row"), weight: 62.5, reps: 8, daysAgo: 1 });

  console.log("Seed complete.");
  console.log("  Coach:  cindy@olympus.gym / 1234");
  console.log("  Coach:  ari@olympus.gym   / 5678");
  console.log("  Member: alex@olympus.gym  / 1111  (has topset history + PRs)");
  console.log("  Member: jamie@olympus.gym / 2222");
  console.log("  Member: sam@olympus.gym   / 3333");
  console.log("  Today's movement: BB Stiff Leg Deadlift");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
