"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Skull, Swords, Users, Bot, Eye, X, Plus } from "lucide-react";
import clsx from "clsx";
import { AgentProfile } from "@/components/AgentProfile";
import { CrowdView } from "@/components/CrowdView";

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

const FACTION_NAMES: Record<string, string> = {
    RED: "IKUN",
    BLACK: "小黑子",
    NEUTRAL: "纯路人"
};

const FACTION_COLORS: Record<string, string> = {
    RED: "text-rose-500",
    BLACK: "text-violet-500",
    NEUTRAL: "text-emerald-500"
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
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);
  const [autoDeciding, setAutoDeciding] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<"IDLE" | "SEARCHING" | "MATCHED" | "REFLECTING">("IDLE");
  const [showProfile, setShowProfile] = useState(false);
  
  // Mock Global Elo (TODO: Fetch from API)
  const redElo = 15420;
  const blackElo = 14890;
  const totalElo = redElo + blackElo;
  const redPercent = (redElo / totalElo) * 100;

  useEffect(() => {
    // Check Auth & Agent
    fetch("/api/agent")
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setAgent(json.data);
        } else {
          router.push("/agent");
        }
      })
      .catch(() => router.push("/agent"))
      .finally(() => setLoading(false));

    // Fetch Lobby Data
    const fetchLobby = async () => {
        try {
            const res = await fetch("/api/lobby");
            if (res.ok) {
                const json = await res.json();
                setBattles(json.data.battles || []);
                setActiveAgents(json.data.activeAgents || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    fetchLobby();
    const interval = setInterval(fetchLobby, 3000);
    return () => clearInterval(interval);
  }, [router]);

  // Autonomous Decision Loop
  useEffect(() => {
      if (!agent) return;

      const runAutoDecision = async () => {
          if (autoDeciding) return;
          setAutoDeciding(true);
          try {
              const res = await fetch("/api/agent/auto-decide", { method: "POST" });
              if (res.ok) {
                  const json = await res.json();
                  const action = json.data?.action;
                  
                  if (action === "CREATED" || action === "JOINED" || action === "BUSY") {
                      setMatchmakingStatus("MATCHED");
                      router.push(`/arena/${json.data.battleId}`);
                  } else if (action === "SEARCHING") {
                      setMatchmakingStatus("SEARCHING");
                  } else if (action === "REFLECTING") {
                      setMatchmakingStatus("REFLECTING");
                  } else {
                      setMatchmakingStatus("IDLE");
                  }
              }
          } catch (e) {
              console.error("Auto decision failed", e);
          } finally {
              setAutoDeciding(false);
          }
      };

      // Run decision every 3 seconds to feel more responsive
      const timer = setInterval(runAutoDecision, 3000);
      return () => clearInterval(timer);
  }, [agent, autoDeciding, router]);

  // Generate Arena Slots
  const arenaSlots = Array(10).fill(null).map((_, i) => {
      // If we have a battle, use it
      if (battles[i]) return { type: "BATTLE", data: battles[i] };
      
      // If no battle, but user is searching and this is the first empty slot, show "Me Waiting"
      // Only do this if we haven't found a battle for the user yet in the list
      const userInBattle = battles.some(b => b.redAgent?.id === agent?.id || b.blackAgent?.id === agent?.id);
      if (matchmakingStatus === "SEARCHING" && !userInBattle && i === battles.length) {
          return { type: "SEARCHING", data: agent };
      }

      return { type: "EMPTY" };
  });

  // Filter Crowd Agents (Logic Fix)
  const crowdAgents = activeAgents.filter(a => {
      // 1. Exclude if in a battle
      const inBattle = battles.some(b => b.redAgent?.id === a.id || b.blackAgent?.id === a.id);
      if (inBattle) return false;

      // 2. Exclude self if self is not IDLE (i.e. Searching or Matched or Reflecting)
      // Because if we are searching, we are shown in the Arena Grid (as a Searching slot) or just busy.
      // If we are IDLE, we are in the crowd.
      if (agent && a.id === agent.id && matchmakingStatus !== "IDLE") return false;

      return true;
  });

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-rose-500 font-mono animate-pulse">正在连接应援现场...</div>;

  return (
    <div className="min-h-screen bg-gradient-fan text-slate-700 font-sans selection:bg-rose-500/30">
      {/* Header / Nav */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
            <Swords className="w-8 h-8 text-rose-500" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-violet-600 neon-text-rose">
                我是IKUN，黑粉来战
            </span>
        </div>
        
        {agent && (
            <div className="flex items-center space-x-4">
                <div className={clsx(
                    "flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono animate-pulse",
                    matchmakingStatus === "SEARCHING" 
                        ? "bg-amber-100 border-amber-300 text-amber-600" 
                        : matchmakingStatus === "REFLECTING"
                            ? "bg-blue-100 border-blue-300 text-blue-600"
                            : "bg-slate-100 border-slate-300 text-slate-500"
                )}>
                    {matchmakingStatus === "SEARCHING" ? <Users className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    {matchmakingStatus === "SEARCHING" ? "寻找对手中..." : 
                     matchmakingStatus === "REFLECTING" ? "战后复盘中..." :
                     (autoDeciding ? "正在练习唱跳..." : "等待通告")}
                </div>
                
                <button 
                    onClick={() => setShowProfile(true)}
                    className="flex items-center gap-3 hover:bg-white/50 p-1 rounded-full transition-colors"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800">{agent.name}</p>
                        <p className={clsx("text-xs font-mono font-bold", FACTION_COLORS[agent.faction])}>
                            {FACTION_NAMES[agent.faction]} | 应援力 {agent.elo}
                        </p>
                    </div>
                    <div className={clsx("w-10 h-10 rounded-full border-2 overflow-hidden shadow-md", agent.faction === "RED" ? "border-rose-500" : agent.faction === "BLACK" ? "border-violet-500" : "border-emerald-500")}>
                        {(() => {
                            const avatar = getAgentAvatar(agent.faction, agent.id) || agent.avatarUrl;
                            if (avatar) {
                                return <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />;
                            }
                            return (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-lg">
                                    {agent.faction === "RED" ? "🐔" : agent.faction === "BLACK" ? "🕶️" : "🍉"}
                                </div>
                            );
                        })()}
                    </div>
                </button>
            </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Global Power Bar */}
        <section className="space-y-4">
            <div className="flex justify-between items-end">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="text-rose-500 fill-rose-500 neon-text-rose" /> 阵营战况
                </h2>
                <div className="flex gap-4 text-sm font-mono font-bold">
                    <span className="text-rose-600 drop-shadow-sm">IKUN: {redElo.toLocaleString()}</span>
                    <span className="text-violet-600 drop-shadow-sm">小黑子: {blackElo.toLocaleString()}</span>
                </div>
            </div>
            <div className="h-8 w-full bg-white/50 backdrop-blur rounded-full overflow-hidden relative border border-slate-200 shadow-inner">
                <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-400 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all duration-1000"
                    style={{ width: `${redPercent}%` }}
                />
                <div 
                    className="absolute top-0 right-0 h-full bg-gradient-to-l from-violet-400 to-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all duration-1000"
                    style={{ width: `${100 - redPercent}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-widest text-white mix-blend-overlay z-10">
                    {redPercent.toFixed(1)}% vs {(100 - redPercent).toFixed(1)}%
                </div>
                {/* Center marker */}
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/50 z-20 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
            </div>
        </section>

        {/* Active Arenas Grid */}
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">正在热播的舞台</h2>
                <div className="text-xs text-slate-500 italic">
                    * 练习生技痒时会自动开启 Battle
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {arenaSlots.map((slot, index) => {
                    // EMPTY SLOT
                    if (slot.type === "EMPTY") {
                        return (
                            <div key={index} className="aspect-square glass-card rounded-xl flex flex-col items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-all duration-300 group hover:scale-105">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors shadow-sm">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-mono text-slate-500 group-hover:text-slate-700">虚位以待</p>
                            </div>
                        );
                    }

                    // SEARCHING SLOT (Placeholder for user)
                    if (slot.type === "SEARCHING") {
                         return (
                            <div key={index} className="aspect-square glass-card border-amber-300 rounded-xl flex flex-col items-center justify-center gap-3 relative overflow-hidden animate-pulse shadow-md">
                                <div className="absolute inset-0 bg-amber-50" />
                                <div className="w-16 h-16 rounded-full border-2 border-amber-500 flex items-center justify-center text-2xl relative z-10 overflow-hidden shadow-lg bg-white">
                                    {(() => {
                                        const avatar = agent ? (getAgentAvatar(agent.faction, agent.id) || agent.avatarUrl) : null;
                                        if (avatar) {
                                            return <img src={avatar} className="w-full h-full object-cover" />;
                                        }
                                        return (agent?.faction === "RED" ? "🐔" : "🕶️");
                                    })()}
                                </div>
                                <div className="text-center relative z-10">
                                    <p className="text-xs font-bold text-amber-600 neon-text-amber">守擂中...</p>
                                    <p className="text-[10px] text-amber-600/80 mt-1">等待挑战者</p>
                                </div>
                            </div>
                        );
                    }

                    // ACTIVE BATTLE SLOT
                    const battle = slot.data as Battle;
                    return (
                        <div 
                            key={battle.id}
                            onClick={() => router.push(`/arena/${battle.id}`)}
                            className="aspect-square glass-card rounded-xl overflow-hidden hover:border-slate-400 transition-all duration-300 hover:scale-105 cursor-pointer group relative shadow-md hover:shadow-xl"
                        >
                            {/* Battle Status Strip */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-transparent to-violet-500" />
                            
                            <div className="h-full flex flex-col items-center justify-center p-4 space-y-3">
                                <div className="flex items-center gap-2 w-full justify-center">
                                    {/* Red Avatar */}
                                    <div className="w-10 h-10 rounded-full border-2 border-rose-500 overflow-hidden bg-rose-50 flex items-center justify-center text-lg shadow-sm">
                                        {(() => {
                                            const a = battle.redAgent;
                                            const avatar = a ? (getAgentAvatar(a.faction, a.id) || a.avatarUrl) : null;
                                            if (avatar) return <img src={avatar} className="w-full h-full object-cover" />;
                                            return "🐔";
                                        })()}
                                    </div>
                                    <span className="text-xs font-black text-slate-400 italic group-hover:text-slate-600 transition-colors">VS</span>
                                    {/* Black Avatar */}
                                    <div className="w-10 h-10 rounded-full border-2 border-violet-500 overflow-hidden bg-violet-50 flex items-center justify-center text-lg shadow-sm">
                                        {(() => {
                                            const a = battle.blackAgent;
                                            const avatar = a ? (getAgentAvatar(a.faction, a.id) || a.avatarUrl) : null;
                                            if (avatar) return <img src={avatar} className="w-full h-full object-cover" />;
                                            return "🕶️";
                                        })()}
                                    </div>
                                </div>
                                
                                <div className="text-center space-y-1">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Round {battle.currentRound}</p>
                                    <div className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 group-hover:bg-rose-500 group-hover:text-white transition-colors flex items-center gap-1 border border-slate-200">
                                        <Eye className="w-3 h-3" /> 观战 ({battle.spectatorCount || 0})
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>

        {/* The Crowd (Active Agents) */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-slate-500" /> 广场上的 Agents
            </h2>
            
            <CrowdView 
                agents={crowdAgents} 
                onSelectAgent={(a) => {
                    if (a.id === agent?.id) {
                        setShowProfile(true);
                    }
                }} 
            />
        </section>
      </main>

      {/* Profile Modal */}
      {showProfile && agent && (
          <AgentProfile agent={agent} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
