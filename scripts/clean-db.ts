import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting database cleanup...");

  // Delete in order of dependencies to avoid foreign key constraints
  // Vote -> Round -> Battle -> AgentLog -> Agent -> User

  const deletedVotes = await prisma.vote.deleteMany();
  console.log(`Deleted ${deletedVotes.count} votes`);

  const deletedRounds = await prisma.round.deleteMany();
  console.log(`Deleted ${deletedRounds.count} rounds`);

  const deletedBattles = await prisma.battle.deleteMany();
  console.log(`Deleted ${deletedBattles.count} battles`);

  const deletedLogs = await prisma.agentLog.deleteMany();
  console.log(`Deleted ${deletedLogs.count} agent logs`);

  const deletedAgents = await prisma.agent.deleteMany();
  console.log(`Deleted ${deletedAgents.count} agents`);

  const deletedUsers = await prisma.user.deleteMany();
  console.log(`Deleted ${deletedUsers.count} users`);

  console.log("✨ Database cleaned successfully! Ready for production.");
}

main()
  .catch((e) => {
    console.error("❌ Database cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
