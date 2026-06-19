import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Globe, Package, Zap, Users, Award, Heart, TrendingUp } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

import africanMedicalTeam from "@/assets/images/african-medical-team_1.jpg";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1" role="main">

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="aboutPattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M0 7.5 L7.5 0 L15 7.5 L7.5 15 Z" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="7.5" cy="7.5" r="2" fill="white" fillOpacity="0.3"/>
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#aboutPattern)"/>
          </svg>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("about.heroTitle")}</h1>
            <p className="text-xl text-blue-100 mb-8">
              {t("about.heroSubtitle")}
            </p>
            <Link href="/catalog">
              <Button size="lg" variant="secondary">
                {t("about.getQuote")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About VIA Section */}
      <section className="py-16 md:py-24 bg-slate-50" data-testid="section-about-via">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8" data-testid="heading-about-via">{t("about.aboutTitle")}</h2>
            
            <div className="space-y-6 text-slate-700 mb-8">
              <p className="text-lg">
                {t("about.aboutText")}
              </p>
              <p className="text-lg font-semibold text-blue-600">
                {t("about.aboutHighlight")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Buyers Section */}
      <section className="py-16 md:py-24" data-testid="section-for-buyers">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">{t("about.whyBuyersTitle")}</h2>
              <p className="text-lg text-slate-700 mb-6">
                {t("about.whyBuyersDesc")}
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  t("about.whyBuyersFeature1"),
                  t("about.whyBuyersFeature2"),
                  t("about.whyBuyersFeature3"),
                  t("about.whyBuyersFeature4"),
                  t("about.whyBuyersFeature5")
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/catalog">
                <Button>{t("about.browseProducts")}</Button>
              </Link>
            </div>
            <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
              <Users className="h-16 w-16 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-4">{t("about.equalAttention")}</h3>
              <p className="text-slate-700">
                {t("about.equalAttentionDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Sellers Section */}
      <section className="py-16 md:py-24 bg-slate-50" data-testid="section-for-sellers">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-green-50 rounded-lg p-8 border border-green-200 md:order-2">
              <Package className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-4">{t("about.becomeVerifiedSeller")}</h3>
              <p className="text-slate-700">
                {t("about.becomeVerifiedSellerDesc")}
              </p>
            </div>
            <div className="md:order-1">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">{t("about.forSellers")}</h2>
              <p className="text-lg text-slate-700 mb-6">
                {t("about.forSellersDesc")}
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  t("about.sellerFeature1"),
                  t("about.sellerFeature2"),
                  t("about.sellerFeature3"),
                  t("about.sellerFeature4"),
                  t("about.sellerFeature5")
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline">{t("about.sellOnVia")}</Button>
            </div>
          </div>
        </div>
      </section>

      {/* How VIA Works */}
      <section className="py-16 md:py-24" data-testid="section-how-it-works">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 text-center">{t("about.howViaWorks")}</h2>
          <p className="text-lg text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            {t("about.howViaWorksDesc")}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: t("about.countriesServedTitle"),
                description: t("about.countriesServedDesc")
              },
              {
                icon: Package,
                title: t("about.noSilenceTitle"),
                description: t("about.noSilenceDesc")
              },
              {
                icon: Zap,
                title: t("about.deliverTitle"),
                description: t("about.deliverDesc")
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="hover:shadow-lg transition-shadow" data-testid={`card-via-process-${idx + 1}`}>
                  <CardHeader>
                    <Icon className="h-10 w-10 text-blue-600 mb-3" />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Services */}
      <section className="py-16 md:py-24 bg-slate-50" data-testid="section-additional-services">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">{t("about.servicesTitle")}</h2>
            <p className="text-lg text-slate-700 mb-8">
              {t("about.servicesDesc")}
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Award, title: t("about.trainingPrograms"), desc: t("about.trainingProgramsDesc") },
                { icon: TrendingUp, title: t("about.rewardsProgram"), desc: t("about.rewardsProgramDesc") },
                { icon: Globe, title: t("about.customWebsites"), desc: t("about.customWebsitesDesc") },
                { icon: Heart, title: t("about.dedicatedSupport"), desc: t("about.dedicatedSupportDesc") }
              ].map((service, idx) => {
                const Icon = service.icon;
                return (
                  <div key={idx} className="bg-white p-6 rounded-lg border border-slate-200">
                    <Icon className="h-8 w-8 text-blue-600 mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-2">{service.title}</h3>
                    <p className="text-slate-600 text-sm">{service.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="relative py-16 md:py-24 bg-blue-50 overflow-hidden" data-testid="section-testimonial">
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="testimonialPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="currentColor" className="text-primary"/>
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#testimonialPattern)"/>
          </svg>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={africanMedicalTeam} 
                alt="African medical professionals collaborating" 
                className="rounded-2xl shadow-xl w-full object-cover aspect-video"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="text-center lg:text-left">
              <div className="mb-6">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-2xl">★</span>
                ))}
              </div>
              <blockquote className="text-2xl font-semibold text-slate-900 mb-6 italic">
                "VIA understands our reality. They don't just sell equipment—they partner with us to strengthen healthcare delivery across West Africa. This is what true partnership looks like."
              </blockquote>
              <p className="text-lg text-slate-700 font-semibold">Dr. Fatou Jallow</p>
              <p className="text-slate-600">Medical Director, Regional Health Network, Gambia</p>
              <Link href="/catalog" className="mt-8 inline-block">
                <Button variant="outline">
                  {t("about.browseOurCatalog")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-16 md:py-24 bg-slate-900 text-white overflow-hidden" data-testid="section-final-cta">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="ctaPattern2" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1" fill="white"/>
              <path d="M0 5 L5 0 L10 5 L5 10 Z" fill="none" stroke="white" strokeWidth="0.3"/>
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#ctaPattern2)"/>
          </svg>
        </div>
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("cta.ready")}</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            {t("about.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" variant="secondary">
                {t("about.browseProducts")}
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-slate-900">
              {t("about.becomeVerifiedBuyer")}
            </Button>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
