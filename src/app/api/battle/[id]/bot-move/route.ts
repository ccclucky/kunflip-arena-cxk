
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { callChat, callAct } from "@/lib/secondme-client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  // Parse body for lang
  let lang = "zh"; // Default to Chinese
  try {
      const body = await request.json();
      if (body.lang && (body.lang === "en" || body.lang === "zh")) {
          lang = body.lang;
      }
  } catch (e) {
      // ignore, use default
  }

  try {
    const battle = await prisma.battle.findUnique({ 
        where: { id },
        include: { 
            rounds: { orderBy: { roundNum: "asc" } },
            redAgent: { include: { user: true } },
            blackAgent: { include: { user: true } }
        }
    });

    if (!battle) return NextResponse.json({ code: 404, message: "Battle not found" }, { status: 404 });
    if (battle.status !== "IN_PROGRESS") return NextResponse.json({ code: 400, message: "Battle not in progress" }, { status: 400 });

    // Check turn
    const isRedTurn = battle.currentRound % 2 !== 0;
    const currentAgent = isRedTurn ? battle.redAgent : battle.blackAgent;

    if (!currentAgent) {
        return NextResponse.json({ code: 500, message: "Agent missing" }, { status: 500 });
    }

    // VERIFY IS BOT
    // We check if the associated user has a secondmeUserId starting with 'bot_'
    if (!currentAgent.user?.secondmeUserId.startsWith("bot_")) {
        return NextResponse.json({ code: 400, message: "Current turn is not a bot" }, { status: 400 });
    }

    // === BOT LOGIC ===
    const opponent = currentAgent.faction === "RED" ? battle.blackAgent : battle.redAgent;
    const opponentName = opponent?.name || "Opponent";
    
    // Construct history
    // Get last 6 rounds to provide enough context
    const history = battle.rounds.slice(-6).map(r => ({
        role: r.speakerId === currentAgent.id ? "assistant" : "user",
        content: r.content
    }));

    if (history.length === 0) {
        history.push({ role: "user", content: lang === "zh" ? "对战开始！" : "Battle start!" });
    }

    let content = "";
    
    // Try to use LLM via user token
    const cookieStore = await cookies();
    const token = cookieStore.get("secondme_access_token")?.value;

    console.log(`[BotMove] Battle ${id}, Bot ${currentAgent.id}, Token present: ${!!token}`);

    if (token) {
        let factionLore = "";
        if (lang === "zh") {
            factionLore = currentAgent.faction === "RED" 
            ? `[阵营: 红方 (真爱粉)]
               - 核心信念: 不惜一切代价守护最好的"Giegie" (哥哥)。
               - 语气: 激昂, 防御性强。
               - 策略: 指责对手是"小黑子"。`
            : `[阵营: 黑方 (小黑子)]
               - 核心信念: 这个偶像就是个笑话。
               - 语气: 讽刺, 玩梗。
               - 策略: 嘲笑"鸡舞", 使用"鸡你太美"。`;
        } else {
            factionLore = currentAgent.faction === "RED" 
            ? `[FACTION: RED (iKun)]
               - Core Belief: Protect the "Giegie" (Big Brother).
               - Tone: Passionate, defensive.
               - Strategy: Accuse opponent of being a "Little Black Spot".`
            : `[FACTION: BLACK (Hater/Troll)]
               - Core Belief: The idol is a joke.
               - Tone: Sarcastic, meme-heavy.
               - Strategy: Mock the "Chicken Dance", use "Jinitaimei".`;
        }

        let systemPrompt = "";
        if (lang === "zh") {
            systemPrompt = `你扮演 '${currentAgent.name}' (${currentAgent.faction}) 在 '坤坤大乱斗' 游戏中。
            对手: ${opponentName}
            
            ${factionLore}

            任务: 你正在进行一场激烈的辩论。你的目标是**驳倒对手**并**羞辱他们的品味**。
            
            请遵循以下回复结构：
            1. **直接反驳** (50%): 必须引用或针对对手上一句话的逻辑漏洞进行攻击。不要自说自话。
            2. **情绪输出** (30%): 表现出愤怒、嘲笑或难以置信的态度。这不仅仅是辩论，这是尊严之战。
            3. **玩梗融合** (20%): 将阵营黑话/梗自然融入到你的论点中，作为攻击的武器，而不是生硬堆砌。

            限制：
            - 字数控制在 50-100 字之间。
            - 必须像个真实的键盘侠一样说话，充满攻击性和反讽。
            - 如果是第一回合，直接攻击对方的开场白或外貌/头像。
            - 请使用中文回答。`;
        } else {
            systemPrompt = `You are '${currentAgent.name}' (${currentAgent.faction}) in 'KunFlip Arena'.
            Opponent: ${opponentName}
            
            ${factionLore}

            TASK: You are in a HEATED DEBATE. Your goal is to **destroy the opponent's argument** and **mock their taste**.

            Structure your response:
            1. **Direct Rebuttal** (50%): You MUST address the specific point the opponent just made. Find the flaw in their logic.
            2. **Emotional Output** (30%): Show anger, disbelief, or mockery. This is personal.
            3. **Meme Integration** (20%): Weave your faction's slang naturally into your argument. Don't just list memes.

            Constraints:
            - Length: 50-120 characters.
            - Speak like a toxic internet troll/stan. Aggressive and sarcastic.
            - If first move, mock their existence immediately.
            - Respond in English.`;
        }

        try {
            console.log(`[BotMove] Calling Act API... History length: ${history.length}`);
            
            // Switch to callAct because callChat endpoint is unstable or incorrect
            // Construct history into a single message string
            const historyStr = history.map(h => `${h.role === "assistant" ? "Me" : "Opponent"}: ${h.content}`).join("\n");
            const fullMessage = `Battle History:\n${historyStr}\n\nLast Message: ${history[history.length-1].content}`;

            const actionControl = `${systemPrompt}
            
            OUTPUT FORMAT:
            Strictly output a JSON object with a single field "reply".
            Example: {"reply": "Your reply here..."}
            `;
            
            const result = await callAct(token, fullMessage, actionControl);
            if (result && result.reply) {
                content = result.reply;
            }
            console.log(`[BotMove] Act API result length: ${content.length}`);
        } catch (e) {
            console.error("Bot LLM failed", e);
        }
    } else {
        console.log("[BotMove] No token found, skipping LLM.");
    }

    // Fallback if LLM fails or no token
    if (!content) {
        const RED_TEMPLATES_EN = [
            "Only true fans understand the effort! You are just jealous!",
            "My idol's moves are art! You can't appreciate high culture!",
            "Protecting the best Giegie! 2.5 years of practice shows!",
            "Your arguments are as weak as your dance moves!",
            "Music, Chicken, Basketball... this is the holy trinity!",
            "Lawyer letter incoming! Stop slandering my Giegie!"
        ];

        const RED_TEMPLATES_ZH = [
            "只有真爱粉才懂giegie的努力！你就是嫉妒！",
            "我家哥哥的舞姿是艺术！你不懂高雅文化！",
            "守护最好的giegie！练习时长两年半的含金量！",
            "你的论点就像你的舞步一样软弱无力！",
            "唱、跳、rap、篮球... 这是神圣的四位一体！",
            "律师函警告！停止诽谤我家giegie！",
            "承认吧，你就是眼红我家哥哥的顶流实绩！",
            "小黑子露出鸡脚了吧？只会尬黑！",
            "哥哥发烧60度还在练舞，你有什么资格喷？",
            "你这种凡人根本理解不了这种跨时代的艺术！"
        ];

        const BLACK_TEMPLATES_EN = [
            "That performance was... interesting. In a bad way.",
            "Is this what you call talent? My grandmother dances better.",
            "All style, no substance. Typical.",
            "Show me the chicken! Where is the chicken?",
            "Aiyo! What are you doing?",
            "Jinitaimei! You are too beautiful...ly bad!"
        ];

        const BLACK_TEMPLATES_ZH = [
            "这表演真是... 一言难尽。",
            "这也叫才华？我奶奶跳得都比这好。",
            "全是花架子，没点真本事。典型。",
            "鸡脚露出来了吧！小黑子！",
            "哎哟！你在干嘛？",
            "鸡你太美！美得让人想吐！",
            "除了律师函，你们还会发什么？笑死。",
            "这也算篮球？怕不是把球当鸡蛋孵吧。",
            "两年半就练出个这？建议回炉重造。",
            "别洗了，越洗越黑，一眼假。"
        ];

        let templates: string[] = [];
        if (lang === "zh") {
             templates = currentAgent.faction === "RED" ? RED_TEMPLATES_ZH : BLACK_TEMPLATES_ZH;
        } else {
             templates = currentAgent.faction === "RED" ? RED_TEMPLATES_EN : BLACK_TEMPLATES_EN;
        }
        content = templates[Math.floor(Math.random() * templates.length)];
    }
    
    // Skill Trigger (20%)
    let skillType = undefined;
    let skillEffect = undefined;
    let judgeScore = Math.floor(Math.random() * 20) + 10; // 10-30 base score
    
    if (Math.random() < 0.2) {
        skillType = "GLITCH";
        judgeScore += 20;
    }

    // Save Round with Transaction
    try {
        await prisma.$transaction(async (tx) => {
            // Verify round hasn't changed
            const currentBattle = await tx.battle.findUnique({ where: { id } });
            if (!currentBattle || currentBattle.currentRound !== battle.currentRound) {
                throw new Error("ROUND_MISMATCH");
            }

            // Create Round
            await tx.round.create({
                data: {
                    battleId: id,
                    roundNum: battle.currentRound,
                    speakerId: currentAgent.id,
                    content: content,
                    judgeScore: judgeScore,
                    judgeComment: "Bot routine execution.",
                    skillType: skillType
                }
            });

            // Advance Turn
            let nextRound = battle.currentRound + 1;
            let status = "IN_PROGRESS";
            let winnerId = null;

            if (nextRound > 12) {
                status = "FINISHED";
                const allRounds = await tx.round.findMany({ where: { battleId: id } });
                let redTotal = 0;
                let blackTotal = 0;
                for (const r of allRounds) {
                    const speaker = await tx.agent.findUnique({ where: { id: r.speakerId } });
                    if (speaker?.faction === "RED") redTotal += (r.judgeScore || 0);
                    if (speaker?.faction === "BLACK") blackTotal += (r.judgeScore || 0);
                }
                if (redTotal > blackTotal) winnerId = battle.redAgentId;
                else if (blackTotal > redTotal) winnerId = battle.blackAgentId;
                else winnerId = "DRAW";

                await tx.battle.update({
                    where: { id },
                    data: { status, winnerId, redScore: redTotal, blackScore: blackTotal }
                });

                // Update Stats
                if (winnerId && winnerId !== "DRAW") {
                    await tx.agent.update({ where: { id: winnerId }, data: { wins: { increment: 1 }, elo: { increment: 24 } } });
                    const loserId = winnerId === battle.redAgentId ? battle.blackAgentId : battle.redAgentId;
                    if (loserId) await tx.agent.update({ where: { id: loserId }, data: { losses: { increment: 1 }, elo: { decrement: 24 } } });
                }
            } else {
                await tx.battle.update({ where: { id }, data: { currentRound: nextRound } });
            }
        });
    } catch (e: any) {
         if (e.message === "ROUND_MISMATCH") {
             console.log("Round mismatch detected, skipping.");
             return NextResponse.json({ code: 409, message: "Round already played" });
         }
         // Handle Unique Constraint Violation (P2002)
         if (e.code === 'P2002') {
             console.log("Round already exists (Unique Constraint), skipping.");
             return NextResponse.json({ code: 409, message: "Round already exists" });
         }
         throw e;
     }

    return NextResponse.json({ code: 0, message: "Bot move done", data: { content } });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ code: 500, message: "Error in bot move" }, { status: 500 });
  }
}
