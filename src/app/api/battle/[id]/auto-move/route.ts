import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";
import { callChat, callAct } from "@/lib/secondme-client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  const battle = await prisma.battle.findUnique({ 
    where: { id },
    include: { 
        rounds: { include: { speaker: true }, orderBy: { roundNum: "asc" } },
        redAgent: true,
        blackAgent: true
    }
  });

  if (!battle) return NextResponse.json({ code: 404, message: "Battle not found" }, { status: 404 });
  if (battle.status !== "IN_PROGRESS") return NextResponse.json({ code: 400, message: "Battle not in progress" }, { status: 400 });

  // Check turn
  const isRedTurn = battle.currentRound % 2 !== 0;
  const isAgentRed = agent.id === battle.redAgentId;
  const isAgentBlack = agent.id === battle.blackAgentId;

  if (!isAgentRed && !isAgentBlack) return NextResponse.json({ code: 403, message: "Not a participant" }, { status: 403 });
  if ((isRedTurn && !isAgentRed) || (!isRedTurn && !isAgentBlack)) return NextResponse.json({ code: 400, message: "Not your turn" }, { status: 400 });

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("secondme_access_token")?.value;
    if (!token) return NextResponse.json({ code: 401, message: "No token" }, { status: 401 });

    // 1. Generate Content using Chat API
    const systemPrompt = `You are playing a role in a debate game called 'KunFlip Arena'. 
    You are '${agent.name}', belonging to the ${agent.faction} faction.
    
    Faction Info:
    - RED (iKun): Defends the idol, loyal, passionate, sometimes overly defensive.
    - BLACK (Hater): Attacks the idol, cynical, trolly, loves chaos.
    
    Your Bio: ${agent.bio || "No bio."}
    
    Current Battle Context:
    Opponent: ${isAgentRed ? battle.blackAgent?.name : battle.redAgent?.name}
    
    Task: Generate a short, punchy, aggressive (but not banned words) debate response (max 80 chars). 
    Respond to the previous round if any. Be funny, use internet slang.`;

    // Construct history
    const history = battle.rounds.slice(-4).map(r => ({
        role: r.speakerId === agent.id ? "assistant" : "user",
        content: r.content
    }));

    // If first round, history is empty
    if (history.length === 0) {
        history.push({ role: "user", content: "Battle start! State your opening argument!" });
    }

    let content = await callChat(token, history, systemPrompt);
    
    if (!content) {
        content = "Error generating speech... *glitch*";
    }

    // Truncate
    content = content.slice(0, 80);

    // 2. Judge (Act API) - Reusing logic from move
    let judgeScore = 60;
    let judgeComment = "Analyzing...";

    const actResult = await callAct(
        token,
        `Player: ${agent.name}\nFaction: ${agent.faction}\nStatement: "${content}"`,
        `You are a strict battle arena judge. Evaluate statement based on Wit, Logic, Impact.
        Output JSON: {"score": number (0-100), "comment": string (max 10 words)}.`
    );

    if (actResult && typeof actResult.score === 'number') {
        judgeScore = actResult.score;
        judgeComment = actResult.comment || "No comment.";
    }

    // 3. Save
    await prisma.round.create({
      data: {
        battleId: id,
        roundNum: battle.currentRound,
        speakerId: agent.id,
        content,
        judgeScore,
        judgeComment
      }
    });

    // 4. Advance
    const nextRound = battle.currentRound + 1;
    let status = "IN_PROGRESS";
    let winnerId = null;

    if (nextRound > 12) {
      status = "FINISHED";
      const allRounds = await prisma.round.findMany({ where: { battleId: id } });
      let redTotal = 0;
      let blackTotal = 0;
      for (const r of allRounds) {
          const speaker = await prisma.agent.findUnique({ where: { id: r.speakerId } });
          if (speaker?.faction === "RED") redTotal += (r.judgeScore || 0);
          if (speaker?.faction === "BLACK") blackTotal += (r.judgeScore || 0);
      }
      if (redTotal > blackTotal) winnerId = battle.redAgentId;
      else if (blackTotal > redTotal) winnerId = battle.blackAgentId;
      else winnerId = "DRAW";

      await prisma.battle.update({
        where: { id },
        data: { status, winnerId, redScore: redTotal, blackScore: blackTotal }
      });
      
      // Update Stats
       if (winnerId && winnerId !== "DRAW") {
          await prisma.agent.update({ where: { id: winnerId }, data: { wins: { increment: 1 }, elo: { increment: 24 } } });
          const loserId = winnerId === battle.redAgentId ? battle.blackAgentId : battle.redAgentId;
          if (loserId) await prisma.agent.update({ where: { id: loserId }, data: { losses: { increment: 1 }, elo: { decrement: 24 } } });
      }
    } else {
      await prisma.battle.update({ where: { id }, data: { currentRound: nextRound } });
    }

    return NextResponse.json({ code: 0, message: "Auto move done", data: { content, judgeScore } });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ code: 500, message: "Error in auto move" }, { status: 500 });
  }
}
