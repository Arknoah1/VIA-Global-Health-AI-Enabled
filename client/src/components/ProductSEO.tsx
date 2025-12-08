import { useEffect } from "react";
import { Product } from "@/lib/types";

interface ProductSEOProps {
  products: Product[];
  selectedProduct?: Product | null;
}

export function ProductSEO({ products, selectedProduct }: ProductSEOProps) {
  useEffect(() => {
    const existingScript = document.getElementById("product-jsonld");
    if (existingScript) {
      existingScript.remove();
    }

    if (selectedProduct) {
      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: selectedProduct.name,
        description: selectedProduct.description,
        sku: selectedProduct.sku,
        image: selectedProduct.imageUrl,
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
        },
      };

      const script = document.createElement("script");
      script.id = "product-jsonld";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(productSchema);
      document.head.appendChild(script);

      document.title = `${selectedProduct.name} | VIA Global Health`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", 
          selectedProduct.description.slice(0, 160) + (selectedProduct.description.length > 160 ? "..." : "")
        );
      }
    } else if (products.length > 0) {
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
            image: product.imageUrl,
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

      document.title = "Medical Products Catalog | VIA Global Health";
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

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
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
