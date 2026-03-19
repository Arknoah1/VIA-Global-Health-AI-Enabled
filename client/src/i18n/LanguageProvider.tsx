import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, type Language } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const SUPPORTED_LANGUAGES: Language[] = ["en", "fr", "pt", "sw", "es"];

function isSupported(code: string): code is Language {
  return SUPPORTED_LANGUAGES.includes(code as Language);
}

function detectBrowserLanguage(): Language {
  try {
    const navLang = navigator.language || (navigator as any).userLanguage || "";
    const base = navLang.split("-")[0].toLowerCase();
    if (isSupported(base)) {
      return base;
    }
  } catch {}
  return "en";
}

function detectUtmLanguage(): Language | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const campaign = (params.get("utm_campaign") || "").toLowerCase();
    if (campaign.includes("spanish") || campaign.includes("espanol") || campaign.includes("español")) {
      return "es";
    }
  } catch {}
  return null;
}

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem("via-language");
    if (stored && isSupported(stored)) {
      return stored;
    }
  } catch {}
  const utm = detectUtmLanguage();
  if (utm) return utm;
  return detectBrowserLanguage();
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("via-language", lang);
    } catch {}
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let text = translations[language]?.[key] || translations.en[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
