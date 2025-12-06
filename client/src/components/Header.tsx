import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location === path;

  return (
    <header className="bg-white border-b sticky top-0 z-50" data-testid="header-main">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
              <Globe className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-900 hidden sm:inline">VIA Global Health</span>
              <span className="text-lg font-bold text-slate-900 sm:hidden">VIA</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8" data-testid="nav-desktop">
            <Link href="/">
              <a className={`transition-colors ${isActive("/") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} data-testid="link-home-nav">
                Home
              </a>
            </Link>
            <Link href="/catalog">
              <a className={`transition-colors ${isActive("/catalog") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} data-testid="link-catalog">
                Catalog
              </a>
            </Link>
            <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors" data-testid="link-contact">
              Contact
            </a>
            <a href="#about" className="text-slate-600 hover:text-slate-900 transition-colors" data-testid="link-about">
              About
            </a>
          </nav>

          {/* Desktop CTA Button */}
          <div className="hidden md:flex items-center gap-4" data-testid="nav-cta-desktop">
            <Link href="/catalog">
              <Button data-testid="button-browse-catalog">Browse Catalog</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2"
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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 border-t" data-testid="nav-mobile">
            <div className="space-y-3 pt-4">
              <Link href="/">
                <a
                  className="block px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="link-mobile-home"
                >
                  Home
                </a>
              </Link>
              <Link href="/catalog">
                <a
                  className="block px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="link-mobile-catalog"
                >
                  Catalog
                </a>
              </Link>
              <a href="#contact" className="block px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors" data-testid="link-mobile-contact">
                Contact
              </a>
              <a href="#about" className="block px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors" data-testid="link-mobile-about">
                About
              </a>
              <Link href="/catalog">
                <Button className="w-full" onClick={() => setMobileMenuOpen(false)} data-testid="button-mobile-catalog">
                  Browse Catalog
                </Button>
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
