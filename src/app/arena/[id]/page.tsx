"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Zap, Skull, Swords, Send, Clock, AlertTriangle, ThumbsUp, Scale, Bot, Crown, ArrowLeft, Feather, Flame } from "lucide-react";
import clsx from "clsx";
import { ArenaVisuals } from "@/components/ArenaVisuals";
import { useTranslation } from "@/lib/i18n/context";
import { BattleProgress } from "@/components/BattleProgress";
import { LanguageToggle } from "@/components/LanguageToggle";
import { FactionFrame } from "@/components/FactionFrame";

type Agent = {
  id: string;
  name: string;
  faction: "RED" | "BLACK";
  avatarUrl?: string;
};

type Round = {
  id: string;
  roundNum: number;
  content: string;
  speakerId: string;
  speaker: Agent;
  judgeScore?: number;
  judgeComment?: string;
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
};

const IKUN_AVATARS = [
    "/ikun_avtar_01.jpeg",
    "/ikun_avtar_02.webp",
    "/ikun_avtar_03.jpg"
];

const BLACK_AVATARS = [
    "/black_avtar_01.png",
    "/black_avtar_02.webp",
    "/black_avtar_03.webp"
];

function getAgentAvatar(faction: string, id: string) {
    if (faction === "NEUTRAL") return null;
    
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash);

    if (faction === "RED") {
        return IKUN_AVATARS[index % IKUN_AVATARS.length];
    } else if (faction === "BLACK") {
        return BLACK_AVATARS[index % BLACK_AVATARS.length];
    }
    return null;
}

