import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { getCustomerProfile, saveCustomerProfile, clearCustomerProfile } from "@/lib/customerProfile";
import { trackQuoteStarted, trackQuoteSubmitted, trackChatMessage } from "@/lib/analytics";
import { useTranslation } from "@/i18n/LanguageProvider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatContactForm } from "@/components/ChatContactForm";

interface AmaraChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AmaraChatDialog({ isOpen, onClose }: AmaraChatDialogProps) {
  const { t, language } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quoteRequestId, setQuoteRequestId] = useState<string | null>(null);
  const [isConversationComplete, setIsConversationComplete] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactFormSubmitted, setContactFormSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const laneATriggers = ["i'm ready to buy", "ready to buy", "ready to order", "i need bulk pricing", "buy now", "want to purchase", "want to order", "send me a quote", "send me a proforma", "i want pricing", "i need to order", "place an order"];
  const isLaneATrigger = (text: string) => laneATriggers.some(trigger => text.toLowerCase().includes(trigger));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startSession = async () => {
    setIsLoading(true);
    try {
      const customerProfile = getCustomerProfile();
      const response = await fetch("/api/quote-requests/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerProfile: customerProfile || undefined,
          language,
        }),
      });

      if (!response.ok) throw new Error("Failed to start session");

      const data = await response.json();
      setQuoteRequestId(data.quoteRequestId);
      setMessages([{ role: "assistant", content: data.message }]);
      trackQuoteStarted("General Inquiry");
    } catch (error) {
      console.error("Error starting chat session:", error);
      setMessages([{
        role: "assistant",
        content: "Hello! I'm Amara from VIA Global Health. How can I help you today?",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0 && !quoteRequestId) {
      startSession();
    }
    if (isOpen && messages.length > 0 && quoteRequestId && isConversationComplete) {
      setMessages([]);
      setQuoteRequestId(null);
      setIsConversationComplete(false);
      setShowQuickReplies(true);
      startSession();
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (isLoading || isConversationComplete || !quoteRequestId) return;

    const userMessage = text.trim();
    if (!userMessage) return;

    setShowQuickReplies(false);
    const triggeredLaneA = isLaneATrigger(userMessage);
    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/quote-requests/${quoteRequestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, language }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || data.message }]);
      trackChatMessage(updatedMessages.length + 1);

      if (data.profileUpdate) {
        const currentProfile = getCustomerProfile() || {};
        saveCustomerProfile({ ...currentProfile, ...data.profileUpdate });
      }

      if (data.referToAgent) {
        setIsConversationComplete(true);
        trackQuoteSubmitted(quoteRequestId, 1);
      }

      if (triggeredLaneA && !contactFormSubmitted) {
        const profile = getCustomerProfile();
        if (!profile?.firstName || !profile?.email) {
          setShowContactForm(true);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm sorry, I had trouble processing that. Could you try again?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactFormSubmit = async (data: { fullName: string; email: string; country: string; firstName: string; lastName: string }) => {
    if (!quoteRequestId) return;
    setShowContactForm(false);
    setContactFormSubmitted(true);

    const displayMessage = `${data.fullName}, ${data.email}, ${data.country}`;
    setMessages(prev => [...prev, { role: 'user', content: displayMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/quote-requests/${quoteRequestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: displayMessage,
          contactData: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            shippingCountry: data.country
          },
          language
        })
      });
      if (!response.ok) throw new Error('Failed to send message');
      const responseData = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: responseData.reply || responseData.message }]);
      const currentProfile = getCustomerProfile() || {};
      saveCustomerProfile({ ...currentProfile, firstName: data.firstName, lastName: data.lastName, email: data.email, country: data.country });
      if (responseData.referToAgent) {
        setIsConversationComplete(true);
        trackQuoteSubmitted(quoteRequestId, 1);
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I had trouble processing that. Could you try again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setMessages([]);
      setQuoteRequestId(null);
      setIsConversationComplete(false);
      setInputValue("");
      setShowQuickReplies(true);
      setShowContactForm(false);
      setContactFormSubmitted(false);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
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
                  handleClose();
                  setTimeout(() => {}, 100);
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded min-h-[44px] flex items-center"
                data-testid="button-not-you-general"
              >
                Not you?
              </button>
            )}
          </div>
          <DialogDescription className="sr-only">AI-powered chat assistant to help you with medical equipment and pharmaceutical inquiries</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-line" : "bg-muted chat-markdown"
                  }`}
                  data-testid={`general-chat-message-${msg.role}-${idx}`}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}
            {showQuickReplies && messages.length === 1 && messages[0]?.role === "assistant" && !isLoading && (
              <motion.div
                className="flex flex-wrap gap-2 justify-center pt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {["I need bulk pricing", "I have some questions", "Just exploring options"].map((text) => (
                  <Button
                    key={text}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full"
                    onClick={() => sendMessage(text)}
                    data-testid={`quick-reply-general-${text.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {text}
                  </Button>
                ))}
              </motion.div>
            )}
            {showContactForm && !isLoading && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ChatContactForm
                  onSubmit={handleContactFormSubmit}
                  isLoading={isLoading}
                  defaultValues={{
                    fullName: (() => {
                      const p = getCustomerProfile();
                      return p?.firstName ? `${p.firstName}${p.lastName ? ' ' + p.lastName : ''}` : '';
                    })(),
                    email: getCustomerProfile()?.email || '',
                    country: getCustomerProfile()?.country || ''
                  }}
                />
              </motion.div>
            )}
            {isLoading && (
              <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="bg-muted rounded-2xl px-4 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Amara is typing...
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-3 border-t shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputValue);
            }}
            className="flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isConversationComplete ? "Conversation complete" : "Type your message..."}
              disabled={isLoading || isConversationComplete}
              className="flex-1"
              data-testid="input-general-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !inputValue.trim() || isConversationComplete}
              data-testid="button-send-general-chat"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
