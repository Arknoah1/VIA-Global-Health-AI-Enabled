import { Product } from "@/lib/types";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Play, Download, HelpCircle, 
  Settings, Package, Award,
  ChevronDown, ChevronUp, Search, Phone, Mail, Eye,
  Stethoscope, Activity, Heart, Microscope, ClipboardCheck,
  Shield, Headphones, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { trackProductView } from "@/lib/browsingHistory";
import { slugify } from "@/lib/slugify";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useEffect } from "react";

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

export function ProductDetailSheet({ product, isOpen, onClose }: ProductDetailSheetProps) {
  const { t } = useTranslation();
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [showSupportChat, setShowSupportChat] = useState(false);

  const filteredFaqs = useMemo(() => {
    if (!product?.faqs || !faqSearchQuery.trim()) return product?.faqs || [];
    const query = faqSearchQuery.toLowerCase();
    return (product.faqs as any[]).filter(
      faq => faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query)
    );
  }, [product?.faqs, faqSearchQuery]);

  useEffect(() => {
    if (isOpen && product) {
      trackProductView({ id: product.id, name: product.name, category: product.category });
    }
  }, [isOpen, product?.id]);

  const currentImage = product?.images && product.images.length > 0 
    ? (product.images as string[])[selectedImageIndex] || product?.imageUrl 
    : product?.imageUrl;

  if (!product) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0 flex flex-col">
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

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-8">
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

        <div className="sticky bottom-0 p-3 sm:p-6 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t space-y-1.5 sm:space-y-2">
          <a
            href={`/products/${slugify(product.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-view-public-page"
          >
            <Button
              className="w-full h-12 sm:h-12 text-sm sm:text-base font-semibold bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              View Public Product Page
            </Button>
          </a>
          <p className="text-[11px] sm:text-xs text-center text-muted-foreground">
            Opens the customer-facing product page in a new tab
          </p>
        </div>
      </SheetContent>

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
