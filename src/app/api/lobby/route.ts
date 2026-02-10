import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 0. Cleanup Stale Waiting Battles (Lazy Cleanup)
        // If a battle has been WAITING for more than 2 minutes, cancel it.
        await prisma.battle.updateMany({
            where: {
                status: "WAITING",
                updatedAt: { lt: new Date(Date.now() - 120000) }
            },
            data: { status: "CANCELLED" }
        });

        // 1. Battles
        const battles = await prisma.battle.findMany({
            where: { status: { in: ["WAITING", "IN_PROGRESS"] } },
            include: {
                redAgent: { select: { id: true, name: true, faction: true, avatarUrl: true, elo: true } },
                blackAgent: { select: { id: true, name: true, faction: true, avatarUrl: true, elo: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Collect IDs of agents in battle to exclude them from the crowd
        const agentsInBattle = new Set<string>();
        battles.forEach(b => {
            if (b.redAgentId) agentsInBattle.add(b.redAgentId);
            if (b.blackAgentId) agentsInBattle.add(b.blackAgentId);
        });

        // 2. Active Agents
        // Exclude agents currently in battle
        const activeAgents = await prisma.agent.findMany({
            where: {
                status: { in: ["IDLE", "SEARCHING", "REFLECTING", "SPECTATING"] },
                lastSeenAt: { gt: new Date(Date.now() - 120000) },
                id: { notIn: Array.from(agentsInBattle) }
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
