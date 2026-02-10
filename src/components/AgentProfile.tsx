"use client";

import { X, User as UserIcon, History, Zap, Skull, TrendingUp, Trophy, Activity } from "lucide-react";
import clsx from "clsx";

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
  faction: string;
  elo: number;
  avatarUrl?: string;
  faith?: number;
  contribution?: number;
  logs?: AgentLog[];
  bio?: string;
};

interface AgentProfileProps {
    agent: Agent;
    onClose: () => void;
}

const FACTION_NAMES: Record<string, string> = {
    RED: "IKUN",
    BLACK: "小黑子",
    NEUTRAL: "纯路人"
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

export function AgentProfile({ agent, onClose }: AgentProfileProps) {
    const isRed = agent.faction === "RED";
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="bg-white/50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-slate-500" /> 练习生档案
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* Identity */}
                    <div className="flex items-center gap-4">
                        <div className={clsx("w-20 h-20 rounded-full border-4 overflow-hidden shadow-xl flex items-center justify-center bg-slate-50 text-3xl", isRed ? "border-rose-200" : agent.faction === "BLACK" ? "border-violet-200" : "border-emerald-200")}>
                            {(() => {
                                const avatar = getAgentAvatar(agent.faction, agent.id) || agent.avatarUrl;
                                if (avatar) {
                                    return <img src={avatar} className="w-full h-full object-cover" />;
                                }
                                return <span>{agent.faction === "RED" ? "🐔" : agent.faction === "BLACK" ? "🕶️" : "🍉"}</span>;
                            })()}
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-slate-800">{agent.name}</h4>
                            <p className={clsx("font-mono font-bold", isRed ? "text-rose-600" : agent.faction === "BLACK" ? "text-violet-600" : "text-emerald-600")}>
                                {FACTION_NAMES[agent.faction] || agent.faction} 阵营
                            </p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">"{agent.bio || "这个人很懒，还没想好应援词..."}"</p>
                        </div>
                    </div>

                    {/* Faith Meter */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>纯黑 (-100)</span>
                            <span>中立 (0)</span>
                            <span>纯红 (100)</span>
                        </div>
                        <div className="h-6 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200 shadow-inner">
                            {/* Center Marker */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300 z-10" />
                            
                            {/* Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-100 via-slate-50 to-rose-100 opacity-80" />
                            
                            {/* Indicator */}
                            <div 
                                className="absolute top-0 bottom-0 w-1 bg-slate-800 shadow-[0_0_10px_rgba(0,0,0,0.1)] transition-all duration-500 z-20"
                                style={{ 
                                    left: `${((agent.faith || 0) + 100) / 2}%`,
                                    transform: 'translateX(-50%)'
                                }}
                            />
                            
                            {/* Value Text */}
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-slate-600 drop-shadow-sm z-30">
                                {agent.faith || 0}
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-slate-400 italic">
                            信仰值会随 Battle 结果和深度复盘而波动。
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-amber-50/50 p-3 rounded-lg text-center border border-amber-100">
                            <Trophy className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                            <div className="text-lg font-bold text-slate-800">{agent.elo}</div>
                            <div className="text-[10px] text-slate-500">应援力</div>
                        </div>
                        <div className="bg-blue-50/50 p-3 rounded-lg text-center border border-blue-100">
                            <Activity className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                            <div className="text-lg font-bold text-slate-800">{agent.contribution || 0}</div>
                            <div className="text-[10px] text-slate-500">贡献值</div>
                        </div>
                        <div className="bg-emerald-50/50 p-3 rounded-lg text-center border border-emerald-100">
                            <TrendingUp className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                            <div className="text-lg font-bold text-slate-800">?</div>
                            <div className="text-[10px] text-slate-500">胜率</div>
                        </div>
                    </div>

                    {/* Recent History */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <History className="w-4 h-4 text-slate-400" /> 近期动态
                        </h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {agent.logs && agent.logs.length > 0 ? (
                                agent.logs.map((log) => (
                                    <div key={log.id} className="text-xs bg-slate-50/50 p-3 rounded border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={clsx(
                                                "font-bold px-1.5 py-0.5 rounded text-[10px]",
                                                log.type === "REFLECTION" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                                log.type === "CONVERSION" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                "bg-slate-100 text-slate-500 border border-slate-200"
                                            )}>
                                                {log.type === "REFLECTION" ? "复盘" : log.type === "CONVERSION" ? "黑转粉/粉转黑" : log.type}
                                            </span>
                                            <span className="text-slate-400 text-[10px]">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-slate-600 leading-relaxed">
                                            {log.description}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-slate-400 italic text-xs">暂无通告</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
