import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useTranslation } from "@/i18n/LanguageProvider";
import { 
  ArrowRight, Building2, Heart, HandshakeIcon, Globe, Zap, Users, Award, 
  ShieldCheck, Clock, TrendingUp, Quote, CheckCircle2, MapPin, Package,
} from "lucide-react";

import africanMedicalTeam from "@/assets/images/african-medical-team_1.jpg";
import africanDoctorPatient from "@/assets/images/african-doctor-patient.png";

const africanHealthcareHero = "/images/hero/african-healthcare-hero.jpg";

export default function HomePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"distributors" | "providers" | "ngos">("distributors");
  const heroRef = useRef<HTMLDivElement>(null);

  const audienceData = useMemo(() => ({
    distributors: {
      title: t("audience.distributors"),
      icon: Building2,
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
      description: t("audience.distributorsDesc"),
      pricing: t("audience.distributorsPricing"),
      features: [
        t("audience.distributorsFeature1"),
        t("audience.distributorsFeature2"),
        t("audience.distributorsFeature3"),
        t("audience.distributorsFeature4")
      ],
      cta: t("audience.distributorsCta")
    },
    providers: {
      title: t("audience.providers"),
      icon: Heart,
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      description: t("audience.providersDesc"),
      pricing: t("audience.providersPricing"),
      features: [
        t("audience.providersFeature1"),
        t("audience.providersFeature2"),
        t("audience.providersFeature3"),
        t("audience.providersFeature4")
      ],
      cta: t("audience.providersCta")
    },
    ngos: {
      title: t("audience.ngos"),
      icon: HandshakeIcon,
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
      description: t("audience.ngosDesc"),
      pricing: t("audience.ngosPricing"),
      features: [
        t("audience.ngosFeature1"),
        t("audience.ngosFeature2"),
        t("audience.ngosFeature3"),
        t("audience.ngosFeature4")
      ],
      cta: t("audience.ngosCta")
    }
  }), [t]);

  const heroProducts = [
    {
      name: "NASG (Non-pneumatic Anti-Shock Garment)",
      description: "Life-saving device for treating obstetric hemorrhage and hypovolemic shock",
      category: "Maternal Health",
      image: "/images/products/nasg.jpg",
      slug: "lifewrap-non-pneumatic-anti-shock-garment-nasg-size-mediumlarge"
    },
    {
      name: "Thermocoagulator",
      description: "Portable device for cervical cancer treatment using thermal ablation",
      category: "Oncology",
      image: "/images/products/thermocoagulator.png",
      slug: "thermocoagulator"
    },
    {
      name: "MTTS Beluga CPAP",
      description: "Affordable CPAP system designed for low-resource settings",
      category: "Neonatal Care",
      image: "/images/products/beluga-cpap.jpg",
      slug: "mtts-beluga-resuscitator"
    }
  ];

  const testimonials = [
    {
      quote: "VIA helped us equip three new maternal health clinics across rural Kenya. Their 24-hour response meant we could finalize procurement before our grant deadline—and now those clinics are saving lives every day.",
      author: "Dr. Grace Wanjiku",
      role: "Regional Health Director",
      org: "Kenya Ministry of Health Partner"
    },
    {
      quote: "As a Tanzanian distributor, I needed a partner who understood our market. VIA's team works alongside us—not above us. Together we've brought essential equipment to hospitals that were struggling to get manufacturer attention.",
      author: "James Mwangi",
      role: "Managing Director",
      org: "MedEquip Tanzania Ltd"
    },
    {
      quote: "Our community health workers now have the diagnostic tools they need. VIA understood our timeline, our budget, and our mission. This is how partnerships should work—Africans helping Africans build stronger health systems.",
      author: "Sister Amara Diallo",
      role: "Health Program Coordinator",
      org: "Catholic Relief Services, Senegal"
    }
  ];

  const stats = [
    { value: "15+", label: t("stats.yearsExperience"), icon: Clock },
    { value: "90+", label: t("stats.countriesServed"), icon: Globe },
    { value: "8M+", label: t("stats.patientLives"), icon: Heart },
    { value: "24hr", label: t("stats.quoteResponse"), icon: Zap }
  ];

  const current = audienceData[activeTab];
  const CurrentIcon = current.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />

      <main className="flex-1" role="main">

      {/* Hero Section - Responsiveness Focused */}
      <section ref={heroRef} className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              {t("hero.title1")}<br />
              <span className="text-primary">{t("hero.title2")}</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/catalog">
                <Button size="lg" className="w-full sm:w-auto text-xl px-10 py-7 bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold" data-testid="button-view-products">
                  Explore Our Catalog
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-4 text-center lg:text-left">
              Join 500+ global clinics sourcing through VIA. Response time &lt; 2 mins.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-blue-200/30 rounded-3xl transform rotate-3"></div>
            <img 
              src={africanHealthcareHero} 
              alt="African healthcare professional" 
              className="relative rounded-2xl shadow-2xl w-full object-cover aspect-[4/3]"
              fetchPriority="high"
              decoding="sync"
              width="800"
              height="600"
            />
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border">
              <p className="text-sm font-semibold text-slate-900">{t("hero.tagline")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className="bg-slate-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-3xl md:text-4xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hero Products Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">{t("products.title")}</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {t("products.subtitle")}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {heroProducts.map((product, idx) => (
            <Link key={idx} href={`/products/${product.slug}`}>
              <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-primary/30" data-testid={`card-hero-product-${idx}`}>
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <CardHeader>
                  <div className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">
                    {product.category}
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-primary text-sm font-medium">
                    {t("products.requestQuote")} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Customer Segmentation */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">{t("audience.title")}</h2>
            <p className="text-slate-600">{t("audience.subtitle")}</p>
          </div>

          {/* Audience Tabs */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(Object.entries(audienceData) as Array<[keyof typeof audienceData, typeof audienceData.distributors]>).map(([key, data]) => {
              const Icon = data.icon;
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? data.color + " border-current shadow-lg"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                  data-testid={`button-audience-${key}`}
                >
                  <Icon className={`h-8 w-8 mb-3 ${isActive ? data.textColor : "text-slate-400"}`} />
                  <h4 className="text-lg font-semibold text-slate-900">{data.title}</h4>
                  <p className="text-sm text-slate-600 mt-2">{data.description}</p>
                </button>
              );
            })}
          </div>

          {/* Active Audience Details */}
          <Card className={`${current.color} border-2`}>
            <CardContent className="p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <CurrentIcon className={`h-8 w-8 ${current.textColor}`} />
                    <h3 className="text-2xl font-bold text-slate-900">{current.title}</h3>
                  </div>
                  
                  <div className="bg-white/70 rounded-lg p-4 mb-6 border">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      {current.pricing}
                    </div>
                  </div>

                  <h4 className="text-lg font-semibold text-slate-900 mb-4">{t("audience.whatWeOffer")}</h4>
                  <ul className="space-y-3 mb-8">
                    {current.features.map((feature, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700">
                        <CheckCircle2 className={`h-5 w-5 ${current.textColor} flex-shrink-0 mt-0.5`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/catalog">
                    <Button size="lg" className="w-full sm:w-auto" data-testid={`button-cta-${activeTab}`}>
                      {current.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="bg-white/50 rounded-xl p-6 border">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">{t("audience.quickQuoteProcess")}</h4>
                  <div className="space-y-4">
                    {[
                      { step: "1", title: t("audience.step1Title"), desc: t("audience.step1Desc") },
                      { step: "2", title: t("audience.step2Title"), desc: t("audience.step2Desc") },
                      { step: "3", title: t("audience.step3Title"), desc: t("audience.step3Desc") },
                      { step: "4", title: t("audience.step4Title"), desc: t("audience.step4Desc") }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className={`h-8 w-8 rounded-full ${current.color} ${current.textColor} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                          {item.step}
                        </div>
                        <div>
                          <h5 className="font-medium text-slate-900">{item.title}</h5>
                          <p className="text-sm text-slate-600">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="africanPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="currentColor" className="text-primary"/>
              <circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary"/>
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#africanPattern)"/>
          </svg>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">{t("testimonials.title")}</h2>
            <p className="text-slate-600">{t("testimonials.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="h-full bg-white/80 backdrop-blur-sm" data-testid={`card-testimonial-${idx}`}>
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-primary/30 mb-4" />
                  <p className="text-slate-700 mb-6 italic">"{testimonial.quote}"</p>
                  <div className="border-t pt-4">
                    <p className="font-semibold text-slate-900">{testimonial.author}</p>
                    <p className="text-sm text-slate-600">{testimonial.role}</p>
                    <p className="text-sm text-primary">{testimonial.org}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Trust VIA - with team image */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">{t("whyVia.title")}</h2>
              <p className="text-slate-600 mb-6">{t("whyVia.subtitle")}</p>
              <img 
                src={africanMedicalTeam} 
                alt="African medical professionals collaborating" 
                className="rounded-xl shadow-lg w-full object-cover aspect-video"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: ShieldCheck, title: t("whyVia.trustedRelationships"), desc: t("whyVia.trustedRelationshipsDesc") },
                { icon: Zap, title: t("whyVia.fastQuotes"), desc: t("whyVia.fastQuotesDesc") },
                { icon: Award, title: t("whyVia.qualityAssured"), desc: t("whyVia.qualityAssuredDesc") },
                { icon: MapPin, title: t("whyVia.africaExpertise"), desc: t("whyVia.africaExpertiseDesc") }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Card key={idx} className="text-center">
                    <CardContent className="p-6">
                      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-primary text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="ctaPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1" fill="white"/>
              <path d="M0 5 L5 0 L10 5 L5 10 Z" fill="none" stroke="white" strokeWidth="0.3"/>
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#ctaPattern)"/>
          </svg>
        </div>
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl font-bold mb-4">{t("cta.ready")}</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-browse-catalog">
                {t("cta.browseCatalog")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10 text-lg px-8" data-testid="button-learn-more">
                {t("cta.learnMore")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
