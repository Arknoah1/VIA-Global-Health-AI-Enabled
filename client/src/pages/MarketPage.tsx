import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, Package, Info, ExternalLink } from "lucide-react";
import { MARKETS } from "@shared/markets";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export default function MarketPage() {
  const { slug } = useParams<{ slug: string }>();
  const market = MARKETS.find(m => m.slug === slug);
  const [showAll, setShowAll] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  if (!market) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center" role="main">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Market Not Found</h1>
            <p className="text-slate-600 mb-6">We don't have a page for that market yet.</p>
            <Link href="/markets">
              <Button>View all markets</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasFilter = market.relevantCategories.length > 0;
  const filteredProducts = hasFilter && !showAll
    ? products.filter(p => market.relevantCategories.includes(p.category))
    : products;
  const filteredCount = hasFilter
    ? products.filter(p => market.relevantCategories.includes(p.category)).length
    : products.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />

      <main className="flex-1" role="main">
        <div className="bg-primary text-white py-14">
          <div className="container mx-auto px-4">
            <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span className="mx-2">›</span>
              <Link href="/markets" className="hover:text-white transition-colors">Markets</Link>
              <span className="mx-2">›</span>
              <span>{market.name}</span>
            </nav>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl leading-none" role="img" aria-label={market.name}>
                {market.flag}
              </span>
              <div>
                <p className="text-sm text-primary-foreground/60 uppercase tracking-widest mb-1">
                  {market.subregion}
                </p>
                <h1 className="text-3xl md:text-4xl font-bold">
                  Medical Equipment for {market.name}
                </h1>
              </div>
            </div>
            <p className="text-primary-foreground/80 max-w-2xl mt-3 text-base leading-relaxed">
              Quality medical equipment supplied to healthcare providers, distributors, and NGOs
              in {market.name}. Quote response within 24 hours.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-start gap-3 mb-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <h2 className="text-lg font-semibold text-slate-900">Healthcare Context</h2>
              </div>
              <p className="text-slate-600 leading-relaxed ml-8">{market.healthContext}</p>
            </div>

            <Card className="border-2 border-amber-100 bg-amber-50/50">
              <CardContent className="p-5">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <h2 className="text-base font-semibold text-slate-900">Procurement &amp; Import</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{market.importNote}</p>
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <p className="text-xs text-slate-500">
                    VIA Global Health handles shipping documentation and can provide DDP, DAP, or EXW
                    incoterms. We support air and sea freight options.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-slate-900">
                  {hasFilter && !showAll
                    ? `Featured Equipment for ${market.name}`
                    : `Equipment Available for ${market.name}`}
                </h2>
              </div>
              {hasFilter && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm text-primary hover:underline font-medium"
                  data-testid={`button-market-${market.slug}-show-all`}
                >
                  Show all {products.length} products
                </button>
              )}
            </div>

            {hasFilter && !showAll ? (
              <p className="text-slate-500 text-sm mb-6">
                Showing {filteredCount} product{filteredCount !== 1 ? "s" : ""} most relevant to {market.name}'s healthcare priorities.
                {" "}
                <button onClick={() => setShowAll(true)} className="text-primary hover:underline">
                  View all {products.length} products →
                </button>
              </p>
            ) : (
              <p className="text-slate-500 text-sm mb-6">
                All products in our catalog ship to {market.name}. Request a quote on any item — we respond within 24 hours.
                {showAll && hasFilter && (
                  <button onClick={() => setShowAll(false)} className="ml-2 text-primary hover:underline">
                    Show featured only
                  </button>
                )}
              </p>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <p className="text-slate-500 mb-4">No products found for the selected categories.</p>
                <Button variant="outline" onClick={() => setShowAll(true)}>
                  Browse all {products.length} products
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    data-testid={`card-market-product-${product.id}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center mt-10">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Ready to source equipment for {market.name}?
            </h2>
            <p className="text-slate-600 mb-5 max-w-xl mx-auto">
              VIA Global Health provides transparent pricing, shipping documentation, and
              24-hour quote responses for all {market.name} orders.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/catalog">
                <Button size="lg" data-testid={`button-market-${market.slug}-catalog`}>
                  Browse full catalog <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" data-testid={`button-market-${market.slug}-contact`}>
                  Contact us about {market.name}
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/markets" className="text-sm text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1">
              <ExternalLink className="h-3.5 w-3.5" />
              View all market guides
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
