import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, MessageCircle, Mail, MapPin, Globe, Clock, Users, Shield } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useState } from "react";
import { AmaraChatDialog } from "@/components/AmaraChatDialog";

export default function ContactPage() {
  const { t } = useTranslation();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="contactPattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M0 7.5 L7.5 0 L15 7.5 L7.5 15 Z" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="7.5" cy="7.5" r="2" fill="white" fillOpacity="0.3"/>
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#contactPattern)"/>
          </svg>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="heading-contact-hero">{t("contact.heroTitle")}</h1>
            <p className="text-xl text-blue-100 mb-8">
              {t("contact.heroSubtitle")}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24" data-testid="section-how-to-reach">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 text-center" data-testid="heading-how-to-reach">{t("contact.howToReachTitle")}</h2>
          <p className="text-lg text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            {t("contact.howToReachSubtitle")}
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow" data-testid="card-request-quote">
              <CardHeader className="text-center">
                <ShoppingCart className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <CardTitle className="text-lg">{t("contact.requestQuoteTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-600 mb-4">{t("contact.requestQuoteDesc")}</p>
                <Link href="/catalog">
                  <Button data-testid="button-browse-catalog-contact">{t("contact.browseCatalog")}</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="card-chat-amara">
              <CardHeader className="text-center">
                <MessageCircle className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <CardTitle className="text-lg">{t("contact.chatAmaraTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-600 mb-4">{t("contact.chatAmaraDesc")}</p>
                <Button onClick={() => setChatOpen(true)} data-testid="button-chat-amara-contact">{t("contact.startChat")}</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="card-email-us">
              <CardHeader className="text-center">
                <Mail className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <CardTitle className="text-lg">{t("contact.emailUsTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-600 mb-4">{t("contact.emailUsDesc")}</p>
                <a href="mailto:info@viaglobalhealth.com">
                  <Button variant="outline" data-testid="button-email-contact">info@viaglobalhealth.com</Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-slate-50" data-testid="section-our-offices">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 text-center" data-testid="heading-our-offices">{t("contact.officesTitle")}</h2>
          <p className="text-lg text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            {t("contact.officesSubtitle")}
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow" data-testid="card-office-usa">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("contact.usaOfficeTitle")}</CardTitle>
                    <p className="text-sm text-slate-500">{t("contact.usaOfficeLabel")}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700" data-testid="text-office-usa-location">{t("contact.usaOfficeLocation")}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="card-office-kenya">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("contact.kenyaOfficeTitle")}</CardTitle>
                    <p className="text-sm text-slate-500">{t("contact.kenyaOfficeLabel")}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700" data-testid="text-office-kenya-location">{t("contact.kenyaOfficeLocation")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24" data-testid="section-trust-signals">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Globe, value: "40+", label: t("contact.trustCountries") },
              { icon: Clock, value: "24hr", label: t("contact.trustQuoteResponse") },
              { icon: Users, value: "8M+", label: t("contact.trustLivesImpacted") },
              { icon: Shield, value: "100%", label: t("contact.trustQualityAssured") },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="text-center p-6" data-testid={`trust-signal-${idx}`}>
                  <Icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <p className="text-3xl font-bold text-slate-900 mb-1">{item.value}</p>
                  <p className="text-sm text-slate-600">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-24 bg-slate-900 text-white overflow-hidden" data-testid="section-contact-cta">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="ctaContactPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1" fill="white"/>
              <path d="M0 5 L5 0 L10 5 L5 10 Z" fill="none" stroke="white" strokeWidth="0.3"/>
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#ctaContactPattern)"/>
          </svg>
        </div>
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("contact.ctaTitle")}</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            {t("contact.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" variant="secondary" data-testid="button-cta-browse-catalog">
                {t("contact.browseCatalog")}
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-slate-900"
              onClick={() => setChatOpen(true)}
              data-testid="button-cta-chat-amara"
            >
              {t("contact.startChat")}
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      <AmaraChatDialog isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
