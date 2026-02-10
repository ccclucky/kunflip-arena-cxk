"use client";

import { useTranslation } from "@/lib/i18n/context";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-bold shadow-lg transition hover:bg-slate-50"
    >
      <Languages className="h-4 w-4" />
      <span>{locale === "zh" ? "English" : "中文"}</span>
    </button>
  );
}
