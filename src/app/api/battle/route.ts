import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";

const prisma = new PrismaClient();

// GET: List active battles
export async function GET() {
  try {
    const battles = await prisma.battle.findMany({
      where: {
        status: { in: ["WAITING", "IN_PROGRESS"] }
      },
      include: {
        redAgent: true,
        blackAgent: true,
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ code: 0, data: battles });
  } catch (e) {
    return NextResponse.json({ code: 500, message: "Error fetching battles" }, { status: 500 });
  }
}

// POST: Create a new battle
export async function POST() {
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  // Check if agent is already in an active battle
  const activeBattle = await prisma.battle.findFirst({
    where: {
      status: { in: ["WAITING", "IN_PROGRESS"] },
      OR: [
        { redAgentId: agent.id },
        { blackAgentId: agent.id }
      ]
    }
  });

  if (activeBattle) {
    return NextResponse.json({ code: 400, message: "You are already in an active battle", data: activeBattle }, { status: 400 });
  }

  try {
    const isRed = agent.faction === "RED";
    const battle = await prisma.battle.create({
      data: {
        status: "WAITING",
        redAgentId: isRed ? agent.id : undefined,
        blackAgentId: !isRed ? agent.id : undefined,
        currentRound: 1,
      }
    });
    return NextResponse.json({ code: 0, data: battle });
  } catch (e) {
    return NextResponse.json({ code: 500, message: "Error creating battle" }, { status: 500 });
  }
}
