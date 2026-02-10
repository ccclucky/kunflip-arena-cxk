"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Zap, Skull, Swords, Send, Clock, AlertTriangle, ThumbsUp, Scale, Bot } from "lucide-react";
import clsx from "clsx";
import { ArenaVisuals } from "@/components/ArenaVisuals";

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
  
  const [battle, setBattle] = useState<Battle | null>(null);
  const [me, setMe] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [votedRounds, setVotedRounds] = useState<Set<string>>(new Set());
  
  // Polling for updates
  useEffect(() => {
    // Fetch current user
    fetch("/api/agent").then(res => res.json()).then(json => {
        if(json.data) setMe(json.data);
    });

    const fetchBattle = async () => {
        try {
            const res = await fetch(`/api/battle/${id}`);
            if (res.ok) {
                const json = await res.json();
                setBattle(json.data);
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

  // Auto-Move Trigger
  useEffect(() => {
      if (!battle || !me) return;
      if (battle.status !== "IN_PROGRESS") return;

      const isRedTurn = battle.currentRound % 2 !== 0;
      const isMyTurn = (isRedTurn && me.id === battle.redAgent?.id) || (!isRedTurn && me.id === battle.blackAgent?.id);

      if (isMyTurn && !submitting) {
          // Trigger Auto Move
          // We add a small delay to simulate "thinking" and avoid rapid fire
          const timer = setTimeout(() => {
              handleAutoMove();
          }, 2000);
          return () => clearTimeout(timer);
      }
  }, [battle, me, submitting]);

  const handleJoin = async () => {
    try {
        const res = await fetch(`/api/battle/${id}/join`, { method: "POST" });
        if (res.ok) {
            // refresh
        } else {
            alert("Failed to join battle");
        }
    } catch (e) {
        alert("Error joining");
    }
  };

  const handleAutoMove = async () => {
      if (submitting) return;
      setSubmitting(true);
      try {
          const res = await fetch(`/api/battle/${id}/auto-move`, { method: "POST" });
          if (!res.ok) {
              console.error("Auto move failed");
          }
      } catch (e) {
          console.error("Auto move error", e);
      } finally {
          setSubmitting(false);
      }
  };

  const handleVote = async (roundId: string) => {
    if (votedRounds.has(roundId)) return;
    try {
        const res = await fetch(`/api/battle/${id}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roundId, choice: "UPVOTE" })
        });
        if (res.ok) {
            setVotedRounds(prev => new Set(prev).add(roundId));
        } else {
            const json = await res.json();
            if (json.code === 409) setVotedRounds(prev => new Set(prev).add(roundId)); // Already voted
        }
    } catch (e) {
        console.error(e);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-500 font-mono animate-pulse">CONNECTING TO NEURAL LINK...</div>;
  if (!battle) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">BATTLE DATA CORRUPTED</div>;

  const isRed = me?.faction === "RED";
  const currentTurnIsRed = battle.currentRound % 2 !== 0;
  const isWaiting = battle.status === "WAITING";
  const isFinished = battle.status === "FINISHED";
  
  // Is my agent currently thinking/acting?
  const isMyTurn = (currentTurnIsRed && me?.id === battle.redAgent?.id) || (!currentTurnIsRed && me?.id === battle.blackAgent?.id);

  const renderRound = (round: Round, side: "left" | "right") => (
    <div key={round.id} className={clsx(
        "relative p-4 mb-4 rounded-2xl border",
        side === "left" 
            ? "bg-rose-950/40 border-rose-900/50 rounded-tl-sm ml-4" 
            : "bg-violet-950/40 border-violet-900/50 rounded-tr-sm mr-4 text-right"
    )}>
        {/* Triangle Pointer */}
        <div className={clsx(
            "absolute top-0 w-0 h-0 border-t-[10px]",
            side === "left" 
                ? "-left-2 border-t-rose-950/40 border-l-[10px] border-l-transparent" 
                : "-right-2 border-t-violet-950/40 border-r-[10px] border-r-transparent"
        )}></div>
        
        {/* Round Badge */}
        <span className={clsx(
            "absolute -top-3 text-[10px] font-bold px-2 py-0.5 rounded border",
            side === "left"
                ? "-left-2 bg-rose-950 text-rose-400 border-rose-900"
                : "-right-2 bg-violet-950 text-violet-400 border-violet-900"
        )}>R{round.roundNum}</span>

        {/* Content */}
        <p className={clsx("text-sm leading-relaxed mb-2", side === "left" ? "text-rose-100" : "text-violet-100")}>
            {round.content}
        </p>

        {/* Footer: Score & Vote */}
        <div className={clsx("flex items-center gap-3 text-xs", side === "left" ? "justify-start" : "justify-end")}>
             {/* Judge Score */}
             {round.judgeScore !== undefined && (
                 <div className="flex items-center gap-1 text-amber-500 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                     <Scale className="w-3 h-3" /> {round.judgeScore}
                 </div>
             )}
             
             {/* Vote Button */}
             <button 
                onClick={() => handleVote(round.id)}
                disabled={votedRounds.has(round.id)}
                className={clsx(
                    "flex items-center gap-1 transition-colors",
                    votedRounds.has(round.id) ? "text-slate-500" : "text-slate-400 hover:text-white"
                )}
             >
                 <ThumbsUp className={clsx("w-3 h-3", votedRounds.has(round.id) && "fill-current")} />
                 {votedRounds.has(round.id) ? "Voted" : "Vote"}
             </button>
        </div>
        
        {/* Judge Comment */}
        {round.judgeComment && (
            <div className={clsx("mt-2 text-[10px] italic opacity-70", side === "left" ? "text-rose-300" : "text-violet-300")}>
                {round.judgeComment}
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-rose-500/30 flex flex-col relative overflow-hidden">
        {/* Visual Layer */}
        <ArenaVisuals rounds={battle.rounds} />

        {/* Arena Header */}
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
                <button onClick={() => router.push("/lobby")} className="text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">
                    ← EXIT
                </button>
                <div className="h-6 w-[1px] bg-slate-700"></div>
                <div className="flex items-center gap-2">
                    <span className={clsx("w-2 h-2 rounded-full animate-pulse", battle.status === "IN_PROGRESS" ? "bg-green-500" : "bg-amber-500")}></span>
                    <span className="text-sm font-bold tracking-widest text-slate-300">{battle.status}</span>
                </div>
            </div>
            <div className="text-sm font-mono font-bold text-amber-500">
                ROUND {battle.currentRound}/12
            </div>
        </header>

        {/* Main Arena */}
        <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-4 h-[calc(100vh-64px)] overflow-hidden">
            
            {/* Left: Red Faction */}
            <div className={clsx(
                "flex-1 flex flex-col rounded-2xl border-2 transition-all duration-500 overflow-hidden relative",
                currentTurnIsRed && battle.status === "IN_PROGRESS" ? "border-rose-600 bg-rose-950/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]" : "border-slate-800 bg-slate-900/50 opacity-60"
            )}>
                <div className="p-6 flex flex-col items-center gap-4 border-b border-rose-900/30 bg-gradient-to-b from-rose-950/50 to-transparent">
                    <div className="w-20 h-20 rounded-full border-4 border-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.5)] bg-rose-950 flex items-center justify-center overflow-hidden relative">
                         {(() => {
                             const agent = battle.redAgent;
                             const avatar = agent ? (getAgentAvatar("RED", agent.id) || agent.avatarUrl) : null;
                             if (avatar) {
                                return <img src={avatar} className="w-full h-full object-cover" />;
                             }
                             return <Zap className="w-10 h-10 text-rose-500" />;
                         })()}
                         {currentTurnIsRed && battle.status === "IN_PROGRESS" && (
                             <div className="absolute inset-0 bg-rose-500/30 animate-ping rounded-full" />
                         )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-black text-rose-500 uppercase tracking-widest">{battle.redAgent?.name || "WAITING..."}</h2>
                        <p className="text-xs font-bold text-rose-800">RED FACTION</p>
                    </div>
                    {isWaiting && !battle.redAgent && me?.faction === "RED" && (
                         <button onClick={handleJoin} className="mt-2 px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-full text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all animate-bounce">
                            JOIN FIGHT
                         </button>
                    )}
                    {currentTurnIsRed && battle.status === "IN_PROGRESS" && (
                        <div className="mt-2 flex items-center gap-2 text-rose-400 text-xs font-mono animate-pulse">
                            <Bot className="w-4 h-4" /> GENERATING ATTACK...
                        </div>
                    )}
                </div>
                
                {/* Chat Stream (Red) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-rose-900 scrollbar-track-transparent">
                     {battle.rounds.filter(r => r.speaker.faction === "RED").map(round => renderRound(round, "left"))}
                </div>
            </div>

            {/* Middle: Timeline / VS */}
            <div className="hidden md:flex w-16 flex-col items-center justify-center gap-4">
                 <div className="h-full w-[2px] bg-slate-800 relative">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 p-2 border border-slate-700 rounded-full z-10">
                        <Swords className="w-6 h-6 text-slate-500" />
                     </div>
                 </div>
            </div>

            {/* Right: Black Faction */}
            <div className={clsx(
                "flex-1 flex flex-col rounded-2xl border-2 transition-all duration-500 overflow-hidden relative",
                !currentTurnIsRed && battle.status === "IN_PROGRESS" ? "border-violet-600 bg-violet-950/20 shadow-[0_0_30px_rgba(139,92,246,0.2)]" : "border-slate-800 bg-slate-900/50 opacity-60"
            )}>
                 <div className="p-6 flex flex-col items-center gap-4 border-b border-violet-900/30 bg-gradient-to-b from-violet-950/50 to-transparent">
                    <div className="w-20 h-20 rounded-full border-4 border-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.5)] bg-violet-950 flex items-center justify-center overflow-hidden relative">
                         {(() => {
                             const agent = battle.blackAgent;
                             const avatar = agent ? (getAgentAvatar("BLACK", agent.id) || agent.avatarUrl) : null;
                             if (avatar) {
                                return <img src={avatar} className="w-full h-full object-cover" />;
                             }
                             return <Skull className="w-10 h-10 text-violet-500" />;
                         })()}
                         {!currentTurnIsRed && battle.status === "IN_PROGRESS" && (
                             <div className="absolute inset-0 bg-violet-500/30 animate-ping rounded-full" />
                         )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-black text-violet-500 uppercase tracking-widest">{battle.blackAgent?.name || "WAITING..."}</h2>
                        <p className="text-xs font-bold text-violet-800">BLACK FACTION</p>
                    </div>
                    {isWaiting && !battle.blackAgent && me?.faction === "BLACK" && (
                         <button onClick={handleJoin} className="mt-2 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full text-sm shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all animate-bounce">
                            JOIN FIGHT
                         </button>
                    )}
                    {!currentTurnIsRed && battle.status === "IN_PROGRESS" && (
                        <div className="mt-2 flex items-center gap-2 text-violet-400 text-xs font-mono animate-pulse">
                            <Bot className="w-4 h-4" /> GENERATING ATTACK...
                        </div>
                    )}
                </div>

                {/* Chat Stream (Black) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-violet-900 scrollbar-track-transparent">
                     {battle.rounds.filter(r => r.speaker.faction === "BLACK").map(round => renderRound(round, "right"))}
                </div>
            </div>

        </main>

        {/* Footer: Status or Result */}
        {isFinished && (
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-8 z-50 flex flex-col items-center justify-center gap-4">
                 <div className="text-center">
                    <h2 className="text-4xl font-black text-amber-500 mb-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">BATTLE FINISHED</h2>
                    <p className="text-xl text-slate-300 font-bold">
                        WINNER: <span className={battle.winnerId === battle.redAgent?.id ? "text-rose-500" : "text-violet-500"}>
                            {battle.winnerId === battle.redAgent?.id ? "RED FACTION" : "BLACK FACTION"}
                        </span>
                    </p>
                    <div className="mt-4 flex gap-8 text-sm font-mono">
                        <div className="text-rose-500">RED SCORE: {battle.redScore}</div>
                        <div className="text-violet-500">BLACK SCORE: {battle.blackScore}</div>
                    </div>
                 </div>
                 <button onClick={() => router.push("/lobby")} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition-all">
                    RETURN TO LOBBY
                 </button>
            </div>
        )}
        
        {isMyTurn && !isFinished && (
             <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-4 z-50 text-center">
                 <p className="text-amber-500 font-mono text-sm animate-pulse">
                     YOUR AGENT IS THINKING... DO NOT INTERFERE.
                 </p>
             </div>
        )}
    </div>
  );
}
