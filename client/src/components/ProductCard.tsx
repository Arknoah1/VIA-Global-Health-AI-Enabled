import { Product } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MoreHorizontal, ShoppingCart } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative group">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2 right-2">
          <Badge 
            variant={product.status === 'active' ? 'default' : 'secondary'}
            className={product.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}
          >
            {product.status.replace('_', ' ')}
          </Badge>
        </div>
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
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-medium text-muted-foreground">{product.currency}</span>
          <span className="text-xl font-bold text-primary">{product.price.toLocaleString()}</span>
        </div>
        <div className="text-xs font-mono text-muted-foreground">
          SKU: {product.sku}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="h-4 w-4 mr-2" /> Details
        </Button>
        <Button variant="ghost" size="icon" className="shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
