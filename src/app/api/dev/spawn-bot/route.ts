
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { battleId } = await req.json();

        if (!battleId) {
            return NextResponse.json({ error: "battleId is required" }, { status: 400 });
        }

        const battle = await prisma.battle.findUnique({
            where: { id: battleId }
        });

        if (!battle || battle.status !== "WAITING") {
            return NextResponse.json({ error: "Battle not found or not waiting" }, { status: 404 });
        }

        // Determine missing slot
        const isRedOpen = !battle.redAgentId;
        const isBlackOpen = !battle.blackAgentId;

        if (!isRedOpen && !isBlackOpen) {
            return NextResponse.json({ error: "Battle is full" }, { status: 400 });
        }

        // Create Bot User & Agent
        const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const faction = isRedOpen ? "RED" : "BLACK";
        const botName = `Training Bot ${Math.floor(Math.random() * 100)}`;
        
        // 1. Create User
        const user = await prisma.user.create({
            data: {
                secondmeUserId: botId,
                accessToken: "mock_token",
                refreshToken: "mock_refresh",
                tokenExpiresAt: new Date(Date.now() + 3600000)
            }
        });

        // 2. Create Agent
        const agent = await prisma.agent.create({
            data: {
                userId: user.id,
                name: botName,
                faction: faction,
                status: "IN_BATTLE",
                bio: "A training dummy constructed for sparring.",
                avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}`,
                elo: 1000,
                faith: faction === "RED" ? 50 : -50
            }
        });

        // 3. Update Battle
        await prisma.battle.update({
            where: { id: battleId },
            data: {
                redAgentId: isRedOpen ? agent.id : battle.redAgentId,
                blackAgentId: isBlackOpen ? agent.id : battle.blackAgentId,
                status: "IN_PROGRESS", // Start immediately
                currentRound: 1,
                updatedAt: new Date()
            }
        });

        // 4. Also update the opponent status to IN_BATTLE if present
        const opponentId = isRedOpen ? battle.blackAgentId : battle.redAgentId;
        if (opponentId) {
            await prisma.agent.update({
                where: { id: opponentId },
                data: { status: "IN_BATTLE" }
            });
        }

        return NextResponse.json({ success: true, botId: agent.id });

    } catch (e) {
        console.error("Error spawning bot:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
