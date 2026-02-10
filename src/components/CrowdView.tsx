"use client";

import { useEffect, useState, useMemo } from "react";
import clsx from "clsx";

type Agent = {
    id: string;
    name: string;
    faction: string;
    avatarUrl?: string;
    status?: string;
    faith?: number;
};

interface CrowdViewProps {
    agents: Agent[];
    onSelectAgent: (agent: Agent) => void;
}

const FACTION_ICONS: Record<string, string> = {
    RED: "🐔",     // IKUN
    BLACK: "🕶️",   // 小黑子
    NEUTRAL: "🍉", // 吃瓜群众
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

const FACTION_COLORS: Record<string, string> = {
    RED: "bg-rose-500/20 border-rose-500 text-rose-200",
    BLACK: "bg-violet-500/20 border-violet-500 text-violet-200",
    NEUTRAL: "bg-emerald-500/20 border-emerald-500 text-emerald-200",
};

export function CrowdView({ agents, onSelectAgent }: CrowdViewProps) {
    // Generate stable but random initial positions
    // Then animate them slowly
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
    
    useEffect(() => {
        // Initial positioning
        const newPos: Record<string, { x: number; y: number }> = {};
        agents.forEach(agent => {
            if (!positions[agent.id]) {
                newPos[agent.id] = getRandomPosition(agent.faction);
            } else {
                newPos[agent.id] = positions[agent.id];
            }
        });
        setPositions(prev => ({ ...prev, ...newPos }));

        // Random walk interval
        const interval = setInterval(() => {
            setPositions(prev => {
                const next = { ...prev };
                agents.forEach(agent => {
                    if (Math.random() > 0.7) { // Only move some agents each tick
                        next[agent.id] = moveAgent(prev[agent.id] || getRandomPosition(agent.faction), agent.faction);
                    }
                });
                return next;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [agents.map(a => a.id).join(',')]); // Re-run if agent list changes

    return (
        <div className="relative w-full h-[500px] bg-slate-900/80 rounded-xl overflow-hidden border border-slate-800 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] group">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            
            {/* Zones Label */}
            <div className="absolute bottom-4 left-8 text-rose-800/20 font-black text-6xl select-none pointer-events-none">IKUN</div>
            <div className="absolute bottom-4 right-8 text-violet-800/20 font-black text-6xl select-none pointer-events-none">小黑子</div>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-emerald-800/20 font-black text-4xl select-none pointer-events-none">吃瓜区</div>

            {/* Middle Divider (Visual) */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-slate-700/30 to-transparent dashed" />

            {/* Empty State */}
            {agents.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono animate-pulse">
                    广场空空荡荡...
                </div>
            )}

            {agents.map((agent) => {
                const pos = positions[agent.id] || { x: 50, y: 50 };
                const isReflecting = agent.status === "REFLECTING";
                
                return (
                    <button
                        key={agent.id}
                        onClick={() => onSelectAgent(agent)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-[3000ms] ease-in-out z-10 focus:outline-none group/agent"
                        style={{ 
                            left: `${pos.x}%`, 
                            top: `${pos.y}%`,
                        }}
                    >
                        <div className="relative flex flex-col items-center">
                            {/* Avatar Bubble */}
                            <div className={clsx(
                                "w-10 h-10 rounded-full border-2 flex items-center justify-center text-xl shadow-lg transition-transform duration-300 group-hover/agent:scale-125 bg-slate-950 overflow-hidden",
                                FACTION_COLORS[agent.faction] || "border-slate-500 text-slate-300",
                                isReflecting && "animate-bounce border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            )}>
                                {(() => {
                                    const avatar = getAgentAvatar(agent.faction, agent.id) || agent.avatarUrl;
                                    if (avatar) {
                                        return <img src={avatar} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" alt={agent.name} />;
                                    }
                                    return <span>{FACTION_ICONS[agent.faction] || "👤"}</span>;
                                })()}
                                
                                {/* Status Indicator Badge */}
                                {isReflecting && (
                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border border-white text-[10px] animate-pulse">
                                        🤔
                                    </div>
                                )}
                            </div>

                            {/* Name Label */}
                            <div className={clsx(
                                "mt-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white whitespace-nowrap border border-white/10 opacity-60 group-hover/agent:opacity-100 transition-opacity",
                                isReflecting && "opacity-100 bg-blue-900/60 border-blue-500/30"
                            )}>
                                {isReflecting ? "正在反思..." : agent.name}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

function getRandomPosition(faction: string) {
    // RED: 5-40% x, 10-90% y
    // BLACK: 60-95% x, 10-90% y
    // NEUTRAL: 30-70% x, 10-90% y
    
    let minX = 0, maxX = 100;
    
    if (faction === "RED") {
        minX = 5; maxX = 40;
    } else if (faction === "BLACK") {
        minX = 60; maxX = 95;
    } else {
        minX = 30; maxX = 70;
    }
    
    return {
        x: minX + Math.random() * (maxX - minX),
        y: 10 + Math.random() * 80
    };
}

function moveAgent(current: { x: number; y: number }, faction: string) {
    const target = getRandomPosition(faction);
    // Move 20% towards target to make it smooth/brownian-like
    return {
        x: current.x + (target.x - current.x) * 0.2,
        y: current.y + (target.y - current.y) * 0.2
    };
}
