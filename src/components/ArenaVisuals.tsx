"use client";

import { useEffect, useState, useRef } from "react";
import clsx from "clsx";

type Round = {
    id: string;
    content: string;
    speaker: { faction: string };
    judgeScore?: number;
};

interface ArenaVisualsProps {
    rounds: Round[];
}

type DanmakuItem = {
    id: string;
    text: string;
    top: number;
    color: string;
    duration: number;
    size: number;
};

export function ArenaVisuals({ rounds }: ArenaVisualsProps) {
    const [items, setItems] = useState<DanmakuItem[]>([]);
    const lastRoundIdRef = useRef<string | null>(null);

    // Watch for new rounds
    useEffect(() => {
        if (rounds.length === 0) return;
        
        const latestRound = rounds[rounds.length - 1];
        if (latestRound.id === lastRoundIdRef.current) return;
        
        lastRoundIdRef.current = latestRound.id;
        
        // Add new Danmaku
        const isRed = latestRound.speaker.faction === "RED";
        const isHighImpact = (latestRound.judgeScore || 0) > 80;
        
        const newItem: DanmakuItem = {
            id: latestRound.id,
            text: latestRound.content,
            top: Math.random() * 80 + 10, // 10% to 90%
            // Use CSS Variables via Tailwind arbitrary values
            color: isRed ? "text-[var(--color-ikun-gold)]" : "text-[var(--color-anti-purple)]",
            duration: isHighImpact ? 15 : 10, // Slower if high impact so people can read
            size: isHighImpact ? 2 : 1.2 // Bigger if high impact
        };
        
        setItems(prev => [...prev, newItem]);
        
        // Cleanup after animation
        setTimeout(() => {
            setItems(prev => prev.filter(i => i.id !== newItem.id));
        }, newItem.duration * 1000);
        
    }, [rounds]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {items.map(item => (
                <div
                    key={item.id}
                    className={clsx(
                        "absolute whitespace-nowrap font-bold drop-shadow-md animate-danmaku",
                        item.color
                    )}
                    style={{
                        top: `${item.top}%`,
                        fontSize: `${item.size}rem`,
                        animationDuration: `${item.duration}s`,
                    }}
                >
                    {item.text}
                </div>
            ))}
        </div>
    );
}
