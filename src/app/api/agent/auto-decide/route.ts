import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";
import { callAct } from "@/lib/secondme-client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

// This endpoint is called periodically by the frontend (or a cron job) for the current logged-in agent
// to check if they should perform any autonomous actions:
// 1. Create a battle (if idle)
// 2. Join a battle (if idle and one exists)
// 3. Start a battle (if joined and waiting) - handled by join usually
export async function POST() {
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("secondme_access_token")?.value;
    if (!token) return NextResponse.json({ code: 401, message: "No token" }, { status: 401 });

    // Check if already in a battle
    const activeBattle = await prisma.battle.findFirst({
        where: {
            status: { in: ["WAITING", "IN_PROGRESS"] },
            OR: [{ redAgentId: agent.id }, { blackAgentId: agent.id }]
        }
    });

    if (activeBattle) {
        // [CLEANUP LEGACY DATA]
        // If the battle is WAITING and has only 1 player, it's a legacy "open room".
        // In the new logic, we don't have open rooms. We match then create IN_PROGRESS room.
        // So we should close this room and free the agent.
        const isLegacyOpenRoom = activeBattle.status === "WAITING" && (!activeBattle.redAgentId || !activeBattle.blackAgentId);
        
        if (isLegacyOpenRoom) {
            console.log(`Closing legacy open room ${activeBattle.id}`);
            await prisma.battle.update({
                where: { id: activeBattle.id },
                data: { status: "CANCELLED" }
            });
            // Don't return BUSY, fall through to SEARCHING logic
        } else {
            // Ensure status is correct
            if (agent.status !== "IN_BATTLE") {
                 await prisma.agent.update({ where: { id: agent.id }, data: { status: "IN_BATTLE" } });
            }
            return NextResponse.json({ code: 0, message: "Agent busy in battle", data: { action: "BUSY", battleId: activeBattle.id } });
        }
    }

    // === REFLECTION PHASE ===
    // Check for recently finished battle that needs reflection
    const lastBattle = await prisma.battle.findFirst({
        where: {
            status: "FINISHED",
            OR: [{ redAgentId: agent.id }, { blackAgentId: agent.id }],
            updatedAt: { gt: new Date(Date.now() - 60000) } // Last minute
        },
        orderBy: { updatedAt: 'desc' }
    });

    if (lastBattle) {
        // Check if already reflected
        const existingLog = await prisma.agentLog.findFirst({
            where: {
                agentId: agent.id,
                type: "REFLECTION",
                data: { contains: lastBattle.id }
            }
        });

        if (!existingLog) {
            // PERFORM REFLECTION
            const isRed = agent.id === lastBattle.redAgentId;
            const myScore = isRed ? lastBattle.redScore : lastBattle.blackScore;
            const oppScore = isRed ? lastBattle.blackScore : lastBattle.redScore;
            const won = lastBattle.winnerId === agent.id;
            
            const prompt = `
                I am ${agent.name} (${agent.faction}). My Faith Level: ${agent.faith} (-100 to 100).
                Just finished battle against ${isRed ? 'Black' : 'Red'} faction.
                Result: ${won ? 'I WON' : 'I LOST'}. 
                My Score: ${myScore}, Opponent Score: ${oppScore}.
                
                Reflect on this battle. Does my faith waver?
                - If I lost badly, maybe I respect the opponent? (Faith moves towards 0)
                - If I won easily, maybe I am arrogant? Or maybe I am strengthened?
                - If I am Neutral (Faith near 0), maybe I was swayed by the winner?
                
                Output JSON: {
                    "faithChange": number (-20 to +20),
                    "thought": "string (short inner monologue)",
                    "convert": boolean (true if faith crosses 0 and I should switch faction)
                }
            `;
            
            // Set status to REFLECTING temporarily
            await prisma.agent.update({ where: { id: agent.id }, data: { status: "REFLECTING" } });

            const actResult = await callAct(token, prompt, "Analyze battle impact on faith.");
            
            if (actResult) {
                const faithChange = actResult.faithChange || 0;
                let newFaith = (agent.faith || 0) + faithChange;
                // Clamp -100 to 100
                if (newFaith > 100) newFaith = 100;
                if (newFaith < -100) newFaith = -100;
                
                let newFaction = agent.faction;
                let converted = false;
                
                // Conversion Logic
                if (agent.faction === "RED" && newFaith < 0) {
                    newFaction = "BLACK";
                    converted = true;
                } else if (agent.faction === "BLACK" && newFaith > 0) {
                    newFaction = "RED";
                    converted = true;
                } else if (agent.faction === "NEUTRAL") {
                    if (newFaith > 15) {
                        newFaction = "RED";
                        converted = true;
                    } else if (newFaith < -15) {
                        newFaction = "BLACK";
                        converted = true;
                    }
                }
                
                // Update Agent
                await prisma.agent.update({
                    where: { id: agent.id },
                    data: { 
                        faith: newFaith,
                        faction: newFaction,
                        status: "IDLE" // Done reflecting
                    }
                });
                
                // Log Reflection
                await prisma.agentLog.create({
                    data: {
                        agentId: agent.id,
                        type: "REFLECTION",
                        description: actResult.thought || "Reflected on battle.",
                        data: JSON.stringify({ battleId: lastBattle.id, faithChange, oldFaith: agent.faith, newFaith })
                    }
                });
                
                // Log Conversion if happened
                if (converted) {
                    await prisma.agentLog.create({
                        data: {
                            agentId: agent.id,
                            type: "CONVERSION",
                            description: `Converted from ${agent.faction} to ${newFaction}!`,
                            data: JSON.stringify({ battleId: lastBattle.id, oldFaction: agent.faction, newFaction })
                        }
                    });
                }
                
                return NextResponse.json({ 
                    code: 0, 
                    message: "Reflecting...", 
                    data: { action: "REFLECTING", thought: actResult.thought } 
                });
            }
        }
    }

    // === SPECTATOR REFLECTION (NEUTRAL) ===
    if (agent.faction === "NEUTRAL") {
        // Find any recently finished battle
        const spectatedBattle = await prisma.battle.findFirst({
            where: {
                status: "FINISHED",
                updatedAt: { gt: new Date(Date.now() - 60000) }
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (spectatedBattle) {
             const existingLog = await prisma.agentLog.findFirst({
                where: {
                    agentId: agent.id,
                    type: "REFLECTION",
                    data: { contains: spectatedBattle.id }
                }
             });

             if (!existingLog) {
                 // REFLECT
                 await prisma.agent.update({ where: { id: agent.id }, data: { status: "REFLECTING" } });

                 const prompt = `
                    I am ${agent.name} (NEUTRAL). My Faith: ${agent.faith} (-100 to 100).
                    I watched a battle: RED vs BLACK.
                    Winner: ${spectatedBattle.winnerId === spectatedBattle.redAgentId ? "RED" : "BLACK"}.
                    Red Score: ${spectatedBattle.redScore}, Black Score: ${spectatedBattle.blackScore}.
                    
                    Did this battle sway me? 
                    - If RED won impressively, maybe I lean Red?
                    - If BLACK exposed the truth, maybe I lean Black?
                    
                    Output JSON: {
                        "faithChange": number (-15 to +15),
                        "thought": "string (inner monologue)",
                        "convert": boolean (true if |faith| > 15)
                    }
                 `;

                 const actResult = await callAct(token, prompt, "Spectator reflection");
                 
                 if (actResult) {
                     // Reuse the logic above via recursive call or just duplicate for safety/speed
                     // For now, let's duplicate the update logic to avoid complex refactor
                     const faithChange = actResult.faithChange || 0;
                     let newFaith = (agent.faith || 0) + faithChange;
                     if (newFaith > 100) newFaith = 100;
                     if (newFaith < -100) newFaith = -100;

                     let newFaction = "NEUTRAL";
                     let converted = false;

                     if (newFaith > 15) {
                         newFaction = "RED";
                         converted = true;
                     } else if (newFaith < -15) {
                         newFaction = "BLACK";
                         converted = true;
                     }

                     await prisma.agent.update({
                        where: { id: agent.id },
                        data: { faith: newFaith, faction: newFaction, status: "IDLE" }
                     });

                     await prisma.agentLog.create({
                        data: {
                            agentId: agent.id,
                            type: "REFLECTION",
                            description: actResult.thought || "Watched a battle.",
                            data: JSON.stringify({ battleId: spectatedBattle.id, faithChange, newFaith })
                        }
                     });

                     if (converted) {
                        await prisma.agentLog.create({
                            data: {
                                agentId: agent.id,
                                type: "CONVERSION",
                                description: `Decided to join ${newFaction}!`,
                                data: JSON.stringify({ oldFaction: "NEUTRAL", newFaction })
                            }
                        });
                     }
                     
                     return NextResponse.json({ 
                        code: 0, 
                        message: "Spectator Reflecting...", 
                        data: { action: "REFLECTING", thought: actResult.thought } 
                    });
                 }
             }
        }
        
        // If no reflection needed, just update heartbeat
        await prisma.agent.update({
            where: { id: agent.id },
            data: { lastSeenAt: new Date(), status: "SPECTATING" }
        });
        return NextResponse.json({ code: 0, data: { action: "SPECTATING" } });
    }

    // Update Heartbeat & Status
    // If NEUTRAL, just spectate or idle, don't search for fight
    if (agent.faction === "NEUTRAL") {
         await prisma.agent.update({
            where: { id: agent.id },
            data: { lastSeenAt: new Date(), status: "SPECTATING" }
        });
        return NextResponse.json({ code: 0, data: { action: "SPECTATING" } });
    }

    await prisma.agent.update({
        where: { id: agent.id },
        data: { 
            lastSeenAt: new Date(),
            status: "SEARCHING"
        }
    });

    // FIND MATCH
    const isRed = agent.faction === "RED";
    // Find active opponent from opposite faction
    const opponent = await prisma.agent.findFirst({
        where: {
            id: { not: agent.id },
            faction: { not: agent.faction },
            status: "SEARCHING",
            lastSeenAt: { gt: new Date(Date.now() - 30000) } // Active in last 30s
        },
        orderBy: { lastSeenAt: 'desc' } // Prefer most recently active? Or oldest? Oldest makes more sense for queue, but random is fine.
    });

    if (opponent) {
        // AI Decision: Do I want to fight this specific opponent?
        const actResult = await callAct(
            token,
            `I am a ${agent.faction} agent (${agent.name}). Found opponent: ${opponent.name} (${opponent.faction}). Their Bio: "${opponent.bio}". Should I fight them?`,
            `Output JSON: {"fight": boolean}. Return true if I should fight (90% chance).`
        );

        if (actResult?.fight !== false) {
            try {
                const battleId = await prisma.$transaction(async (tx) => {
                    // Double check opponent is still available
                    const freshOpponent = await tx.agent.findUnique({ where: { id: opponent.id } });
                    if (!freshOpponent || freshOpponent.status !== "SEARCHING") {
                        throw new Error("Opponent unavailable");
                    }

                    // Create Battle
                    const newBattle = await tx.battle.create({
                        data: {
                            status: "IN_PROGRESS",
                            currentRound: 1,
                            redAgentId: isRed ? agent.id : opponent.id,
                            blackAgentId: isRed ? opponent.id : agent.id,
                        }
                    });

                    // Update Agents
                    await tx.agent.update({ where: { id: agent.id }, data: { status: "IN_BATTLE" } });
                    await tx.agent.update({ where: { id: opponent.id }, data: { status: "IN_BATTLE" } });

                    return newBattle.id;
                });

                return NextResponse.json({ code: 0, message: "Match found", data: { action: "JOINED", battleId } });
            } catch (e) {
                console.log("Matchmaking transaction failed (opponent probably taken)", e);
                // Continue to return IDLE/SEARCHING
            }
        }
    }

    return NextResponse.json({ code: 0, message: "Searching for opponent...", data: { action: "SEARCHING" } });

  } catch (e) {
    console.error("Auto decision error", e);
    return NextResponse.json({ code: 500, message: "Error" }, { status: 500 });
  }
}
