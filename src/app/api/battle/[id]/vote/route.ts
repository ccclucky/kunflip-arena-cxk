import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id; // battleId
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  const { roundId, choice } = await request.json(); // choice: "UPVOTE"

  if (!roundId || !choice) {
    return NextResponse.json({ code: 400, message: "Missing parameters" }, { status: 400 });
  }

  try {
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
        return NextResponse.json({ code: 409, message: "Already voted" }, { status: 409 });
    }

    await prisma.vote.create({
        data: {
            roundId,
            voterId: agent.id,
            choice
        }
    });

    return NextResponse.json({ code: 0, message: "Vote recorded" });
  } catch (e) {
    return NextResponse.json({ code: 500, message: "Error voting" }, { status: 500 });
  }
}
