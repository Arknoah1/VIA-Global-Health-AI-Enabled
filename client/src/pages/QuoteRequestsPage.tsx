import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  Download, 
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QuoteRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationName: string;
  organizationType: string;
  orderQuantity: string;
  shippingCountry: string;
  importAssistance: string;
  initialIntent: string;
  decisionTimeline: string;
  productName: string;
  productSku: string;
  conversation: ChatMessage[];
  status: string;
  createdAt: string;
}

export default function QuoteRequestsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [showConversationDialog, setShowConversationDialog] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery<QuoteRequest[]>({
    queryKey: ["quoteRequests"],
    queryFn: async () => {
      const response = await fetch("/api/quote-requests");
      if (!response.ok) throw new Error("Failed to fetch quote requests");
      return response.json();
    },
  });

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(requests, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "quote-requests.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast({
      title: "Export Started",
      description: "Downloading quote requests data as JSON...",
    });
  };

  const handleViewConversation = async (request: QuoteRequest) => {
    setSelectedRequest(request);
    setShowConversationDialog(true);
    setIsLoadingMessages(true);
    
    try {
      const response = await fetch(`/api/quote-requests/${request.id}/messages`);
      if (response.ok) {
        const messages = await response.json();
        setConversationMessages(messages.map((m: any) => ({ role: m.role, content: m.content })));
      } else {
        setConversationMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setConversationMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-background w-full">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Quote Requests</h1>
          </div>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-lg font-medium text-muted-foreground">Loading quote requests...</p>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-lg font-medium text-muted-foreground">No quote requests yet</p>
                <p className="text-sm text-muted-foreground">Quote requests will appear here when customers use the request quote feature</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg bg-card hover:bg-card/80 transition-colors">
                  {/* Header Row */}
                  <button
                    onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                    data-testid={`quote-request-row-${request.id}`}
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <div className="font-semibold text-sm">{request.firstName} {request.lastName}</div>
                        <div className="text-xs text-muted-foreground">{request.organizationName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Product</div>
                        <div className="font-medium text-sm">{request.productName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Quantity</div>
                        <div className="font-medium text-sm">{request.orderQuantity}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Date</div>
                        <div className="font-medium text-sm">{formatDate(request.createdAt)}</div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 ml-4 shrink-0 transition-transform ${
                        expandedId === request.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Expanded Details */}
                  {expandedId === request.id && (
                    <div className="border-t px-4 py-4 space-y-4 bg-muted/30">
                      {/* Summary Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Email</div>
                          <a href={`mailto:${request.email}`} className="text-sm text-primary hover:underline">{request.email || 'N/A'}</a>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Organization Type</div>
                          <Badge variant="secondary">{request.organizationType || 'N/A'}</Badge>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</div>
                          <Badge variant={request.status === 'active' ? 'default' : 'outline'}>{request.status || 'active'}</Badge>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Shipping Country</div>
                          <p className="text-sm font-medium">{request.shippingCountry || 'N/A'}</p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Timeline</div>
                          <p className="text-sm">{request.decisionTimeline || 'N/A'}</p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Product SKU</div>
                          <p className="text-sm font-mono text-muted-foreground">{request.productSku || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Initial Intent */}
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What Brings Them Here</div>
                        <p className="text-sm text-foreground bg-background/50 rounded p-3">{request.initialIntent}</p>
                      </div>

                      {/* Conversation Button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewConversation(request)}
                        className="w-full"
                        data-testid={`button-view-conversation-${request.id}`}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Full Conversation ({request.conversation.length} messages)
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Conversation Dialog */}
      <Dialog open={showConversationDialog} onOpenChange={setShowConversationDialog}>
        <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b shrink-0">
            <DialogTitle>
              Conversation - {selectedRequest?.firstName} {selectedRequest?.lastName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : conversationMessages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No conversation messages found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversationMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                      data-testid={`chat-message-${msg.role}-${idx}`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
