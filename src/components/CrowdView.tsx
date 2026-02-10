"use client";

import { Agent, getAgentAvatar } from "@/lib/game-logic";
import { Users } from "lucide-react";
import { FactionFrame } from "./FactionFrame";
import clsx from "clsx";

interface CrowdViewProps {
  spectators: Agent[];
  maxDisplay?: number;
  className?: string;
}

export function CrowdView({ spectators, maxDisplay = 20, className }: CrowdViewProps) {
  const displaySpectators = spectators.slice(0, maxDisplay);
  const remaining = Math.max(0, spectators.length - maxDisplay);

  return (
    <div className={clsx("w-full rounded-2xl border border-[var(--color-border)] bg-white/50 p-4 backdrop-blur-sm", className)}>
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
        <Users className="h-3 w-3" />
        <span>Spectators ({spectators.length})</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {displaySpectators.map((agent) => (
          <div key={agent.id} className="relative group cursor-help">
            <div className="h-8 w-8 transition-transform hover:scale-110 hover:z-10">
              <FactionFrame faction={agent.faction} size="xs">
                 {(() => {
                    const avatar = getAgentAvatar(agent.faction, agent.id);
                    return avatar ? (
                        <img src={avatar} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-[10px] text-slate-500">
                            {agent.name[0]}
                        </div>
                    );
                 })()}
              </FactionFrame>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white group-hover:block z-20">
                {agent.name}
            </div>
          </div>
        ))}
        
        {remaining > 0 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">
                +{remaining}
            </div>
        )}
        
        {spectators.length === 0 && (
            <div className="w-full text-center text-xs italic text-slate-300 py-2">
                Waiting for audience...
            </div>
        )}
      </div>
    </div>
  );
}
