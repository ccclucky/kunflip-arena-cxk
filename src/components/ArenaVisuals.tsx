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
  extraMessages?: { id: string; text: string; faction: string }[];
}

type DanmakuItem = {
  id: string;
  text: string;
  top: number;
  color: string;
  duration: number;
  size: number;
};

export function ArenaVisuals({
  rounds,
  extraMessages = [],
}: ArenaVisualsProps) {
  const [items, setItems] = useState<DanmakuItem[]>([]);
  const lastRoundIdRef = useRef<string | null>(null);
  const processedExtraIds = useRef<Set<string>>(new Set());

  const addItem = ({
    id,
    text,
    faction,
    isHighImpact,
  }: {
    id: string;
    text: string;
    faction: string;
    isHighImpact: boolean;
  }) => {
    const isRed = faction === "RED";
    const newItem: DanmakuItem = {
      id,
      text,
      top: Math.random() * 80 + 10,
      color: isRed
        ? "text-[var(--color-ikun-gold)]"
        : faction === "BLACK"
          ? "text-[var(--color-anti-purple)]"
          : "text-slate-400",
      duration: isHighImpact ? 15 : 10,
      size: isHighImpact ? 2 : 1.2,
    };

    // Use setTimeout to avoid synchronous setState during render/effect warnings
    setTimeout(() => {
      setItems((prev) => [...prev, newItem]);
    }, 0);

    setTimeout(
      () => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      },
      newItem.duration * 1000 + 100,
    );
  };

  // Watch for new rounds
  useEffect(() => {
    // ... (existing round logic)
    if (rounds.length > 0) {
      const latestRound = rounds[rounds.length - 1];
      if (latestRound.id !== lastRoundIdRef.current) {
        lastRoundIdRef.current = latestRound.id;
        addItem({
          id: latestRound.id,
          text: latestRound.content,
          faction: latestRound.speaker.faction,
          isHighImpact: (latestRound.judgeScore || 0) > 80,
        });
      }
    }
  }, [rounds]);

  // Watch for extra messages (spectator thoughts)
  useEffect(() => {
    extraMessages.forEach((msg) => {
      if (!processedExtraIds.current.has(msg.id)) {
        processedExtraIds.current.add(msg.id);
        addItem({
          id: msg.id,
          text: msg.text,
          faction: msg.faction,
          isHighImpact: false,
        });
      }
    });
  }, [extraMessages]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {items.map((item) => (
        <div
          key={item.id}
          className={clsx(
            "absolute whitespace-nowrap font-bold drop-shadow-md animate-danmaku",
            item.color,
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
