import { Product } from "@/lib/types";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Play, Download, HelpCircle, Check, MessageSquare, Send, Loader2, Star, AlertCircle,
  Zap, Shield, Leaf, Settings, Package, Award, TrendingUp, Headphones, 
  ChevronDown, ChevronUp, Search, Phone, Mail, Eye, Sparkles,
  Stethoscope, Activity, Heart, Thermometer, FlaskConical, ClipboardCheck,
  Microscope, Syringe, Briefcase, Pill, Building2
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef, useEffect, useMemo } from "react";
import { trackProductView } from "@/lib/browsingHistory";
import { getCustomerProfile, saveCustomerProfile, clearCustomerProfile } from "@/lib/customerProfile";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

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

const extractFirstSpecValue = (text: string): string => {
  if (!text) return "";
  
  if (text.includes('•')) {
    const parts = text.split('•').map(part => part.trim()).filter(part => part.length > 0);
    if (parts.length > 0) {
      const firstPart = parts[0].split('\n')[0].trim();
      return firstPart;
    }
  }
  
  return text.split('\n')[0].trim();
};

const featureCategories = {
  performance: { icon: Activity, color: "bg-blue-500/10 text-blue-600 border-blue-200", label: "Clinical Efficiency" },
  durability: { icon: Shield, color: "bg-slate-500/10 text-slate-600 border-slate-200", label: "Reliability" },
  sustainability: { icon: Heart, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", label: "Patient Care" },
  technology: { icon: Microscope, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200", label: "Advanced Technology" },
  quality: { icon: ClipboardCheck, color: "bg-rose-500/10 text-rose-600 border-rose-200", label: "Certified Quality" },
  value: { icon: Stethoscope, color: "bg-cyan-500/10 text-cyan-600 border-cyan-200", label: "Clinical Value" },
};

const categorizeFeature = (feature: string): keyof typeof featureCategories => {
  const lowerFeature = feature.toLowerCase();
  if (lowerFeature.includes('fast') || lowerFeature.includes('speed') || lowerFeature.includes('quick') || lowerFeature.includes('performance') || lowerFeature.includes('efficient')) {
    return 'performance';
  }
  if (lowerFeature.includes('durable') || lowerFeature.includes('strong') || lowerFeature.includes('robust') || lowerFeature.includes('reliable') || lowerFeature.includes('sturdy')) {
    return 'durability';
  }
  if (lowerFeature.includes('eco') || lowerFeature.includes('green') || lowerFeature.includes('sustainable') || lowerFeature.includes('recyclable') || lowerFeature.includes('environment')) {
    return 'sustainability';
  }
  if (lowerFeature.includes('smart') || lowerFeature.includes('digital') || lowerFeature.includes('tech') || lowerFeature.includes('automated') || lowerFeature.includes('iot')) {
    return 'technology';
  }
  if (lowerFeature.includes('premium') || lowerFeature.includes('quality') || lowerFeature.includes('certified') || lowerFeature.includes('tested') || lowerFeature.includes('approved')) {
    return 'quality';
  }
  return 'value';
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
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [autoOpenDismissed, setAutoOpenDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredFaqs = useMemo(() => {
    if (!product?.faqs || !faqSearchQuery.trim()) return product?.faqs || [];
    const query = faqSearchQuery.toLowerCase();
    return (product.faqs as any[]).filter(
      faq => faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query)
    );
  }, [product?.faqs, faqSearchQuery]);

  const startQuoteSession = async () => {
    if (!product) return;
    
    setIsLoading(true);
    setInitError(null);
    
    try {
      const customerProfile = getCustomerProfile();
      const response = await fetch('/api/quote-requests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          customerProfile: customerProfile || undefined
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
        content: `Hello! I'm Amara from VIA Global Health. Thank you for your interest in the ${product.name}. I'm here to help you find the right solution and get you a custom quote. What brings you to us today?`
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
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && product) {
      trackProductView({ id: product.id, name: product.name, category: product.category });
    }
  }, [isOpen, product?.id]);

  useEffect(() => {
    if (!isOpen || showQuoteDialog || autoOpenDismissed) return;
    const timer = setTimeout(() => {
      if (!showQuoteDialog) {
        setShowQuoteDialog(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen, showQuoteDialog, autoOpenDismissed]);

  const handleCloseQuoteDialogWithDismiss = () => {
    setAutoOpenDismissed(true);
    handleCloseQuoteDialog();
  };

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
      
      if (data.profileUpdate) {
        saveCustomerProfile(data.profileUpdate);
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

  const currentImage = product?.images && product.images.length > 0 
    ? (product.images as string[])[selectedImageIndex] || product?.imageUrl 
    : product?.imageUrl;

  if (!product) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0 flex flex-col">
        {/* Header with Close Button */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/95 backdrop-blur-sm border-b p-4 sm:p-6">
          <button
            onClick={onClose}
            className="mb-4 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm"
            aria-label="Close product details"
            data-testid="button-close-sheet"
          >
            ← Back to catalog
          </button>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
              {product.name}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">SKU: {product.sku}</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-8">
            {/* Image Gallery with Zoom */}
            <div className="space-y-2">
              <div 
                className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted/50 max-h-56 group cursor-zoom-in"
                onMouseEnter={() => setIsImageZoomed(true)}
                onMouseLeave={() => setIsImageZoomed(false)}
                data-testid="product-image-container"
              >
                <motion.img 
                  src={currentImage} 
                  alt={product.name} 
                  className="h-full w-full object-contain bg-white transition-transform duration-300"
                  animate={{ scale: isImageZoomed ? 1.5 : 1 }}
                  data-testid="product-image-main"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <div className="bg-black/70 text-white border-0 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Eye className="h-2.5 w-2.5" />
                    Hover to zoom
                  </div>
                </div>
              </div>
              {product.images && (product.images as string[]).length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  <button 
                    className={`relative h-14 w-14 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 hover:shadow-sm ${selectedImageIndex === -1 ? 'border-primary ring-1 ring-primary/20' : 'border-transparent'}`}
                    onClick={() => setSelectedImageIndex(-1)}
                    data-testid="product-thumbnail-main"
                  >
                    <img src={product.imageUrl} alt="Main view" className="h-full w-full object-cover" />
                  </button>
                  {(product.images as string[]).map((img, idx) => (
                    <button 
                      key={idx}
                      className={`relative h-14 w-14 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 hover:shadow-sm ${selectedImageIndex === idx ? 'border-primary ring-1 ring-primary/20' : 'border-transparent'}`}
                      onClick={() => setSelectedImageIndex(idx)}
                      data-testid={`product-thumbnail-${idx}`}
                    >
                      <img src={img} alt={`Product view ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Info Section with Enhanced Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.keyFeatures && (product.keyFeatures as string[]).length > 0 && (
                <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-3 border">
                  <h3 className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Stethoscope className="h-3 w-3 text-primary" />
                    Key Features
                  </h3>
                  <ul className="space-y-2">
                    {(product.keyFeatures as string[]).slice(0, 4).map((feature, idx) => {
                      const category = categorizeFeature(feature);
                      const CategoryIcon = featureCategories[category].icon;
                      return (
                        <motion.li 
                          key={idx} 
                          className="flex items-start gap-2.5 text-xs"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <span className="text-foreground line-clamp-2">{feature}</span>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {Object.keys(product.specifications).length > 0 && (
                <div className="bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 rounded-xl p-3 border">
                  <h3 className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Settings className="h-3 w-3 text-blue-600" />
                    Quick Specs
                  </h3>
                  <dl className="space-y-2 text-xs">
                    {Object.entries(product.specifications).slice(0, 4).map(([key, value], idx) => {
                      const extractedValue = extractFirstSpecValue(value as string);
                      return (
                        <motion.div 
                          key={key} 
                          className="flex flex-col gap-0.5 p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <dt className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{key}</dt>
                          <dd className="text-foreground font-medium line-clamp-2">
                            {extractedValue || "See full specs"}
                          </dd>
                        </motion.div>
                      );
                    })}
                  </dl>
                </div>
              )}
            </div>

            {/* Tabs for Detailed Info */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto scrollbar-hide">
                <TabsTrigger 
                  value="details" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3 min-h-[44px]"
                >
                  <span className="text-sm">Overview</span>
                </TabsTrigger>
                {Object.keys(product.specifications).length > 0 && (
                  <TabsTrigger 
                    value="specs" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3 min-h-[44px]"
                  >
                    <span className="text-sm">Specs</span>
                  </TabsTrigger>
                )}
                {(product.videoUrl || (product.documents as any[]).length > 0) && (
                  <TabsTrigger 
                    value="media" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3 min-h-[44px]"
                  >
                    <span className="text-sm">Media</span>
                  </TabsTrigger>
                )}
                {product.faqs && (product.faqs as any[]).length > 0 && (
                  <TabsTrigger 
                    value="faqs" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3 min-h-[44px]"
                  >
                    <span className="text-sm">FAQs</span>
                  </TabsTrigger>
                )}
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="details" className="space-y-6 py-6">
                {product.description && (
                  <div className="bg-muted/20 rounded-xl p-5 border">
                    <h3 className="font-semibold mb-3 text-base flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      Clinical Overview
                    </h3>
                    <div className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                      {formatBulletText(product.description)}
                    </div>
                  </div>
                )}
                
                {product.keyFeatures && (product.keyFeatures as string[]).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4 text-base flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Key Specifications
                    </h3>
                    <div className="grid gap-3">
                      {(product.keyFeatures as string[]).map((feature, idx) => {
                        const category = categorizeFeature(feature);
                        const CategoryIcon = featureCategories[category].icon;
                        return (
                          <motion.div 
                            key={idx} 
                            className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
                            whileHover={{ x: 4 }}
                          >
                            <div className="flex-1">
                              <span className="text-sm text-foreground font-medium">{feature}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Specifications Tab */}
              {Object.keys(product.specifications).length > 0 && (
                <TabsContent value="specs" className="py-6">
                  <div className="grid gap-4">
                    {Object.entries(product.specifications).map(([key, value], idx) => (
                      <motion.div 
                        key={key} 
                        className="p-4 rounded-xl border bg-gradient-to-r from-card to-card/50 hover:shadow-md hover:border-primary/30 transition-all duration-200"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                            <Settings className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="font-semibold text-sm text-foreground">{key}</div>
                        </div>
                        <div className="text-sm text-muted-foreground pl-8">
                          {formatBulletText(value as string)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {/* Media & Files Tab */}
              {(product.videoUrl || (product.documents as any[]).length > 0) && (
                <TabsContent value="media" className="space-y-6 py-6">
                  {product.videoUrl && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                        <Play className="h-5 w-5 text-primary" /> Product Video
                      </h3>
                      <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border shadow-lg">
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

                  {product.documents && (product.documents as any[]).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                        <FileText className="h-5 w-5 text-primary" /> Documents
                      </h3>
                      <div className="grid gap-3">
                        {(product.documents as any[]).map((doc, idx) => (
                          <motion.div 
                            key={idx} 
                            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                            whileHover={{ x: 4 }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{doc.name}</div>
                                <div className="text-xs text-muted-foreground">PDF Document</div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" data-testid={`download-document-${idx}`}>
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}

              {/* FAQs Tab with Search */}
              {product.faqs && (product.faqs as any[]).length > 0 && (
                <TabsContent value="faqs" className="py-6">
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search FAQs..." 
                        value={faqSearchQuery}
                        onChange={(e) => setFaqSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-faq-search"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredFaqs.map((faq: any, idx: number) => (
                        <motion.div 
                          key={idx} 
                          className="rounded-xl border bg-card overflow-hidden hover:border-primary/50 transition-colors"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          layout
                        >
                          <button 
                            className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedFaqIndex(expandedFaqIndex === idx ? null : idx)}
                            data-testid={`faq-question-${idx}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <HelpCircle className="h-4 w-4" />
                              </div>
                              <h4 className="font-semibold text-sm leading-snug">{faq.question}</h4>
                            </div>
                            {expandedFaqIndex === idx ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedFaqIndex === idx && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-4 pb-4"
                              >
                                <div className="pl-11 pt-1">
                                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {filteredFaqs.length === 0 && faqSearchQuery && (
                      <div className="text-center py-8 text-muted-foreground">
                        <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No FAQs found matching "{faqSearchQuery}"</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

            </Tabs>
          </div>
        </div>

        {/* Sticky Action Footer with Unified CTA */}
        <div className="sticky bottom-0 p-3 sm:p-6 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t space-y-1.5 sm:space-y-2">
          <Button 
            className="w-full h-12 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="button-request-quote-unified"
            onClick={() => setShowQuoteDialog(true)}
          >
            <Stethoscope className="mr-2 h-5 w-5" />
            Request a Quote & Live Support
            <Shield className="ml-2 h-4 w-4 opacity-80" />
          </Button>
          <p className="text-[10px] sm:text-xs text-center text-muted-foreground flex items-center justify-center gap-2 sm:gap-3">
            <span>Response within 24 hours</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
            <span>No obligation</span>
          </p>
        </div>
      </SheetContent>

      {/* AI Quote Assistant Dialog - Chat with Amara */}
      <Dialog open={showQuoteDialog} onOpenChange={(open) => !open && handleCloseQuoteDialogWithDismiss()}>
        <DialogContent className="w-[95vw] sm:max-w-md h-[85vh] sm:h-[600px] max-h-[600px] flex flex-col p-0 rounded-t-xl sm:rounded-xl">
          <DialogHeader className="p-3 sm:p-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span>Chat with Amara</span>
                  <span className="text-xs font-normal text-muted-foreground">Clinical Procurement Specialist</span>
                </div>
              </DialogTitle>
              {getCustomerProfile() && (
                <button
                  onClick={() => {
                    clearCustomerProfile();
                    handleCloseQuoteDialog();
                    setTimeout(() => setShowQuoteDialog(true), 100);
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded min-h-[44px] flex items-center"
                  data-testid="button-not-you"
                >
                  Not you?
                </button>
              )}
            </div>
            <DialogDescription className="sr-only">AI-powered chat assistant to help you get a custom quote for this product</DialogDescription>
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
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                    data-testid={`chat-message-${msg.role}-${idx}`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2">
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
                        className="p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
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
                <motion.div 
                  className="pt-4 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm">
                    <Check className="h-4 w-4" />
                    Amara has your details - expect a quote within 24 hours
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="p-3 sm:p-4 border-t flex gap-2 bg-muted/30 shrink-0">
            <Input
              placeholder={isConversationComplete ? "Conversation complete" : "Type your message..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading || isConversationComplete}
              className="bg-background h-11 text-base sm:text-sm"
              data-testid="input-chat-message"
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage} 
              disabled={isLoading || !inputValue.trim() || isConversationComplete}
              className="bg-primary hover:bg-primary/90 h-11 w-11 shrink-0"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Support Chat Dialog */}
      <Dialog open={showSupportChat} onOpenChange={setShowSupportChat}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              Live Support
            </DialogTitle>
            <DialogDescription className="sr-only">Contact our support team for product assistance</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Need help with {product.name}?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our support team is available to assist you with any questions.
              </p>
              <div className="space-y-2">
                <Button className="w-full gap-2" variant="outline">
                  <Phone className="h-4 w-4" />
                  Call Us: 1-800-EXAMPLE
                </Button>
                <Button className="w-full gap-2" variant="outline">
                  <Mail className="h-4 w-4" />
                  Email: support@example.com
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
