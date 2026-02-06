import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { getBrowsingHistory, getCategoryPreferences, getRecentProductIds, onHistoryChange } from "@/lib/browsingHistory";

interface Recommendation {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  description: string;
  sku: string;
  reason: string;
}

interface RecommendedProductsProps {
  onSelectProduct: (product: any) => void;
  allProducts: any[];
}

export function RecommendedProducts({ onSelectProduct, allProducts }: RecommendedProductsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedForIds, setFetchedForIds] = useState<string>("");

  const fetchRecommendations = useCallback(async () => {
    const history = getBrowsingHistory();
    if (history.length === 0) return;

    const currentIds = getRecentProductIds(10).sort().join(",");
    if (currentIds === fetchedForIds) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewedProductIds: getRecentProductIds(10),
          categoryPreferences: getCategoryPreferences(),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
        setFetchedForIds(currentIds);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [fetchedForIds]);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onHistoryChange(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchRecommendations();
      }, 2000);
    });
    return () => {
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fetchRecommendations]);

  if (!isLoading && recommendations.length === 0) return null;

  return (
    <div className="mb-8" data-testid="section-recommendations">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Recommended for You</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {isLoading && recommendations.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-32 bg-muted rounded mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendations.map(rec => {
            const fullProduct = allProducts.find(p => p.id === rec.id);
            return (
              <Card
                key={rec.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-all group"
                onClick={() => fullProduct && onSelectProduct(fullProduct)}
                data-testid={`card-recommendation-${rec.id}`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={rec.imageUrl}
                    alt={rec.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <span className="text-xs text-muted-foreground">{rec.category}</span>
                  <h3 className="text-sm font-medium line-clamp-2 mt-1">{rec.name}</h3>
                  <p className="text-xs text-primary/80 mt-2 italic line-clamp-2">{rec.reason}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
