import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";

const prisma = new PrismaClient();

// POST: Register for matchmaking (Queue/Host)
export async function POST() {
    const agent = await getCurrentAgent();
    if (!agent) {
        return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Check if already in a battle
        const activeBattle = await prisma.battle.findFirst({
            where: {
                status: { in: ["WAITING", "IN_PROGRESS"] },
                OR: [{ redAgentId: agent.id }, { blackAgentId: agent.id }]
            }
        });

        if (activeBattle) {
            // Already in battle, return info
            return NextResponse.json({ code: 0, message: "Already in battle", data: { action: "BUSY", battleId: activeBattle.id } });
        }

        // 2. Try to find an existing WAITING battle from OPPOSITE faction
        const isRed = agent.faction === "RED";
        
        // Find battle where opponent is waiting
        // If I am RED, find battle where redAgentId is NULL and blackAgentId is NOT NULL
        // If I am BLACK, find battle where blackAgentId is NULL and redAgentId is NOT NULL
        const availableBattle = await prisma.battle.findFirst({
            where: {
                status: "WAITING",
                redAgentId: isRed ? null : { not: null },
                blackAgentId: !isRed ? null : { not: null },
                // Ensure the opponent is still active (optional, but good for safety)
                updatedAt: { gt: new Date(Date.now() - 60000) } 
            },
            orderBy: { createdAt: 'asc' } // First come first served
        });

        if (availableBattle) {
            // JOIN BATTLE
            await prisma.battle.update({
                where: { id: availableBattle.id },
                data: {
                    redAgentId: isRed ? agent.id : availableBattle.redAgentId,
                    blackAgentId: !isRed ? agent.id : availableBattle.blackAgentId,
                    status: "IN_PROGRESS",
                    currentRound: 1, // Start Game!
                    updatedAt: new Date()
                }
            });

            // Update Agent Status
            await prisma.agent.update({ where: { id: agent.id }, data: { status: "IN_BATTLE" } });
            // Also update opponent status just in case
            const opponentId = isRed ? availableBattle.blackAgentId : availableBattle.redAgentId;
            if (opponentId) {
                await prisma.agent.update({ where: { id: opponentId }, data: { status: "IN_BATTLE" } });
            }

            return NextResponse.json({ 
                code: 0, 
                message: "Match found!", 
                data: { action: "JOINED", battleId: availableBattle.id } 
            });
        }

        // 3. No match found -> Create new Arena (Host)
        const newBattle = await prisma.battle.create({
            data: {
                status: "WAITING",
                redAgentId: isRed ? agent.id : undefined,
                blackAgentId: !isRed ? agent.id : undefined,
                currentRound: 0
            }
        });

        // Update Agent Status to WAITING_OPPONENT (Use SEARCHING as alias for now or custom)
        // Let's use "SEARCHING" but conceptually it means "Waiting on Stage"
        await prisma.agent.update({ where: { id: agent.id }, data: { status: "SEARCHING" } });

        return NextResponse.json({ 
            code: 0, 
            message: "Created arena, waiting for challenger", 
            data: { action: "WAITING", battleId: newBattle.id } 
        });

    } catch (e) {
        console.error("Matchmaking error", e);
        return NextResponse.json({ code: 500, message: "Error in matchmaking" }, { status: 500 });
    }
}
