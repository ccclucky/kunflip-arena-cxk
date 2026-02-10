"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FactionFrame } from "./FactionFrame";
import { useTranslation } from "@/lib/i18n/context";
import clsx from "clsx";
import { AgentSimState, Agent, getAgentAvatar } from "@/lib/game-logic";

interface AgentSquareProps {
  currentUser: Agent | null;
  otherAgents: Agent[];
  simStates: Map<string, AgentSimState>;
  onAgentClick: (agent: Agent) => void;
}

const AVATAR_SIZE = 48;

export function AgentSquare({
  currentUser,
  otherAgents,
  simStates,
  onAgentClick,
}: AgentSquareProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const renderAgent = (agent: Agent, isUser: boolean) => {
    const state = simStates.get(agent.id);

    // If no state, or if fighting/defending (unless we want to show them leaving), don't render in plaza
    if (!state) return null;
    if (state.action === "DEFENDING" || state.action === "FIGHTING")
      return null;

    // Translate status
    let statusText = "";
    if (state.action === "THINKING") {
      statusText = "Thinking...";
    } else if (state.thought) {
      statusText = state.thought;
    } else if (state.action === "SPECTATING") {
      statusText = `Watching Arena ${state.targetId}`;
    }

    return (
      <motion.div
        key={agent.id}
        initial={false}
        animate={{ left: `${state.position.x}%`, top: `${state.position.y}%` }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="absolute -ml-6 -mt-6 flex flex-col items-center z-10"
        onClick={(e) => {
          e.stopPropagation();
          onAgentClick(agent);
        }}
      >
        {/* Status Bubble */}
        {statusText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={statusText}
            className="mb-1 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-slate-600 shadow-sm border border-slate-100"
          >
            {statusText}
          </motion.div>
        )}

        <div className="cursor-pointer transition-transform hover:scale-110">
          <FactionFrame
            faction={agent.faction}
            size={isUser ? "md" : "sm"}
            isActive={isUser}
          >
            {(() => {
              const avatar = getAgentAvatar(agent.faction, agent.id);
              return avatar ? (
                <img
                  src={avatar}
                  alt={agent.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-bold">
                  {agent.name[0]}
                </div>
              );
            })()}
          </FactionFrame>
        </div>

        <span
          className={clsx(
            "mt-1 max-w-[100px] truncate rounded px-1 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-sm",
            isUser ? "bg-yellow-400 text-black" : "bg-black/50 text-white",
          )}
        >
          {agent.name}
        </span>
      </motion.div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative h-96 w-full overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 shadow-inner transition-colors"
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      ></div>

      <div className="absolute top-4 left-4 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-500 backdrop-blur">
        {t("lobby.square_plaza")}
      </div>

      {currentUser && renderAgent(currentUser, true)}
      {otherAgents.map((agent) => renderAgent(agent, false))}
    </div>
  );
}
