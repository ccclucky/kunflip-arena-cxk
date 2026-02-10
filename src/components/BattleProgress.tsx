"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useTranslation } from "@/lib/i18n/context";

interface BattleProgressProps {
  redScore: number;
  blackScore: number;
}

export function BattleProgress({ redScore, blackScore }: BattleProgressProps) {
  const { t } = useTranslation();
  const total = redScore + blackScore || 1;
  const redPercent = Math.min(100, Math.max(0, (redScore / total) * 100));
  const blackPercent = 100 - redPercent;
  
  const [prevRedPercent, setPrevRedPercent] = useState(redPercent);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    // Check if change is >= 1%
    if (Math.abs(redPercent - prevRedPercent) >= 1) {
      // Trigger Shake
      setShaking(true);
      
      // Vibration
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }

      // SFX (Synthesized Beep)
      if (typeof window !== "undefined" && window.AudioContext) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(150, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
      }

      setTimeout(() => setShaking(false), 500);
      setPrevRedPercent(redPercent);
    }
  }, [redPercent, prevRedPercent]);

  return (
    <div className={clsx("relative w-full", shaking && "animate-shake")}>
      {/* Percentage Text */}
      <div className="mb-2 flex justify-between px-1 text-sm font-black italic tracking-tighter">
        <span className="text-[var(--color-ikun-gold)] text-xl drop-shadow-sm">
          {redPercent.toFixed(1)}%
        </span>
        <span className="text-[var(--color-anti-purple)] text-xl drop-shadow-sm">
          {blackPercent.toFixed(1)}%
        </span>
      </div>

      {/* The Bar */}
      <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-800 shadow-inner">
        {/* Red Bar */}
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-yellow-600 to-[var(--color-ikun-gold)] transition-all duration-500 ease-out"
          style={{ width: `${redPercent}%` }}
        >
          {/* Particles / Shine */}
          <div className="absolute inset-0 animate-pulse bg-white/20"></div>
          <div className="absolute right-0 top-0 h-full w-1 bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
        </div>

        {/* Black Bar (Background is sufficient, but we can make it explicit for particles) */}
        <div 
          className="absolute right-0 top-0 h-full bg-gradient-to-l from-violet-900 to-[var(--color-anti-purple)] transition-all duration-500 ease-out"
          style={{ width: `${blackPercent}%` }}
        >
             <div className="absolute inset-0 animate-pulse bg-black/10"></div>
             <div className="absolute left-0 top-0 h-full w-1 bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
        </div>
        
        {/* Clash Point */}
        <div 
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,1)] flex items-center justify-center border-4 border-slate-900 transition-all duration-500"
            style={{ left: `${redPercent}%` }}
        >
            <div className="h-2 w-2 rounded-full bg-red-500 animate-ping"></div>
        </div>
      </div>
      
      {/* Prediction / Status */}
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
          <span>{t("arena.win_prob")}: {redPercent > 50 ? "High" : "Low"}</span>
          <span>{t("arena.win_prob")}: {blackPercent > 50 ? "High" : "Low"}</span>
      </div>
    </div>
  );
}
