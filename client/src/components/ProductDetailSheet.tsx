import { Product } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, FileText, Play, Download, Image as ImageIcon, HelpCircle } from "lucide-react";

interface ProductDetailSheetProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailSheet({ product, isOpen, onClose }: ProductDetailSheetProps) {
  if (!product) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-6 pb-4">
          <div>
            <Badge variant="outline" className="mb-2">
              {product.category}
            </Badge>
            <SheetTitle className="text-2xl font-bold leading-tight">
              {product.name}
            </SheetTitle>
            <SheetDescription className="mt-1 font-mono text-xs text-muted-foreground">
              SKU: {product.sku}
            </SheetDescription>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="h-full w-full object-contain bg-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border hover:ring-2 hover:ring-primary transition-all"
                >
                  <img src={img} alt={`View ${idx}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="details" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="specs" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Specifications
              </TabsTrigger>
              <TabsTrigger 
                value="media" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Media & Files
              </TabsTrigger>
              {product.faqs && product.faqs.length > 0 && (
                <TabsTrigger 
                  value="faqs" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                  FAQs
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="details" className="mt-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-lg">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 text-lg">Key Features</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.keyFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="specs" className="mt-6">
              <div className="rounded-lg border bg-card">
                <div className="grid grid-cols-1 divide-y">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 p-4 hover:bg-muted/50 transition-colors">
                      <div className="font-medium text-sm text-muted-foreground">{key}</div>
                      <div className="col-span-2 text-sm font-medium">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="media" className="mt-6 space-y-6">
              {product.videoUrl && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Play className="h-4 w-4" /> Product Video
                  </h3>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black/5 border">
                     <iframe 
                       width="100%" 
                       height="100%" 
                       src={product.videoUrl} 
                       title="Product Video"
                       frameBorder="0" 
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                       allowFullScreen
                     ></iframe>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Documents & Downloads
                </h3>
                <div className="grid gap-3">
                  {product.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{doc.name}</div>
                          <div className="text-xs text-muted-foreground">PDF Document</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {product.faqs && product.faqs.length > 0 && (
              <TabsContent value="faqs" className="mt-6">
                <div className="space-y-4">
                  {product.faqs.map((faq, idx) => (
                    <div key={idx} className="rounded-lg border bg-card p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <HelpCircle className="h-4 w-4" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">{faq.question}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
        
        <SheetFooter className="sticky bottom-0 p-6 bg-background/80 backdrop-blur-md border-t">
          <div className="flex w-full gap-4">
            <Button variant="outline" className="flex-1" asChild>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Source
              </a>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
