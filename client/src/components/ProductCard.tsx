import { Product } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useLocation } from "wouter";
import { slugify } from "@/lib/slugify";

interface ProductCardProps {
  product: Product;
  onSelectProduct?: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
}

export function ProductCard({ product, onSelectProduct, onEditProduct, onDeleteProduct }: ProductCardProps) {
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

  const isAdmin = !!onEditProduct;

  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer group"
      onClick={() => onSelectProduct ? onSelectProduct(product) : setLocation(`/products/${slugify(product.name)}`)}
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
      <CardFooter className="p-4 pt-0">
        {isAdmin ? (
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onSelectProduct?.(product); }} data-testid={`card-view-${product.id}`}>
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEditProduct?.(product); }} data-testid={`card-edit-${product.id}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteProduct?.(product); }} data-testid={`card-delete-${product.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-2" /> {t("productCard.details")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
