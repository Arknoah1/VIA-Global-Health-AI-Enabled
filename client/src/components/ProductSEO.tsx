import { useEffect } from "react";
import { Product } from "@/lib/types";
import { slugify } from "@/lib/slugify";

interface ProductSEOProps {
  products: Product[];
  selectedProduct?: Product | null;
}

function absoluteImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${window.location.origin}${imageUrl}`;
}

export function ProductSEO({ products, selectedProduct }: ProductSEOProps) {
  useEffect(() => {
    const existingScript = document.getElementById("product-jsonld");
    if (existingScript) {
      existingScript.remove();
    }

    if (selectedProduct) {
      const siteUrl = window.location.origin;
      const productSlug = slugify(selectedProduct.name);
      const canonicalUrl = `${siteUrl}/products/${productSlug}`;
      const imageUrl = absoluteImageUrl(selectedProduct.imageUrl);

      const productSchema: any = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: selectedProduct.name,
        description: selectedProduct.description,
        sku: selectedProduct.sku,
        image: imageUrl,
        url: canonicalUrl,
        category: selectedProduct.category,
        brand: {
          "@type": "Brand",
          name: "VIA Global Health",
        },
        offers: {
          "@type": "Offer",
          availability: selectedProduct.status === "active" 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock",
          priceCurrency: selectedProduct.currency,
          price: (selectedProduct.price / 100).toFixed(2),
          seller: {
            "@type": "Organization",
            name: "VIA Global Health",
          },
        },
      };

      if ((selectedProduct as any).sellerName) {
        productSchema.manufacturer = {
          "@type": "Organization",
          name: (selectedProduct as any).sellerName,
        };
      }

      if ((selectedProduct as any).shippingWeightKg) {
        productSchema.weight = {
          "@type": "QuantitativeValue",
          value: (selectedProduct as any).shippingWeightKg,
          unitCode: "KGM",
        };
      }

      const script = document.createElement("script");
      script.id = "product-jsonld";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(productSchema);
      document.head.appendChild(script);
    } else if (products.length > 0) {
      const siteUrl = window.location.origin;
      const catalogSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Medical Products Catalog",
        description: "Quality medical equipment and supplies from VIA Global Health",
        numberOfItems: products.length,
        itemListElement: products.slice(0, 20).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: product.name,
            description: product.description.slice(0, 200),
            sku: product.sku,
            image: absoluteImageUrl(product.imageUrl),
            url: `${siteUrl}/products/${slugify(product.name)}`,
            category: product.category,
            offers: {
              "@type": "Offer",
              availability: product.status === "active" 
                ? "https://schema.org/InStock" 
                : "https://schema.org/OutOfStock",
              priceCurrency: product.currency,
              price: (product.price / 100).toFixed(2),
            },
          },
        })),
      };

      const script = document.createElement("script");
      script.id = "product-jsonld";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(catalogSchema);
      document.head.appendChild(script);
    }

    return () => {
      const script = document.getElementById("product-jsonld");
      if (script) {
        script.remove();
      }
    };
  }, [products, selectedProduct]);

  return null;
}

interface BreadcrumbSEOProps {
  items: Array<{ name: string; url?: string }>;
}

export function BreadcrumbSEO({ items }: BreadcrumbSEOProps) {
  useEffect(() => {
    const existingScript = document.getElementById("breadcrumb-jsonld");
    if (existingScript) {
      existingScript.remove();
    }

    const siteUrl = window.location.origin;
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url ? `${siteUrl}${item.url}` : undefined,
      })),
    };

    const script = document.createElement("script");
    script.id = "breadcrumb-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(script);

    return () => {
      const script = document.getElementById("breadcrumb-jsonld");
      if (script) {
        script.remove();
      }
    };
  }, [items]);

  return null;
}
