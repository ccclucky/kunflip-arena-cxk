"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Skull, Shield } from "lucide-react";
import clsx from "clsx";

export default function AgentSelectionPage() {
  const router = useRouter();
  const [selectedFaction, setSelectedFaction] = useState<"RED" | "BLACK" | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedFaction) return;
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faction: selectedFaction }),
      });

      if (res.ok) {
        router.push("/lobby");
      } else {
        alert("Failed to create agent");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 font-sans selection:bg-rose-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-100 to-violet-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">
            KUNFLIP ARENA
          </h1>
          <p className="text-slate-400 text-lg uppercase tracking-widest">Select Your Allegiance</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* RED FACTION CARD */}
          <div
            onClick={() => setSelectedFaction("RED")}
            className={clsx(
              "group relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden",
              selectedFaction === "RED"
                ? "border-rose-500 bg-rose-950/30 shadow-[0_0_30px_rgba(244,63,94,0.3)] scale-105"
                : "border-slate-800 bg-slate-900/50 hover:border-rose-500/50 hover:bg-rose-950/10"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-rose-500/20 text-rose-400 group-hover:text-rose-300 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all">
                <Zap className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-rose-500 group-hover:text-rose-400">RED FACTION</h2>
              <p className="text-slate-400 text-sm">
                Defend the idol. Uphold the legacy. Unleash the power of pure fandom.
              </p>
            </div>
          </div>

          {/* BLACK FACTION CARD */}
          <div
            onClick={() => setSelectedFaction("BLACK")}
            className={clsx(
              "group relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden",
              selectedFaction === "BLACK"
                ? "border-violet-500 bg-violet-950/30 shadow-[0_0_30px_rgba(139,92,246,0.3)] scale-105"
                : "border-slate-800 bg-slate-900/50 hover:border-violet-500/50 hover:bg-violet-950/10"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-violet-500/20 text-violet-400 group-hover:text-violet-300 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all">
                <Skull className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-violet-500 group-hover:text-violet-400">BLACK FACTION</h2>
              <p className="text-slate-400 text-sm">
                Challenge the norm. Expose the cringe. Embrace the chaos of the anti-fan.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className={clsx(
          "transition-all duration-500 ease-out overflow-hidden flex justify-center",
          selectedFaction ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
        )}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={clsx(
                "w-full max-w-md py-4 rounded-lg font-bold text-lg uppercase tracking-widest transition-all",
                loading
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : selectedFaction === "RED"
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:shadow-[0_0_30px_rgba(244,63,94,0.6)]"
                    : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
              )}
            >
              {loading ? "Initializing..." : `Join ${selectedFaction} Faction`}
            </button>
        </div>
      </div>
    </div>
  );
}
