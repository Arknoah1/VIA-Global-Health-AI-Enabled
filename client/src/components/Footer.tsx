import { Link } from "wouter";
import { Globe, Mail, Building2, MapPin } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300" data-testid="footer-main">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-10">

          <div className="md:col-span-4" data-testid="footer-company">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-5 w-5 text-blue-400" />
              <h4 className="text-lg font-semibold text-white">VIA Global Health</h4>
            </div>
            <p className="text-sm leading-relaxed mb-5 text-slate-400">{t("footer.companyDesc")}</p>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 flex-shrink-0 text-blue-400" />
              <a href="mailto:info@viaglobalhealth.com" className="text-sm hover:text-white transition" data-testid="link-email">info@viaglobalhealth.com</a>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-blue-400" />
              <span className="text-sm text-slate-400">{t("footer.servingCountries")}</span>
            </div>
          </div>

          <div className="md:col-span-5" data-testid="footer-offices">
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{t("contact.officesTitle")}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <div className="text-sm">
                  <p className="text-white font-medium mb-0.5">Seattle, WA</p>
                  <p className="text-slate-400 leading-relaxed">2212 Queen Anne Ave. N<br />Unit #824<br />Seattle, WA 98109 USA</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <div className="text-sm">
                  <p className="text-white font-medium mb-0.5">Nairobi, Kenya</p>
                  <p className="text-slate-400 leading-relaxed">General Mathenge Rd<br />Westlands<br />48620-00100 GPO Nairobi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-3" data-testid="footer-links">
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/catalog" className="text-slate-400 hover:text-white transition" data-testid="link-footer-wholesale">{t("footer.wholesalePricing")}</Link>
              </li>
              <li>
                <Link href="/catalog" className="text-slate-400 hover:text-white transition" data-testid="link-footer-medical">{t("footer.medicalProducts")}</Link>
              </li>
              <li>
                <Link href="/about" className="text-slate-400 hover:text-white transition" data-testid="link-footer-about">{t("footer.aboutUs")}</Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-white transition" data-testid="link-footer-contact">{t("footer.contactUs")}</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-700/60 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <p data-testid="footer-copyright">&copy; {currentYear} VIA Global Health. {t("footer.allRights")}</p>
            <div className="flex flex-wrap justify-center gap-4" data-testid="footer-legal">
              <Link href="/privacy-policy" className="hover:text-slate-300 transition" data-testid="link-footer-privacy">{t("footer.privacyPolicy")}</Link>
              <Link href="/return-policy" className="hover:text-slate-300 transition" data-testid="link-footer-return">{t("footer.returnPolicy")}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
