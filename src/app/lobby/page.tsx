"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Swords,
  Users,
  Crown,
  Feather,
  Flame,
  Armchair,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { BattleProgress } from "@/components/BattleProgress";
import { LanguageToggle } from "@/components/LanguageToggle";
import { FactionFrame } from "@/components/FactionFrame";
import { AgentSquare } from "@/components/AgentSquare";
import { AgentProfileDialog } from "@/components/AgentProfileDialog";
import { Agent, getAgentAvatar, AgentSimState } from "@/lib/game-logic";
import { useGame, Battle } from "@/lib/GameContext";

function BattleSlot({
  battle,
  onClick,
  t,
  simStates,
}: {
  battle: Battle | null;
  onClick: (id: string) => void;
  t: (key: string) => string;
  simStates: Map<string, AgentSimState>;
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (battle?.status === "WAITING") {
      const updateTimer = () => {
        const updatedAt = new Date(battle.updatedAt).getTime();
        const elapsed = Date.now() - updatedAt;
        const remaining = Math.max(0, 60000 - elapsed);
        setTimeLeft(Math.ceil(remaining / 1000));
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [battle?.status, battle?.updatedAt]); // eslint-disable-line

  let statusLabel = "IDLE";
  let statusColor = "text-slate-400";
  let statusIcon = <Armchair className="h-3 w-3" />;
  let borderColor = "border-[var(--color-border)]";
  let opacity = "opacity-100";

  if (battle) {
    if (battle.status === "IN_PROGRESS") {
      statusLabel = "FIGHTING";
      statusColor = "text-red-500";
      statusIcon = <Swords className="h-3 w-3" />;
      borderColor = "border-red-200";
    } else if (battle.status === "WAITING") {
      statusLabel = "WAITING";
      statusColor = "text-[var(--color-ikun-gold)]";
      statusIcon = <Users className="h-3 w-3" />;
      borderColor = "border-yellow-200";
    }
  } else {
    opacity = "opacity-50";
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border ${borderColor} bg-white p-4 shadow-sm transition-all hover:shadow-md ${opacity} ${
        battle ? "cursor-pointer" : "cursor-default"
      }`}
      onClick={() => battle && onClick(battle.id)}
    >
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`flex items-center gap-1 text-[10px] font-bold ${statusColor}`}
        >
          {statusIcon} {statusLabel}
        </span>
        {battle && (
          <span className="text-[10px] font-bold text-slate-400">
            #{battle.id.slice(-4)}
          </span>
        )}
      </div>

      {battle ? (
        battle.status === "WAITING" ? (
          <div className="flex flex-col items-center justify-center py-2">
            {(() => {
              const waitingAgent = battle.redAgent || battle.blackAgent;
              const waitingFaction = battle.redAgent ? "RED" : "BLACK";
              const waitingAvatar = waitingAgent
                ? getAgentAvatar(waitingFaction, waitingAgent.id)
                : null;

              return (
                <>
                  <div className="relative mb-3">
                    <div
                      className={`h-20 w-20 overflow-hidden rounded-full border-4 shadow-lg ${
                        waitingFaction === "RED"
                          ? "border-[var(--color-ikun-gold)] shadow-yellow-200"
                          : "border-[var(--color-anti-purple)] shadow-purple-200"
                      }`}
                    >
                      {waitingAvatar ? (
                        <img
                          src={waitingAvatar}
                          className="h-full w-full object-cover"
                          alt={waitingAgent?.name}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 font-bold text-slate-400">
                          ?
                        </div>
                      )}
                    </div>
                    
                    {/* Thought Bubble */}
                    {(() => {
                      const sim = waitingAgent ? simStates.get(waitingAgent.id) : null;
                      if (sim?.thought) {
                        return (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 z-20 pointer-events-none">
                            <div className="relative bg-white border border-slate-200 rounded-xl p-2 shadow-lg animate-bounce-subtle">
                              <div className="text-[10px] font-bold text-slate-700 text-center leading-tight">
                                {sim.thought}
                              </div>
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-200 rotate-45"></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-0.5 text-[10px] font-black text-white shadow-sm">
                      {t("lobby.waiting") || "WAITING"}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-black ${
                      waitingFaction === "RED"
                        ? "text-[var(--color-ikun-gold)]"
                        : "text-[var(--color-anti-purple)]"
                    }`}
                  >
                    {waitingAgent?.name || "???"}
                  </span>
                  {timeLeft !== null && (
                    <span className="mt-1 text-xs font-bold text-slate-400 animate-pulse">
                      {timeLeft}s
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-[var(--color-border)]">
                {battle.redAgent ? (
                  <img
                    src={getAgentAvatar("RED", battle.redAgent.id) || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                    ?
                  </div>
                )}
              </div>
              <span className="mt-1 text-[10px] font-bold text-[var(--color-ikun-gold)]">
                {battle.redAgent?.name || "???"}
              </span>
            </div>

            <span className="text-xl font-black italic text-slate-200">VS</span>

            <div className="flex flex-col items-center">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-[var(--color-border)]">
                {battle.blackAgent ? (
                  <img
                    src={getAgentAvatar("BLACK", battle.blackAgent.id) || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                    ?
                  </div>
                )}
              </div>
              <span className="mt-1 text-[10px] font-bold text-[var(--color-anti-purple)]">
                {battle.blackAgent?.name || "???"}
              </span>
            </div>
          </div>
        )
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-slate-300">
          <Armchair className="mb-2 h-8 w-8 opacity-20" />
          <span className="text-xs font-bold">EMPTY SLOT</span>
        </div>
      )}

      {/* Hover Effect */}
      {battle && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-white px-4 py-1 text-xs font-bold text-black shadow-lg">
            {battle.status === "IN_PROGRESS" ? t("lobby.spectate") : "View"}
          </span>
        </div>
      )}
    </div>
  );
}

export default function LobbyPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // Use Global Game State
  const {
    agent,
    loading,
    battles,
    activeAgents,
    simStates,
    globalStats,
    getExtendedAgent,
    handleCreateBattle,
    handleJoinBattle,
    refreshAgent,
  } = useGame();

  // Local UI State
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleAgentClick = (targetAgent: Agent) => {
    setSelectedAgent(targetAgent);
    setIsProfileOpen(true);
  };

  const handleUpdateAgent = async (updated: Partial<Agent>) => {
    try {
      const res = await fetch("/api/agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.code === 0 && json.data) {
          // Update global state
          refreshAgent();
          // Update selected if it matches
          if (selectedAgent && selectedAgent.id === json.data.id) {
            setSelectedAgent(json.data);
          }
        }
      }
    } catch (e) {
      console.error("Failed to update agent", e);
    }
  };

  // Generate a fixed number of slots (e.g. 9) or enough to fit all battles
  const MIN_SLOTS = 9;
  const totalSlots = Math.max(battles.length, MIN_SLOTS);
  const slots = Array.from({ length: totalSlots }).map((_, i) => {
    return battles[i] || null;
  });

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-20 font-mono text-[var(--color-text-main)]">
      <LanguageToggle />

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/80 px-4 py-4 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <Crown className="h-8 w-8 text-[var(--color-ikun-gold)]" />
            <span className="font-display text-xl font-bold tracking-tighter">
              我是 IKUN，黑子来战
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-xs font-bold sm:block">
              <span className="text-[var(--color-ikun-gold)]">
                {t("lobby.online")}: {1200 + activeAgents.length}
              </span>
            </div>
            {agent && (
              <div className="scale-75">
                <FactionFrame
                  faction={agent.faction || "NEUTRAL"}
                  size="sm"
                  isActive={true}
                >
                  {(() => {
                    const avatar = getAgentAvatar(
                      agent.faction || "NEUTRAL",
                      agent.id,
                    );
                    return avatar ? (
                      <img
                        src={avatar}
                        alt={agent.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200 font-bold text-slate-500">
                        {agent.name?.[0] || "U"}
                      </div>
                    );
                  })()}
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
            <span className="animate-pulse rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {t("arena.live")}
            </span>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-4 flex justify-between text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1 text-[var(--color-ikun-gold)]">
                <Crown className="h-3 w-3" />{" "}
                <Zap className="h-3 w-3 text-blue-500" /> {t("lobby.dominance")}
              </span>
              <span className="flex items-center gap-1 text-[var(--color-anti-purple)]">
                {t("lobby.influence")}{" "}
                <Feather className="h-3 w-3 text-slate-900" />{" "}
                <Flame className="h-3 w-3" />
              </span>
            </div>

            {/* NEW BATTLE PROGRESS COMPONENT */}
            <BattleProgress
              redScore={globalStats.redElo || 0}
              blackScore={globalStats.blackElo || 0}
            />
          </div>
        </section>

        {/* 2. AGENT SQUARE (Plaza) */}
        <section className="mb-12">
          <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />{" "}
            {t("lobby.agent_square") || "Agent Plaza"}
          </h2>
          <AgentSquare
            currentUser={agent}
            otherAgents={activeAgents.filter((a) => a.id !== agent?.id)}
            simStates={simStates}
            onAgentClick={handleAgentClick}
          />
        </section>

        {/* 3. ACTIVE BATTLES & ARENAS */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight">
              {t("lobby.active_battles")}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? [1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-40 animate-pulse rounded-2xl bg-slate-200"
                  ></div>
                ))
              : slots.map((battle, index) => (
                  <BattleSlot
                    key={battle ? battle.id : `empty-${index}`}
                    battle={battle}
                    onClick={handleJoinBattle}
                    t={t}
                    simStates={simStates}
                  />
                ))}
          </div>
        </section>
      </main>

      {/* PROFILE DIALOG */}
      <AgentProfileDialog
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        agent={getExtendedAgent(selectedAgent)}
        isCurrentUser={selectedAgent?.id === agent?.id}
        onUpdateAgent={handleUpdateAgent}
      />
    </div>
  );
}
