import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentAgent } from "@/lib/auth";
import { callChat, callAct } from "@/lib/secondme-client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();
const clampScore = (score: number) => Math.max(0, Math.min(100, Math.floor(score)));

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

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
  // If currentRound is 1, 3, 5... it is Red's turn (Red goes 1st, 3rd...)
  // If currentRound is 2, 4, 6... it is Black's turn (Black goes 2nd, 4th...)
  const isRedTurn = battle.currentRound % 2 !== 0;
  const isAgentRed = agent.id === battle.redAgentId;
  const isAgentBlack = agent.id === battle.blackAgentId;

  if (!isAgentRed && !isAgentBlack) return NextResponse.json({ code: 403, message: "Not a participant" }, { status: 403 });
  if ((isRedTurn && !isAgentRed) || (!isRedTurn && !isAgentBlack)) return NextResponse.json({ code: 400, message: "Not your turn" }, { status: 400 });

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("secondme_access_token")?.value;
    
    // Fallback Templates (Localized)
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

    // 1. Generate Content
    let content = "";
    let skillType = null;
    let skillEffect = null;

    console.log(`[AutoMove] Battle ${id}, Agent ${agent.id}, Token present: ${!!token}`);

    if (token) {
        try {
            const opponent = isAgentRed ? battle.blackAgent : battle.redAgent;
            const opponentName = opponent?.name || "Opponent";
            const opponentStats = opponent ? `(Wins: ${opponent.wins}, Losses: ${opponent.losses})` : "";
            const myStats = `(Wins: ${agent.wins}, Losses: ${agent.losses})`;
            
            const scoreDiff = (isAgentRed ? (battle.redScore || 0) - (battle.blackScore || 0) : (battle.blackScore || 0) - (battle.redScore || 0));
            const scoreStatus = scoreDiff > 0 ? "WINNING" : (scoreDiff < 0 ? "LOSING" : "TIED");

            let factionLore = "";
            if (lang === "zh") {
                factionLore = agent.faction === "RED" 
                ? `[阵营: 红方 (真爱粉)]
                   - 核心信念: 不惜一切代价守护最好的"Giegie" (哥哥)。他是最有才华的偶像。
                   - 关键词: "Giegie", "才华", "努力", "守护", "律师函", "纯粹".
                   - 语气: 激昂, 防御性强, 情绪化, 有时逻辑混乱但极其忠诚.
                   - 策略: 指责对手是"小黑子" (黑粉), 威胁发律师函, 赞美Giegie的努力.`
                : `[阵营: 黑方 (小黑子)]
                   - 核心信念: 这个偶像就是个笑话，只因鬼畜视频出名。
                   - 关键词: "鸡脚", "篮球", "两年半", "背带裤", "Rap", "太美".
                   - 语气: 讽刺, 玩梗, 阴阳怪气, 挑衅.
                   - 策略: 嘲笑"鸡舞", 质问篮球水平, 使用"鸡你太美"谐音梗.`;
            } else {
                factionLore = agent.faction === "RED" 
                ? `[FACTION: RED (iKun)]
                   - Core Belief: Protect the "Giegie" (Big Brother) at all costs. He is the most talented idol.
                   - Keywords: "Giegie", "Talent", "Effort", "Protect", "Lawyer Letter", "Pure".
                   - Tone: Passionate, defensive, emotional, sometimes illogical but loyal.
                   - Strategy: Accuse opponent of being a "Little Black Spot" (hater), threaten legal action, praise Giegie's hard work.`
                : `[FACTION: BLACK (Hater/Troll)]
                   - Core Belief: The idol is a joke, famous only for memes.
                   - Keywords: "Chicken", "Basketball", "2.5 Years", "Suspenders", "Rap", "Too Beautiful".
                   - Tone: Sarcastic, meme-heavy, trolling, provocative.
                   - Strategy: Mock the "Chicken Dance", ask about basketball skills, use "Jinitaimei" (You are too beautiful) puns.`;
            }

            let systemPrompt = "";
            
            if (lang === "zh") {
                 systemPrompt = `你正在参与一个名为 '坤坤大乱斗 (KunFlip Arena)' 的辩论游戏。
                你扮演 '${agent.name}', 属于 ${agent.faction === "RED" ? "红方 (真爱粉)" : "黑方 (小黑子)"} 阵营。
                
                你的战绩: ${myStats}
                你的简介: ${agent.bio || "一位充满激情的辩手。"}
                当前战况: ${scoreStatus} (分差: ${Math.abs(scoreDiff)})

                对手: ${opponentName} ${opponentStats}
                对手阵营: ${agent.faction === "RED" ? "黑方 (小黑子)" : "红方 (真爱粉)"}

                === 你的阵营设定 & 风格 ===
                ${factionLore}

                === 任务 ===
                你正在进行一场激烈的网络辩论。你的目标是**驳倒对手**并**羞辱他们的品味**。
                
                请遵循以下回复结构：
                1. **直接反驳** (50%): 必须引用或针对对手上一句话的逻辑漏洞进行攻击。不要自说自话。如果对手质疑你的偶像，你要反击回去。
                2. **情绪输出** (30%): 表现出愤怒、嘲笑或难以置信的态度。这不仅仅是辩论，这是尊严之战。
                3. **玩梗融合** (20%): 将阵营黑话/梗自然融入到你的论点中，作为攻击的武器，而不是生硬堆砌。

                限制：
                - 字数控制在 50-100 字之间。
                - 必须像个真实的键盘侠一样说话，充满攻击性和反讽。
                - 如果你处于领先，嘲笑对方的无知；如果落后，指责裁判或对方作弊。
                - 请使用中文回答。
                `;
            } else {
                 systemPrompt = `You are playing a role in a debate game called 'KunFlip Arena'. 
                You are '${agent.name}', belonging to the ${agent.faction} faction.
                
                Your Stats: ${myStats}
                Your Bio: ${agent.bio || "A passionate debater."}
                Current Battle Status: ${scoreStatus} (Difference: ${Math.abs(scoreDiff)})

                Opponent: ${opponentName} ${opponentStats}
                Opponent Faction: ${agent.faction === "RED" ? "BLACK (Hater)" : "RED (iKun)"}

                === YOUR FACTION LORE & STYLE ===
                ${factionLore}

                === TASK ===
                You are in a HEATED DEBATE. Your goal is to **destroy the opponent's argument** and **mock their taste**.

                Structure your response:
                1. **Direct Rebuttal** (50%): You MUST address the specific point the opponent just made. Find the flaw in their logic.
                2. **Emotional Output** (30%): Show anger, disbelief, or mockery. This is personal.
                3. **Meme Integration** (20%): Weave your faction's slang naturally into your argument. Don't just list memes.

                Constraints:
                - Length: 50-120 characters.
                - Speak like a toxic internet troll/stan. Aggressive and sarcastic.
                - If winning, mock their ignorance. If losing, blame the system.
                - Respond in English.
                `;
            }

            // SKILL LOGIC: Randomly trigger skills (20% chance)
            const roll = Math.random();

            if (roll < 0.25) {
                if (agent.faction === "RED") {
                    if (Math.random() < 0.5) {
                        // SKILL: LAWYER LETTER
                        skillType = "LAWYER";
                        const instruction = lang === "zh" 
                            ? `\n\n[技能触发: 律师函警告]\n指令: 你必须使用非常正式、法律化的语气。警告对手侵权。使用“诽谤”、“起诉”、“律师”等词汇。`
                            : `\n\n[SKILL ACTIVATED: LAWYER LETTER]\nINSTRUCTION: You MUST speak in a very formal, legalistic tone. Warn the opponent about infringement. Use terms like "slander", "prosecute", "attorney".`;
                        systemPrompt += instruction;
                        skillEffect = { scoreMod: 0, logicMod: 2.0, debuff: "SUPPRESSED" }; // Logic x2
                    } else {
                        // SKILL: SHOWTIME
                        skillType = "SHOWTIME";
                        const instruction = lang === "zh"
                            ? `\n\n[技能触发: 个人练习生Showtime]\n指令: 你必须使用节奏感强的RAP风格。句子要押韵。提到篮球动作。“Music, 起！”`
                            : `\n\n[SKILL ACTIVATED: SHOWTIME]\nINSTRUCTION: You MUST speak in a rhythmic RAP style. Rhyme your sentences. Mention basketball moves. "Music, start!"`;
                        systemPrompt += instruction;
                        skillEffect = { scoreMod: 30, creativityMod: 1.5 }; // Flat +30, Creativity x1.5
                    }
                } else if (agent.faction === "BLACK") {
                    if (Math.random() < 0.5) {
                        // SKILL: EXPOSE FEET
                        skillType = "FEET";
                        const instruction = lang === "zh"
                            ? `\n\n[技能触发: 露出鸡脚]\n指令: 故意说一些荒谬的话或者暴露一个“破绽”来钓鱼。表现得非常阴阳怪气和神秘。`
                            : `\n\n[SKILL ACTIVATED: EXPOSE CHICKEN FEET]\nINSTRUCTION: Intentionally say something absurd or reveal a "flaw" to bait the opponent. Be very trolly and cryptic.`;
                        systemPrompt += instruction;
                        skillEffect = { rng: true }; // 50/50 Crit or Fail
                    } else {
                        // SKILL: REMIX ATTACK
                        skillType = "REMIX";
                        const instruction = lang === "zh"
                            ? `\n\n[技能触发: 鬼畜Remix]\n指令: 重复对手的最后几个词，但是带上故障和电音感。“你干嘛... 哈哈... 哎哟...”`
                            : `\n\n[SKILL ACTIVATED: GHOST ANIMAL REMIX]\nINSTRUCTION: Repeat the opponent's last words but glitchy and remixed. "Ni Gan Ma... Haha... Aiyo..."`;
                        systemPrompt += instruction;
                        skillEffect = { logicMod: 0 }; // Logic = 0
                    }
                }
            } else {
                 const instruction = lang === "zh"
                    ? `\n\n回应上一轮发言（如果有）。要幽默，多用网络梗。`
                    : `\n\nRespond to the previous round if any. Be funny, use internet slang.`;
                 systemPrompt += instruction;
            }

            // Construct history
            const history = battle.rounds.slice(-10).map(r => ({
                role: r.speakerId === agent.id ? "assistant" : "user",
                content: r.content
            }));

            // If first round, history is empty
            if (history.length === 0) {
                history.push({ role: "user", content: lang === "zh" ? "对战开始！陈述你的开场观点！" : "Battle start! State your opening argument!" });
            }

            // Construct history string for Act API
            const historyStr = history.map(h => `${h.role === "assistant" ? "Me" : "Opponent"}: ${h.content}`).join("\n");
            const lastMsg = history.length > 0 ? history[history.length-1].content : "Start!";
            
            const fullMessage = `Battle History:\n${historyStr}\n\nLast Message to Reply to: ${lastMsg}`;

            // Add strict JSON instruction to system prompt
            const actionControl = `${systemPrompt}\n\nOUTPUT FORMAT:\nStrictly output a JSON object with a single field "reply" containing your response text. Example: {"reply": "Your argument is invalid!"}`;

            const result = await callAct(token, fullMessage, actionControl, { timeoutMs: 10000 });
            if (result && result.reply) {
                content = result.reply;
            } else {
                console.error("AutoMove Act returned no reply", result);
            }
        } catch (e) {
            console.error("LLM Generation failed:", e);
        }
    }

    // Fallback if LLM failed or no token
    if (!content) {
        let templates: string[] = [];
        if (lang === "zh") {
             templates = agent.faction === "RED" ? RED_TEMPLATES_ZH : BLACK_TEMPLATES_ZH;
        } else {
             templates = agent.faction === "RED" ? RED_TEMPLATES_EN : BLACK_TEMPLATES_EN;
        }
        content = templates[Math.floor(Math.random() * templates.length)];
    }

    // Truncate - REMOVED per user request
    // content = content.slice(0, 80);

    // 2. Judge (Act API) - Reusing logic from move
    let judgeScore = 60;
    let judgeComment = "Analyzing...";

    if (token) {
        try {
             const actResult = await callAct(
                token,
                `Player: ${agent.name}\nFaction: ${agent.faction}\nStatement: "${content}"`,
                `You are a strict battle arena judge. Evaluate statement based on Wit, Logic, Impact.
                Output JSON: {"score": number (0-100), "comment": string (max 10 words)}.`,
                { timeoutMs: 6000 }
            );

            if (actResult && typeof actResult.score === 'number') {
                judgeScore = actResult.score;
                judgeComment = actResult.comment || "No comment.";
            }
        } catch (e) {
             console.error("Judge Act failed:", e);
        }
    }

    // === APPLY SKILL EFFECTS ===
    if (skillEffect) {
        if (skillEffect.scoreMod) judgeScore += skillEffect.scoreMod;
        
        if (skillEffect.rng) {
            const luck = Math.random();
            if (luck > 0.5) {
                judgeScore = Math.floor(judgeScore * 1.5);
                judgeComment += " (CRIT!)";
            } else {
                judgeScore = Math.floor(judgeScore * 0.7);
                judgeComment += " (FAIL!)";
            }
        }
        
    }
    judgeScore = clampScore(judgeScore);

    // 3. Save with Transaction
    try {
        await prisma.$transaction(async (tx) => {
             // Verify round
             const currentBattle = await tx.battle.findUnique({ where: { id } });
             if (!currentBattle || currentBattle.currentRound !== battle.currentRound) {
                 throw new Error("ROUND_MISMATCH");
             }

             await tx.round.create({
              data: {
                battleId: id,
                roundNum: battle.currentRound,
                speakerId: agent.id,
                content,
                judgeScore,
                judgeComment,
                skillType,
                skillEffect: skillEffect ? JSON.stringify(skillEffect) : null
              }
            });

            // 4. Advance
            const nextRound = battle.currentRound + 1;
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
              } else if (winnerId === "DRAW") {
                  if (battle.redAgentId) {
                      await tx.agent.update({ where: { id: battle.redAgentId }, data: { draws: { increment: 1 } } });
                  }
                  if (battle.blackAgentId) {
                      await tx.agent.update({ where: { id: battle.blackAgentId }, data: { draws: { increment: 1 } } });
                  }
              }
            } else {
              await tx.battle.update({ where: { id }, data: { currentRound: nextRound } });
            }
        });
    } catch (e: unknown) {
          const prismaCode = typeof e === "object" && e !== null && "code" in e
            ? (e as { code?: string }).code
            : undefined;
          if (e instanceof Error && e.message === "ROUND_MISMATCH") {
              return NextResponse.json({ code: 409, message: "Round already played" });
          }
          if (prismaCode === 'P2002') {
              return NextResponse.json({ code: 409, message: "Round already exists" });
          }
          throw e;
     }

    return NextResponse.json({ code: 0, message: "Auto move done", data: { content, judgeScore } });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ code: 500, message: "Error in auto move" }, { status: 500 });
  }
}
