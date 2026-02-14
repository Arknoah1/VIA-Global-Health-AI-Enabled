import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Product } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { ProductSEO, BreadcrumbSEO } from "@/components/ProductSEO";
import { AmaraChatDialog } from "@/components/AmaraChatDialog";
import { RecommendedProducts } from "@/components/RecommendedProducts";
import { useTranslation } from "@/i18n/LanguageProvider";
import { trackCatalogView, trackCtaClick } from "@/lib/analytics";

export default function PublicCatalog() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialSearch = searchParams.get("search") || "";
  const autoOpen = searchParams.get("autoOpen") === "true";

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showQuoteFlow, setShowQuoteFlow] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  useEffect(() => {
    trackCatalogView(initialSearch || undefined, undefined);
  }, []);

  useEffect(() => {
    if (autoOpen && !isLoading && products.length > 0 && initialSearch) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(initialSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        setSelectedProduct(filtered[0]);
      }
    }
  }, [isLoading, products, initialSearch, autoOpen]);

  const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ProductSEO products={products} selectedProduct={selectedProduct} />
      <BreadcrumbSEO items={[
        { name: t("breadcrumb.home"), url: "/" },
        { name: t("breadcrumb.catalog"), url: "/catalog" },
        ...(selectedProduct ? [{ name: selectedProduct.name }] : [])
      ]} />
      
      <Header />

      <main className="flex-1" role="main">
        {/* Page Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
              <ol className="flex items-center gap-2" itemScope itemType="https://schema.org/BreadcrumbList">
                <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <a href="/" itemProp="item" className="hover:text-primary transition-colors">
                    <span itemProp="name">{t("breadcrumb.home")}</span>
                  </a>
                  <meta itemProp="position" content="1" />
                </li>
                <li aria-hidden="true">/</li>
                <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <span itemProp="name" className="text-foreground font-medium">{t("breadcrumb.catalog")}</span>
                  <meta itemProp="position" content="2" />
                </li>
              </ol>
            </nav>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">{t("catalog.title")}</h1>
                <p className="text-muted-foreground">{t("catalog.subtitle")}</p>
              </div>
              <Button 
                size="lg" 
                onClick={() => { trackCtaClick("catalog_header"); setShowQuoteFlow(true); }}
                className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                data-testid="button-request-quote"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Check Bulk Pricing & Availability
              </Button>
            </div>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t("catalog.searchPlaceholder")} 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="min-h-[44px] sm:min-h-0"
                  data-testid={`button-category-${cat}`}
                >
                  {cat === "all" ? t("catalog.allCategories") : cat}
                </Button>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <RecommendedProducts
            onSelectProduct={setSelectedProduct}
            allProducts={products}
          />

          {/* Products Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("catalog.loading")}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("catalog.noProducts")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onSelectProduct={setSelectedProduct}
                  data-testid={`card-product-${product.id}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Detail Sheet */}
        <ProductDetailSheet
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />

        {/* Amara Chat Dialog */}
        <AmaraChatDialog
          isOpen={showQuoteFlow}
          onClose={() => setShowQuoteFlow(false)}
        />
      </main>

      <Footer />
    </div>
  );
}
