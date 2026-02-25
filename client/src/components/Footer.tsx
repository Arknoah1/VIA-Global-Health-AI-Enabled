import { Link } from "wouter";
import { Globe, Mail, MapPin, Building2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t" data-testid="footer-main">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div data-testid="footer-company">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-6 w-6 text-blue-400" />
              <h4 className="text-lg font-semibold text-white">VIA Global Health</h4>
            </div>
            <p className="text-sm mb-4">{t("footer.companyDesc")}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <a href="mailto:info@viaglobalhealth.com" className="hover:text-white transition" data-testid="link-email">info@viaglobalhealth.com</a>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span>{t("footer.seattleOffice")}</span>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span>{t("footer.nairobiOffice")}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span>{t("footer.servingCountries")}</span>
              </div>
            </div>
          </div>

          <div data-testid="footer-distributors">
            <h4 className="font-semibold text-white mb-4">{t("footer.forDistributors")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="hover:text-white transition" data-testid="link-footer-wholesale">{t("footer.wholesalePricing")}</Link>
              </li>
            </ul>
          </div>

          <div data-testid="footer-providers">
            <h4 className="font-semibold text-white mb-4">{t("footer.forHealthcare")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="hover:text-white transition" data-testid="link-footer-medical">{t("footer.medicalProducts")}</Link>
              </li>
            </ul>
          </div>

          <div data-testid="footer-ngos">
            <h4 className="font-semibold text-white mb-4">{t("footer.forNgos")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="hover:text-white transition" data-testid="link-footer-ngo-catalog">{t("nav.browseCatalog")}</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-8">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2" data-testid="footer-legal">
              <div className="flex flex-wrap gap-4">
                <Link href="/about" className="hover:text-white transition" data-testid="link-footer-about">{t("footer.aboutUs")}</Link>
                <Link href="/contact" className="hover:text-white transition" data-testid="link-footer-contact">{t("footer.contactUs")}</Link>
                <Link href="/privacy-policy" className="hover:text-white transition" data-testid="link-footer-privacy">{t("footer.privacyPolicy")}</Link>
                <Link href="/return-policy" className="hover:text-white transition" data-testid="link-footer-return">{t("footer.returnPolicy")}</Link>
              </div>
            </div>
            <div className="text-right md:text-right" data-testid="footer-copyright">
              <p>&copy; {currentYear} VIA Global Health. {t("footer.allRights")}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
