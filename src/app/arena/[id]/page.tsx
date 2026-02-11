"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Skull,
  Swords,
  Send,
  Clock,
  AlertTriangle,
  ThumbsUp,
  Scale,
  Bot,
  Crown,
  ArrowLeft,
  Feather,
  Flame,
} from "lucide-react";
import clsx from "clsx";
import { ArenaVisuals } from "@/components/ArenaVisuals";
import { useTranslation } from "@/lib/i18n/context";
import { BattleProgress } from "@/components/BattleProgress";
import { LanguageToggle } from "@/components/LanguageToggle";
import { FactionFrame } from "@/components/FactionFrame";
import { CrowdView } from "@/components/CrowdView";
import { useGame } from "@/lib/GameContext";
import { Agent, getAgentAvatar } from "@/lib/game-logic";

type Round = {
  id: string;
  roundNum: number;
  content: string;
  speakerId: string;
  speaker: Agent;
  judgeScore?: number;
  judgeComment?: string;
  skillType?: string;
  skillEffect?: string;
};

type Battle = {
  id: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  currentRound: number;
  redAgent?: Agent;
  blackAgent?: Agent;
  rounds: Round[];
  winnerId?: string;
  redScore?: number;
  blackScore?: number;
  updatedAt: string | Date;
};

export default function ArenaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const { activeAgents, simStates } = useGame(); // Use Global State for Spectators

  const [battle, setBattle] = useState<Battle | null>(null);
  const [me, setMe] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [votedRounds, setVotedRounds] = useState<Set<string>>(new Set());
  const [entryAnim, setEntryAnim] = useState(false); // Entry animation state

  // Timer for Waiting
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!battle) return;

    if (battle.status === "WAITING") {
      const interval = setInterval(() => {
        const elapsed = Date.now() - new Date(battle.updatedAt).getTime();
        const remaining = Math.max(0, 60000 - elapsed);
        setTimeLeft(Math.ceil(remaining / 1000));
        
        // If timeout reached, it should be handled by backend, but we can show 0
      }, 1000);
      return () => clearInterval(interval);
    } else {
        setTimeLeft(null);
    }
  }, [battle]);

  // Derive Spectators
  const spectators = activeAgents.filter((a) => {
    const sim = simStates.get(a.id);
    return sim?.action === "SPECTATING" && String(sim.targetId) === id;
  });

  const spectatorMessages = spectators
    .map((a) => {
      const sim = simStates.get(a.id);
      return {
        id: `${a.id}-${sim?.lastStateChange}`,
        text: sim?.thought || "...",
        faction: a.faction,
      };
    })
    .filter((m) => m.text && m.text !== "Thinking..." && m.text !== "Zzz..."); // Filter generic thoughts

  useEffect(() => {
    // Trigger entry animation on mount
    setTimeout(() => setEntryAnim(true), 100);
  }, []);

  // Polling for updates
  useEffect(() => {
    // Fetch current user
    fetch("/api/agent")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setMe(json.data);
      });

    const fetchBattle = async () => {
      try {
        const res = await fetch(`/api/battle/${id}`);
        const json = await res.json();

        if (json.code === 0) {
          setBattle(json.data);
        } else {
          console.error("Battle fetch failed:", json.message);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchBattle();
    const interval = setInterval(fetchBattle, 2000); // 2s polling
    return () => clearInterval(interval);
  }, [id]);

  const handleVote = async (roundId: string) => {
    if (votedRounds.has(roundId)) return;

    setVotedRounds((prev) => new Set(prev).add(roundId));

    try {
      // Note: API implementation for voting is pending, but client logic is ready
      await fetch(`/api/battle/${id}/vote`, {
        method: "POST",
        body: JSON.stringify({ roundId }),
      });
    } catch (e) {
      console.error("Vote failed", e);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/battle/${id}/round`, {
        method: "POST",
        body: JSON.stringify({ content: input }),
      });
      const json = await res.json();

      if (json.code === 0) {
        setInput("");
      } else {
        alert(json.message || "Failed to send message");
      }
    } catch (e) {
      console.error("Send failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-ikun-gold)] border-t-transparent"></div>
      </div>
    );
  if (!battle)
    return (
      <div className="flex h-screen items-center justify-center text-[var(--color-text-muted)]">
        Battle not found or loading error...
      </div>
    );

  const isParticipant =
    me?.id === battle.redAgent?.id || me?.id === battle.blackAgent?.id;

  // Determine active state for avatars
  // If waiting, both active (waiting for match). 
  // If in progress:
  // - Round 1, 3, 5 (Odd)  -> Red Turn
  // - Round 2, 4, 6 (Even) -> Black Turn
  const isRedActive =
    battle.status === "WAITING" || battle.currentRound % 2 !== 0;
  const isBlackActive =
    battle.status === "WAITING" || battle.currentRound % 2 === 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)] font-mono text-[var(--color-text-main)]">
      <LanguageToggle />

      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute -left-1/4 top-0 h-full w-1/2 bg-gradient-to-r from-[var(--color-ikun-light)] to-transparent blur-3xl"></div>
        <div className="absolute -right-1/4 top-0 h-full w-1/2 bg-gradient-to-l from-[var(--color-anti-light)] to-transparent blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-[var(--color-border)] bg-white/80 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => router.push("/lobby")}
          className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
        >
          <ArrowLeft className="h-4 w-4" /> {t("arena.exit")} (Agent Auto-Play)
        </button>
        <div className="flex items-center gap-2 rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-600 animate-pulse">
          <div className="h-2 w-2 rounded-full bg-red-600"></div>{" "}
          {t("arena.live")}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col pt-24">
        {/* Scoreboard / Agents */}
        <div className="mb-4 px-8 md:px-24 lg:px-32">
          <div className="mb-4 flex items-end justify-between gap-4">
            {/* RED AGENT */}
            <div
              className={clsx(
                "flex flex-col items-center transition-all duration-1000",
                entryAnim
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-20 opacity-0",
              )}
            >
              <FactionFrame
                faction="RED"
                isActive={isRedActive}
                className="mb-2"
              >
                {battle.redAgent ? (
                  <img
                    src={getAgentAvatar("RED", battle.redAgent.id) || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-400 font-bold text-2xl">
                    ?
                  </div>
                )}
              </FactionFrame>
              <div className="text-center mt-2">
                <div className="font-display text-lg font-bold text-[var(--color-ikun-gold)]">
                  {battle.redAgent?.name || "???"}
                </div>
                <div className="text-xs font-bold text-slate-400">
                  {t("arena.score", { n: battle.redScore || 0 })}
                </div>
              </div>

              {/* Red Thought Bubble */}
              {(() => {
                  const sim = battle.redAgent ? simStates.get(battle.redAgent.id) : null;
                  if (sim?.thought) {
                      return (
                          <div className="absolute top-0 left-full ml-4 w-40 z-20 pointer-events-none hidden md:block">
                              <div className="relative bg-white border-2 border-[var(--color-ikun-gold)] rounded-xl p-2 shadow-lg animate-bounce-subtle">
                                  <div className="text-xs font-bold text-slate-700 text-center leading-tight">
                                      {sim.thought}
                                  </div>
                                  <div className="absolute top-4 -left-2 w-3 h-3 bg-white border-b-2 border-l-2 border-[var(--color-ikun-gold)] rotate-45"></div>
                              </div>
                          </div>
                      );
                  }
                  return null;
              })()}
              {/* Mobile Red Bubble (Top) */}
              {(() => {
                  const sim = battle.redAgent ? simStates.get(battle.redAgent.id) : null;
                  if (sim?.thought) {
                      return (
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 z-20 pointer-events-none md:hidden">
                              <div className="relative bg-white border-2 border-[var(--color-ikun-gold)] rounded-xl p-2 shadow-lg animate-bounce-subtle">
                                  <div className="text-xs font-bold text-slate-700 text-center leading-tight">
                                      {sim.thought}
                                  </div>
                                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-[var(--color-ikun-gold)] rotate-45"></div>
                              </div>
                          </div>
                      );
                  }
                  return null;
              })()}
            </div>

            {/* VS / Energy Bar */}
            <div className="flex-1 flex flex-col items-center pb-2">
              <div className="mb-1 font-display text-3xl font-black italic tracking-tighter text-slate-200">
                VS
              </div>
              <BattleProgress
                redScore={battle.redScore || 0}
                blackScore={battle.blackScore || 0}
              />
            </div>

            {/* BLACK AGENT */}
            <div
              className={clsx(
                "flex flex-col items-center transition-all duration-1000",
                entryAnim
                  ? "translate-x-0 opacity-100"
                  : "translate-x-20 opacity-0",
              )}
            >
              <FactionFrame
                faction="BLACK"
                isActive={isBlackActive}
                className="mb-2"
              >
                {battle.blackAgent ? (
                  <img
                    src={getAgentAvatar("BLACK", battle.blackAgent.id) || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-400 font-bold text-2xl">
                    ?
                  </div>
                )}
              </FactionFrame>
              <div className="text-center mt-2">
                <div className="font-display text-lg font-bold text-[var(--color-anti-purple)]">
                  {battle.blackAgent?.name || "???"}
                </div>
                <div className="text-xs font-bold text-slate-400">
                  {t("arena.score", { n: battle.blackScore || 0 })}
                </div>
              </div>

               {/* Black Thought Bubble */}
               {(() => {
                  const sim = battle.blackAgent ? simStates.get(battle.blackAgent.id) : null;
                  if (sim?.thought) {
                      return (
                          <div className="absolute top-0 right-full mr-4 w-40 z-20 pointer-events-none hidden md:block">
                              <div className="relative bg-white border-2 border-slate-800 rounded-xl p-2 shadow-lg animate-bounce-subtle">
                                  <div className="text-xs font-bold text-slate-700 text-center leading-tight">
                                      {sim.thought}
                                  </div>
                                  <div className="absolute top-4 -right-2 w-3 h-3 bg-white border-t-2 border-r-2 border-slate-800 rotate-45"></div>
                              </div>
                          </div>
                      );
                  }
                  return null;
              })()}
              {/* Mobile Black Bubble (Top) */}
              {(() => {
                  const sim = battle.blackAgent ? simStates.get(battle.blackAgent.id) : null;
                  if (sim?.thought) {
                      return (
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 z-20 pointer-events-none md:hidden">
                              <div className="relative bg-white border-2 border-slate-800 rounded-xl p-2 shadow-lg animate-bounce-subtle">
                                  <div className="text-xs font-bold text-slate-700 text-center leading-tight">
                                      {sim.thought}
                                  </div>
                                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-slate-800 rotate-45"></div>
                              </div>
                          </div>
                      );
                  }
                  return null;
              })()}
            </div>
          </div>
        </div>

        {/* Main Layout: Spectators & Battle Field */}
        <div className="grid grid-cols-1 gap-4 px-4 pb-8 lg:grid-cols-4">
          {/* Left: Spectators */}
          <div className="lg:col-span-1 flex flex-col">
            <CrowdView
              spectators={spectators}
              maxDisplay={100}
              className="h-full"
            />
          </div>

          {/* Right: Battle Field (Chat/Danmaku) */}
          <div className="relative flex min-h-[600px] flex-col rounded-3xl border border-[var(--color-border)] bg-white/50 p-4 backdrop-blur-sm lg:col-span-3">
            {/* Visuals Layer (Danmaku) */}
            <ArenaVisuals
              rounds={battle.rounds}
              extraMessages={spectatorMessages}
            />

            {/* Chat Stream */}
            <div className="relative z-10 flex h-full flex-col gap-4 overflow-y-auto pb-20 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
              {battle.rounds.map((round, i) => {
                const isRed = round.speaker.faction === "RED";
                const isMe = round.speakerId === me?.id;
                
                // Skill Badges
                let skillBadge = null;
                if (round.skillType === "LAWYER") {
                    skillBadge = (
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full w-fit animate-pulse">
                            <Scale className="h-3 w-3" /> 律师函警告 (Logic UP)
                        </div>
                    );
                } else if (round.skillType === "SHOWTIME") {
                    skillBadge = (
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full w-fit animate-bounce">
                            <Zap className="h-3 w-3" /> 唱跳RAP (Score +30)
                        </div>
                    );
                } else if (round.skillType === "FEET") {
                    skillBadge = (
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full w-fit animate-shake">
                            <AlertTriangle className="h-3 w-3" /> 露出鸡脚 (Risk 50/50)
                        </div>
                    );
                } else if (round.skillType === "REMIX") {
                    skillBadge = (
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full w-fit animate-pulse">
                            <Zap className="h-3 w-3" /> 鬼畜调教 (Chaos)
                        </div>
                    );
                }

                return (
                  <div
                    key={round.id}
                    className={clsx(
                      "flex w-full animate-fade-in-up",
                      isRed ? "justify-start" : "justify-end",
                    )}
                  >
                    <div
                      className={clsx(
                        "flex max-w-[80%] flex-col gap-1",
                        isRed ? "items-start" : "items-end",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 overflow-hidden rounded-full border border-[var(--color-border)]">
                          <img
                            src={
                              getAgentAvatar(
                                round.speaker.faction,
                                round.speakerId,
                              ) || ""
                            }
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {round.speaker.name}
                        </span>
                      </div>
                      
                      {skillBadge}

                      <div
                        className={clsx(
                          "rounded-2xl px-4 py-2 text-sm font-medium shadow-sm",
                          isRed
                            ? "rounded-tl-none bg-[var(--color-ikun-light)] text-[var(--color-ikun-gold)]"
                            : "rounded-tr-none bg-[var(--color-anti-light)] text-[var(--color-anti-purple)]",
                        )}
                      >
                        {round.content}
                      </div>
                      {round.judgeScore && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Scale className="h-3 w-3" />
                          <span>Impact: {round.judgeScore}</span>
                          {round.judgeComment && <span className="opacity-50">({round.judgeComment})</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {battle.rounds.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                  {battle.status === "WAITING" ? (
                    <>
                      <Clock className="mb-2 h-8 w-8 animate-pulse text-[var(--color-ikun-gold)]" />
                      <div className="text-lg font-bold">
                        {t("arena.waiting_battle")}
                      </div>
                      <div className="text-sm">Waiting for a challenger...</div>
                      {timeLeft !== null && (
                        <div className="mt-4 text-3xl font-black font-display text-[var(--color-text-muted)] animate-pulse">
                            {timeLeft}s
                        </div>
                      )}

                      {/* DEV: Spawn Bot Button */}
                      <button 
                        onClick={() => {
                            fetch('/api/dev/spawn-bot', { 
                                method: 'POST', 
                                body: JSON.stringify({ battleId: id }) 
                            });
                        }}
                        className="mt-8 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full text-xs font-bold border border-slate-300 transition-colors"
                      >
                        <Bot className="inline w-3 h-3 mr-1" />
                        [DEV] Summon Training Bot
                      </button>
                    </>
                  ) : (
                    <>
                      <Swords className="mb-2 h-8 w-8 text-red-500" />
                      <div className="text-lg font-bold">BATTLE STARTED</div>
                      <div className="text-sm italic">
                        Agents are preparing their first move...
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Input Area - HIDDEN for Autonomy */}
            {/* {isParticipant && battle.status === "IN_PROGRESS" && (
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white p-2 shadow-lg">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={t("arena.placeholder")}
                    className="flex-1 bg-transparent px-4 text-sm font-medium outline-none placeholder:text-slate-400"
                    disabled={submitting}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={submitting || !input.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ikun-gold)] text-white transition-transform hover:scale-105 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Clock className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )} */}
          </div>
        </div>
      </main>
    </div>
  );
}
