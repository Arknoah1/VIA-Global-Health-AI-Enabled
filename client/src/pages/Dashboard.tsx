import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { ProductTable } from "@/components/ProductTable";
import { ProductCard } from "@/components/ProductCard";
import { ScraperModal } from "@/components/ScraperModal";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  LayoutGrid,
  List
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [isScraperOpen, setIsScraperOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products from API
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Mutation to save scraped products
  const saveProductsMutation = useMutation({
    mutationFn: async (newProducts: Product[]) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProducts),
      });
      if (!response.ok) throw new Error("Failed to save products");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleScrapeComplete = async (newProducts: Product[]) => {
    try {
      await saveProductsMutation.mutateAsync(newProducts);
      toast({
        title: "Extraction Complete",
        description: `Successfully saved ${newProducts.length} products to the database.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save products to database",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "products.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast({
      title: "Export Started",
      description: "Downloading product data as JSON...",
    });
  };

  return (
    <div className="flex h-screen bg-background w-full">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xl font-semibold">Product Database</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setIsScraperOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Scrape
            </Button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="p-6 pb-0 space-y-4 shrink-0">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products by name, SKU, or category..." 
                className="pl-9 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <div className="border rounded-md flex p-1 bg-card">
                <Button 
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-lg font-medium text-muted-foreground">Loading products...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-lg font-medium text-muted-foreground">No products yet</p>
                <p className="text-sm text-muted-foreground">Start a new scrape to populate the database</p>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <ProductTable 
              products={filteredProducts} 
              onSelectProduct={setSelectedProduct}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onSelectProduct={setSelectedProduct}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ScraperModal 
        isOpen={isScraperOpen} 
        onClose={() => setIsScraperOpen(false)}
        onComplete={handleScrapeComplete}
      />

      <ProductDetailSheet
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
