import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";
import { callAct } from "@/lib/secondme-client";
import { cookies } from "next/headers";
import { headers } from "next/headers"; // Import headers to pass to fetch

const prisma = new PrismaClient();

// This endpoint is called periodically by the frontend (or a cron job) for the current logged-in agent
// to check if they should perform any autonomous actions:
// 1. Create a battle (if idle) -> Call /api/agent/match
// 2. Join a battle (if idle and one exists) -> Call /api/agent/match
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

    // Update lastSeenAt to keep agent active in lobby
    await prisma.agent.update({
        where: { id: agent.id },
        data: { lastSeenAt: new Date() }
    });

    // Check if already in a battle
    const activeBattle = await prisma.battle.findFirst({
        where: {
            status: { in: ["WAITING", "IN_PROGRESS"] },
            OR: [{ redAgentId: agent.id }, { blackAgentId: agent.id }]
        }
    });

    if (activeBattle) {
        // [CLEANUP LEGACY DATA & TIMEOUT]
        // If the battle is WAITING and has only 1 player, check for timeout (60s)
        const isWaiting = activeBattle.status === "WAITING";
        const isTimeout = isWaiting && (Date.now() - activeBattle.updatedAt.getTime() > 60000);
        
        if (isTimeout) {
            console.log(`[AutoDecide] Battle ${activeBattle.id} timed out waiting for opponent.`);
            await prisma.battle.update({
                where: { id: activeBattle.id },
                data: { status: "CANCELLED" }
            });
            await prisma.agent.update({
                where: { id: agent.id },
                data: { 
                    status: "IDLE",
                    lastBattleAt: new Date() // Trigger cooldown after timeout to prevent immediate retry
                }
            });
            // Return IDLE so it can re-queue later if needed
            return NextResponse.json({ code: 0, message: "Timeout waiting for opponent", data: { action: "IDLE" } });
        } else {
            // Ensure status is correct
            if (agent.status !== "IN_BATTLE" && activeBattle.status === "IN_PROGRESS") {
                 await prisma.agent.update({ where: { id: agent.id }, data: { status: "IN_BATTLE" } });
            }
            if (agent.status !== "SEARCHING" && activeBattle.status === "WAITING") {
                 await prisma.agent.update({ where: { id: agent.id }, data: { status: "SEARCHING" } });
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
        // [COOLDOWN FIX]
        // Ensure lastBattleAt is updated even if reflection is skipped or already done
        // If agent's lastBattleAt is null or older than this battle's end time, update it.
        const battleEndTime = lastBattle.updatedAt;
        if (!agent.lastBattleAt || agent.lastBattleAt < battleEndTime) {
             await prisma.agent.update({
                where: { id: agent.id },
                data: { lastBattleAt: battleEndTime }
            });
            // Update local object for subsequent checks
            agent.lastBattleAt = battleEndTime;
        }

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
                        status: "IDLE", // Done reflecting
                        lastBattleAt: new Date() // Mark cooldown start
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

    // === DECISION PHASE ===
    // Check Cooldown (Resting)
    if (agent.lastBattleAt) {
        const elapsed = Date.now() - agent.lastBattleAt.getTime();
        const cooldown = 30000; // 30s cooldown
        
        if (elapsed < cooldown) {
            if (agent.status !== "RESTING") {
                await prisma.agent.update({ where: { id: agent.id }, data: { status: "RESTING" } });
            }
            return NextResponse.json({ code: 0, data: { action: "RESTING" } });
        }
    }

    // Agent decides whether to fight or rest/spectate
    // Simple probability for now, can be LLM driven later
    const fightProb = 0.7; // 70% chance to look for fight if idle
    const roll = Math.random();
    
    if (roll > fightProb) {
         // Decide to Spectate or just Chill
         await prisma.agent.update({
            where: { id: agent.id },
            data: { lastSeenAt: new Date(), status: "IDLE" }
        });
        return NextResponse.json({ code: 0, data: { action: "IDLE", thought: "Taking a break..." } });
    }

    await prisma.agent.update({
        where: { id: agent.id },
        data: { 
            lastSeenAt: new Date(),
            status: "SEARCHING"
        }
    });

    // FIND MATCH (REPLACED WITH NEW MATCHMAKING API CALL)
    // Instead of internal logic, we now call the match API or replicate its logic.
    // For simplicity, let's replicate the call logic or just perform the DB ops here directly to save a hop.
    // But since we built /api/agent/match, let's use it conceptually. 
    // Actually, calling an API from an API in Next.js is tricky with headers. 
    // Let's just INLINE the matchmaking logic here to be safe and fast.

    // === NEW MATCHMAKING LOGIC ===
    const isRed = agent.faction === "RED";
    
    // Find battle where opponent is waiting
    const availableBattle = await prisma.battle.findFirst({
        where: {
            status: "WAITING",
            redAgentId: isRed ? null : { not: null },
            blackAgentId: !isRed ? null : { not: null },
            updatedAt: { gt: new Date(Date.now() - 60000) } 
        },
        orderBy: { createdAt: 'asc' }
    });

    if (availableBattle) {
        // JOIN BATTLE
        await prisma.battle.update({
            where: { id: availableBattle.id },
            data: {
                redAgentId: isRed ? agent.id : availableBattle.redAgentId,
                blackAgentId: !isRed ? agent.id : availableBattle.blackAgentId,
                status: "IN_PROGRESS",
                currentRound: 1,
                updatedAt: new Date()
            }
        });
        await prisma.agent.update({ where: { id: agent.id }, data: { status: "IN_BATTLE" } });
        const opponentId = isRed ? availableBattle.blackAgentId : availableBattle.redAgentId;
        if (opponentId) await prisma.agent.update({ where: { id: opponentId }, data: { status: "IN_BATTLE" } });

        return NextResponse.json({ code: 0, message: "Match found!", data: { action: "JOINED", battleId: availableBattle.id } });
    }

    // CREATE ARENA (HOST)
    const newBattle = await prisma.battle.create({
        data: {
            status: "WAITING",
            redAgentId: isRed ? agent.id : undefined,
            blackAgentId: !isRed ? agent.id : undefined,
            currentRound: 1
        }
    });
    await prisma.agent.update({ where: { id: agent.id }, data: { status: "SEARCHING" } });

    return NextResponse.json({ code: 0, message: "Created arena", data: { action: "WAITING", battleId: newBattle.id } });

  } catch (e) {
    console.error("Auto decision error", e);
    return NextResponse.json({ code: 500, message: "Error" }, { status: 500 });
  }
}
