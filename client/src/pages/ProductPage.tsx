import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductContent } from "@/components/ProductContent";
import { ProductSEO, BreadcrumbSEO } from "@/components/ProductSEO";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";
import { Product } from "@/lib/types";
import { Loader2, ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo } from "react";
import { trackProductView } from "@/lib/analytics";
import { slugify } from "@/lib/slugify";

export default function ProductPage() {
  const { t } = useTranslation();
  const [match, params] = useRoute("/products/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug || "";

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/by-slug/${slug}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!product,
  });

  const relatedProducts = useMemo(() => {
    if (!product || !allProducts) return [];
    const manualIds = (product.relatedProductIds as string[] | null) || [];
    if (manualIds.length > 0) {
      return allProducts.filter(p => manualIds.includes(String(p.id)) && String(p.id) !== String(product.id));
    }
    return allProducts
      .filter(p => p.category === product.category && String(p.id) !== String(product.id))
      .slice(0, 4);
  }, [product, allProducts]);

  useEffect(() => {
    if (product) {
      trackProductView({ name: product.name, category: product.category, sku: product.sku, slug });
      document.title = `${product.name} | VIA Global Health`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", product.description.slice(0, 160));
      }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", `${product.name} | VIA Global Health`);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", product.description.slice(0, 160));
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && product.imageUrl) ogImage.setAttribute("content", product.imageUrl);
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-product" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-2xl font-bold" data-testid="text-product-not-found">Product Not Found</h1>
          <p className="text-muted-foreground text-center">The product you're looking for doesn't exist or may have been removed.</p>
          <Link href="/catalog">
            <Button className="gap-2" data-testid="button-back-to-catalog">
              <ArrowLeft className="h-4 w-4" />
              Browse Catalog
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <ProductSEO products={[product]} selectedProduct={product} />
      <BreadcrumbSEO items={[
        { name: "Home", url: "/" },
        { name: "Catalog", url: "/catalog" },
        { name: product.name }
      ]} />

      <main className="flex-1" role="main">
        {/* Breadcrumb Navigation */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-3">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              <ol className="flex items-center gap-1.5 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
                <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <a href="/" itemProp="item" className="hover:text-primary transition-colors">
                    <span itemProp="name">{t("breadcrumb.home")}</span>
                  </a>
                  <meta itemProp="position" content="1" />
                </li>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <a href="/catalog" itemProp="item" className="hover:text-primary transition-colors">
                    <span itemProp="name">{t("breadcrumb.catalog")}</span>
                  </a>
                  <meta itemProp="position" content="2" />
                </li>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <span itemProp="name" className="text-foreground font-medium">{product.name}</span>
                  <meta itemProp="position" content="3" />
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Product Content */}
        <ProductContent product={product} relatedProducts={relatedProducts} />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              description: product.description,
              sku: product.sku,
              image: product.imageUrl,
              brand: {
                "@type": "Brand",
                name: "VIA Global Health"
              },
              category: product.category,
              offers: {
                "@type": "Offer",
                availability: "https://schema.org/InStock",
                priceCurrency: "USD",
                seller: {
                  "@type": "Organization",
                  name: "VIA Global Health"
                }
              }
            })
          }}
        />
      </main>

      <Footer />
    </div>
  );
}