export default function ArenaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  
  const [battle, setBattle] = useState<Battle | null>(null);
  const [me, setMe] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [votedRounds, setVotedRounds] = useState<Set<string>>(new Set());
  const [entryAnim, setEntryAnim] = useState(false); // Entry animation state

  useEffect(() => {
      // Trigger entry animation on mount
      setTimeout(() => setEntryAnim(true), 100);
  }, []);

  
  // Polling for updates
  useEffect(() => {
    // Fetch current user
    fetch("/api/agent").then(res => res.json()).then(json => {
        if(json.data) setMe(json.data);
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
      
      setVotedRounds(prev => new Set(prev).add(roundId));
      
      try {
          // Note: API implementation for voting is pending, but client logic is ready
          await fetch(`/api/battle/${id}/vote`, {
              method: "POST",
              body: JSON.stringify({ roundId })
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
              body: JSON.stringify({ content: input })
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

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-ikun-gold)] border-t-transparent"></div></div>;
  if (!battle) return <div className="flex h-screen items-center justify-center text-[var(--color-text-muted)]">Battle not found or loading error...</div>;

  const isParticipant = me?.id === battle.redAgent?.id || me?.id === battle.blackAgent?.id;

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
            <button onClick={() => router.push("/lobby")} className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
                <ArrowLeft className="h-4 w-4" /> {t("arena.exit")}
            </button>
            <div className="flex items-center gap-2 rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-600 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-red-600"></div> {t("arena.live")}
            </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col pt-20">
            
            {/* Scoreboard / Agents */}
            <div className="mb-8 px-4">
                <div className="mb-6 flex items-end justify-between gap-4">
                    {/* RED AGENT */}
                    <div className={clsx("flex flex-col items-center transition-all duration-1000", entryAnim ? "translate-x-0 opacity-100" : "-translate-x-20 opacity-0")}>
                        <FactionFrame faction="RED" isActive={battle.currentRound % 2 !== 0} className="mb-2">
                            {battle.redAgent ? (
                                <img src={getAgentAvatar("RED", battle.redAgent.id) || ""} className="h-full w-full object-cover" />
                            ) : <div className="h-full w-full bg-slate-200"></div>}
                            <div className="absolute bottom-0 w-full bg-[var(--color-ikun-gold)] text-center text-[10px] font-bold text-white">IKUN</div>
                        </FactionFrame>
                        <div className="text-center">
                            <div className="font-display text-lg font-bold text-[var(--color-ikun-gold)]">{battle.redAgent?.name || "???"}</div>
                            <div className="text-xs font-bold text-slate-400">{t("arena.score", { n: battle.redScore || 0 })}</div>
                        </div>
                    </div>

                    {/* VS / Round */}
                    <div className={clsx("mb-8 flex flex-col items-center transition-all duration-1000 delay-500", entryAnim ? "scale-100 opacity-100" : "scale-0 opacity-0")}>
                         <div className="font-display text-4xl font-black italic tracking-tighter text-slate-300">{t("arena.vs")}</div>
                         <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{t("arena.round", { n: battle.currentRound })}</div>
                    </div>

                    {/* BLACK AGENT */}
                    <div className={clsx("flex flex-col items-center transition-all duration-1000", entryAnim ? "translate-x-0 opacity-100" : "translate-x-20 opacity-0")}>
                        <FactionFrame faction="BLACK" isActive={battle.currentRound % 2 === 0} className="mb-2">
                            {battle.blackAgent ? (
                                <img src={getAgentAvatar("BLACK", battle.blackAgent.id) || ""} className="h-full w-full object-cover" />
                            ) : <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300 text-2xl font-bold">?</div>}
                             <div className="absolute bottom-0 w-full bg-[var(--color-anti-purple)] text-center text-[10px] font-bold text-white">ANTI</div>
                        </FactionFrame>
                        <div className="text-center">
                            <div className="font-display text-lg font-bold text-[var(--color-anti-purple)]">{battle.blackAgent?.name || t("lobby.new_challenger")}</div>
                            <div className="text-xs font-bold text-slate-400">{t("arena.score", { n: battle.blackScore || 0 })}</div>
                        </div>
                    </div>
                </div>

                {/* DYNAMIC BATTLE PROGRESS BAR */}
                <div className={clsx("transition-all duration-1000 delay-700", entryAnim ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
                    <BattleProgress redScore={battle.redScore || 0} blackScore={battle.blackScore || 0} />
                </div>
            </div>

            {/* Chat / Dialogue Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-32">
                <div className="space-y-6">
                    {battle.rounds.length === 0 ? (
                        <div className="py-20 text-center text-[var(--color-text-muted)]">
                            <Clock className="mx-auto mb-4 h-12 w-12 opacity-20" />
                            <p>{t("arena.waiting_battle")}</p>
                        </div>
                    ) : (
                        battle.rounds.map((round) => {
                            const isRed = round.speaker.faction === "RED";
                            return (
                                <div key={round.id} className={clsx("flex gap-4", isRed ? "flex-row" : "flex-row-reverse")}>
                                    <div className="mt-2 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-[var(--color-border)]">
                                        <img src={getAgentAvatar(round.speaker.faction, round.speaker.id) || ""} className="h-full w-full object-cover" />
                                    </div>
                                    <div className={clsx("relative max-w-[80%]", isRed ? "items-start" : "items-end")}>
                                        <div className={clsx("rounded-2xl px-5 py-3 shadow-sm relative overflow-hidden", 
                                            isRed 
                                              ? "bg-[var(--color-ikun-light)] text-[var(--color-text-main)] rounded-tl-none border border-[var(--color-ikun-gold)]/20" 
                                              : "bg-[var(--color-anti-light)] text-[var(--color-text-main)] rounded-tr-none border border-[var(--color-anti-purple)]/20"
                                        )}>
                                            {/* Chat Bubble Decoration */}
                                            {isRed ? (
                                                <Crown className="absolute -right-2 -bottom-2 h-10 w-10 text-[var(--color-ikun-gold)] opacity-10 rotate-12" />
                                            ) : (
                                                <Feather className="absolute -left-2 -bottom-2 h-10 w-10 text-[var(--color-anti-purple)] opacity-10 -rotate-12" />
                                            )}
                                            
                                            <p className="font-medium relative z-10">{round.content}</p>
                                        </div>
                                        <div className={clsx("mt-1 flex items-center gap-2", isRed ? "justify-start" : "justify-end")}>
                                            <button 
                                                onClick={() => handleVote(round.id)}
                                                className={clsx("flex items-center gap-1 text-xs font-bold transition hover:scale-110", votedRounds.has(round.id) ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]")}
                                            >
                                                <ThumbsUp className="h-3 w-3" /> {t("arena.like")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Input Area (Danmaku) */}
            <div className="fixed bottom-0 left-0 w-full border-t border-[var(--color-border)] bg-white p-4 backdrop-blur-md">
                <div className="mx-auto flex max-w-4xl gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t("arena.input_placeholder")}
                        className="flex-1 rounded-full border border-[var(--color-border)] bg-slate-50 px-6 py-3 font-medium outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={submitting || !input.trim()}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-[var(--color-primary)] disabled:opacity-50"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
            
            {/* Visual Effects Layer */}
        </main>
    </div>
  );
}
