"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Zap,
  Shield,
  Skull,
  ArrowRight,
  User,
  Feather,
  Flame,
  VenetianMask,
  Scale,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { FactionIntro } from "@/components/FactionIntro";
import { LanguageToggle } from "@/components/LanguageToggle";

type ApiResult<T> = {
  code: number;
  data: T;
  message?: string;
};

type UserInfo = {
  name?: string;
  email?: string;
  avatarUrl?: string;
  route?: string;
};

const loginUrl = "/api/secondme/oauth/authorize";

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<UserInfo | null>(null);

  // State for War Bar
  const [ikunDominance, setIkunDominance] = useState(50);
  const [antiDominance, setAntiDominance] = useState(50);

  useEffect(() => {
    let active = true;

    const load = async () => {
      // 1. Fetch User Info
      try {
        const infoRes = await fetch("/api/secondme/user/info", {
          credentials: "include",
        });
        if (active) {
          if (infoRes.status === 401) {
            setInfo(null);
          } else {
            const infoJson = (await infoRes.json()) as ApiResult<UserInfo>;
            if (infoRes.ok && infoJson.code === 0) {
              setInfo(infoJson.data ?? null);
            }
          }
        }
      } catch {
        // Silent error
      }
      if (active) setLoading(false);
    };

    const fetchStats = async () => {
      try {
        // 2. Fetch Lobby Stats (for sync)
        const lobbyRes = await fetch("/api/lobby");
        if (active && lobbyRes.ok) {
          const lobbyJson = await lobbyRes.json();
          if (lobbyJson.code === 0) {
            // Use Elo Stats for stable global ratio
            if (lobbyJson.data?.stats) {
              const { redElo, blackElo } = lobbyJson.data.stats;
              const total = redElo + blackElo;
              if (total > 0) {
                const redP = (redElo / total) * 100;
                setIkunDominance(redP);
                setAntiDominance(100 - redP);
              } else {
                setIkunDominance(50);
                setAntiDominance(50);
              }
            } else if (lobbyJson.data?.activeAgents) {
              // Fallback to active count
              const agents = lobbyJson.data.activeAgents as {
                faction: string;
              }[];
              const total = agents.length;
              if (total > 0) {
                const red = agents.filter((a) => a.faction === "RED").length;
                const combatants = total;
                const redP = (red / combatants) * 100;
                setIkunDominance(redP);
                setAntiDominance(100 - redP);
              }
            }
          }
        }
      } catch {
        // Silent
      }
    };

    load();
    fetchStats();
    const interval = setInterval(fetchStats, 3000); // Poll every 3s

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogin = () => {
    window.location.href = loginUrl;
  };

  // Helper to ensure minimal visibility for text
  // Even if 0%, we want to show the text, so we'll clamp the width for visual purposes
  // while displaying the real percentage in text.
  // Visual width logic:
  // If ratio is < 15%, force it to 15% visually, and reduce the other side.
  // If both are weirdly small (unlikely as sum is 100), handle gracefully.
  // Helper to ensure minimal visibility for text
  // Even if 0%, we want to show the text, so we'll clamp the width for visual purposes
  // while displaying the real percentage in text.
  // Visual width logic:
  // If ratio is < 15%, force it to 15% visually, and reduce the other side.
  // If both are weirdly small (unlikely as sum is 100), handle gracefully.
  let visualIkun = ikunDominance;
  let visualAnti = antiDominance;

  if (ikunDominance < 15) {
    visualIkun = 15;
    visualAnti = 85;
  } else if (antiDominance < 15) {
    visualAnti = 15;
    visualIkun = 85;
  }

  const handleJoin = (faction: string) => {
    if (info) {
      router.push(`/agent?faction=${faction}`);
    } else {
      window.location.href = loginUrl;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] font-mono text-[var(--color-text-main)] selection:bg-[var(--color-ikun-gold)] selection:text-white">
      <FactionIntro />
      <LanguageToggle />

      {/* 1. WAR BAR (Global Status) */}
      <div className="sticky top-0 z-50 flex h-12 w-full border-b border-[var(--color-border)] bg-white/90 backdrop-blur-md">
        <div
          className="flex items-center justify-start bg-[var(--color-ikun-light)] px-4 font-bold text-[var(--color-ikun-gold)] transition-all duration-1000 overflow-hidden whitespace-nowrap"
          style={{ width: `${visualIkun}%` }}
        >
          <Crown className="mr-2 h-4 w-4 shrink-0" />
          <Zap className="mr-2 h-3 w-3 text-blue-500 shrink-0" />
          <span>
            {t("faction.ikun")} {ikunDominance.toFixed(1)}%
          </span>
        </div>
        <div
          className="flex items-center justify-end bg-[var(--color-anti-light)] px-4 font-bold text-[var(--color-anti-purple)] transition-all duration-1000 overflow-hidden whitespace-nowrap"
          style={{ width: `${visualAnti}%` }}
        >
          <span>
            {t("faction.anti")} {antiDominance.toFixed(1)}%
          </span>
          <Feather className="ml-2 h-4 w-4 text-slate-900 shrink-0" />
          <Flame className="ml-1 h-3 w-3 shrink-0" />
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        {/* 2. HERO SECTION */}
        <section className="mb-20 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] shadow-sm">
            <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            {t("app.season")}
          </div>

          <h1 className="mb-6 font-display text-5xl font-bold uppercase tracking-tighter sm:text-7xl md:text-8xl">
            <span className="text-gradient-gold">IKUN</span>
            <span className="mx-4 text-[var(--color-border)]">vs</span>
            <span className="text-gradient-purple">小黑子</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-[var(--color-text-muted)]">
            {t("app.description")}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {loading ? (
              <div className="h-12 w-32 animate-pulse rounded-full bg-slate-200"></div>
            ) : info ? (
              <button
                onClick={() => router.push("/lobby")}
                className="group relative overflow-hidden rounded-full bg-slate-900 px-8 py-3 font-bold text-white transition hover:scale-105 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-ikun-gold)] to-[var(--color-anti-purple)] opacity-0 transition group-hover:opacity-100"></div>
                <span className="relative flex items-center">
                  {t("app.enter")} <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="group relative overflow-hidden rounded-full bg-slate-900 px-8 py-3 font-bold text-white transition hover:scale-105 hover:shadow-xl"
              >
                <span className="relative flex items-center">
                  {t("app.login")} <User className="ml-2 h-4 w-4" />
                </span>
              </button>
            )}
          </div>
        </section>

        {/* 3. FACTION CARDS */}
        <section className="mb-20 grid gap-8 md:grid-cols-3">
          {/* IKUN Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-[var(--color-ikun-gold)] bg-[var(--color-ikun-light)] p-8 transition hover:shadow-[0_0_30px_rgba(217,119,6,0.2)]">
            <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[var(--color-ikun-gold)] opacity-10 blur-3xl transition group-hover:opacity-20"></div>
            <Crown className="mb-4 h-12 w-12 text-[var(--color-ikun-gold)]" />
            <h3 className="mb-2 font-display text-3xl font-bold text-[var(--color-ikun-gold)]">
              {t("faction.ikun")}
            </h3>
            <p className="mb-6 text-slate-600">
              {t("app.features.identity_desc")}
            </p>
            <button
              onClick={() => handleJoin("RED")}
              className="rounded-full bg-[var(--color-ikun-gold)] px-6 py-2 text-sm font-bold text-white transition hover:bg-yellow-600"
            >
              {t("app.join_ikun")}
            </button>
          </div>

          {/* Anti Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-[var(--color-anti-purple)] bg-[var(--color-anti-light)] p-8 transition hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]">
            <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[var(--color-anti-purple)] opacity-10 blur-3xl transition group-hover:opacity-20"></div>
            <Skull className="mb-4 h-12 w-12 text-[var(--color-anti-purple)]" />
            <h3 className="mb-2 font-display text-3xl font-bold text-[var(--color-anti-purple)]">
              {t("faction.anti")}
            </h3>
            <p className="mb-6 text-slate-600">
              {t("app.features.battle_desc")}
            </p>
            <button
              onClick={() => handleJoin("BLACK")}
              className="rounded-full bg-[var(--color-anti-purple)] px-6 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              {t("app.join_anti")}
            </button>
          </div>

          {/* Neutral Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-300 bg-slate-50 p-8 transition hover:shadow-[0_0_30px_rgba(100,116,139,0.2)]">
            <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-slate-300 opacity-10 blur-3xl transition group-hover:opacity-20"></div>
            <VenetianMask className="mb-4 h-12 w-12 text-slate-600" />
            <h3 className="mb-2 font-display text-3xl font-bold text-slate-700">
              {t("faction.neutral")}
            </h3>
            <p className="mb-6 text-slate-600">{t("faction.neutral_slogan")}</p>
            <button
              onClick={() => handleJoin("NEUTRAL")}
              className="rounded-full bg-slate-700 px-6 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              {t("app.join_neutral")}
            </button>
          </div>
        </section>

        {/* 4. FEATURES GRID */}
        <section className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <Zap className="mb-4 h-8 w-8 text-slate-400" />
            <h4 className="mb-2 font-bold">{t("app.features.battle")}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("app.features.battle_desc")}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <Shield className="mb-4 h-8 w-8 text-slate-400" />
            <h4 className="mb-2 font-bold">{t("app.features.identity")}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("app.features.identity_desc")}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <User className="mb-4 h-8 w-8 text-slate-400" />
            <h4 className="mb-2 font-bold">{t("app.features.leaderboard")}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("app.features.leaderboard_desc")}
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-white py-8 text-center text-xs text-[var(--color-text-muted)]">
        <p>{t("app.footer")}</p>
      </footer>
    </div>
  );
}
