import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, MapPin } from "lucide-react";
import { MARKETS, MARKET_SUBREGIONS, MARKETS_BY_SUBREGION } from "@shared/markets";

const SUBREGION_DESCRIPTIONS: Record<string, string> = {
  "East Africa": "Kenya, Ethiopia, Tanzania, Uganda, Rwanda, and Mozambique — VIA's most active shipping region for maternal health and neonatal equipment.",
  "West Africa": "Nigeria, Ghana, and Senegal — major procurement hubs for distributors and NGO health programmes across francophone and anglophone West Africa.",
  "Southern Africa": "South Africa, Zambia, and Zimbabwe — strong private hospital networks and government procurement tenders.",
  "Central Africa": "DRC and Central African Republic — served by major international NGOs in complex humanitarian contexts.",
  "Latin America & Caribbean": "Haiti and other LMIC markets where VIA's equipment and NGO-compatible pricing make a direct impact.",
};

export default function MarketsIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />

      <main className="flex-1" role="main">
        <div className="bg-primary text-white py-14">
          <div className="container mx-auto px-4">
            <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span className="mx-2">›</span>
              <span>Markets</span>
            </nav>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-8 w-8 text-primary-foreground/80" />
              <h1 className="text-3xl md:text-4xl font-bold">Medical Equipment for Africa &amp; LMIC</h1>
            </div>
            <p className="text-lg text-primary-foreground/80 max-w-2xl">
              VIA Global Health supplies quality medical equipment to healthcare providers,
              distributors, and NGOs across Africa and low- and middle-income countries.
              Browse country-specific procurement guides below.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto mb-10 text-slate-600 text-base leading-relaxed">
            <p>
              We ship medical equipment — thermocoagulators, CPAP devices, autoclaves, pulse oximeters,
              diagnostic tools, and more — to healthcare facilities in over 30 countries. Each market
              page below provides local procurement context, import guidance, and links to request a
              quote for any product in our catalog.
            </p>
          </div>

          {MARKET_SUBREGIONS.map(region => {
            const countries = MARKETS_BY_SUBREGION[region];
            if (!countries.length) return null;
            return (
              <section key={region} className="mb-12" aria-labelledby={`region-${region.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2
                    id={`region-${region.replace(/\s+/g, "-").toLowerCase()}`}
                    className="text-xl font-bold text-slate-900"
                  >
                    {region}
                  </h2>
                </div>
                <p className="text-sm text-slate-500 mb-5 ml-7">
                  {SUBREGION_DESCRIPTIONS[region]}
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-0">
                  {countries.map(country => (
                    <Link key={country.slug} href={`/markets/${country.slug}`}>
                      <Card
                        className="h-full hover:shadow-md hover:border-primary/30 border-2 transition-all duration-200 cursor-pointer group"
                        data-testid={`card-market-${country.slug}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl leading-none" role="img" aria-label={country.name}>
                              {country.flag}
                            </span>
                            <div>
                              <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                                {country.name}
                              </h3>
                              <p className="text-xs text-slate-400 uppercase tracking-wide">{country.subregion}</p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-3 mb-3">
                            {country.healthContext.slice(0, 120)}…
                          </p>
                          <div className="flex items-center text-primary text-sm font-medium">
                            View procurement guide <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="mt-10 bg-slate-50 border rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Don't see your country?</h2>
            <p className="text-slate-600 mb-5">
              VIA Global Health ships to over 30 countries. Contact us for a custom shipping quote
              or to discuss procurement in your market.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/catalog">
                <Button size="lg" data-testid="button-markets-browse-catalog">
                  Browse full catalog <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" data-testid="button-markets-contact">
                  Contact us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
