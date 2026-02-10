"use client";

import { useEffect, useState } from "react";
import { Crown, Zap, Flame, Feather, Scale, User, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import clsx from "clsx";

type Faction = "IKUN" | "ANTI" | "NEUTRAL";

export function FactionIntro() {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const { t } = useTranslation();

  useEffect(() => {
    // Check if seen
    const seen = localStorage.getItem("faction-intro-seen");
    if (!seen) {
      setVisible(true);
      // Sequence
      setTimeout(() => setStage(1), 500); // IKUN
      setTimeout(() => setStage(2), 2500); // ANTI
      setTimeout(() => setStage(3), 4500); // NEUTRAL
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem("faction-intro-seen", "true");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl transition-opacity duration-500">
      <button onClick={handleClose} className="absolute right-6 top-6 text-white/50 hover:text-white">
        <X className="h-8 w-8" />
      </button>

      <div className="relative h-full w-full max-w-4xl p-8 flex items-center justify-center">
        
        {/* Stage 1: IKUN */}
        <div className={clsx("absolute transition-all duration-1000 transform", 
            stage === 1 ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-10 pointer-events-none"
        )}>
           <div className="flex flex-col items-center text-center">
               <div className="mb-6 relative">
                   <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-ikun-gold)] opacity-20"></div>
                   <div className="h-40 w-40 rounded-full border-4 border-[var(--color-ikun-gold)] bg-black flex items-center justify-center shadow-[0_0_50px_rgba(217,119,6,0.6)]">
                        <div className="relative">
                            <Crown className="h-20 w-20 text-[var(--color-ikun-gold)]" />
                            <Zap className="absolute -bottom-2 -right-2 h-10 w-10 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                        </div>
                   </div>
               </div>
               <h2 className="text-5xl font-black text-[var(--color-ikun-gold)] mb-2 tracking-tighter">{t("faction.ikun")}</h2>
               <p className="text-2xl text-white font-display italic">"{t("faction.ikun_slogan")}"</p>
           </div>
        </div>

        {/* Stage 2: ANTI */}
        <div className={clsx("absolute transition-all duration-1000 transform", 
            stage === 2 ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-10 pointer-events-none"
        )}>
           <div className="flex flex-col items-center text-center">
               <div className="mb-6 relative">
                   <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-anti-purple)] opacity-20"></div>
                   <div className="h-40 w-40 rounded-full border-4 border-[var(--color-anti-purple)] bg-black flex items-center justify-center shadow-[0_0_50px_rgba(124,58,237,0.6)]">
                        <div className="relative">
                            <Feather className="h-20 w-20 text-slate-800 fill-slate-900" />
                            <Flame className="absolute -top-4 -right-2 h-12 w-12 text-[var(--color-anti-purple)] drop-shadow-[0_0_15px_rgba(139,92,246,1)] animate-pulse" />
                        </div>
                   </div>
               </div>
               <h2 className="text-5xl font-black text-[var(--color-anti-purple)] mb-2 tracking-tighter">{t("faction.anti")}</h2>
               <p className="text-2xl text-white font-display italic">"{t("faction.anti_slogan")}"</p>
           </div>
        </div>

        {/* Stage 3: NEUTRAL */}
        <div className={clsx("absolute transition-all duration-1000 transform", 
            stage === 3 ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-10 pointer-events-none"
        )}>
           <div className="flex flex-col items-center text-center">
               <div className="mb-6 relative">
                   <div className="h-40 w-40 rounded-full border-4 border-slate-500 bg-black flex items-center justify-center shadow-[0_0_50px_rgba(100,116,139,0.4)]">
                        <div className="relative flex flex-col items-center">
                            <User className="h-16 w-16 text-slate-400" />
                            <Scale className="absolute -bottom-4 h-12 w-12 text-slate-200" />
                        </div>
                   </div>
               </div>
               <h2 className="text-5xl font-black text-slate-400 mb-2 tracking-tighter">{t("faction.neutral")}</h2>
               <p className="text-2xl text-white font-display italic">"{t("faction.neutral_slogan")}"</p>
               
               <button 
                onClick={handleClose}
                className="mt-12 rounded-full bg-white px-8 py-3 font-bold text-black hover:bg-slate-200 transition"
               >
                   ENTER THE ARENA
               </button>
           </div>
        </div>

      </div>
    </div>
  );
}
