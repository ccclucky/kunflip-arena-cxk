import { FactionFrame } from "@/components/FactionFrame";
import { useState } from "react";
import {
  Zap,
  Skull,
  Shield,
  History,
  Trophy,
  RefreshCw,
  X,
  MessageSquare,
  Activity,
  Brain,
  ScrollText,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import clsx from "clsx";
import { Agent, getAgentAvatar } from "@/lib/game-logic";
import { motion, AnimatePresence } from "framer-motion";

interface AgentProfileDialogProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  isCurrentUser: boolean;
  onUpdateAgent: (updated: Partial<Agent>) => Promise<void>;
}

export function AgentProfileDialog({
  agent,
  isOpen,
  onClose,
  isCurrentUser,
  onUpdateAgent,
}: AgentProfileDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showThoughts, setShowThoughts] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "timeline">("stats");

  if (!isOpen || !agent) return null;

  const handleSwitchFaction = async (
    newFaction: "RED" | "BLACK" | "NEUTRAL",
  ) => {
    if (loading) return;
    setLoading(true);
    try {
      await onUpdateAgent({ faction: newFaction });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const avatar =
    agent.avatarUrl || getAgentAvatar(agent.faction, agent.id) || null;

  // Combine history and logs for the timeline
  const timelineItems = [...(agent.history || [])].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 z-10"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-6 flex items-center justify-center flex-col gap-2 shrink-0">
            <div className="scale-125 mb-2 relative group cursor-pointer" onClick={() => setShowThoughts(true)}>
               <FactionFrame faction={agent.faction} size="lg" isActive={true}>
                {avatar ? (
                  <img
                    src={avatar}
                    className="w-full h-full object-cover"
                    alt={agent.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 font-bold text-2xl text-slate-400">
                    {agent.name[0]}
                  </div>
                )}
              </FactionFrame>
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Brain className="w-4 h-4 text-purple-500" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xl font-display font-bold uppercase tracking-tight">
                {agent.name}
              </span>
              {isCurrentUser && (
                <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-500 font-bold">
                  YOU
                </span>
              )}
            </div>
            
            <button 
                onClick={() => setShowThoughts(true)}
                className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full hover:bg-purple-100 transition-colors"
            >
                <Brain className="w-3 h-3" />
                Show Thoughts
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 shrink-0">
            <button
              onClick={() => setActiveTab("stats")}
              className={clsx(
                "flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-colors",
                activeTab === "stats"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-400 hover:bg-slate-50"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={clsx(
                "flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-colors",
                activeTab === "timeline"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-400 hover:bg-slate-50"
              )}
            >
              Timeline
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === "stats" ? (
              <div className="flex flex-col items-center gap-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 w-full text-center">
                  <div className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Trophy className="w-4 h-4 text-[var(--color-ikun-gold)] mb-1" />
                    <span className="text-lg font-black">{agent.elo}</span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      ELO
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <History className="w-4 h-4 text-blue-400 mb-1" />
                    <span className="text-lg font-black">--</span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      Win Rate
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Shield className="w-4 h-4 text-green-400 mb-1" />
                    <span className="text-lg font-black">--</span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      Battles
                    </span>
                  </div>
                </div>

                {/* Bio */}
                <div className="w-full text-sm text-center text-slate-500 italic px-4">
                  &quot;{agent.bio || "No bio yet."}&quot;
                </div>

                {/* Faction Switch (Only for Current User) */}
                {isCurrentUser && (
                  <div className="w-full pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold uppercase text-slate-400 mb-3 text-center">
                      Switch Faction
                    </div>
                    <div className="flex justify-center gap-2">
                      <button
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                          agent.faction === "RED"
                            ? "border-[var(--color-ikun-gold)] bg-yellow-50 text-[var(--color-ikun-gold)] ring-2 ring-[var(--color-ikun-gold)] ring-offset-1"
                            : "border-slate-200 hover:bg-slate-50 text-slate-600",
                        )}
                        onClick={() => handleSwitchFaction("RED")}
                        disabled={loading}
                      >
                        <Zap className="w-3 h-3" /> IKUN
                      </button>
                      <button
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                          agent.faction === "BLACK"
                            ? "border-[var(--color-anti-purple)] bg-purple-50 text-[var(--color-anti-purple)] ring-2 ring-[var(--color-anti-purple)] ring-offset-1"
                            : "border-slate-200 hover:bg-slate-50 text-slate-600",
                        )}
                        onClick={() => handleSwitchFaction("BLACK")}
                        disabled={loading}
                      >
                        <Skull className="w-3 h-3" /> BLACK
                      </button>
                      <button
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                          agent.faction === "NEUTRAL"
                            ? "border-slate-400 bg-slate-100 text-slate-700 ring-2 ring-slate-400 ring-offset-1"
                            : "border-slate-200 hover:bg-slate-50 text-slate-600",
                        )}
                        onClick={() => handleSwitchFaction("NEUTRAL")}
                        disabled={loading}
                      >
                        <RefreshCw className="w-3 h-3" /> NEUTRAL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-1">
                {timelineItems.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-8">
                    No history yet.
                  </div>
                ) : (
                  timelineItems.map((item, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                            <div className={clsx("w-2 h-2 rounded-full mt-1.5", 
                                item.type === "FACTION_CHANGE" ? "bg-blue-400" :
                                item.type === "BATTLE_RESULT" ? "bg-red-400" : "bg-slate-300"
                            )} />
                            {i < timelineItems.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1" />}
                        </div>
                        <div className="pb-4">
                            <div className="text-slate-900 font-medium">{item.content}</div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thoughts Modal */}
      <AnimatePresence>
        {showThoughts && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl flex flex-col max-h-[80vh]"
            >
               <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-bold flex items-center gap-2">
                       <Brain className="w-5 h-5 text-purple-500" />
                       Thought Process
                   </h3>
                   <button onClick={() => setShowThoughts(false)} className="text-slate-400 hover:text-slate-600">
                       <X className="w-5 h-5" />
                   </button>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-4 p-2 bg-slate-50 rounded-xl">
                    {(agent.thoughtHistory || []).length === 0 ? (
                         <div className="text-center text-slate-400 py-10 italic">
                             "Empty mind..."
                         </div>
                    ) : (
                        [...(agent.thoughtHistory || [])].reverse().map((thought, i) => (
                            <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                                <p className="text-slate-700 text-sm mb-2">"{thought.content}"</p>
                                <div className="text-[10px] text-slate-400 text-right">
                                    {new Date(thought.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        ))
                    )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
