import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  FileText, Play, Download, HelpCircle, Check, Send, Loader2, Star, AlertCircle,
  Shield, Settings, Package, Activity, Heart,
  ChevronDown, ChevronUp, Search, Eye, Sparkles,
  Stethoscope, ClipboardCheck,
  Microscope, ExternalLink, Headphones, Mail,
  MapPin, Calendar, Award, Box, Quote, BookOpen, Link2, Tag, AlertTriangle, Truck
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useRef, useEffect, useMemo } from "react";
import { trackProductView } from "@/lib/browsingHistory";
import { slugify } from "@/lib/slugify";
import { getCustomerProfile, saveCustomerProfile, clearCustomerProfile } from "@/lib/customerProfile";
import {
  trackCtaClick,
  trackQuoteStarted,
  trackQuoteSubmitted,
  trackChatMessage,
  trackQuoteFormStep1View,
  trackQuoteFormStep2View,
  trackQuoteFormStep2Complete,
  trackQuoteFormStep3View,
  trackQuoteFormStep3FieldStart,
  trackQuoteFormAbandoned,
  captureUtmParams,
  initRemarketingTracking,
} from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/LanguageProvider";
import { ChatContactForm } from "@/components/ChatContactForm";
import { getCurrencyForCountry, formatLocalCurrency } from "@/lib/currency";

