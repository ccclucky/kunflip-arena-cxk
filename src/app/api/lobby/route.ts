import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 0. Cleanup Stale Battles (Lazy Cleanup)
        const now = Date.now();
        const twoMinutesAgo = new Date(now - 120000);
        const tenMinutesAgo = new Date(now - 600000);

        // Find stale battles first to release agents
        const staleBattles = await prisma.battle.findMany({
            where: {
                OR: [
                    { status: "WAITING", updatedAt: { lt: twoMinutesAgo } },
                    { status: "IN_PROGRESS", updatedAt: { lt: tenMinutesAgo } }
                ]
            }
        });

        if (staleBattles.length > 0) {
            const staleBattleIds = staleBattles.map(b => b.id);
            const staleAgentIds = staleBattles
                .flatMap(b => [b.redAgentId, b.blackAgentId])
                .filter((id): id is string => !!id);

            // 1. Reset Agents to IDLE
            if (staleAgentIds.length > 0) {
                await prisma.agent.updateMany({
                    where: { id: { in: staleAgentIds } },
                    data: { status: "IDLE" }
                });
            }

            // 2. Cancel Battles
            await prisma.battle.updateMany({
                where: { id: { in: staleBattleIds } },
                data: { status: "CANCELLED" }
            });
            
            console.log(`[Lobby] Cleaned up ${staleBattles.length} stale battles and released ${staleAgentIds.length} agents.`);
        }

        // 1. Battles
        let battles = await prisma.battle.findMany({
            where: { status: { in: ["WAITING", "IN_PROGRESS"] } },
            include: {
                redAgent: { select: { id: true, name: true, faction: true, avatarUrl: true, elo: true } },
                blackAgent: { select: { id: true, name: true, faction: true, avatarUrl: true, elo: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // 1.1 Self-Healing: Deduplicate Battles
        // If an agent is found in multiple active battles, keep the most recent one and cancel the others.
        const agentBattleMap = new Map<string, string>(); // AgentID -> BattleID
        const battlesToRemove = new Set<string>();

        // Since battles are ordered by updatedAt desc, the first time we see an agent, it's their latest battle.
        // Any subsequent appearance of the same agent means that battle is stale/duplicate.
        for (const battle of battles) {
            const agentIds = [];
            if (battle.redAgentId) agentIds.push(battle.redAgentId);
            if (battle.blackAgentId) agentIds.push(battle.blackAgentId);

            let isDuplicate = false;
            for (const agentId of agentIds) {
                if (agentBattleMap.has(agentId)) {
                    // This agent is already in a newer battle
                    isDuplicate = true;
                    break;
                }
            }

            if (isDuplicate) {
                battlesToRemove.add(battle.id);
            } else {
                // Register agents for this valid battle
                for (const agentId of agentIds) {
                    agentBattleMap.set(agentId, battle.id);
                }
            }
        }

        if (battlesToRemove.size > 0) {
            console.log(`[Lobby] Cleaning up ${battlesToRemove.size} duplicate/stale battles:`, Array.from(battlesToRemove));
            // Perform cleanup
            await prisma.battle.updateMany({
                where: { id: { in: Array.from(battlesToRemove) } },
                data: { status: "CANCELLED" }
            });
            // Filter current list
            battles = battles.filter(b => !battlesToRemove.has(b.id));
        }

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

        // 3. Global Stats (Elo Sum)
        const redStats = await prisma.agent.aggregate({
            where: { faction: "RED" },
            _sum: { elo: true }
        });
        const blackStats = await prisma.agent.aggregate({
            where: { faction: "BLACK" },
            _sum: { elo: true }
        });

        const redElo = redStats._sum.elo || 0;
        const blackElo = blackStats._sum.elo || 0;

        return NextResponse.json({ 
            code: 0, 
            data: { 
                battles, 
                activeAgents,
                stats: {
                    redElo,
                    blackElo
                }
            } 
        });
    } catch (e) {
        console.error("Lobby API error", e);
        return NextResponse.json({ code: 500, message: "Error fetching lobby data" }, { status: 500 });
    }
}
