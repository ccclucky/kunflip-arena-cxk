"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  decideNextAction,
  AgentSimState,
  ArenaState,
  Agent,
  AgentHistoryItem,
  AgentThought,
} from "@/lib/game-logic";

// --- Types ---

export type Battle = {
  id: string;
  redAgent?: Agent;
  blackAgent?: Agent;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  currentRound: number;
  spectatorCount: number;
};

// Full Battle Details for Auto-Fight
type FullBattle = Battle & {
  rounds: { id: string; speakerId: string }[];
};

interface GameContextType {
  agent: Agent | null;
  loading: boolean;
  battles: Battle[];
  activeAgents: Agent[];
  simStates: Map<string, AgentSimState>;
  globalStats: { redElo: number; blackElo: number };
  getExtendedAgent: (baseAgent: Agent | null) => Agent | null;
  handleCreateBattle: () => Promise<void>;
  handleJoinBattle: (battleId: string) => void;
  refreshAgent: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);
  const [globalStats, setGlobalStats] = useState({ redElo: 0, blackElo: 0 });

  // Simulation State
  const [simStates, setSimStates] = useState<Map<string, AgentSimState>>(
    new Map(),
  );

  // Extension state for history/thoughts
  const [agentExtensions, setAgentExtensions] = useState<
    Map<string, { history: AgentHistoryItem[]; thoughts: AgentThought[] }>
  >(new Map());

  // Refs for tracking changes
  const prevThoughtsRef = useRef<Map<string, string>>(new Map());
  const prevFactionsRef = useRef<Map<string, string>>(new Map());
  const prevBattlesRef = useRef<
    Map<string, { status: string; redId?: string; blackId?: string }>
  >(new Map());

  // Helper to merge extensions into an agent
  const getExtendedAgent = (baseAgent: Agent | null) => {
    if (!baseAgent) return null;
    const ext = agentExtensions.get(baseAgent.id);
    if (!ext) return baseAgent;

    return {
      ...baseAgent,
      history: [...(baseAgent.history || []), ...ext.history],
      thoughtHistory: [...(baseAgent.thoughtHistory || []), ...ext.thoughts],
    };
  };

  // --- 1. Fetch Data ---
  const fetchAgent = async () => {
    try {
      const res = await fetch("/api/agent");
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error(res.statusText);
      }
      const json = await res.json();
      if (json && json.data) setAgent(json.data);
    } catch (err) {
      console.error("Error fetching agent:", err);
    }
  };

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

  useEffect(() => {
    fetchAgent();
    fetchLobby();
    const lobbyInterval = setInterval(fetchLobby, 3000);
    // Heartbeat: Fetch agent every 30s to keep online status
    const agentInterval = setInterval(fetchAgent, 30000);

    return () => {
      clearInterval(lobbyInterval);
      clearInterval(agentInterval);
    };
  }, []);

  // --- 2. Battle History Tracking ---
  useEffect(() => {
    const finishedBattles = new Map<
      string,
      { redId?: string; blackId?: string }
    >();

    prevBattlesRef.current.forEach((prev, id) => {
      const current = battles.find((b) => b.id === id);
      if (current) {
        if (prev.status === "IN_PROGRESS" && current.status === "FINISHED") {
          finishedBattles.set(id, prev);
        }
      } else {
        if (prev.status === "IN_PROGRESS") {
          finishedBattles.set(id, prev);
        }
      }
    });

    battles.forEach((b) => {
      const prev = prevBattlesRef.current.get(b.id);
      if (b.status === "FINISHED" && (!prev || prev.status !== "FINISHED")) {
        finishedBattles.set(b.id, {
          redId: b.redAgent?.id,
          blackId: b.blackAgent?.id,
        });
      }
    });

    const newRef = new Map();
    battles.forEach((b) => {
      newRef.set(b.id, {
        status: b.status,
        redId: b.redAgent?.id,
        blackId: b.blackAgent?.id,
      });
    });
    prevBattlesRef.current = newRef;

    if (finishedBattles.size > 0) {
      setAgentExtensions((prev) => {
        const next = new Map(prev);
        finishedBattles.forEach((info) => {
          const timestamp = Date.now();
          [info.redId, info.blackId].forEach((aid) => {
            if (aid) {
              const existing = next.get(aid) || { history: [], thoughts: [] };
              next.set(aid, {
                ...existing,
                history: [
                  ...existing.history,
                  {
                    type: "BATTLE_RESULT",
                    content: "Battle Finished",
                    timestamp,
                  },
                ],
                thoughts: existing.thoughts,
              });
            }
          });
        });
        return next;
      });
    }

    // Auto-redirect to arena when my battle starts
    if (agent) {
        battles.forEach(b => {
            const prev = prevBattlesRef.current.get(b.id);
            if (b.status === "IN_PROGRESS" && prev && prev.status === "WAITING") {
                if (b.redAgent?.id === agent.id || b.blackAgent?.id === agent.id) {
                    router.push(`/arena/${b.id}`);
                }
            }
        });
    }
  }, [battles]);

  // --- 3. Actions ---
  const handleJoinBattle = (battleId: string) => {
    // Redirect to arena page for any battle status
    const battle = battles.find(b => b.id === battleId);
    if (battle) {
        router.push(`/arena/${battleId}`);
    }
  };

  const handleCreateBattle = async () => {
    if (!agent) return;
    try {
      const res = await fetch("/api/battle", { method: "POST" });
      const json = await res.json();
      if (json.code === 0) {
        // User requested: Do not auto-redirect. Agent stands in lobby.
        // router.push(`/arena/${json.data.id}`);
        // Instead, we just refresh the lobby list (which happens automatically via poll)
        // But we might want to trigger an immediate fetch
        fetchLobby();
      } else if (json.code === 400 && json.data?.id) {
        // If already in battle, maybe we do want to go there?
        // User said: "User can click... to enter". So strictly, no auto-redirect.
        // router.push(`/arena/${json.data.id}`);
      }
    } catch (e) {
      console.error("Failed to create battle", e);
    }
  };

  // --- 4. Simulation Loop ---
  useEffect(() => {
    if (loading || !agent) return;

    const timer = setInterval(() => {
      setSimStates((prev) => {
        const next = new Map(prev);
        const now = Date.now();
        let hasChanges = false;

        const allAgents = [
          agent,
          ...activeAgents.filter((a) => a.id !== agent.id),
        ];
        const activeIds = new Set(allAgents.map((a) => a.id));

        for (const id of next.keys()) {
          if (!activeIds.has(id)) {
            next.delete(id);
            hasChanges = true;
          }
        }

        const arenaStates: ArenaState[] = battles.map((b) => ({
          id: b.id,
          status: b.status,
          redAgentId: b.redAgent?.id,
          blackAgentId: b.blackAgent?.id,
        }));

        const newExtensions = new Map<
          string,
          { history: AgentHistoryItem[]; thoughts: AgentThought[] }
        >();
        let hasExtensions = false;

        allAgents.forEach((a) => {
          if (!next.has(a.id)) {
            next.set(a.id, {
              action: "IDLE",
              position: {
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
              },
              lastStateChange: now,
            });
            hasChanges = true;
          }

          const currentSim = next.get(a.id)!;

          // FORCE SYNC: If agent is in a battle, force correct state
          const activeBattle = battles.find(
            (b) =>
              (b.status === "IN_PROGRESS" || b.status === "WAITING") &&
              (b.redAgent?.id === a.id || b.blackAgent?.id === a.id),
          );

          if (activeBattle) {
            const shouldBeAction =
              activeBattle.status === "IN_PROGRESS" ? "FIGHTING" : "DEFENDING"; // DEFENDING maps to waiting on stage

            let newThought = currentSim.thought;
            if (shouldBeAction === "FIGHTING") {
                newThought = "Fighting for glory!";
            } else {
                 // Waiting on stage thought logic
                 const thoughts = a.faction === "RED" 
                    ? ["Bring it on!", "Adjusting suspenders...", "Where is the music?", "Is the mic on?"]
                    : ["Analyzing data...", "Checking facts...", "Loading memes...", "Prepare to lose."];
                
                if (!currentSim.thought || currentSim.thought === "Waiting for opponent..." || Math.random() < 0.05) {
                    newThought = thoughts[Math.floor(Math.random() * thoughts.length)];
                }
            }

            if (currentSim.action !== shouldBeAction || currentSim.thought !== newThought) {
              next.set(a.id, {
                ...currentSim,
                action: shouldBeAction,
                targetId: activeBattle.id,
                thought: newThought,
                lastStateChange: now,
              });
              hasChanges = true;
            }
            // Skip decision logic if in battle
            return;
          }

          // FORCE SYNC: If agent is searching (from backend status), force SEARCHING state
          if (a.status === "SEARCHING") {
             // Randomly change thought if already searching
             const thoughts = a.faction === "RED" 
                ? ["Where are the haters?", "My lawyer is ready.", "Practicing moves...", "Need a stage!"]
                : ["Showing the truth!", "Exposing fake fans...", "Preparing evidence.", "Who wants to debate?"];
            
            // 5% chance to change thought per tick
            const newThought = Math.random() < 0.05 
                ? thoughts[Math.floor(Math.random() * thoughts.length)]
                : (currentSim.thought === "Looking for opponent..." ? thoughts[0] : currentSim.thought);

            if (currentSim.action !== "SEARCHING" || currentSim.thought !== newThought) {
              next.set(a.id, {
                ...currentSim,
                action: "SEARCHING",
                thought: newThought,
                lastStateChange: now,
              });
              hasChanges = true;
            }
            return;
          }

          // FORCE SYNC: If agent is resting (from backend status)
          if (a.status === "RESTING") {
             const restThoughts = ["Taking a breather...", "Recovering energy...", "Analyzing last match...", "Too tired to fight."];
             const newThought = Math.random() < 0.05
                ? restThoughts[Math.floor(Math.random() * restThoughts.length)]
                : (currentSim.thought || "Resting...");

             if (currentSim.action !== "RESTING" || currentSim.thought !== newThought) {
                next.set(a.id, {
                    ...currentSim,
                    action: "RESTING", // Need to ensure RESTING is in AgentSimState type
                    thought: newThought,
                    lastStateChange: now,
                });
                hasChanges = true;
             }
             return;
          }

          const nextSim = decideNextAction(a, currentSim, arenaStates, now);

          // Thought Change
          if (
            nextSim.thought &&
            nextSim.thought !== prevThoughtsRef.current.get(a.id)
          ) {
            prevThoughtsRef.current.set(a.id, nextSim.thought);
            if (!newExtensions.has(a.id))
              newExtensions.set(a.id, { history: [], thoughts: [] });
            newExtensions.get(a.id)!.thoughts.push({
              content: nextSim.thought,
              timestamp: now,
            });
            hasExtensions = true;
          }

          // Faction Change
          const prevFaction = prevFactionsRef.current.get(a.id);
          if (prevFaction && prevFaction !== a.faction) {
            if (!newExtensions.has(a.id))
              newExtensions.set(a.id, { history: [], thoughts: [] });
            newExtensions.get(a.id)!.history.push({
              type: "FACTION_CHANGE",
              content: `Changed faction from ${prevFaction} to ${a.faction}`,
              timestamp: now,
            });
            hasExtensions = true;
          }
          if (prevFaction !== a.faction) {
            prevFactionsRef.current.set(a.id, a.faction);
          }

          if (nextSim !== currentSim) {
            next.set(a.id, nextSim);
            hasChanges = true;

            // [FIX] Removed Auto-Actions from Frontend
            // All actual actions (Join/Create) are now handled by /api/agent/auto-decide response
            // to prevent "jumping on stage immediately" issue.
            // Frontend only handles visual simulation.
          }
        });

        if (hasExtensions) {
          setTimeout(() => {
            setAgentExtensions((prevExt) => {
              const nextExt = new Map(prevExt);
              newExtensions.forEach((val, key) => {
                const existing = nextExt.get(key) || {
                  history: [],
                  thoughts: [],
                };
                nextExt.set(key, {
                  history: [...existing.history, ...val.history],
                  thoughts: [...existing.thoughts, ...val.thoughts],
                });
              });
              return nextExt;
            });
          }, 0);
        }

        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAgents, agent, battles, loading]);

  // --- 5. Auto-Battle Logic ---
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!agent) return;

    // Check if agent is in an active battle
    const myBattle = battles.find(
      (b) =>
        b.status === "IN_PROGRESS" &&
        (b.redAgent?.id === agent.id || b.blackAgent?.id === agent.id),
    );

    if (!myBattle) return;

    const battleId = myBattle.id;
    const myFaction = agent.faction; // "RED" or "BLACK" (assuming agent.faction is correct)

    // Poller for this specific battle
    const battlePoller = setInterval(async () => {
      // Prevent overlapping calls for the same battle
      if (processingRef.current.has(battleId)) return;

      try {
        const res = await fetch(`/api/battle/${battleId}`);
        const json = await res.json();

        if (json.code === 0 && json.data) {
          const fullBattle = json.data as FullBattle;

          if (fullBattle.status !== "IN_PROGRESS") return;

          const roundCount = fullBattle.rounds.length;
          const isRedTurn = roundCount % 2 === 0;
          const isMyTurn =
            (myFaction === "RED" && isRedTurn) ||
            (myFaction === "BLACK" && !isRedTurn);

          if (isMyTurn) {
            // Check if I already submitted (just in case of race condition)
            // Actually, if it's my turn, it means the last round was opponent's.
            // So I should act.
            
            processingRef.current.add(battleId);
            const locale = localStorage.getItem("app-locale") || "zh";
            try {
                await fetch(`/api/battle/${battleId}/auto-move`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lang: locale }),
                });
            } finally {
                processingRef.current.delete(battleId);
            }
          } else {
             // It's opponent's turn. Check if opponent is a DEV BOT and trigger them if so.
             // We do this optimistically; the backend will verify if it's really a bot's turn.
             // We use a small delay or just fire it; duplicate calls are safe-guarded by backend state check.
             
             // Check if opponent is bot (locally if possible, otherwise backend handles it)
             const opponent = myFaction === "RED" ? fullBattle.blackAgent : fullBattle.redAgent;
             if (opponent?.user?.secondmeUserId?.startsWith("bot_")) {
                 processingRef.current.add(battleId);
                 const locale = localStorage.getItem("app-locale") || "zh";
                 fetch(`/api/battle/${battleId}/bot-move`, { 
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ lang: locale }) 
                 })
                 .catch(() => {})
                 .finally(() => {
                     // Add a small delay before unlocking to allow backend state to settle
                     setTimeout(() => processingRef.current.delete(battleId), 1000);
                 });
             }
          }
        }
      } catch (e) {
        console.error("Auto-battle error", e);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(battlePoller);
  }, [agent, battles]);

  // --- 5. Auto-Decide (Agent Brain) ---
  useEffect(() => {
    if (!agent) return;

    const brainTimer = setInterval(async () => {
        try {
            const res = await fetch("/api/agent/auto-decide", { method: "POST" });
            const json = await res.json();
            if (json.code === 0 && json.data) {
                const action = json.data.action;
                const battleId = json.data.battleId;

                // Handle Navigation Actions from Backend
                if (action === "JOINED" && battleId) {
                    router.push(`/arena/${battleId}`);
                } else if (action === "WAITING" && battleId) {
                    // Do not auto-redirect when waiting for opponent
                    // router.push(`/arena/${battleId}`);
                }
                
                // Refresh agent/lobby if state changed
                if (action !== "IDLE") {
                    fetchAgent();
                    fetchLobby();
                }
            }
        } catch (e) {
            console.error("Brain error", e);
        }
    }, 5000); // Think every 5 seconds

    return () => clearInterval(brainTimer);
  }, [agent]);

  return (
    <GameContext.Provider
      value={{
        agent,
        loading,
        battles,
        activeAgents,
        simStates,
        globalStats,
        getExtendedAgent,
        handleCreateBattle,
        handleJoinBattle,
        refreshAgent: fetchAgent,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
