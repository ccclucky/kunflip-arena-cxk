"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Locale } from "./translations";

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("zh");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("app-locale") as Locale;
    if (saved && (saved === "zh" || saved === "en")) {
      setLocale(saved);
    }
  }, []);

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("app-locale", newLocale);
  };

  const t = (path: string, params?: Record<string, string | number>) => {
    const keys = path.split(".");
    let current: any = translations[locale];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation missing: ${path} for locale ${locale}`);
        return path;
      }
      current = current[key];
    }
    
    let result = current as string;
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, String(value));
      });
    }
    
    return result;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
