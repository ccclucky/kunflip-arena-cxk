"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Zap, Shield, Skull, ArrowRight, User, Feather, Flame, VenetianMask, Scale } from "lucide-react";
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
  
  // Fake stats for the War Bar (Simulated)
  const ikunDominance = 52;
  const antiDominance = 48;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const infoRes = await fetch("/api/secondme/user/info", { credentials: "include" });
        
        if (!active) return;

        if (infoRes.status === 401) {
          setInfo(null);
        } else {
          const infoJson = (await infoRes.json()) as ApiResult<UserInfo>;
          if (infoRes.ok && infoJson.code === 0) {
            setInfo(infoJson.data ?? null);
          }
        }
      } catch {
        // Silent error
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  const handleLogin = () => {
    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] font-mono text-[var(--color-text-main)] selection:bg-[var(--color-ikun-gold)] selection:text-white">
      <FactionIntro />
      <LanguageToggle />

      {/* 1. WAR BAR (Global Status) */}
      <div className="sticky top-0 z-50 flex h-12 w-full border-b border-[var(--color-border)] bg-white/90 backdrop-blur-md">
        <div 
          className="flex items-center justify-start bg-[var(--color-ikun-light)] px-4 font-bold text-[var(--color-ikun-gold)] transition-all duration-1000"
          style={{ width: `${ikunDominance}%` }}
        >
          <Crown className="mr-2 h-4 w-4" />
          <Zap className="mr-2 h-3 w-3 text-blue-500" />
          <span>{t("faction.ikun")} {ikunDominance}%</span>
        </div>
        <div 
          className="flex items-center justify-end bg-[var(--color-anti-light)] px-4 font-bold text-[var(--color-anti-purple)] transition-all duration-1000"
          style={{ width: `${antiDominance}%` }}
        >
          <span>{t("faction.anti")} {antiDominance}%</span>
          <Feather className="ml-2 h-4 w-4 text-slate-900" />
          <Flame className="ml-1 h-3 w-3" />
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
            <span className="text-gradient-gold">Golden</span>
            <span className="mx-4 text-[var(--color-border)]">vs</span>
            <span className="text-gradient-purple">Evil</span>
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
        <section className="mb-20 grid gap-8 md:grid-cols-2">
            {/* IKUN Card */}
            <div className="group relative overflow-hidden rounded-3xl border border-[var(--color-ikun-gold)] bg-[var(--color-ikun-light)] p-8 transition hover:shadow-[0_0_30px_rgba(217,119,6,0.2)]">
                <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[var(--color-ikun-gold)] opacity-10 blur-3xl transition group-hover:opacity-20"></div>
                <Crown className="mb-4 h-12 w-12 text-[var(--color-ikun-gold)]" />
                <h3 className="mb-2 font-display text-3xl font-bold text-[var(--color-ikun-gold)]">{t("faction.ikun")}</h3>
                <p className="mb-6 text-slate-600">{t("app.features.identity_desc")}</p>
                <button className="rounded-full bg-[var(--color-ikun-gold)] px-6 py-2 text-sm font-bold text-white transition hover:bg-yellow-600">
                    {t("app.join_ikun")}
                </button>
            </div>

            {/* Anti Card */}
            <div className="group relative overflow-hidden rounded-3xl border border-[var(--color-anti-purple)] bg-[var(--color-anti-light)] p-8 transition hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[var(--color-anti-purple)] opacity-10 blur-3xl transition group-hover:opacity-20"></div>
                <Skull className="mb-4 h-12 w-12 text-[var(--color-anti-purple)]" />
                <h3 className="mb-2 font-display text-3xl font-bold text-[var(--color-anti-purple)]">{t("faction.anti")}</h3>
                <p className="mb-6 text-slate-600">{t("app.features.battle_desc")}</p>
                <button className="rounded-full bg-[var(--color-anti-purple)] px-6 py-2 text-sm font-bold text-white transition hover:bg-violet-700">
                    {t("app.join_anti")}
                </button>
            </div>
        </section>

        {/* 4. FEATURES GRID */}
        <section className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <Zap className="mb-4 h-8 w-8 text-slate-400" />
            <h4 className="mb-2 font-bold">{t("app.features.battle")}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">{t("app.features.battle_desc")}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <Shield className="mb-4 h-8 w-8 text-slate-400" />
            <h4 className="mb-2 font-bold">{t("app.features.identity")}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">{t("app.features.identity_desc")}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <User className="mb-4 h-8 w-8 text-slate-400" />
            <h4 className="mb-2 font-bold">{t("app.features.leaderboard")}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">{t("app.features.leaderboard_desc")}</p>
          </div>
        </section>

      </main>

      <footer className="border-t border-[var(--color-border)] bg-white py-8 text-center text-xs text-[var(--color-text-muted)]">
        <p>{t("app.footer")}</p>
      </footer>
    </div>
  );
}
