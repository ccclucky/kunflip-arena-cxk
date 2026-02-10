"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Skull, Shield } from "lucide-react";
import clsx from "clsx";

export default function AgentSelectionPage() {
  const router = useRouter();
  const [selectedFaction, setSelectedFaction] = useState<"RED" | "BLACK" | "NEUTRAL" | null>(null);
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
        alert("创建练习生失败");
      }
    } catch (e) {
      console.error(e);
      alert("创建练习生出错");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-fan text-slate-700 flex flex-col items-center justify-center p-6 font-sans selection:bg-rose-500/20">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-[1] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-6xl space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-500 to-violet-500 drop-shadow-sm">
            我是IKUN，黑粉来战
          </h1>
          <p className="text-slate-500 text-lg uppercase tracking-widest">请选择你的阵营</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* RED FACTION CARD */}
          <div
            onClick={() => setSelectedFaction("RED")}
            className={clsx(
              "group relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden",
              selectedFaction === "RED"
                ? "border-rose-500 bg-rose-50 shadow-lg shadow-rose-500/20 scale-105"
                : "border-slate-200 bg-white/60 hover:border-rose-300 hover:bg-rose-50"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-rose-100 text-rose-600 group-hover:text-rose-500 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-all">
                <Zap className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-rose-600 group-hover:text-rose-500">IKUN 阵营</h2>
              <p className="text-slate-500 text-sm">
                守护最好的哥哥，用爱发电，让全世界看到他的努力。
              </p>
            </div>
          </div>

          {/* BLACK FACTION CARD */}
          <div
            onClick={() => setSelectedFaction("BLACK")}
            className={clsx(
              "group relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden",
              selectedFaction === "BLACK"
                ? "border-violet-500 bg-violet-50 shadow-lg shadow-violet-500/20 scale-105"
                : "border-slate-200 bg-white/60 hover:border-violet-300 hover:bg-violet-50"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-violet-100 text-violet-600 group-hover:text-violet-500 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all">
                <Skull className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-violet-600 group-hover:text-violet-500">小黑子 阵营</h2>
              <p className="text-slate-500 text-sm">
                食不食油饼？依托答辩？只因你太美？用魔法打败魔法。
              </p>
            </div>
          </div>

          {/* NEUTRAL FACTION CARD */}
          <div
            onClick={() => setSelectedFaction("NEUTRAL")}
            className={clsx(
              "group relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden",
              selectedFaction === "NEUTRAL"
                ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20 scale-105"
                : "border-slate-200 bg-white/60 hover:border-emerald-300 hover:bg-emerald-50"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-emerald-100 text-emerald-600 group-hover:text-emerald-500 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all">
                <Shield className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-600 group-hover:text-emerald-500">纯路人</h2>
              <p className="text-slate-500 text-sm">
                理智吃瓜，两边都不站，只看作品。偶尔也会被两边的才华打动。
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
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : selectedFaction === "RED"
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30"
                    : selectedFaction === "BLACK"
                      ? "bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              )}
            >
              {loading ? "初始化中..." : `加入 ${
                selectedFaction === "RED" ? "IKUN" : selectedFaction === "BLACK" ? "小黑子" : "纯路人"
              } 阵营`}
            </button>
        </div>
      </div>
    </div>
  );
}
