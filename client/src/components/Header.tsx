import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { languageNames, type Language } from "@/i18n/translations";

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { t, language, setLanguage } = useTranslation();

  const isActive = (path: string) => location === path;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages: Language[] = ["en", "fr", "pt", "sw", "es"];

  return (
    <header className="bg-white border-b sticky top-0 z-50" data-testid="header-main">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity" data-testid="link-home">
            <img 
              src="/via-logo.png" 
              alt="VIA Global Health" 
              className="h-10 sm:h-12 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8" data-testid="nav-desktop">
            <Link 
              href="/" 
              className={`transition-colors ${isActive("/") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-home-nav"
            >
              {t("nav.home")}
            </Link>
            <Link 
              href="/catalog" 
              className={`transition-colors ${isActive("/catalog") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-catalog"
            >
              {t("nav.catalog")}
            </Link>
            <Link 
              href="/markets" 
              className={`transition-colors ${isActive("/markets") || location.startsWith("/markets/") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-markets-nav"
            >
              Markets
            </Link>
            <Link 
              href="/about" 
              className={`transition-colors ${isActive("/about") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-about-nav"
            >
              {t("nav.about")}
            </Link>
            <Link 
              href="/track-quote" 
              className={`transition-colors ${isActive("/track-quote") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-track-quote"
            >
              {t("nav.trackQuote")}
            </Link>
            <Link 
              href="/contact" 
              className={`transition-colors ${isActive("/contact") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-contact-nav"
            >
              {t("nav.contact")}
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3" data-testid="nav-cta-desktop">
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                data-testid="select-language"
              >
                <Globe className="h-4 w-4" />
                <span className="uppercase font-medium">{language}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setLangMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${language === lang ? "text-blue-600 font-medium bg-blue-50/50" : "text-slate-700"}`}
                      data-testid={`option-language-${lang}`}
                    >
                      <span>{languageNames[lang]}</span>
                      <span className="text-xs text-slate-400 uppercase">{lang}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link href="/catalog">
              <Button data-testid="button-browse-catalog">{t("nav.browseCatalog")}</Button>
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 border-t" data-testid="nav-mobile">
            <div className="space-y-3 pt-4">
              <Link 
                href="/" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-home"
              >
                {t("nav.home")}
              </Link>
              <Link 
                href="/catalog" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-catalog"
              >
                {t("nav.catalog")}
              </Link>
              <Link 
                href="/markets" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-markets"
              >
                Markets
              </Link>
              <Link 
                href="/about" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-about"
              >
                {t("nav.about")}
              </Link>
              <Link 
                href="/track-quote" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-track-quote"
              >
                {t("nav.trackQuote")}
              </Link>
              <Link 
                href="/contact" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-contact"
              >
                {t("nav.contact")}
              </Link>
              <div className="px-4 py-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">{t("nav.language")}</p>
                <div className="flex gap-2 flex-wrap">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); }}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors min-h-[44px] ${language === lang ? "border-blue-500 bg-blue-50 text-blue-600 font-medium" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                      data-testid={`option-mobile-language-${lang}`}
                    >
                      {languageNames[lang]}
                    </button>
                  ))}
                </div>
              </div>
              <Link href="/catalog">
                <Button className="w-full" onClick={() => setMobileMenuOpen(false)} data-testid="button-mobile-catalog">
                  {t("nav.browseCatalog")}
                </Button>
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
