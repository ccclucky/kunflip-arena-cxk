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
        redAgent: true,
        blackAgent: true,
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

    return NextResponse.json({ code: 0, data: battle });
  } catch (e) {
    return NextResponse.json({ code: 500, message: "Error fetching battle" }, { status: 500 });
  }
}
