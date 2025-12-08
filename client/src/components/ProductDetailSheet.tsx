import { Product } from "@/lib/types";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Play, Download, HelpCircle, Check, MessageSquare, Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface QuoteAnswers {
  initialIntent: string;
  firstName: string;
  lastName: string;
  orgName: string;
  orgType: string;
  quantity: string;
  country: string;
  importHelp: string;
}

type QuestionStep = 'intent' | 'name' | 'orgName' | 'quantity' | 'orgType' | 'country' | 'importHelp' | 'complete';

export function ProductDetailSheet({ product, isOpen, onClose }: ProductDetailSheetProps) {
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<QuestionStep>('intent');
  const [answers, setAnswers] = useState<QuoteAnswers>({
    initialIntent: '',
    firstName: '',
    lastName: '',
    orgName: '',
    orgType: '',
    quantity: '',
    country: '',
    importHelp: ''
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showQuoteDialog && messages.length === 0 && product) {
      setMessages([
        { role: 'assistant', content: 'Thank you for requesting additional product information and pricing.' },
        { role: 'assistant', content: 'What brings you here today?' }
      ]);
      setCurrentStep('intent');
    }
  }, [showQuoteDialog, product]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const saveQuoteRequest = async (finalAnswers: QuoteAnswers, allMessages: ChatMessage[]) => {
    if (!product) return;
    
    try {
      const response = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: finalAnswers.firstName,
          lastName: finalAnswers.lastName,
          organizationName: finalAnswers.orgName,
          organizationType: finalAnswers.orgType,
          orderQuantity: finalAnswers.quantity,
          shippingCountry: finalAnswers.country,
          importAssistance: finalAnswers.importHelp,
          initialIntent: finalAnswers.initialIntent,
          conversation: allMessages.map(m => ({ role: m.role, content: m.content })),
          productId: product.id,
          productName: product.name,
          productSku: product.sku
        })
      });
      
      if (response.ok) {
        console.log('Quote request saved successfully');
        console.log('Notification should be sent to noah@viaglobalhealth.com');
      }
    } catch (error) {
      console.error('Failed to save quote request:', error);
    }
  };

  const getNextResponse = (step: QuestionStep, userInput: string, currentAnswers: QuoteAnswers): { response: string; nextStep: QuestionStep } => {
    switch (step) {
      case 'intent':
        return {
          response: "Got it! May I have your name? (First and last name)",
          nextStep: 'name'
        };
      
      case 'name': {
        const nameParts = userInput.trim().split(/\s+/);
        const firstName = nameParts[0] || userInput;
        return {
          response: `Nice to meet you, ${firstName}! What company or organization are you with?`,
          nextStep: 'orgName'
        };
      }
      
      case 'orgName':
        return {
          response: `Perfect, thanks! About how many units are you looking to order?`,
          nextStep: 'quantity'
        };
      
      case 'quantity':
        return {
          response: `That helps a lot. What type of organization is ${currentAnswers.orgName}? (Distributor, Government, NGO, University, Hospital/Clinic, or Private practice)`,
          nextStep: 'orgType'
        };
      
      case 'orgType':
        return {
          response: `Thanks, ${currentAnswers.firstName}! Where would you like the products shipped?`,
          nextStep: 'country'
        };
      
      case 'country':
        return {
          response: `Got it! One last question - are you able to handle importing yourself, or would you like assistance with that?`,
          nextStep: 'importHelp'
        };
      
      case 'importHelp':
        return {
          response: `Thank you, ${currentAnswers.firstName}! I'm connecting you with our specialist who will send a custom quote within 24 hours. We appreciate your interest in ${product?.name}!`,
          nextStep: 'complete'
        };
      
      default:
        return { response: '', nextStep: 'complete' };
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !product || currentStep === 'complete') return;

    const userInput = inputValue.trim();
    const userMessage: ChatMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    let updatedAnswers = { ...answers };
    
    switch (currentStep) {
      case 'intent':
        updatedAnswers.initialIntent = userInput;
        break;
      case 'name': {
        const nameParts = userInput.split(/\s+/);
        updatedAnswers.firstName = nameParts[0] || userInput;
        updatedAnswers.lastName = nameParts.slice(1).join(' ') || '';
        break;
      }
      case 'orgName':
        updatedAnswers.orgName = userInput;
        break;
      case 'quantity':
        updatedAnswers.quantity = userInput;
        break;
      case 'orgType':
        updatedAnswers.orgType = userInput;
        break;
      case 'country':
        updatedAnswers.country = userInput;
        break;
      case 'importHelp':
        updatedAnswers.importHelp = userInput;
        break;
    }
    
    setAnswers(updatedAnswers);

    setTimeout(async () => {
      const { response, nextStep } = getNextResponse(currentStep, userInput, updatedAnswers);
      
      const newAssistantMessage: ChatMessage = { role: 'assistant', content: response };
      const updatedMessages = [...messages, userMessage, newAssistantMessage];
      
      setMessages(prev => [...prev, newAssistantMessage]);
      setCurrentStep(nextStep);
      setIsLoading(false);

      if (nextStep === 'complete') {
        await saveQuoteRequest(updatedAnswers, updatedMessages);
      }
    }, 600);
  };

  const handleCloseQuoteDialog = () => {
    setShowQuoteDialog(false);
    setMessages([]);
    setInputValue('');
    setCurrentStep('intent');
    setAnswers({
      initialIntent: '',
      firstName: '',
      lastName: '',
      orgName: '',
      orgType: '',
      quantity: '',
      country: '',
      importHelp: ''
    });
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
        <DialogContent className="sm:max-w-md h-[500px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Request Quote - {product?.name}
            </DialogTitle>
          </DialogHeader>
          
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
            </div>
          </ScrollArea>

          <div className="p-4 border-t flex gap-2">
            <Input
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
              data-testid="input-chat-message"
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage} 
              disabled={isLoading || !inputValue.trim()}
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
