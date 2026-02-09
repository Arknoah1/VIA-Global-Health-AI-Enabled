import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowRight, ArrowLeft, Building2, Heart, HandshakeIcon, GraduationCap,
  Package, MapPin, Clock, Ship, Plane, CheckCircle2, Loader2, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/LanguageProvider";

interface SmartQuoteFlowProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  productId?: string;
}

interface QuoteData {
  organizationType: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  productName: string;
  quantity: string;
  destinationCountry: string;
  destinationCity: string;
  timeline: string;
  shippingPreference: string;
  additionalNotes: string;
}

export function SmartQuoteFlow({ isOpen, onClose, productName = "", productId }: SmartQuoteFlowProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [quoteData, setQuoteData] = useState<QuoteData>({
    organizationType: "",
    organizationName: "",
    contactName: "",
    contactEmail: "",
    productName: productName,
    quantity: "",
    destinationCountry: "",
    destinationCity: "",
    timeline: "",
    shippingPreference: "",
    additionalNotes: ""
  });

  const STEPS = useMemo(() => [
    { id: 1, title: t("quoteFlow.step.organization"), icon: Building2 },
    { id: 2, title: t("quoteFlow.step.product"), icon: Package },
    { id: 3, title: t("quoteFlow.step.destination"), icon: MapPin },
    { id: 4, title: t("quoteFlow.step.timeline"), icon: Clock },
    { id: 5, title: t("quoteFlow.step.review"), icon: CheckCircle2 }
  ], [t]);

  const ORG_TYPES = useMemo(() => [
    { value: "distributor", label: t("quoteFlow.orgDistributor"), icon: Building2, desc: t("quoteFlow.orgDistributorDesc") },
    { value: "ngo", label: t("quoteFlow.orgNgo"), icon: HandshakeIcon, desc: t("quoteFlow.orgNgoDesc") },
    { value: "provider", label: t("quoteFlow.orgProvider"), icon: Heart, desc: t("quoteFlow.orgProviderDesc") },
    { value: "academic", label: t("quoteFlow.orgAcademic"), icon: GraduationCap, desc: t("quoteFlow.orgAcademicDesc") }
  ], [t]);

  const TIMELINE_OPTIONS = useMemo(() => [
    { value: "urgent", label: t("quoteFlow.urgent"), desc: t("quoteFlow.urgentDesc") },
    { value: "standard", label: t("quoteFlow.standard"), desc: t("quoteFlow.standardDesc") },
    { value: "flexible", label: t("quoteFlow.flexible"), desc: t("quoteFlow.flexibleDesc") }
  ], [t]);

  const SHIPPING_OPTIONS = useMemo(() => [
    { value: "air", label: t("quoteFlow.airFreight"), icon: Plane, desc: t("quoteFlow.airFreightDesc") },
    { value: "sea", label: t("quoteFlow.seaFreight"), icon: Ship, desc: t("quoteFlow.seaFreightDesc") },
    { value: "recommend", label: t("quoteFlow.recommendBest"), icon: CheckCircle2, desc: t("quoteFlow.recommendBestDesc") }
  ], [t]);

  const updateData = (field: keyof QuoteData, value: string) => {
    setQuoteData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return quoteData.organizationType && quoteData.organizationName && quoteData.contactName && quoteData.contactEmail;
      case 2:
        return quoteData.productName && quoteData.quantity;
      case 3:
        return quoteData.destinationCountry;
      case 4:
        return quoteData.timeline && quoteData.shippingPreference;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId,
          productName: quoteData.productName,
          firstName: quoteData.contactName.split(' ')[0],
          lastName: quoteData.contactName.split(' ').slice(1).join(' ') || '',
          email: quoteData.contactEmail,
          organizationName: quoteData.organizationName,
          organizationType: quoteData.organizationType,
          orderQuantity: quoteData.quantity,
          shippingCountry: quoteData.destinationCountry,
          decisionTimeline: quoteData.timeline,
          initialIntent: `Shipping: ${quoteData.shippingPreference}, City: ${quoteData.destinationCity}, Notes: ${quoteData.additionalNotes}`
        })
      });

      if (response.ok) {
        setIsComplete(true);
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setIsComplete(false);
    setQuoteData({
      organizationType: "",
      organizationName: "",
      contactName: "",
      contactEmail: "",
      productName: productName,
      quantity: "",
      destinationCountry: "",
      destinationCity: "",
      timeline: "",
      shippingPreference: "",
      additionalNotes: ""
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("quoteFlow.title")}</DialogTitle>
          <DialogDescription className="sr-only">Step-by-step form to request a custom quote for medical equipment</DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center ${idx > 0 ? 'ml-2' : ''}`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-primary text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${isActive ? 'text-primary font-medium' : 'text-slate-500'}`}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-12 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("quoteFlow.submitted")}</h3>
              <p className="text-slate-600 mb-6">
                {t("quoteFlow.submittedDesc")}
              </p>
              <Button onClick={handleClose} data-testid="button-close-quote">
                {t("quoteFlow.close")}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Organization */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-3 block">{t("quoteFlow.orgType")}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {ORG_TYPES.map((org) => {
                        const Icon = org.icon;
                        const isSelected = quoteData.organizationType === org.value;
                        return (
                          <button
                            key={org.value}
                            onClick={() => updateData('organizationType', org.value)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            data-testid={`button-org-${org.value}`}
                          >
                            <Icon className={`h-5 w-5 mb-2 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                            <div className="font-medium text-sm">{org.label}</div>
                            <div className="text-xs text-slate-500 mt-1">{org.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="orgName">{t("quoteFlow.orgName")}</Label>
                      <Input
                        id="orgName"
                        value={quoteData.organizationName}
                        onChange={(e) => updateData('organizationName', e.target.value)}
                        placeholder={t("quoteFlow.orgNamePlaceholder")}
                        data-testid="input-org-name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactName">{t("quoteFlow.yourName")}</Label>
                        <Input
                          id="contactName"
                          value={quoteData.contactName}
                          onChange={(e) => updateData('contactName', e.target.value)}
                          placeholder={t("quoteFlow.yourNamePlaceholder")}
                          data-testid="input-contact-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactEmail">{t("quoteFlow.email")}</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={quoteData.contactEmail}
                          onChange={(e) => updateData('contactEmail', e.target.value)}
                          placeholder={t("quoteFlow.emailPlaceholder")}
                          data-testid="input-contact-email"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Product Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="productName">{t("quoteFlow.productName")}</Label>
                    <Input
                      id="productName"
                      value={quoteData.productName}
                      onChange={(e) => updateData('productName', e.target.value)}
                      placeholder={t("quoteFlow.productNamePlaceholder")}
                      data-testid="input-product-name"
                    />
                    <p className="text-xs text-slate-500 mt-1">{t("quoteFlow.productNameHint")}</p>
                  </div>
                  <div>
                    <Label htmlFor="quantity">{t("quoteFlow.quantity")}</Label>
                    <Input
                      id="quantity"
                      value={quoteData.quantity}
                      onChange={(e) => updateData('quantity', e.target.value)}
                      placeholder={t("quoteFlow.quantityPlaceholder")}
                      data-testid="input-quantity"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">{t("quoteFlow.additionalNotes")}</Label>
                    <textarea
                      id="notes"
                      className="w-full min-h-[80px] px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={quoteData.additionalNotes}
                      onChange={(e) => updateData('additionalNotes', e.target.value)}
                      placeholder={t("quoteFlow.additionalNotesPlaceholder")}
                      data-testid="input-notes"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Destination */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="country">{t("quoteFlow.destinationCountry")}</Label>
                    <Input
                      id="country"
                      value={quoteData.destinationCountry}
                      onChange={(e) => updateData('destinationCountry', e.target.value)}
                      placeholder={t("quoteFlow.destinationCountryPlaceholder")}
                      data-testid="input-country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">{t("quoteFlow.destinationCity")}</Label>
                    <Input
                      id="city"
                      value={quoteData.destinationCity}
                      onChange={(e) => updateData('destinationCity', e.target.value)}
                      placeholder={t("quoteFlow.destinationCityPlaceholder")}
                      data-testid="input-city"
                    />
                  </div>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> {t("quoteFlow.shippingNote")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 4: Timeline & Shipping */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-3 block">{t("quoteFlow.whenNeeded")}</Label>
                    <RadioGroup
                      value={quoteData.timeline}
                      onValueChange={(value) => updateData('timeline', value)}
                      className="space-y-3"
                    >
                      {TIMELINE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            quoteData.timeline === option.value ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <RadioGroupItem value={option.value} data-testid={`radio-timeline-${option.value}`} />
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-slate-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-3 block">{t("quoteFlow.shippingPreference")}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {SHIPPING_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isSelected = quoteData.shippingPreference === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => updateData('shippingPreference', option.value)}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            data-testid={`button-shipping-${option.value}`}
                          >
                            <Icon className={`h-6 w-6 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                            <div className="font-medium text-sm">{option.label}</div>
                            <div className="text-xs text-slate-500 mt-1">{option.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{t("quoteFlow.reviewTitle")}</CardTitle>
                      <CardDescription>{t("quoteFlow.reviewSubtitle")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-slate-500">{t("quoteFlow.reviewOrganization")}</div>
                          <div className="font-medium">{quoteData.organizationName}</div>
                          <div className="text-slate-600 capitalize">{quoteData.organizationType}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{t("quoteFlow.reviewContact")}</div>
                          <div className="font-medium">{quoteData.contactName}</div>
                          <div className="text-slate-600">{quoteData.contactEmail}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{t("quoteFlow.reviewProduct")}</div>
                          <div className="font-medium">{quoteData.productName}</div>
                          <div className="text-slate-600">{t("quoteFlow.qty")}: {quoteData.quantity}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{t("quoteFlow.reviewDestination")}</div>
                          <div className="font-medium">{quoteData.destinationCountry}</div>
                          {quoteData.destinationCity && <div className="text-slate-600">{quoteData.destinationCity}</div>}
                        </div>
                        <div>
                          <div className="text-slate-500">{t("quoteFlow.reviewTimeline")}</div>
                          <div className="font-medium capitalize">{quoteData.timeline}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{t("quoteFlow.reviewShipping")}</div>
                          <div className="font-medium capitalize">{quoteData.shippingPreference}</div>
                        </div>
                      </div>
                      {quoteData.additionalNotes && (
                        <div>
                          <div className="text-slate-500 text-sm">{t("quoteFlow.reviewNotes")}</div>
                          <div className="text-sm">{quoteData.additionalNotes}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">{t("quoteFlow.whatHappensNext")}</p>
                          <p className="text-sm text-green-700">
                            {t("quoteFlow.whatHappensNextDesc")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {!isComplete && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("quoteFlow.back")}
            </Button>
            {currentStep < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                data-testid="button-next"
              >
                {t("quoteFlow.next")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="button-submit-quote"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("quoteFlow.submitting")}
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t("quoteFlow.submitQuote")}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
