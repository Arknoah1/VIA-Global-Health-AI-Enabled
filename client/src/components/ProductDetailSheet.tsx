import { Product } from "@/lib/types";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Play, Download, HelpCircle, Check, MessageSquare, Send, Loader2, Star, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductDetailSheetProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatBulletText = (text: string) => {
  if (!text) return null;
  
  const hasBullets = text.includes('•');
  if (!hasBullets) {
    return <span>{text}</span>;
  }
  
  const parts = text.split('•').map(part => part.trim()).filter(part => part.length > 0);
  
  return (
    <ul className="space-y-2">
      {parts.map((part, idx) => (
        <li key={idx} className="flex items-start gap-2">
          <span className="text-primary mt-1">•</span>
          <span>{part}</span>
        </li>
      ))}
    </ul>
  );
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RecommendedProduct {
  id: string;
  name: string;
  sku: string;
}

export function ProductDetailSheet({ product, isOpen, onClose }: ProductDetailSheetProps) {
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quoteRequestId, setQuoteRequestId] = useState<string | null>(null);
  const [specialPricingEligible, setSpecialPricingEligible] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [isConversationComplete, setIsConversationComplete] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const startQuoteSession = async () => {
    if (!product) return;
    
    setIsLoading(true);
    setInitError(null);
    
    try {
      const response = await fetch('/api/quote-requests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productSku: product.sku
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start quote session');
      }
      
      const data = await response.json();
      setQuoteRequestId(data.quoteRequestId);
      setMessages([{ role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error starting quote session:', error);
      setInitError('Unable to start chat. Please try again.');
      setMessages([{ 
        role: 'assistant', 
        content: `Thank you for your interest in ${product.name}! I'm here to help you get a custom quote. What brings you here today?`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showQuoteDialog && messages.length === 0 && product) {
      startQuoteSession();
    }
  }, [showQuoteDialog, product]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !product || isConversationComplete) return;

    const userInput = inputValue.trim();
    const userMessage: ChatMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!quoteRequestId) {
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "I apologize, but I'm having trouble with my connection. Please close this chat and try again."
          }]);
          setIsLoading(false);
        }, 500);
        return;
      }

      const response = await fetch(`/api/quote-requests/${quoteRequestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          productDetails: {
            name: product.name,
            description: product.description,
            category: product.category,
            specifications: product.specifications,
            faqs: product.faqs
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      
      if (data.specialPricingEligible) {
        setSpecialPricingEligible(true);
      }
      
      if (data.recommendedProducts && data.recommendedProducts.length > 0) {
        setRecommendedProducts(data.recommendedProducts);
      }
      
      if (data.referToAgent) {
        setIsConversationComplete(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I apologize, but I'm having trouble responding. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseQuoteDialog = () => {
    setShowQuoteDialog(false);
    setMessages([]);
    setInputValue('');
    setQuoteRequestId(null);
    setSpecialPricingEligible(false);
    setRecommendedProducts([]);
    setIsConversationComplete(false);
    setInitError(null);
  };

  if (!product) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0 flex flex-col">
        {/* Header with Close Button */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-background/80 backdrop-blur-sm border-b p-4 sm:p-6">
          <button
            onClick={onClose}
            className="mb-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close product details"
          >
            ← Back
          </button>
          <div className="space-y-2">
            <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-0">
              {product.category}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
              {product.name}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">SKU: {product.sku}</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="aspect-video w-full overflow-hidden rounded-xl border bg-muted/50">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="h-full w-full object-contain bg-white"
                  data-testid="product-image-main"
                />
              </div>
              {product.images && product.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {product.images.map((img, idx) => (
                    <button 
                      key={idx}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-transparent hover:border-primary transition-all duration-200 hover:shadow-md"
                      data-testid={`product-thumbnail-${idx}`}
                    >
                      <img src={img} alt={`Product view ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.keyFeatures && product.keyFeatures.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                    Key Features
                  </h3>
                  <ul className="space-y-2">
                    {product.keyFeatures.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {Object.keys(product.specifications).length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                    Quick Specs
                  </h3>
                  <dl className="space-y-4 text-sm">
                    {Object.entries(product.specifications).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <dt className="text-muted-foreground font-medium">{key}</dt>
                        <dd className="text-foreground pl-2">
                          {formatBulletText(value as string)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* Tabs for Detailed Info */}
            <Tabs defaultValue="details" className="w-full -mx-4 sm:-mx-6">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent px-4 sm:px-6">
                <TabsTrigger 
                  value="details" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 mr-6"
                >
                  <span className="text-sm">Overview</span>
                </TabsTrigger>
                {Object.keys(product.specifications).length > 0 && (
                  <TabsTrigger 
                    value="specs" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 mr-6"
                  >
                    <span className="text-sm">Specs</span>
                  </TabsTrigger>
                )}
                {(product.videoUrl || product.documents.length > 0) && (
                  <TabsTrigger 
                    value="media" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 mr-6"
                  >
                    <span className="text-sm">Media</span>
                  </TabsTrigger>
                )}
                {product.faqs && product.faqs.length > 0 && (
                  <TabsTrigger 
                    value="faqs" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3"
                  >
                    <span className="text-sm">FAQs</span>
                  </TabsTrigger>
                )}
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="details" className="space-y-6 px-4 sm:px-6 py-6">
                {product.description && (
                  <div>
                    <h3 className="font-semibold mb-3 text-base">About This Product</h3>
                    <div className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                      {formatBulletText(product.description)}
                    </div>
                  </div>
                )}
                
                {product.keyFeatures && product.keyFeatures.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-base">Features</h3>
                    <ul className="space-y-3">
                      {product.keyFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              {/* Specifications Tab */}
              {Object.keys(product.specifications).length > 0 && (
                <TabsContent value="specs" className="px-4 sm:px-6 py-6">
                  <div className="space-y-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="p-4 rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors">
                        <div className="font-semibold text-sm text-foreground mb-2">{key}</div>
                        <div className="text-sm text-muted-foreground pl-2">
                          {formatBulletText(value as string)}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {/* Media & Files Tab */}
              {(product.videoUrl || product.documents.length > 0) && (
                <TabsContent value="media" className="space-y-6 px-4 sm:px-6 py-6">
                  {product.videoUrl && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                        <Play className="h-5 w-5" /> Product Video
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
                          data-testid="product-video"
                        ></iframe>
                      </div>
                    </div>
                  )}

                  {product.documents && product.documents.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                        <FileText className="h-5 w-5" /> Documents
                      </h3>
                      <div className="grid gap-3">
                        {product.documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{(doc as any).name}</div>
                                <div className="text-xs text-muted-foreground">PDF Document</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" data-testid={`download-document-${idx}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}

              {/* FAQs Tab */}
              {product.faqs && product.faqs.length > 0 && (
                <TabsContent value="faqs" className="px-4 sm:px-6 py-6">
                  <div className="space-y-3">
                    {product.faqs.map((faq, idx) => (
                      <div key={idx} className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                            <HelpCircle className="h-4 w-4" />
                          </div>
                          <div className="space-y-2 flex-1">
                            <h4 className="font-semibold text-sm leading-snug">{(faq as any).question}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{(faq as any).answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Action Footer */}
        <div className="sticky bottom-0 p-4 sm:p-6 bg-background/80 backdrop-blur-sm border-t mt-4 space-y-3">
          <Button 
            className="w-full h-11 text-base font-semibold"
            data-testid="button-request-quote"
            onClick={() => setShowQuoteDialog(true)}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Request Quote
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-10"
            onClick={onClose}
            data-testid="button-close"
          >
            Close
          </Button>
        </div>
      </SheetContent>

      {/* AI Quote Assistant Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={(open) => !open && handleCloseQuoteDialog()}>
        <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Request Quote - {product?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Special Pricing Banner */}
          {specialPricingEligible && (
            <div className="px-4 pt-2">
              <Alert className="bg-green-50 border-green-200">
                <Star className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  You may qualify for special pricing! We'll include this in your quote.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Init Error Banner */}
          {initError && (
            <div className="px-4 pt-2">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {initError}
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                    data-testid={`chat-message-${msg.role}-${idx}`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              {/* Product Recommendations */}
              {recommendedProducts.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">You might also be interested in:</p>
                  <div className="space-y-2">
                    {recommendedProducts.map((prod) => (
                      <div 
                        key={prod.id}
                        className="p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                        data-testid={`recommended-product-${prod.id}`}
                      >
                        <p className="text-sm font-medium">{prod.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {prod.sku}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation Complete Message */}
              {isConversationComplete && (
                <div className="pt-4 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm">
                    <Check className="h-4 w-4" />
                    Our team will reach out within 24 hours
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t flex gap-2">
            <Input
              placeholder={isConversationComplete ? "Conversation complete" : "Type your message..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading || isConversationComplete}
              data-testid="input-chat-message"
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage} 
              disabled={isLoading || !inputValue.trim() || isConversationComplete}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