interface ProductContentProps {
  product: Product;
  relatedProducts?: Product[];
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

function SectionHeading({ icon: Icon, children, id }: { icon: React.ElementType; children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5 mb-4 pt-2" data-testid={`section-heading-${id}`}>
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      {children}
    </h2>
  );
}

export function ProductContent({ product, relatedProducts }: ProductContentProps) {
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
  const [desktopCtaVisible, setDesktopCtaVisible] = useState(true);
  const desktopCtaRef = useRef<HTMLDivElement>(null);
  const [mobileStickyVisible, setMobileStickyVisible] = useState(false);
  const [stickyBasePrice, setStickyBasePrice] = useState<string>('');
  const [contactFormSubmitted, setContactFormSubmitted] = useState(false);
  const [chatStep, setChatStep] = useState<'intro' | 'org_type' | 'details' | 'quantity' | 'chat'>('intro');
  const [selectedOrgType, setSelectedOrgType] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [priceText, setPriceText] = useState('');
  const [lowestTierPrice, setLowestTierPrice] = useState('');
  const [pricingTiers, setPricingTiers] = useState<Array<{ minQuantity: number; maxQuantity: number | null; unitPriceCents: number }>>([]);
  const [pricingRestricted, setPricingRestricted] = useState(product.pricingRestricted ?? false);
  const [purchasingInfoOpen, setPurchasingInfoOpen] = useState(false);
  const [shippingCountry, setShippingCountry] = useState<string>('');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const chatProgress = useMemo(() => {
    if (chatStep === 'intro') return { step: 1, label: "Product & pricing", total: 4 };
    if (chatStep === 'org_type') return { step: 2, label: "Organisation type", total: 4 };
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

  const salesRestrictions = product.salesRestrictions as { cantShipTo?: string[]; cantSellTo?: string[] } | null;
  const hasSalesRestrictions = salesRestrictions && ((salesRestrictions.cantShipTo?.length || 0) > 0 || (salesRestrictions.cantSellTo?.length || 0) > 0);
  const hasPurchasingInfo = hasSalesRestrictions || product.leadTimeDays || (product.shippingLengthCm && product.shippingWidthCm);

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
      if (!response.ok) throw new Error('Failed to start quote session');
      const data = await response.json();
      setQuoteRequestId(data.quoteRequestId);
      setMessages([{ role: 'assistant', content: data.message }]);
      if (data.pricingRestricted) {
        setPricingRestricted(true);
      } else {
        if (data.priceText) setPriceText(data.priceText);
        if (data.lowestTierPrice) setLowestTierPrice(data.lowestTierPrice);
        if (data.pricingTiers) setPricingTiers(data.pricingTiers);
      }
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
    fetch("/api/exchange-rates")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setExchangeRates(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const profile = getCustomerProfile();
    if (profile?.shippingCountry) setShippingCountry(profile.shippingCountry);
  }, [showQuoteDialog]);

  useEffect(() => {
    if (!showQuoteDialog) return;
    if (chatStep === 'intro') {
      trackQuoteFormStep1View(product.name, product.sku || undefined, priceText || undefined);
    } else if (chatStep === 'org_type') {
      trackQuoteFormStep2View(product.name);
    } else if (chatStep === 'details') {
      trackQuoteFormStep3View(product.name, selectedOrgType);
    }
  }, [chatStep, showQuoteDialog]);

  useEffect(() => {
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
    setLowestTierPrice('');
    setPricingTiers([]);
    setPricingRestricted(product?.pricingRestricted ?? false);
    setSelectedOrgType('');
  }, [product?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    trackProductView({ id: product.id, name: product.name, category: product.category });
  }, [product?.id]);

  useEffect(() => {
    const el = desktopCtaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setDesktopCtaVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const SCROLL_THRESHOLD = 280;
    const onScroll = () => setMobileStickyVisible(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    captureUtmParams();
    return initRemarketingTracking();
  }, []);

  useEffect(() => {
    if (!product?.id || product.pricingRestricted) return;
    fetch(`/api/products/${product.id}/pricing-tiers`)
      .then(r => r.ok ? r.json() : [])
      .then((tiers: Array<{ minQuantity: number; maxQuantity: number | null; unitPriceCents: number }>) => {
        if (tiers.length > 0) {
          const lowestCents = Math.min(...tiers.map(t => t.unitPriceCents));
          setStickyBasePrice("$" + (lowestCents / 100).toFixed(2));
        }
      })
      .catch(() => {});
  }, [product?.id]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !product || isConversationComplete) return;
    const userInput = inputValue.trim();
    const userMessage: ChatMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    const userMessageCount = messages.filter(m => m.role === 'user').length + 1;
    trackChatMessage(userMessageCount);
    try {
      if (!quoteRequestId) {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: t("chat.connectionTrouble") }]);
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
            name: product.name, description: product.description, category: product.category,
            specifications: product.specifications, faqs: product.faqs,
            unitsPerPack: product.unitsPerPack, packType: product.packType
          },
          language
        })
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
        if (quoteRequestId) trackQuoteSubmitted(quoteRequestId, 1);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I apologize, but I'm having trouble responding. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriceForQuantity = (qty: number) => {
    if (pricingTiers.length === 0) return null;
    const matchedTier = pricingTiers.find(t => qty >= t.minQuantity && (t.maxQuantity === null || qty <= t.maxQuantity));
    if (matchedTier) return matchedTier.unitPriceCents / 100;
    const lastTier = pricingTiers[pricingTiers.length - 1];
    if (qty > (lastTier.maxQuantity || 0)) return lastTier.unitPriceCents / 100;
    return pricingTiers[0].unitPriceCents / 100;
  };

  const localCurrencyNote = useMemo(() => {
    if (!shippingCountry || !exchangeRates) return null;
    const currency = getCurrencyForCountry(shippingCountry);
    if (!currency || currency.code === "USD") return null;
    const rate = exchangeRates[currency.code];
    if (!rate) return null;
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant) return null;
    const totalMatch = lastAssistant.content.match(/\*\*\$([0-9,]+\.?\d*)\*\*/g);
    if (!totalMatch || totalMatch.length === 0) return null;
    const lastBoldAmount = totalMatch[totalMatch.length - 1];
    const usdValue = parseFloat(lastBoldAmount.replace(/\*\*/g, '').replace('$', '').replace(/,/g, ''));
    if (!usdValue || isNaN(usdValue)) return null;
    return formatLocalCurrency(usdValue, rate, currency) + " at today's rate";
  }, [shippingCountry, exchangeRates, messages]);

  const formatAiResponse = (content: string) => {
    return content.replace(/\. (?=(Shipping to|Based on|To ensure|For \d|What type|Could you|Would you|May I|This estimate|Your estimated|Our team|We offer|As an? |Here'?s|Let me|Delivery to|When would))/g, '.\n\n');
  };

  const fetchOrgPricing = async (organizationType: string) => {
    if (!quoteRequestId) return;
    try {
      const res = await fetch(`/api/quote-requests/${quoteRequestId}/pricing?organizationType=${encodeURIComponent(organizationType)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.pricingRestricted) {
        setPricingRestricted(true);
        return;
      }
      if (data.pricingTiers) setPricingTiers(data.pricingTiers);
      if (data.lowestTierPrice) setLowestTierPrice(data.lowestTierPrice);
    } catch (e) {
      console.error("Error fetching org-specific pricing:", e);
    }
  };

  const handleQuantityConfirm = () => {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) return;
    const profile = getCustomerProfile();
    if (!profile?.firstName || !profile?.email || !profile?.shippingCountry || !profile?.organizationType) {
      setChatStep('details');
      return;
    }
    setChatStep('chat');
    const unitPrice = getPriceForQuantity(qty);
    const priceInfo = unitPrice ? ` (${qty} units at $${unitPrice.toFixed(2)}/unit = $${(qty * unitPrice).toFixed(2)})` : ` (${qty} units)`;
    const quantityMessage = `I'd like to order ${qty} units${priceInfo}`;
    setMessages(prev => [...prev,
      { role: 'user', content: quantityMessage },
      { role: 'assistant', content: `One moment while I pull up the latest shipping rates for ${profile.shippingCountry}...` }
    ]);
    sendQuantityToAI(quantityMessage, { firstName: profile.firstName!, lastName: profile.lastName || '', email: profile.email!, shippingCountry: profile.shippingCountry!, organizationType: profile.organizationType! });
  };

  const sendQuantityToAI = async (quantityMessage: string, contactInfo?: { firstName: string; lastName: string; email: string; shippingCountry: string; organizationType?: string }) => {
    if (!quoteRequestId || !product) return;
    setIsLoading(true);
    const interimStart = Date.now();
    try {
      const messageBody: Record<string, unknown> = {
        message: quantityMessage,
        productDetails: {
          name: product.name, description: product.description, category: product.category,
          specifications: product.specifications, faqs: product.faqs,
          unitsPerPack: product.unitsPerPack, packType: product.packType
        },
        language
      };
      if (contactInfo) messageBody.contactData = { ...contactInfo, orderQuantity: parseInt(quantity) || 1 };
      else messageBody.contactData = { orderQuantity: parseInt(quantity) || 1 };
      const response = await fetch(`/api/quote-requests/${quoteRequestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody)
      });
      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();
      const elapsed = Date.now() - interimStart;
      const minDisplay = 1500;
      if (elapsed < minDisplay) await new Promise(r => setTimeout(r, minDisplay - elapsed));
      setMessages(prev => {
        const withoutInterim = prev.filter(m => !m.content.startsWith('One moment while I pull up'));
        return [...withoutInterim, { role: 'assistant' as const, content: data.message }];
      });
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
      setMessages(prev => {
        const withoutInterim = prev.filter(m => !m.content.startsWith('One moment while I pull up'));
        return [...withoutInterim, { role: 'assistant' as const, content: "I'm having trouble connecting. You can type your message below to retry, or close and reopen the dialog." }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepContactFormSubmit = async (data: { fullName: string; email: string; country: string; firstName: string; lastName: string; organizationType: string }) => {
    if (!quoteRequestId || !product) return;
    setContactFormSubmitted(true);
    setShippingCountry(data.country);
    const currentProfile = getCustomerProfile() || {};
    saveCustomerProfile({ ...currentProfile, firstName: data.firstName, lastName: data.lastName, email: data.email, shippingCountry: data.country, organizationType: data.organizationType });
    trackQuoteSubmitted(quoteRequestId, 1);
    await fetchOrgPricing(data.organizationType);
    setChatStep('quantity');
  };

  const fireAbandonEvent = () => {
    const stepMap: Record<string, 1 | 2 | 3 | null> = {
      intro: 1,
      org_type: 2,
      details: 3,
      quantity: null,
      chat: null,
    };
    const stepNum = stepMap[chatStep];
    if (stepNum !== null) {
      trackQuoteFormAbandoned(product.name, stepNum, selectedOrgType || undefined);
    }
  };

  const handleCloseQuoteDialog = () => {
    fireAbandonEvent();
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
    setLowestTierPrice('');
    setPricingTiers([]);
    setPricingRestricted(false);
    setContactFormSubmitted(false);
    setSelectedOrgType('');
  };

  const currentImage = product?.images && product.images.length > 0
    ? (product.images as string[])[selectedImageIndex] || product?.imageUrl
    : product?.imageUrl;

  const videos = (product.videos as { title: string; url: string }[] | null) || [];
  const documents = (product.documents as { name: string; url: string; thumbnailUrl?: string }[] | null) || [];
  const regulatoryCertificates = (product.regulatoryCertificates as { name: string; url: string; thumbnailUrl?: string }[] | null) || [];
  const testimonials = (product.testimonials as { quote: string; author: string; organization: string }[] | null) || [];
  const studiesAndTrials = (product.studiesAndTrials as { title: string; url: string }[] | null) || [];
  const standardAccessories = (product.standardAccessories as string[] | null) || [];
  const optionalAccessories = (product.optionalAccessories as { name: string; productUrl?: string }[] | null) || [];
  const boxContents = (product.boxContents as string[] | null) || [];
  const tags = (product.tags as string[] | null) || [];

  return (
    <>
      <div className="container mx-auto px-4 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column: Images */}
          <div className="space-y-3">
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted/50 group cursor-zoom-in"
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
                fetchPriority="high"
                decoding="sync"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <div className="bg-black/70 text-white border-0 text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {t("productDetail.hoverToZoom")}
                </div>
              </div>
            </div>
            {product.images && (product.images as string[]).length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 hover:shadow-sm ${selectedImageIndex === -1 ? 'border-primary ring-1 ring-primary/20' : 'border-transparent'}`}
                  onClick={() => setSelectedImageIndex(-1)}
                  data-testid="product-thumbnail-main"
                >
                  <img src={product.imageUrl} alt="Main view" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </button>
                {(product.images as string[]).map((img, idx) => (
                  <button
                    key={idx}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 hover:shadow-sm ${selectedImageIndex === idx ? 'border-primary ring-1 ring-primary/20' : 'border-transparent'}`}
                    onClick={() => setSelectedImageIndex(idx)}
                    data-testid={`product-thumbnail-${idx}`}
                  >
                    <img src={img} alt={`Product view ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}

            {/* Desktop CTA */}
            <div ref={desktopCtaRef} className="hidden lg:block pt-4">
              <Button
                className="w-full h-14 text-base font-semibold bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                data-testid="button-request-quote-unified"
                onClick={() => { trackCtaClick("product_detail", product?.name); setShowQuoteDialog(true); }}
              >
                <Stethoscope className="mr-2 h-5 w-5" />
                Check Bulk Pricing & Availability
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Join 500+ global clinics sourcing through VIA. Response time &lt; 2 mins.
              </p>
            </div>
          </div>

          {/* Right Column: Product Info */}
          <div className="space-y-6">
            {/* Title & SKU */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-foreground" data-testid="text-product-name">
                {product.name}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">SKU: {product.sku}</p>
              {product.unitsPerPack && product.packType && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold" data-testid="product-pack-info">
                    <Package className="h-3 w-3" />
                    Sold in {product.packType}s of {product.unitsPerPack} units
                  </span>
                </div>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px]" data-testid={`tag-${idx}`}>
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Seller / Manufacturer Info Card */}
            {(product.sellerName || product.regulatoryApproval || product.warrantyTerm) && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-800/20 rounded-xl p-4 border space-y-3" data-testid="seller-info-card">
                <h3 className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Shield className="h-3 w-3 text-primary" />
                  Manufacturer Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {product.sellerName && (
                    <div>
                      <span className="text-muted-foreground text-xs">Manufacturer</span>
                      <p className="font-medium">{product.sellerName}</p>
                    </div>
                  )}
                  {product.sellerLocation && (
                    <div>
                      <span className="text-muted-foreground text-xs flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />Location</span>
                      <p className="font-medium">{product.sellerLocation}</p>
                    </div>
                  )}
                  {product.regulatoryApproval && (
                    <div>
                      <span className="text-muted-foreground text-xs flex items-center gap-1"><Award className="h-2.5 w-2.5" />Regulatory</span>
                      <p className="font-medium">{product.regulatoryApproval}</p>
                    </div>
                  )}
                  {product.warrantyTerm && (
                    <div>
                      <span className="text-muted-foreground text-xs flex items-center gap-1"><Shield className="h-2.5 w-2.5" />Warranty</span>
                      <p className="font-medium">{product.warrantyTerm}</p>
                    </div>
                  )}
                  {product.minimumOrderQuantity && (
                    <div>
                      <span className="text-muted-foreground text-xs">MOQ</span>
                      <p className="font-medium">{product.minimumOrderQuantity} {product.minimumOrderQuantity === 1 ? 'unit' : 'units'}</p>
                    </div>
                  )}
                  {product.estimatedLifespan && (
                    <div>
                      <span className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />Lifespan</span>
                      <p className="font-medium">{product.estimatedLifespan}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div data-testid="product-description">
                <SectionHeading icon={ClipboardCheck} id="description">
                  {t("productDetail.clinicalOverview")}
                </SectionHeading>
                <div className="text-muted-foreground leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {product.description}
                </div>
                {product.buyersGuideUrl && (
                  <a
                    href={product.buyersGuideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
                    data-testid="link-buyers-guide"
                  >
                    <BookOpen className="h-4 w-4" />
                    Read the Buyer's Guide
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Important Purchasing Information */}
            {hasPurchasingInfo && (
              <div className="border rounded-xl overflow-hidden" data-testid="purchasing-info">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  onClick={() => setPurchasingInfoOpen(!purchasingInfoOpen)}
                  data-testid="button-toggle-purchasing-info"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="font-semibold text-sm">Important Purchasing Information</span>
                  </div>
                  {purchasingInfoOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {purchasingInfoOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t"
                    >
                      <div className="p-4 space-y-4 text-sm">
                        {hasSalesRestrictions && (
                          <div className="space-y-2">
                            {salesRestrictions!.cantShipTo && salesRestrictions!.cantShipTo.length > 0 && (
                              <div className="flex items-start gap-2">
                                <Truck className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-medium text-red-600">Unable to ship to: </span>
                                  <span className="text-muted-foreground">{salesRestrictions!.cantShipTo.join(', ')}</span>
                                </div>
                              </div>
                            )}
                            {salesRestrictions!.cantSellTo && salesRestrictions!.cantSellTo.length > 0 && (
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-medium text-red-600">Unable to sell to: </span>
                                  <span className="text-muted-foreground">{salesRestrictions!.cantSellTo.join(', ')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {product.leadTimeDays && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                            <span><span className="font-medium">Lead time:</span> {product.leadTimeDays} days</span>
                          </div>
                        )}
                        {product.shippingLengthCm && product.shippingWidthCm && product.shippingDepthCm && (
                          <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span><span className="font-medium">Shipping dimensions:</span> {product.shippingLengthCm} × {product.shippingWidthCm} × {product.shippingDepthCm} cm</span>
                          </div>
                        )}
                        {product.shippingWeightKg && (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span><span className="font-medium">Shipping weight:</span> {product.shippingWeightKg} kg</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Full-Width Content Sections Below the 2-Column Grid */}
        <div className="mt-10 max-w-4xl mx-auto space-y-10">

          {/* Key Features */}
          {product.keyFeatures && (product.keyFeatures as string[]).length > 0 && (
            <section data-testid="section-key-features">
              <SectionHeading icon={Activity} id="key-features">
                {t("productDetail.keyFeatures")}
              </SectionHeading>
              <div className="grid gap-3 sm:grid-cols-2">
                {(product.keyFeatures as string[]).map((feature, idx) => {
                  const dashIdx = feature.indexOf(' - ');
                  const title = dashIdx > -1 ? feature.substring(0, dashIdx) : feature;
                  const desc = dashIdx > -1 ? feature.substring(dashIdx + 3) : '';
                  return (
                    <motion.div
                      key={idx}
                      className="p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      data-testid={`feature-${idx}`}
                    >
                      <div className="font-semibold text-sm text-foreground mb-1">{title}</div>
                      {desc && <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Specifications */}
          {Object.keys(product.specifications || {}).length > 0 && (
            <section data-testid="section-specifications">
              <SectionHeading icon={Settings} id="specifications">
                {t("productDetail.specs")}
              </SectionHeading>
              <div className="grid gap-4">
                {Object.entries(product.specifications).map(([key, value], idx) => (
                  <motion.div
                    key={key}
                    className="p-4 rounded-xl border bg-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="font-semibold text-sm text-foreground mb-2">{key}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatBulletText(value as string)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Standard Accessories */}
          {standardAccessories.length > 0 && (
            <section data-testid="section-standard-accessories">
              <SectionHeading icon={Check} id="standard-accessories">
                Standard Accessories
              </SectionHeading>
              <ul className="grid gap-2 sm:grid-cols-2">
                {standardAccessories.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-3 rounded-lg border bg-card text-sm" data-testid={`accessory-${idx}`}>
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Optional Accessories */}
          {optionalAccessories.length > 0 && (
            <section data-testid="section-optional-accessories">
              <SectionHeading icon={Sparkles} id="optional-accessories">
                Optional Accessories & Add-ons
              </SectionHeading>
              <ul className="grid gap-2 sm:grid-cols-2">
                {optionalAccessories.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-3 rounded-lg border bg-card text-sm" data-testid={`optional-accessory-${idx}`}>
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {item.productUrl ? (
                      <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {item.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span>{item.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Product Documents */}
          {documents.length > 0 && (
            <section data-testid="section-documents">
              <SectionHeading icon={FileText} id="documents">
                {t("productDetail.documents")}
              </SectionHeading>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                    data-testid={`document-${idx}`}
                  >
                    {(doc as any).thumbnailUrl ? (
                      <img src={(doc as any).thumbnailUrl} alt={doc.name} className="h-14 w-10 object-cover rounded border" loading="lazy" decoding="async" />
                    ) : (
                      <div className="h-14 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">PDF Document</div>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Regulatory Certificates */}
          {regulatoryCertificates.length > 0 && (
            <section data-testid="section-certificates">
              <SectionHeading icon={Award} id="certificates">
                Regulatory Certificates
              </SectionHeading>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {regulatoryCertificates.map((cert, idx) => {
                  const hasUrl = !!cert.url;
                  const content = (
                    <>
                      {cert.thumbnailUrl ? (
                        <img src={cert.thumbnailUrl} alt={cert.name} className="h-14 w-14 object-contain rounded border" loading="lazy" decoding="async" />
                      ) : (
                        <div className="h-14 w-10 rounded bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
                          <Award className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{cert.name}</div>
                        <div className="text-xs text-muted-foreground">Certificate</div>
                      </div>
                      {hasUrl && <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />}
                    </>
                  );
                  return hasUrl ? (
                    <a
                      key={idx}
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                      data-testid={`certificate-${idx}`}
                    >
                      {content}
                    </a>
                  ) : (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-4 rounded-xl border bg-card"
                      data-testid={`certificate-${idx}`}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <section data-testid="section-videos">
              <SectionHeading icon={Play} id="videos">
                Videos
              </SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                {videos.map((video, idx) => (
                  <div key={idx} className="space-y-2" data-testid={`video-${idx}`}>
                    <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border shadow-sm">
                      <iframe
                        width="100%"
                        height="100%"
                        src={video.url}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    {video.title && <p className="text-sm font-medium text-center text-muted-foreground">{video.title}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Testimonials */}
          {testimonials.length > 0 && (
            <section data-testid="section-testimonials">
              <SectionHeading icon={Quote} id="testimonials">
                Testimonials
              </SectionHeading>
              <div className="grid gap-4">
                {testimonials.map((testimonial, idx) => (
                  <motion.div
                    key={idx}
                    className="p-5 rounded-xl border bg-card relative"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    data-testid={`testimonial-${idx}`}
                  >
                    <Quote className="h-6 w-6 text-primary/20 absolute top-4 right-4" />
                    <blockquote className="text-sm text-muted-foreground italic leading-relaxed mb-3 pr-8">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {testimonial.author.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{testimonial.author}</p>
                        {testimonial.organization && <p className="text-xs text-muted-foreground">{testimonial.organization}</p>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* FAQs */}
          {product.faqs && (product.faqs as any[]).length > 0 && (
            <section data-testid="section-faqs">
              <SectionHeading icon={HelpCircle} id="faqs">
                {t("productDetail.faqs")}
              </SectionHeading>
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
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredFaqs.map((faq: any, idx: number) => (
                    <motion.div
                      key={idx}
                      className="rounded-xl border bg-card overflow-hidden hover:border-primary/30 transition-colors"
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
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <HelpCircle className="h-3.5 w-3.5" />
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
                            <div className="pl-10 pt-1">
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
            </section>
          )}

          {/* Studies & Trials */}
          {studiesAndTrials.length > 0 && (
            <section data-testid="section-studies">
              <SectionHeading icon={Microscope} id="studies">
                Studies & Trials
              </SectionHeading>
              <div className="grid gap-2">
                {studiesAndTrials.map((study, idx) => (
                  <a
                    key={idx}
                    href={study.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-sm group"
                    data-testid={`study-${idx}`}
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 group-hover:text-primary transition-colors">{study.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Box Contents */}
          {boxContents.length > 0 && (
            <section data-testid="section-box-contents">
              <SectionHeading icon={Box} id="box-contents">
                Box Contents
              </SectionHeading>
              <ul className="grid gap-2 sm:grid-cols-2">
                {boxContents.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-3 rounded-lg border bg-card text-sm" data-testid={`box-item-${idx}`}>
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Warranty */}
          {product.warrantyText && (
            <section data-testid="section-warranty">
              <SectionHeading icon={Shield} id="warranty">
                Warranty
              </SectionHeading>
              <div className="p-4 rounded-xl border bg-card">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.warrantyText}</p>
              </div>
            </section>
          )}

          {/* Related Products */}
          {relatedProducts && relatedProducts.length > 0 && (
            <section data-testid="section-related-products">
              <SectionHeading icon={Link2} id="related-products">
                Related Products
              </SectionHeading>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {relatedProducts.map((rp) => (
                  <a
                    key={rp.id}
                    href={`/products/${slugify(rp.name)}`}
                    className="flex-shrink-0 w-48 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all overflow-hidden group"
                    data-testid={`related-product-${rp.id}`}
                  >
                    <div className="aspect-square overflow-hidden bg-muted/30">
                      <img src={rp.imageUrl} alt={rp.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" decoding="async" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium line-clamp-2">{rp.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">SKU: {rp.sku}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Mobile Sticky CTA — appears after scrolling past page header */}
      {mobileStickyVisible && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-background/95 backdrop-blur-sm border-t shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
          <Button
            className="w-full h-12 text-sm font-semibold bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="button-request-quote-mobile-sticky"
            onClick={() => { trackCtaClick("sticky_bottom", product?.name); setShowQuoteDialog(true); }}
          >
            {stickyBasePrice
              ? t("quote.sticky.cta", { price: stickyBasePrice })
              : t("quote.chat.getQuote")}
          </Button>
        </div>
      )}

      {/* Desktop Sticky CTA — appears when inline CTA scrolls out of view */}
      {!desktopCtaVisible && (
        <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
          <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{product?.name}</span>
            </div>
            <Button
              className="h-11 px-8 text-sm font-semibold bg-teal-600 hover:bg-teal-700 shadow-md hover:shadow-lg transition-all duration-300 shrink-0"
              data-testid="button-request-quote-desktop-sticky"
              onClick={() => { trackCtaClick("product_detail_sticky", product?.name); setShowQuoteDialog(true); }}
            >
              <Stethoscope className="mr-2 h-4 w-4" />
              Check Bulk Pricing & Availability
            </Button>
          </div>
        </div>
      )}

      {/* AI Quote Assistant Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={(open) => { if (!open) { fireAbandonEvent(); setShowQuoteDialog(false); } }}>
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

          {initError && (
            <div className="px-4 pt-2">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{initError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 1: Intro */}
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
                {pricingRestricted ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full max-w-xs text-center" data-testid="step-pricing-restricted">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Due to manufacturer restrictions we are unable to share instant pricing for this product. Please contact our sales team at{' '}
                      <a href="mailto:sales@viaglobalhealth.com" className="underline font-medium">sales@viaglobalhealth.com</a>
                    </p>
                  </div>
                ) : priceText ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 w-full max-w-xs" data-testid="step-price-display">
                    <p className="text-2xl font-bold text-primary">{pricingTiers.length > 1 ? 'From ' : ''}{lowestTierPrice || priceText.split(' ')[0]}/unit</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("quote.chat.subsidyText")}</p>
                    {pricingTiers.length > 1 && (
                      <p className="text-xs text-primary/70 mt-1">{t("quote.chat.volumeDiscount")}</p>
                    )}
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading pricing...
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("quote.chat.contactForPricing")}</p>
                )}
                <Button
                  onClick={() => {
                    const profile = getCustomerProfile();
                    const hasCompleteProfile = !!(profile?.firstName && profile?.email && profile?.shippingCountry && profile?.organizationType);
                    if (hasCompleteProfile) {
                      setContactFormSubmitted(true);
                      setShippingCountry(profile!.shippingCountry!);
                      setSelectedOrgType(profile!.organizationType!);
                      fetchOrgPricing(profile!.organizationType!);
                      setChatStep('quantity');
                    } else {
                      trackQuoteStarted(product.name);
                      setChatStep('org_type');
                    }
                  }}
                  disabled={isLoading}
                  className="w-full max-w-xs h-11 text-sm font-semibold"
                  data-testid="button-step-continue-to-details"
                >
                  {t("quote.chat.getQuote")}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            </div>
          )}

          {/* Step 2: Org Type (Screen A) */}
          {chatStep === 'org_type' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col justify-center space-y-3 px-2 max-w-sm mx-auto w-full"
              >
                <div className="text-center mb-1">
                  <h3 className="text-lg font-bold mb-1">{t("quote.chat.orgTypeQuestion")}</h3>
                </div>
                <div className="flex flex-col gap-2.5 w-full">
                  {[
                    { value: "NGO / Non-Profit", labelKey: "quote.chat.orgNgo", icon: "🌍" },
                    { value: "Government / Public Sector", labelKey: "quote.chat.orgGovt", icon: "🏛️" },
                    { value: "Healthcare Provider", labelKey: "quote.chat.orgHealthcare", icon: "🏥" },
                    { value: "Distributor", labelKey: "quote.chat.orgDistributor", icon: "📦" },
                    { value: "Private Clinic", labelKey: "quote.chat.orgPrivate", icon: "🩺" },
                  ].map((org) => (
                    <button
                      key={org.value}
                      type="button"
                      onClick={() => {
                        setSelectedOrgType(org.value);
                        trackQuoteFormStep2Complete(product.name, org.value);
                        setChatStep('details');
                      }}
                      className={`w-full min-h-[52px] rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-150 flex items-center gap-3
                        ${selectedOrgType === org.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 text-foreground active:bg-primary/10'
                        }`}
                      data-testid={`button-org-type-${org.value.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                    >
                      <span className="text-xl leading-none">{org.icon}</span>
                      <span>{t(org.labelKey)}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {t("quote.chat.orgTypeSubtext")}
                </p>
              </motion.div>
            </div>
          )}

          {/* Step 3: Contact Details (Screen B) */}
          {chatStep === 'details' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col justify-center space-y-4 px-2 max-w-sm mx-auto w-full"
              >
                <div className="text-center mb-1">
                  <h3 className="text-lg font-bold mb-1">{t("quote.chat.almostThere")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("quote.chat.almostThereSubtext")}
                  </p>
                </div>
                <ChatContactForm
                  onSubmit={handleStepContactFormSubmit}
                  isLoading={isLoading}
                  organizationType={selectedOrgType}
                  onFieldStart={(fieldName) => trackQuoteFormStep3FieldStart(fieldName, product.name)}
                  defaultValues={{
                    fullName: (() => {
                      const p = getCustomerProfile();
                      return p?.firstName ? `${p.firstName}${p.lastName ? ' ' + p.lastName : ''}` : '';
                    })(),
                    email: getCustomerProfile()?.email || '',
                    country: getCustomerProfile()?.shippingCountry || '',
                  }}
                />
              </motion.div>
            </div>
          )}

          {/* Step 3: Quantity */}
          {chatStep === 'quantity' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col justify-center items-center space-y-4 px-2"
              >
                <div>
                  <h3 className="text-base font-semibold text-center mb-1">{t("quote.chat.quantityQuestion")}</h3>
                  {product.unitsPerPack && product.packType && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t("quote.chat.soldInPacks", { packType: product.packType, unitsPerPack: product.unitsPerPack })}
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
                  <p className="text-xs text-muted-foreground text-center mt-2" data-testid="volume-nudge">
                    {pricingTiers.length > 1
                      ? t("quote.chat.volumeNudge")
                      : t("quote.chat.volumeNudgeAlt")}
                  </p>
                </div>
                {!pricingRestricted && quantity && parseInt(quantity) > 0 && pricingTiers.length > 0 && (
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
                          <p className="text-xs text-muted-foreground">{t("quote.chat.estimatedTotal")}</p>
                          <p className="text-xl font-bold text-foreground">${(qty * unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-muted-foreground">${unitPrice.toFixed(2)} × {qty} units</p>
                        </>
                      );
                    })()}
                  </motion.div>
                )}
                {pricingTiers.length > 1 && (
                  <div className="w-full max-w-xs">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 text-center">{t("quote.chat.volumePricing")}</p>
                    <div className="space-y-1">
                      {pricingTiers.map((tier, idx) => {
                        const qty = parseInt(quantity) || 0;
                        const isActive = qty >= tier.minQuantity && (tier.maxQuantity === null || qty <= tier.maxQuantity);
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}
                            data-testid={`pricing-tier-${idx}`}
                          >
                            <span>{tier.minQuantity}{tier.maxQuantity ? `-${tier.maxQuantity}` : '+'} units</span>
                            <span>${(tier.unitPriceCents / 100).toFixed(2)}/unit</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleQuantityConfirm}
                  disabled={!quantity || parseInt(quantity) < 1}
                  className="w-full max-w-xs h-11 text-sm font-semibold"
                  data-testid="button-step-confirm-quantity"
                >
                  {t("quote.chat.confirmQuantity")}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            </div>
          )}

          {/* Step 4: Chat */}
          {chatStep === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages-container">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert chat-markdown">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{formatAiResponse(msg.content)}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                {localCurrencyNote && (
                  <div data-testid="chat-currency-note">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 italic">
                      {localCurrencyNote} — VIA invoices in USD
                    </div>
                  </div>
                )}
                {specialPricingEligible && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2 text-center">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                        <Star className="h-3 w-3" /> Special pricing may apply to your order
                      </p>
                    </div>
                  </motion.div>
                )}
                {recommendedProducts.length > 0 && (
                  <div className="bg-muted/50 rounded-xl p-3 border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Recommended products
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {recommendedProducts.map(rp => (
                        <a key={rp.id} href={`/products/${slugify(rp.name)}`} className="text-xs bg-background border rounded-lg px-3 py-1.5 hover:border-primary transition-colors" data-testid={`recommended-${rp.id}`}>
                          {rp.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {isConversationComplete && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-2">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium">
                      <Check className="h-4 w-4" />
                      Quote request submitted
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Our team will follow up via email shortly.</p>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t shrink-0">
                <div className="flex gap-2">
                  <Input
                    placeholder={isConversationComplete ? "Quote submitted — we'll be in touch!" : "Type your message..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading || isConversationComplete}
                    className="h-11"
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading || isConversationComplete}
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    data-testid="button-send-message"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
