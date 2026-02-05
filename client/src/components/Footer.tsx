import { Link } from "wouter";
import { Globe, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t" data-testid="footer-main">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div data-testid="footer-company">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-6 w-6 text-blue-400" />
              <h4 className="text-lg font-semibold text-white">VIA Global Health</h4>
            </div>
            <p className="text-sm mb-4">Leading provider of quality medical solutions across Africa serving distributors, healthcare providers, and humanitarian organizations.</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <a href="tel:+1234567890" className="hover:text-white transition" data-testid="link-phone">+1 (234) 567-890</a>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <a href="mailto:info@viaglobalhealth.com" className="hover:text-white transition" data-testid="link-email">info@viaglobalhealth.com</a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span>Serving 40+ countries across Africa</span>
              </div>
            </div>
          </div>

          {/* For Distributors */}
          <div data-testid="footer-distributors">
            <h4 className="font-semibold text-white mb-4">For Distributors</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="hover:text-white transition" data-testid="link-footer-wholesale">Wholesale Pricing</Link>
              </li>
            </ul>
          </div>

          {/* For Healthcare Providers */}
          <div data-testid="footer-providers">
            <h4 className="font-semibold text-white mb-4">For Healthcare</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="hover:text-white transition" data-testid="link-footer-medical">Medical Products</Link>
              </li>
            </ul>
          </div>

          {/* For NGOs */}
          <div data-testid="footer-ngos">
            <h4 className="font-semibold text-white mb-4">For NGOs & Non-Profits</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="hover:text-white transition" data-testid="link-footer-ngo-catalog">Browse Catalog</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 pt-8">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2" data-testid="footer-legal">
              <div className="flex flex-wrap gap-4">
                <Link href="/about" className="hover:text-white transition" data-testid="link-footer-about">About Us</Link>
              </div>
            </div>
            <div className="text-right md:text-right" data-testid="footer-copyright">
              <p>&copy; {currentYear} VIA Global Health. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
