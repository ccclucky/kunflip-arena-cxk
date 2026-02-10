import React from "react";
import clsx from "clsx";
import { Crown, Zap, Feather, Flame, VenetianMask, Scale } from "lucide-react";

interface FactionFrameProps {
  faction: string;
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export function FactionFrame({ faction, children, isActive = true, className, size = "md" }: FactionFrameProps) {
  const sizeClasses = {
    xs: "h-8 w-8 border-2",
    sm: "h-10 w-10 border-2",
    md: "h-20 w-20 border-4",
    lg: "h-32 w-32 border-4"
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  const secondaryIconSizes = {
    xs: "h-2 w-2",
    sm: "h-3 w-3",
    md: "h-6 w-6",
    lg: "h-10 w-10"
  };

  return (
    <div className={clsx("relative", className)}>
      <div className={clsx(
        "relative overflow-hidden rounded-full bg-white shadow-lg transition-all duration-500",
        sizeClasses[size],
        isActive ? "scale-105" : "grayscale opacity-80 scale-100",
        faction === "RED" ? (isActive ? "border-[var(--color-ikun-gold)] shadow-[0_0_20px_rgba(217,119,6,0.4)]" : "border-slate-200") : "",
        faction === "BLACK" ? (isActive ? "border-[var(--color-anti-purple)] shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "border-slate-200") : "",
        faction === "NEUTRAL" ? "border-slate-400" : ""
      )}>
        {children}
      </div>
      
      {/* Decorations */}
      {faction === "RED" && (
        <>
            <div className={clsx("absolute -top-[25%] left-1/2 -translate-x-1/2 text-[var(--color-ikun-gold)] drop-shadow-md transition-all duration-700", isActive ? "opacity-100 -translate-y-0" : "opacity-0 translate-y-4")}>
                <Crown className={clsx(iconSizes[size], "fill-current")} />
            </div>
            <div className={clsx("absolute -bottom-[10%] -right-[10%] text-blue-500 drop-shadow-md transition-all duration-700 delay-100", isActive ? "opacity-100 scale-100" : "opacity-0 scale-50")}>
                <Zap className={clsx(secondaryIconSizes[size], "fill-current")} />
            </div>
        </>
      )}
      
      {faction === "BLACK" && (
        <>
            <div className={clsx("absolute -top-[15%] -left-[10%] text-slate-900 drop-shadow-md transition-all duration-700", isActive ? "opacity-100 -translate-x-0" : "opacity-0 translate-x-4")}>
                <Feather className={clsx(iconSizes[size], "fill-current")} />
            </div>
            <div className={clsx("absolute -bottom-[15%] left-1/2 -translate-x-1/2 text-[var(--color-anti-purple)] drop-shadow-md transition-all duration-700 delay-100", isActive ? "opacity-100 -translate-y-0" : "opacity-0 -translate-y-4")}>
                <Flame className={clsx(iconSizes[size], "fill-current")} />
            </div>
        </>
      )}

      {faction === "NEUTRAL" && (
        <>
            <div className={clsx("absolute -top-[15%] -right-[10%] text-slate-500 drop-shadow-md transition-all duration-700", isActive ? "opacity-100" : "opacity-0")}>
                <VenetianMask className={clsx(iconSizes[size], "fill-current")} />
            </div>
            <div className={clsx("absolute -bottom-[10%] -left-[10%] text-slate-400 drop-shadow-md transition-all duration-700 delay-100", isActive ? "opacity-100" : "opacity-0")}>
                <Scale className={clsx(secondaryIconSizes[size], "fill-current")} />
            </div>
        </>
      )}
    </div>
  );
}
