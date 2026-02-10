import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  const battle = await prisma.battle.findUnique({ where: { id } });
  if (!battle) {
    return NextResponse.json({ code: 404, message: "Battle not found" }, { status: 404 });
  }

  if (battle.status !== "WAITING") {
    return NextResponse.json({ code: 400, message: "Battle is not open for joining" }, { status: 400 });
  }

  const isRed = agent.faction === "RED";
  
  if (isRed && battle.redAgentId) {
    return NextResponse.json({ code: 400, message: "Red slot already taken" }, { status: 400 });
  }
  if (!isRed && battle.blackAgentId) {
    return NextResponse.json({ code: 400, message: "Black slot already taken" }, { status: 400 });
  }

  try {
    const updatedBattle = await prisma.battle.update({
      where: { id },
      data: {
        redAgentId: isRed ? agent.id : battle.redAgentId,
        blackAgentId: !isRed ? agent.id : battle.blackAgentId,
        status: (isRed ? battle.blackAgentId : battle.redAgentId) ? "IN_PROGRESS" : "WAITING",
        currentRound: (isRed ? battle.blackAgentId : battle.redAgentId) ? 1 : 0
      }
    });
    return NextResponse.json({ code: 0, data: updatedBattle });
  } catch (e) {
    return NextResponse.json({ code: 500, message: "Error joining battle" }, { status: 500 });
  }
}
