import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  try {
    const battle = await prisma.battle.findUnique({
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
