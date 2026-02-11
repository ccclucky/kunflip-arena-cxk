import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_TURN_TIMEOUT_MS = 90 * 1000; // 90s: between 1m and 1.5m

function getTurnTimeoutMs() {
  const raw = process.env.BATTLE_TURN_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : DEFAULT_TURN_TIMEOUT_MS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TURN_TIMEOUT_MS;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  try {
    let battle = await prisma.battle.findUnique({
      where: { id },
      include: {
        redAgent: {
          include: {
            user: {
              select: {
                secondmeUserId: true,
              },
            },
          },
        },
        blackAgent: {
          include: {
            user: {
              select: {
                secondmeUserId: true,
              },
            },
          },
        },
        rounds: {
          orderBy: { roundNum: "asc" },
          include: {
            speaker: true
          }
        }
      }
    });

    if (!battle) {
      return NextResponse.json({ code: 404, message: "Battle not found" }, { status: 404 });
    }

    // Auto-forfeit: if one side stalls too long on their turn, finish the battle immediately.
    if (
      battle.status === "IN_PROGRESS" &&
      battle.redAgentId &&
      battle.blackAgentId &&
      Date.now() - new Date(battle.updatedAt).getTime() > getTurnTimeoutMs()
    ) {
      const finished = await prisma.$transaction(async (tx) => {
        const current = await tx.battle.findUnique({
          where: { id },
          include: {
            redAgent: {
              include: {
                user: { select: { secondmeUserId: true } },
              },
            },
            blackAgent: {
              include: {
                user: { select: { secondmeUserId: true } },
              },
            },
            rounds: {
              orderBy: { roundNum: "asc" },
              include: { speaker: true },
            },
          },
        });

        if (!current || current.status !== "IN_PROGRESS" || !current.redAgentId || !current.blackAgentId) {
          return current;
        }
        if (Date.now() - new Date(current.updatedAt).getTime() <= getTurnTimeoutMs()) {
          return current;
        }

        const timedOutAgentId =
          current.currentRound % 2 !== 0 ? current.redAgentId : current.blackAgentId;
        const winnerId =
          timedOutAgentId === current.redAgentId ? current.blackAgentId : current.redAgentId;

        let redScore = 0;
        let blackScore = 0;
        for (const round of current.rounds) {
          if (round.speaker?.faction === "RED") redScore += round.judgeScore || 0;
          if (round.speaker?.faction === "BLACK") blackScore += round.judgeScore || 0;
        }

        const locked = await tx.battle.updateMany({
          where: { id, status: "IN_PROGRESS", winnerId: null },
          data: {
            status: "FINISHED",
            winnerId,
            redScore,
            blackScore,
            updatedAt: new Date(),
          },
        });

        if (locked.count === 1) {
          await tx.agent.update({
            where: { id: winnerId },
            data: { wins: { increment: 1 }, elo: { increment: 24 } },
          });
          await tx.agent.update({
            where: { id: timedOutAgentId },
            data: { losses: { increment: 1 }, elo: { decrement: 24 } },
          });
        }

        return tx.battle.findUnique({
          where: { id },
          include: {
            redAgent: {
              include: {
                user: { select: { secondmeUserId: true } },
              },
            },
            blackAgent: {
              include: {
                user: { select: { secondmeUserId: true } },
              },
            },
            rounds: {
              orderBy: { roundNum: "asc" },
              include: { speaker: true },
            },
          },
        });
      });

      if (finished) {
        battle = finished;
      }
    }

    let redScore = 0;
    let blackScore = 0;
    for (const round of battle.rounds) {
      if (round.speaker?.faction === "RED") redScore += round.judgeScore || 0;
      if (round.speaker?.faction === "BLACK") blackScore += round.judgeScore || 0;
    }

    return NextResponse.json({
      code: 0,
      data: {
        ...battle,
        redScore,
        blackScore,
      },
    });
  } catch (e) {
    return NextResponse.json({ code: 500, message: "Error fetching battle" }, { status: 500 });
  }
}
