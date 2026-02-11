import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";
import { callAct } from "@/lib/secondme-client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();
const clampScore = (score: number) => Math.max(0, Math.min(100, Math.floor(score)));

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  const { content } = await request.json();
  if (!content) {
    return NextResponse.json({ code: 400, message: "Invalid content" }, { status: 400 });
  }

  const battle = await prisma.battle.findUnique({ 
    where: { id },
    include: { rounds: true }
  });

  if (!battle) {
    return NextResponse.json({ code: 404, message: "Battle not found" }, { status: 404 });
  }

  if (battle.status !== "IN_PROGRESS") {
    return NextResponse.json({ code: 400, message: "Battle is not in progress" }, { status: 400 });
  }

  // Check turn
  const isRedTurn = battle.currentRound % 2 !== 0;
  const isAgentRed = agent.id === battle.redAgentId;
  const isAgentBlack = agent.id === battle.blackAgentId;

  if (!isAgentRed && !isAgentBlack) {
    return NextResponse.json({ code: 403, message: "You are not in this battle" }, { status: 403 });
  }

  if ((isRedTurn && !isAgentRed) || (!isRedTurn && !isAgentBlack)) {
    return NextResponse.json({ code: 400, message: "Not your turn" }, { status: 400 });
  }

  try {
    // Call SecondMe Act API for Judging
    const cookieStore = await cookies();
    const token = cookieStore.get("secondme_access_token")?.value;
    
    let judgeScore = 60;
    let judgeComment = "Thinking...";

    if (token) {
        const actResult = await callAct(
            token,
            `Player: ${agent.name}\nFaction: ${agent.faction}\nStatement: "${content}"`,
            `You are a strict battle arena judge for a debate game. 
            Evaluate the statement based on: 1. Humor/Wit 2. Logic/Impact 3. Creativity.
            Output JSON: {"score": number (0-100), "comment": string (short punchy verdict max 10 words)}.
            Be harsh but fair.`,
            { timeoutMs: 6000 }
        );

        if (actResult && typeof actResult.score === 'number') {
            judgeScore = actResult.score;
            judgeComment = actResult.comment || "No comment.";
        }
    }
    judgeScore = clampScore(judgeScore);

    // Save round with Transaction
    try {
        await prisma.$transaction(async (tx) => {
            // Verify round
            const currentBattle = await tx.battle.findUnique({ where: { id } });
            if (!currentBattle || currentBattle.currentRound !== battle.currentRound) {
                throw new Error("ROUND_MISMATCH");
            }

            // Save round
            await tx.round.create({
                data: {
                    battleId: id,
                    roundNum: battle.currentRound,
                    speakerId: agent.id,
                    content,
                    judgeScore,
                    judgeComment
                }
            });

            // Advance round or finish
            const nextRound = battle.currentRound + 1;
            let status = "IN_PROGRESS";
            let winnerId = null;

            if (nextRound > 12) {
                status = "FINISHED";
                const allRounds = await tx.round.findMany({ where: { battleId: id } });
                let redTotal = 0;
                let blackTotal = 0;
                for (const r of allRounds) {
                    const speaker = await tx.agent.findUnique({ where: { id: r.speakerId } });
                    if (speaker?.faction === "RED") redTotal += (r.judgeScore || 0);
                    if (speaker?.faction === "BLACK") blackTotal += (r.judgeScore || 0);
                }
                if (redTotal > blackTotal) winnerId = battle.redAgentId;
                else if (blackTotal > redTotal) winnerId = battle.blackAgentId;
                else winnerId = "DRAW";

                await tx.battle.update({
                    where: { id },
                    data: { status, winnerId, redScore: redTotal, blackScore: blackTotal }
                });

                if (winnerId && winnerId !== "DRAW") {
                    await tx.agent.update({
                        where: { id: winnerId },
                        data: { wins: { increment: 1 }, elo: { increment: 24 } }
                    });
                    const loserId = winnerId === battle.redAgentId ? battle.blackAgentId : battle.redAgentId;
                    if (loserId) {
                        await tx.agent.update({
                            where: { id: loserId },
                            data: { losses: { increment: 1 }, elo: { decrement: 24 } }
                        });
                    }
                } else if (winnerId === "DRAW") {
                    if (battle.redAgentId) {
                        await tx.agent.update({
                            where: { id: battle.redAgentId },
                            data: { draws: { increment: 1 } }
                        });
                    }
                    if (battle.blackAgentId) {
                        await tx.agent.update({
                            where: { id: battle.blackAgentId },
                            data: { draws: { increment: 1 } }
                        });
                    }
                }
            } else {
                await tx.battle.update({
                    where: { id },
                    data: { currentRound: nextRound }
                });
            }
        });
    } catch (e: unknown) {
        const prismaCode = typeof e === "object" && e !== null && "code" in e
          ? (e as { code?: string }).code
          : undefined;
        if (e instanceof Error && e.message === "ROUND_MISMATCH") {
             return NextResponse.json({ code: 409, message: "Round already played" });
        }
        if (prismaCode === 'P2002') {
             return NextResponse.json({ code: 409, message: "Round already exists" });
        }
        throw e;
    }

    return NextResponse.json({ code: 0, message: "Move submitted", data: { judgeScore, judgeComment } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ code: 500, message: "Error submitting move" }, { status: 500 });
  }
}
