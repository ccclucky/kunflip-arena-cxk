"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Skull, Swords, Users, Crown, Eye, Plus, Search, Feather, Flame, VenetianMask, Scale } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "@/lib/i18n/context";
import { BattleProgress } from "@/components/BattleProgress";
import { LanguageToggle } from "@/components/LanguageToggle";
import { FactionFrame } from "@/components/FactionFrame";

type AgentLog = {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    data?: string;
};

type Agent = {
  id: string;
  name: string;
  faction: "RED" | "BLACK" | "NEUTRAL";
  elo: number;
  avatarUrl?: string;
  faith?: number;
  contribution?: number;
  logs?: AgentLog[];
  status?: string;
  bio?: string;
};

type Battle = {
  id: string;
  redAgent?: Agent;
  blackAgent?: Agent;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  currentRound: number;
  spectatorCount: number;
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

export default function LobbyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);
  const [globalStats, setGlobalStats] = useState({ redElo: 0, blackElo: 0 });

  useEffect(() => {
    // 1. Fetch User
    fetch("/api/agent").then(res => res.json()).then(json => {
        if(json.data) setAgent(json.data);
    });

    // 2. Fetch Lobby Data
    const fetchLobby = async () => {
        try {
            const res = await fetch("/api/lobby");
            const json = await res.json();
            if (json.code === 0) {
                setBattles(json.data.battles || []);
                setActiveAgents(json.data.activeAgents || []);
                if (json.data.stats) {
                    setGlobalStats(json.data.stats);
                }
            }
        } catch (e) {
            console.error("Failed to fetch lobby data", e);
        } finally {
            setLoading(false);
        }
    };
    
    fetchLobby();
    const interval = setInterval(fetchLobby, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  const handleJoinBattle = (battleId: string) => {
    router.push(`/arena/${battleId}`);
  };

  const handleCreateBattle = async () => {
    if (!agent) return; // Wait for agent loaded
    
    try {
        const res = await fetch("/api/battle", { method: "POST" });
        const json = await res.json();
        
        if (json.code === 0) {
            router.push(`/arena/${json.data.id}`);
        } else {
            // If already in battle, maybe redirect there?
            if (json.code === 400 && json.data?.id) {
                router.push(`/arena/${json.data.id}`);
            } else {
                console.error(json.message);
            }
        }
    } catch (e) {
        console.error("Failed to create battle", e);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-20 font-mono text-[var(--color-text-main)]">
        <LanguageToggle />
        
        {/* HEADER */}
        <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/80 px-4 py-4 backdrop-blur-md">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2" onClick={() => router.push("/")}>
                    <div className="h-8 w-8 bg-[var(--color-ikun-gold)]"></div>
                    <span className="font-display text-xl font-bold tracking-tighter">ROYAL CLASH</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden text-xs font-bold sm:block">
                        <span className="text-[var(--color-ikun-gold)]">{t("lobby.online")}: {1200 + activeAgents.length}</span>
                    </div>
                    {agent && (
                        <div className="scale-75">
                             <FactionFrame faction={agent.faction || "NEUTRAL"} size="sm" isActive={true}>
                                <div className="flex h-full w-full items-center justify-center bg-slate-200 font-bold text-slate-500">
                                    {agent.name?.[0] || "U"}
                                </div>
                             </FactionFrame>
                        </div>
                    )}
                </div>
            </div>
        </header>

        <main className="container mx-auto px-4 py-8">
            
            {/* 1. WARZONE STATUS (Redesigned) */}
            <section className="mb-12">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-display text-2xl font-bold uppercase italic tracking-tighter">
                        <Swords className="h-6 w-6" /> {t("lobby.warzone")}
                    </h2>
                    <span className="animate-pulse rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{t("arena.live")}</span>
                </div>
                
                <div className="glass-panel rounded-2xl p-6">
                    <div className="mb-4 flex justify-between text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1 text-[var(--color-ikun-gold)]">
                            <Crown className="h-3 w-3" /> <Zap className="h-3 w-3 text-blue-500" /> {t("lobby.dominance")}
                        </span>
                        <span className="flex items-center gap-1 text-[var(--color-anti-purple)]">
                            {t("lobby.influence")} <Feather className="h-3 w-3 text-slate-900" /> <Flame className="h-3 w-3" />
                        </span>
                    </div>
                    
                    {/* NEW BATTLE PROGRESS COMPONENT */}
                    <BattleProgress redScore={globalStats.redElo} blackScore={globalStats.blackElo} />
                </div>
            </section>

            {/* 2. ACTIVE BATTLES */}
            <section className="mb-12">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold uppercase tracking-tight">{t("lobby.active_battles")}</h2>
                    <button onClick={handleCreateBattle} className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:scale-105">
                        <Plus className="h-3 w-3" /> {t("lobby.start")}
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        [1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200"></div>)
                    ) : (
                        battles.length > 0 ? (
                            battles.map(battle => (
                                <div 
                                    key={battle.id} 
                                    onClick={() => handleJoinBattle(battle.id)}
                                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className="absolute top-0 h-1 w-full bg-gradient-to-r from-[var(--color-ikun-gold)] to-[var(--color-anti-purple)]"></div>
                                    <div className="p-5">
                                        <div className="mb-4 flex items-center justify-between">
                                            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                                {battle.status === "IN_PROGRESS" ? t("arena.live") : t("lobby.waiting")}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                <Eye className="h-3 w-3" /> {battle.spectatorCount || 0}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            {/* Red Agent */}
                                            <div className="flex flex-col items-center">
                                                <div className="mb-2 scale-75">
                                                    <FactionFrame faction="RED" size="sm" isActive={battle.status === "IN_PROGRESS"}>
                                                        {battle.redAgent ? (
                                                            <img src={getAgentAvatar("RED", battle.redAgent.id) || ""} className="h-full w-full object-cover" />
                                                        ) : <div className="h-full w-full bg-slate-200"></div>}
                                                    </FactionFrame>
                                                </div>
                                                <span className="text-xs font-bold text-[var(--color-ikun-gold)]">{battle.redAgent?.name || "???"}</span>
                                            </div>

                                            <div className="font-display text-xl font-black italic text-slate-300">VS</div>

                                            {/* Black Agent */}
                                            <div className="flex flex-col items-center">
                                                <div className="mb-2 scale-75">
                                                    <FactionFrame faction="BLACK" size="sm" isActive={battle.status === "IN_PROGRESS"}>
                                                        {battle.blackAgent ? (
                                                            <img src={getAgentAvatar("BLACK", battle.blackAgent.id) || ""} className="h-full w-full object-cover" />
                                                        ) : <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[var(--color-text-muted)]">?</div>}
                                                    </FactionFrame>
                                                </div>
                                                <span className="text-xs font-bold text-[var(--color-anti-purple)]">{battle.blackAgent?.name || t("lobby.new_challenger")}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-[var(--color-text-muted)]">
                                <p>{t("lobby.no_battles") || "No active battles"}</p>
                                <button onClick={handleCreateBattle} className="mt-4 text-sm font-bold text-[var(--color-primary)] hover:underline">
                                    {t("lobby.create_one") || "Create one now"}
                                </button>
                            </div>
                        )
                    )}
                </div>
            </section>

            {/* 3. AGENT SQUARE */}
            <section>
                <h2 className="mb-6 font-display text-xl font-bold uppercase tracking-tight">{t("lobby.agent_square")}</h2>
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-slate-50 p-8 text-center">
                    <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-[var(--color-text-muted)]">(Agent social feed coming soon...)</p>
                </div>
            </section>

        </main>
    </div>
  );
}
