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
  Microscope, Syringe, Briefcase, Pill, Building2, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useRef, useEffect, useMemo } from "react";
import { trackProductView } from "@/lib/browsingHistory";
import { slugify } from "@/lib/slugify";
import { getCustomerProfile, saveCustomerProfile, clearCustomerProfile } from "@/lib/customerProfile";
import { trackCtaClick, trackQuoteStarted, trackQuoteSubmitted, trackChatMessage } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/LanguageProvider";
import { ChatContactForm } from "@/components/ChatContactForm";
import { getCurrencyForCountry, formatLocalCurrency } from "@/lib/currency";

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
  const { t, language } = useTranslation();
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
  const [contactFormSubmitted, setContactFormSubmitted] = useState(false);
  const [chatStep, setChatStep] = useState<'intro' | 'quantity' | 'details' | 'chat'>('intro');
  const [quantity, setQuantity] = useState<string>('');
  const [priceText, setPriceText] = useState('');
  const [pricingTiers, setPricingTiers] = useState<Array<{ minQuantity: number; maxQuantity: number | null; unitPriceCents: number }>>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const [shippingCountry, setShippingCountry] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const chatProgress = useMemo(() => {
    if (chatStep === 'intro') return { step: 1, label: "Product & pricing", total: 4 };
    if (chatStep === 'quantity') return { step: 2, label: "Order quantity", total: 4 };
    if (chatStep === 'details') return { step: 3, label: "Your details", total: 4 };
    return { step: 4, label: "Finalising your quote", total: 4 };
  }, [chatStep]);

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
          customerProfile: customerProfile || undefined,
          language
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start quote session');
      }
      
      const data = await response.json();
      setQuoteRequestId(data.quoteRequestId);
      setMessages([{ role: 'assistant', content: data.message }]);
      trackQuoteStarted(product.name);
      if (data.priceText) setPriceText(data.priceText);
      if (data.pricingTiers) setPricingTiers(data.pricingTiers);
      setChatStep('intro');
    } catch (error) {
      console.error('Error starting quote session:', error);
      setInitError(t("productDetail.connectionError"));
      setChatStep('intro');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showQuoteDialog && messages.length === 0 && product && !quoteRequestId) {
      startQuoteSession();
    }
  }, [showQuoteDialog, product]);

  useEffect(() => {
    if (product) {
      setMessages([]);
      setQuoteRequestId(null);
      setSpecialPricingEligible(false);
      setRecommendedProducts([]);
      setIsConversationComplete(false);
      setInitError(null);
      setContactFormSubmitted(false);
      setChatStep('intro');
      setQuantity('');
      setPriceText('');
      setPricingTiers([]);
    }
  }, [product?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && product) {
      trackProductView({ id: product.id, name: product.name, category: product.category });
    }
  }, [isOpen, product?.id]);

  useEffect(() => {
    fetch("/api/exchange-rates")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setExchangeRates(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const profile = getCustomerProfile();
    if (profile?.shippingCountry) setShippingCountry(profile.shippingCountry);
  }, [isOpen]);

  const localCurrencyNote = useMemo(() => {
    if (!shippingCountry || !exchangeRates) return null;
    const currency = getCurrencyForCountry(shippingCountry);
    if (!currency || currency.code === "USD") return null;
    const rate = exchangeRates[currency.code];
    if (!rate) return null;
    const qty = parseInt(quantity) || 0;
    const unitPrice = qty > 0 ? getPriceForQuantity(qty) : null;
    if (!unitPrice || qty < 1) return null;
    const totalUsd = qty * unitPrice;
    return formatLocalCurrency(totalUsd, rate, currency) + " at today's rate";
  }, [shippingCountry, exchangeRates, quantity, pricingTiers]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !product || isConversationComplete) return;

    const userInput = inputValue.trim();
    const userMessage: ChatMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    trackChatMessage(messages.length);

    try {
      if (!quoteRequestId) {
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: t("chat.connectionTrouble")
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
            faqs: product.faqs,
            unitsPerPack: product.unitsPerPack,
            packType: product.packType
          },
          language
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
        if (quoteRequestId) trackQuoteSubmitted(quoteRequestId, 1);
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

  const getPriceForQuantity = (qty: number) => {
    if (pricingTiers.length === 0) return null;
    const matchedTier = pricingTiers.find(t => 
      qty >= t.minQuantity && (t.maxQuantity === null || qty <= t.maxQuantity)
    );
    if (matchedTier) return matchedTier.unitPriceCents / 100;
    const lastTier = pricingTiers[pricingTiers.length - 1];
    if (qty > (lastTier.maxQuantity || 0)) return lastTier.unitPriceCents / 100;
    return pricingTiers[0].unitPriceCents / 100;
  };

  const handleQuantityConfirm = () => {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) return;
    const profile = getCustomerProfile();
    const hasCompleteProfile = !!(profile?.firstName && profile?.email && profile?.shippingCountry);
    if (hasCompleteProfile) {
      setContactFormSubmitted(true);
      setChatStep('chat');
      const unitPrice = getPriceForQuantity(qty);
      const priceInfo = unitPrice ? ` (${qty} units at $${unitPrice.toFixed(2)}/unit = $${(qty * unitPrice).toFixed(2)})` : ` (${qty} units)`;
      const quantityMessage = `I'd like to order ${qty} units${priceInfo}`;
      setMessages(prev => [...prev, { role: 'user', content: quantityMessage }]);
      sendQuantityToAI(quantityMessage, { firstName: profile!.firstName!, lastName: profile!.lastName || '', email: profile!.email!, shippingCountry: profile!.shippingCountry! });
    } else {
      setChatStep('details');
    }
  };

  const sendQuantityToAI = async (quantityMessage: string, contactInfo?: { firstName: string; lastName: string; email: string; shippingCountry: string }) => {
    if (!quoteRequestId || !product) return;
    setIsLoading(true);
    try {
      const messageBody: Record<string, unknown> = {
        message: quantityMessage,
        productDetails: {
          name: product.name,
          description: product.description,
          category: product.category,
          specifications: product.specifications,
          faqs: product.faqs,
          unitsPerPack: product.unitsPerPack,
          packType: product.packType
        },
        language
      };
      if (contactInfo) {
        messageBody.contactData = contactInfo;
      }
      const response = await fetch(`/api/quote-requests/${quoteRequestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody)
      });
      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      if (data.specialPricingEligible) setSpecialPricingEligible(true);
      if (data.recommendedProducts?.length > 0) setRecommendedProducts(data.recommendedProducts);
      if (data.profileUpdate) {
        const currentProfile = getCustomerProfile() || {};
        saveCustomerProfile({ ...currentProfile, ...data.profileUpdate });
      }
      if (data.referToAgent) {
        setIsConversationComplete(true);
        trackQuoteSubmitted(quoteRequestId, 1);
      }
    } catch (error) {
      console.error('Error sending quantity:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. You can type your message below to retry, or close and reopen the dialog." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepContactFormSubmit = async (data: { fullName: string; email: string; country: string; firstName: string; lastName: string }) => {
    if (!quoteRequestId || !product) return;
    setContactFormSubmitted(true);
    setChatStep('chat');
    const qty = parseInt(quantity) || 1;
    const unitPrice = getPriceForQuantity(qty);
    const priceInfo = unitPrice ? ` (${qty} units at $${unitPrice.toFixed(2)}/unit = $${(qty * unitPrice).toFixed(2)})` : ` (${qty} units)`;
    const combinedMessage = `I'd like to order ${qty} units${priceInfo}. My details: ${data.fullName}, ${data.email}, shipping to ${data.country}`;
    setMessages(prev => [...prev, { role: 'user', content: combinedMessage }]);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/quote-requests/${quoteRequestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: combinedMessage,
          contactData: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            shippingCountry: data.country
          },
          productDetails: {
            name: product.name,
            description: product.description,
            category: product.category,
            specifications: product.specifications,
            faqs: product.faqs,
            unitsPerPack: product.unitsPerPack,
            packType: product.packType
          },
          language
        })
      });
      if (!response.ok) throw new Error('Failed to send message');
      const responseData = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: responseData.message }]);
      if (responseData.specialPricingEligible) setSpecialPricingEligible(true);
      if (responseData.recommendedProducts?.length > 0) setRecommendedProducts(responseData.recommendedProducts);
      const currentProfile = getCustomerProfile() || {};
      saveCustomerProfile({ ...currentProfile, firstName: data.firstName, lastName: data.lastName, email: data.email, shippingCountry: data.country });
      setShippingCountry(data.country);
      if (responseData.referToAgent) {
        setIsConversationComplete(true);
        trackQuoteSubmitted(quoteRequestId, 1);
      }
    } catch (error) {
      console.error('Error submitting step contact form:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. You can type your message below to retry, or close and reopen the dialog." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseQuoteDialog = () => {
    setShowQuoteDialog(false);
  };

  const handleResetQuoteDialog = () => {
    setShowQuoteDialog(false);
    setMessages([]);
    setInputValue('');
    setQuoteRequestId(null);
    setSpecialPricingEligible(false);
    setRecommendedProducts([]);
    setIsConversationComplete(false);
    setInitError(null);
    setChatStep('intro');
    setQuantity('');
    setPriceText('');
    setPricingTiers([]);
    setContactFormSubmitted(false);
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
            {t("productDetail.backToCatalog")}
          </button>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
              {product.name}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">SKU: {product.sku}</p>
            {product.unitsPerPack && product.packType && (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold" data-testid="product-pack-info">
                  <Package className="h-3 w-3" />
                  Sold in {product.packType}s of {product.unitsPerPack} units
                </span>
              </div>
            )}
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
                    {t("productDetail.hoverToZoom")}
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
                    {t("productDetail.keyFeatures")}
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
                    {t("productDetail.quickSpecs")}
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
                            {extractedValue || t("productDetail.seeFullSpecs")}
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
                  <span className="text-sm">{t("productDetail.overview")}</span>
                </TabsTrigger>
                {Object.keys(product.specifications).length > 0 && (
                  <TabsTrigger 
                    value="specs" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3 min-h-[44px]"
                  >
                    <span className="text-sm">{t("productDetail.specs")}</span>
                  </TabsTrigger>
                )}
                {(product.videoUrl || (product.videos as any[] || []).length > 0 || (product.documents as any[]).length > 0 || (product.regulatoryCertificates as any[] || []).length > 0) && (
                  <TabsTrigger 
                    value="media" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3 min-h-[44px]"
                  >
                    <span className="text-sm">{t("productDetail.media")}</span>
                  </TabsTrigger>
                )}
                {product.faqs && (product.faqs as any[]).length > 0 && (
                  <TabsTrigger 
                    value="faqs" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3 min-h-[44px]"
                  >
                    <span className="text-sm">{t("productDetail.faqs")}</span>
                  </TabsTrigger>
                )}
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="details" className="space-y-6 py-6">
                {product.description && (
                  <div className="bg-muted/20 rounded-xl p-5 border">
                    <h3 className="font-semibold mb-3 text-base flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      {t("productDetail.clinicalOverview")}
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
                      {t("productDetail.keySpecifications")}
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
              {(product.videoUrl || (product.videos as any[] || []).length > 0 || (product.documents as any[]).length > 0 || (product.regulatoryCertificates as any[] || []).length > 0) && (
                <TabsContent value="media" className="space-y-6 py-6">
                  {(product.videos as any[] || []).length > 0 ? (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                        <Play className="h-5 w-5 text-primary" /> {t("productDetail.productVideo")}
                      </h3>
                      <div className="grid gap-4">
                        {(product.videos as any[]).map((video: any, idx: number) => (
                          <div key={idx} className="space-y-2">
                            <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border shadow-lg">
                              <iframe 
                                width="100%" 
                                height="100%" 
                                src={video.url} 
                                title={video.title || `Video ${idx + 1}`}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                data-testid={`product-video-${idx}`}
                              ></iframe>
                            </div>
                            {video.title && (
                              <p className="text-sm text-muted-foreground font-medium">{video.title}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : product.videoUrl ? (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                        <Play className="h-5 w-5 text-primary" /> {t("productDetail.productVideo")}
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
                  ) : null}

                  {product.documents && (product.documents as any[]).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                        <FileText className="h-5 w-5 text-primary" /> {t("productDetail.documents")}
                      </h3>
                      <div className="grid gap-3">
                        {(product.documents as any[]).map((doc, idx) => (
                          <motion.div 
                            key={idx} 
                            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                            whileHover={{ x: 4 }}
                          >
                            <div className="flex items-center gap-3">
                              {doc.thumbnailUrl ? (
                                <img src={doc.thumbnailUrl} alt={doc.name} className="h-12 w-12 rounded-xl object-cover border" />
                              ) : (
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary">
                                  <FileText className="h-6 w-6" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-sm">{doc.name}</div>
                                <div className="text-xs text-muted-foreground">PDF Document</div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" data-testid={`download-document-${idx}`}>
                              <Download className="h-4 w-4" />
                              {t("productDetail.downloadDocument")}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.regulatoryCertificates && (product.regulatoryCertificates as any[]).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                        <Award className="h-5 w-5 text-primary" /> {t("productDetail.regulatoryCertificates")}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(product.regulatoryCertificates as any[]).map((cert: any, idx: number) => {
                          const certContent = (
                            <>
                              {cert.thumbnailUrl ? (
                                <img src={cert.thumbnailUrl} alt={cert.name} className="h-20 w-20 object-contain" />
                              ) : (
                                <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                                  <Award className="h-10 w-10 text-green-600" />
                                </div>
                              )}
                              <span className="text-sm font-medium">{cert.name}</span>
                            </>
                          );
                          return cert.url ? (
                            <a
                              key={idx}
                              href={cert.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 text-center"
                              data-testid={`certificate-${idx}`}
                            >
                              {certContent}
                            </a>
                          ) : (
                            <div
                              key={idx}
                              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card text-center"
                              data-testid={`certificate-${idx}`}
                            >
                              {certContent}
                            </div>
                          );
                        })}
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
                        placeholder={t("productDetail.searchFaqs")} 
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
            className="w-full h-12 sm:h-12 text-sm sm:text-base font-semibold bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
            data-testid="button-request-quote-unified"
            onClick={() => { trackCtaClick("product_detail", product?.name); setShowQuoteDialog(true); }}
          >
            <Stethoscope className="mr-2 h-5 w-5" />
            Check Bulk Pricing & Availability
          </Button>
          <p className="text-[11px] sm:text-xs text-center text-muted-foreground">
            Join 500+ global clinics sourcing through VIA. Response time &lt; 2 mins.
          </p>
        </div>
      </SheetContent>

      {/* AI Quote Assistant Dialog - Chat with Amara */}
      <Dialog open={showQuoteDialog} onOpenChange={(open) => !open && setShowQuoteDialog(false)}>
        <DialogContent className="w-[95vw] sm:max-w-lg h-[90vh] sm:h-[80vh] max-h-[800px] flex flex-col p-0 rounded-t-xl sm:rounded-xl">
          <DialogHeader className="p-3 sm:p-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span>{t("productDetail.chatTitle")}</span>
                  <span className="text-xs font-normal text-muted-foreground">Clinical Procurement Specialist</span>
                </div>
              </DialogTitle>
              {getCustomerProfile() && (
                <button
                  onClick={() => {
                    clearCustomerProfile();
                    handleResetQuoteDialog();
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
            <div className="mt-2 pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground">{chatProgress.label}</span>
                <span className="text-[10px] text-muted-foreground">Step {chatProgress.step} of {chatProgress.total}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(chatProgress.step / chatProgress.total) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </DialogHeader>

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

          {/* STEPWISE FLOW: Steps 1-3 are structured UI, Step 4 is open chat */}
          {chatStep === 'intro' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col justify-center items-center text-center space-y-4 px-2"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Hi! I'm Amara from VIA Global Health</p>
                  <h3 className="text-lg font-bold text-foreground" data-testid="step-product-name">{product.name}</h3>
                </div>
                {priceText ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 w-full max-w-xs" data-testid="step-price-display">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Starting price</p>
                    <p className="text-2xl font-bold text-primary">{priceText.split(' ')[0]}</p>
                    <p className="text-xs text-muted-foreground">{priceText.split(' ').slice(1).join(' ')}</p>
                    {pricingTiers.length > 1 && (
                      <p className="text-xs text-primary/70 mt-1">Volume discounts available</p>
                    )}
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading pricing...
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Contact us for pricing details</p>
                )}
                <Button
                  onClick={() => setChatStep('quantity')}
                  disabled={isLoading}
                  className="w-full max-w-xs h-11 text-sm font-semibold"
                  data-testid="button-step-continue-to-quantity"
                >
                  Get a Quote
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            </div>
          )}

          {chatStep === 'quantity' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col justify-center items-center space-y-4 px-2"
              >
                <div>
                  <h3 className="text-base font-semibold text-center mb-1">How many units do you need?</h3>
                  {product.unitsPerPack && product.packType && (
                    <p className="text-xs text-muted-foreground text-center">
                      Sold in {product.packType}s of {product.unitsPerPack} units
                    </p>
                  )}
                </div>
                <div className="w-full max-w-xs">
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuantityConfirm()}
                    placeholder="Enter quantity"
                    className="h-12 text-center text-lg font-semibold"
                    data-testid="input-step-quantity"
                    autoFocus
                  />
                </div>
                {quantity && parseInt(quantity) > 0 && pricingTiers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-muted/50 border rounded-xl p-3 w-full max-w-xs text-center"
                    data-testid="step-quantity-price-summary"
                  >
                    {(() => {
                      const qty = parseInt(quantity);
                      const unitPrice = getPriceForQuantity(qty);
                      if (!unitPrice) return null;
                      return (
                        <>
                          <p className="text-xs text-muted-foreground">Estimated total</p>
                          <p className="text-xl font-bold text-foreground">${(qty * unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-muted-foreground">${unitPrice.toFixed(2)} per unit x {qty} units</p>
                          {localCurrencyNote && (
                            <p className="text-[10px] text-muted-foreground/70 mt-1 italic" data-testid="text-local-currency-note">{localCurrencyNote}</p>
                          )}
                        </>
                      );
                    })()}
                  </motion.div>
                )}
                {pricingTiers.length > 1 && (
                  <div className="w-full max-w-xs">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 text-center">Volume pricing</p>
                    <div className="space-y-1">
                      {pricingTiers.map((tier, idx) => {
                        const qty = parseInt(quantity) || 0;
                        const isActive = qty >= tier.minQuantity && (tier.maxQuantity === null || qty <= tier.maxQuantity);
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg transition-colors ${
                              isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                            }`}
                            data-testid={`pricing-tier-${idx}`}
                          >
                            <span>
                              {tier.minQuantity}{tier.maxQuantity ? `-${tier.maxQuantity}` : '+'} units
                            </span>
                            <span>${(tier.unitPriceCents / 100).toFixed(2)}/unit</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 w-full max-w-xs">
                  <Button
                    variant="outline"
                    onClick={() => setChatStep('intro')}
                    className="h-11 px-4"
                    data-testid="button-step-back-to-intro"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleQuantityConfirm}
                    disabled={!quantity || parseInt(quantity) < 1}
                    className="flex-1 h-11 text-sm font-semibold"
                    data-testid="button-step-confirm-quantity"
                  >
                    Continue
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {chatStep === 'details' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col justify-center items-center space-y-4 px-2"
              >
                <div className="text-center mb-2">
                  <h3 className="text-base font-semibold mb-1">Almost there!</h3>
                  <p className="text-xs text-muted-foreground">
                    Fill in your details so I can calculate shipping and finalise your quote.
                  </p>
                </div>
                <div className="w-full flex justify-center">
                  <ChatContactForm
                    onSubmit={handleStepContactFormSubmit}
                    isLoading={isLoading}
                    defaultValues={{
                      fullName: (() => {
                        const p = getCustomerProfile();
                        return p?.firstName ? `${p.firstName}${p.lastName ? ' ' + p.lastName : ''}` : '';
                      })(),
                      email: getCustomerProfile()?.email || '',
                      country: getCustomerProfile()?.shippingCountry || ''
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatStep('quantity')}
                  className="text-xs text-muted-foreground"
                  data-testid="button-step-back-to-quantity"
                >
                  Back to quantity
                </Button>
              </motion.div>
            </div>
          )}

          {chatStep === 'chat' && (
            <>
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
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground whitespace-pre-line'
                            : 'bg-muted chat-markdown'
                        }`}
                        data-testid={`chat-message-${msg.role}-${idx}`}
                      >
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        ) : (
                          msg.content
                        )}
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

                  {recommendedProducts.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">You might also be interested in:</p>
                      <div className="space-y-2">
                        {recommendedProducts.map((prod) => (
                          <a 
                            key={prod.id}
                            href={`/products/${slugify(prod.name)}`}
                            className="block p-3 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors cursor-pointer group"
                            data-testid={`recommended-product-${prod.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium group-hover:text-primary transition-colors">{prod.name}</p>
                                <p className="text-xs text-muted-foreground">{prod.sku}</p>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

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
                  placeholder={isConversationComplete ? "Conversation complete" : t("productDetail.typeMessage")}
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
            </>
          )}
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
