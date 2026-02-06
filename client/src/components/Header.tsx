import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
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
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity" data-testid="link-home">
            <img 
              src="/via-logo.png" 
              alt="VIA Global Health" 
              className="h-10 sm:h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8" data-testid="nav-desktop">
            <Link 
              href="/" 
              className={`transition-colors ${isActive("/") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-home-nav"
            >
              Home
            </Link>
            <Link 
              href="/catalog" 
              className={`transition-colors ${isActive("/catalog") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-catalog"
            >
              Catalog
            </Link>
            <Link 
              href="/about" 
              className={`transition-colors ${isActive("/about") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-about-nav"
            >
              About
            </Link>
            <Link 
              href="/track-quote" 
              className={`transition-colors ${isActive("/track-quote") ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`} 
              data-testid="link-track-quote"
            >
              Track Quote
            </Link>
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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 border-t" data-testid="nav-mobile">
            <div className="space-y-3 pt-4">
              <Link 
                href="/" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-home"
              >
                Home
              </Link>
              <Link 
                href="/catalog" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-catalog"
              >
                Catalog
              </Link>
              <Link 
                href="/about" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-about"
              >
                About
              </Link>
              <Link 
                href="/track-quote" 
                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-track-quote"
              >
                Track Quote
              </Link>
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
