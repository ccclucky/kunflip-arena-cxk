
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking for duplicate rounds...");

  const rounds = await prisma.round.findMany({
    orderBy: { createdAt: "asc" }
  });

  const seen = new Set<string>();
  const duplicates = [];

  for (const r of rounds) {
    const key = `${r.battleId}-${r.roundNum}`;
    if (seen.has(key)) {
      duplicates.push(r.id);
    } else {
      seen.add(key);
    }
  }

  console.log(`Found ${duplicates.length} duplicate rounds.`);

  if (duplicates.length > 0) {
    console.log("Deleting duplicates...");
    const result = await prisma.round.deleteMany({
      where: {
        id: { in: duplicates }
      }
    });
    console.log(`Deleted ${result.count} rounds.`);
  } else {
    console.log("No duplicates found.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
