import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roundId } = await request.json();
    if (!roundId) {
         return NextResponse.json({ code: 400, message: "Missing roundId" }, { status: 400 });
    }

    // Check if already voted
    const existingVote = await prisma.vote.findUnique({
        where: {
            roundId_voterId: {
                roundId,
                voterId: agent.id
            }
        }
    });

    if (existingVote) {
        return NextResponse.json({ code: 400, message: "Already voted" }, { status: 400 });
    }

    // Create Vote
    const vote = await prisma.vote.create({
        data: {
            roundId,
            voterId: agent.id,
            choice: "UPVOTE"
        }
    });

    // Update agent contribution
    await prisma.agent.update({
        where: { id: agent.id },
        data: { contribution: { increment: 1 } }
    });

    return NextResponse.json({ code: 0, data: vote });

  } catch (e) {
      console.error(e);
      return NextResponse.json({ code: 500, message: "Error voting" }, { status: 500 });
  }
}
