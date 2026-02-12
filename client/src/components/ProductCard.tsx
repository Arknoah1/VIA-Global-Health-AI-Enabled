import { Product } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MoreHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useLocation } from "wouter";
import { slugify } from "@/lib/slugify";

interface ProductCardProps {
  product: Product;
  onSelectProduct?: (product: Product) => void;
}

export function ProductCard({ product, onSelectProduct }: ProductCardProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Card 
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer group"
      onClick={() => setLocation(`/products/${slugify(product.name)}`)}
    >
      <div ref={imgRef} className="aspect-[4/3] w-full overflow-hidden bg-muted relative">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {isInView && (
          <img 
            src={(product as any).imageUrl || (product as any).image_url} 
            alt={product.name} 
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{product.category}</p>
            <h3 className="font-semibold text-lg leading-tight mt-1 line-clamp-1" title={product.name}>{product.name}</h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
          {product.description}
        </p>
        <div className="text-xs font-mono text-muted-foreground">
          SKU: {product.sku}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="h-4 w-4 mr-2" /> {t("productCard.details")}
        </Button>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
