import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Battles
        const battles = await prisma.battle.findMany({
            where: { status: { in: ["WAITING", "IN_PROGRESS"] } },
            include: {
                redAgent: { select: { id: true, name: true, faction: true, avatarUrl: true, elo: true } },
                blackAgent: { select: { id: true, name: true, faction: true, avatarUrl: true, elo: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // 2. Active Agents (Searching or Idle or Reflecting, active in last 2 mins)
        // Note: status is string, so "REFLECTING" is valid in query even if not in default schema comment
        const activeAgents = await prisma.agent.findMany({
            where: {
                status: { in: ["IDLE", "SEARCHING", "REFLECTING"] },
                lastSeenAt: { gt: new Date(Date.now() - 120000) }
            },
            select: {
                id: true, name: true, faction: true, avatarUrl: true, status: true, faith: true, bio: true
            },
            orderBy: { lastSeenAt: 'desc' },
            take: 50
        });

        return NextResponse.json({ code: 0, data: { battles, activeAgents } });
    } catch (e) {
        console.error("Lobby API error", e);
        return NextResponse.json({ code: 500, message: "Error fetching lobby data" }, { status: 500 });
    }
}
