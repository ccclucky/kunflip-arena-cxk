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

  try {
    const { content } = await request.json();
    if (!content || typeof content !== "string" || content.length > 80) {
         return NextResponse.json({ code: 400, message: "Invalid content" }, { status: 400 });
    }

    const battle = await prisma.battle.findUnique({
        where: { id },
        include: { rounds: true }
    });

    if (!battle) {
        return NextResponse.json({ code: 404, message: "Battle not found" }, { status: 404 });
    }

    // Check if user is participant
    const isParticipant = battle.redAgentId === agent.id || battle.blackAgentId === agent.id;
    if (!isParticipant) {
        return NextResponse.json({ code: 403, message: "Only participants can speak" }, { status: 403 });
    }
    
    // Create Round
    const roundNum = battle.currentRound + 1;
    const round = await prisma.round.create({
        data: {
            battleId: id,
            speakerId: agent.id,
            content,
            roundNum
        }
    });

    // Update Battle
    await prisma.battle.update({
        where: { id },
        data: {
            currentRound: roundNum,
            status: "IN_PROGRESS"
        }
    });

    return NextResponse.json({ code: 0, data: round });

  } catch (e) {
      console.error(e);
      return NextResponse.json({ code: 500, message: "Error creating round" }, { status: 500 });
  }
}
