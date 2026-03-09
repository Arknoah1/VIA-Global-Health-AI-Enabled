import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  Download, 
  MessageSquare,
  FileText,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
  Brain,
  Loader2,
  Ship
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProformaInvoicePreview } from "@/components/ProformaInvoicePreview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  shippingAddress: string;
  importAssistance: string;
  initialIntent: string;
  decisionTimeline: string;
  productName: string;
  productSku: string;
  productId: string;
  conversation: ChatMessage[];
  status: string;
  createdAt: string;
  aiReview?: any;
  shippingEstimate?: any;
}

export default function QuoteRequestsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [showConversationDialog, setShowConversationDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<QuoteRequest | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    organizationName: "",
    organizationType: "",
    orderQuantity: "",
    shippingCountry: "",
    shippingAddress: "",
    productName: "",
    status: "",
    decisionTimeline: "",
  });
  const [aiReviews, setAiReviews] = useState<Record<string, any>>({});
  const [loadingAiReviews, setLoadingAiReviews] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<QuoteRequest[]>({
    queryKey: ["quoteRequests"],
    queryFn: async () => {
      const response = await fetch("/api/quote-requests");
      if (!response.ok) throw new Error("Failed to fetch quote requests");
      return response.json();
    },
  });

  const exportData = async () => {
    try {
      const response = await fetch("/api/quote-requests/export/markdown");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      const filename = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "quote-requests-export.md";
      downloadAnchorNode.setAttribute("download", filename);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Export Complete",
        description: "Quote requests exported as Markdown with full conversation history.",
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Could not export quote requests. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateInvoiceMutation = useMutation({
    mutationFn: async (quoteRequestId: string) => {
      const response = await fetch(`/api/quote-requests/${quoteRequestId}/generate-invoice`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate invoice");
      return response.json();
    },
    onSuccess: (invoice) => {
      setCurrentInvoice(invoice);
      setShowInvoiceDialog(true);
      toast({ title: "Invoice generated", description: `Reference: ${invoice.referenceNumber}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate invoice", variant: "destructive" });
    },
  });

  const sendInvoiceEmailMutation = useMutation({
    mutationFn: async (invoice: any) => {
      const response = await fetch(`/api/proforma-invoices/${invoice.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: "noah@viaglobalhealth.com" }),
      });
      if (!response.ok) throw new Error("Failed to send email");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Invoice has been sent to the team." });
      setShowInvoiceDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send email. Please check email configuration.", variant: "destructive" });
    },
  });

  const updateQuoteRequestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const response = await fetch(`/api/quote-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update quote request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quoteRequests"] });
      toast({ title: "Updated", description: "Quote request updated successfully." });
      setShowEditDialog(false);
      setEditingRequest(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update quote request.", variant: "destructive" });
    },
  });

  const deleteQuoteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/quote-requests/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete quote request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quoteRequests"] });
      toast({ title: "Deleted", description: "Quote request has been deleted." });
      if (expandedId) setExpandedId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete quote request.", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/quote-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quoteRequests"] });
      toast({ title: "Status Updated", description: "Quote request status has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const regenerateReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/quote-requests/${id}/generate-review`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to trigger AI review");
      return response.json();
    },
    onSuccess: (_, id) => {
      toast({ title: "AI Review Started", description: "The review is being generated. It will appear shortly." });
      setAiReviews(prev => ({ ...prev, [id]: undefined }));
      setLoadingAiReviews(prev => ({ ...prev, [id]: false }));
      setTimeout(() => {
        fetchAiReview(id, 1);
      }, 5000);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start AI review.", variant: "destructive" });
    },
  });

  const [generatingShippingFor, setGeneratingShippingFor] = useState<string | null>(null);

  const generateShippingEstimateMutation = useMutation({
    mutationFn: async ({ productId, destination, qty, quoteRequestId }: { productId: string; destination: string; qty: number; quoteRequestId: string }) => {
      const response = await fetch("/api/shipping/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, destination, qty, method: "Air", incoterm: "DAP", quoteRequestId }),
      });
      if (!response.ok) throw new Error("Failed to generate shipping estimate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quoteRequests"] });
      setGeneratingShippingFor(null);
      toast({ title: "Shipping Estimate Generated", description: "The estimate has been saved to this quote request." });
    },
    onError: () => {
      setGeneratingShippingFor(null);
      toast({ title: "Error", description: "Failed to generate shipping estimate.", variant: "destructive" });
    },
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "closed_won": return "bg-green-100 text-green-800";
      case "closed_lost": return "bg-red-100 text-red-800";
      case "active":
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress": return "In Progress";
      case "closed_won": return "Closed Won";
      case "closed_lost": return "Closed Lost";
      case "active":
      default: return "Active";
    }
  };

  const fetchAiReview = async (requestId: string, retries = 0) => {
    if (loadingAiReviews[requestId]) return;
    if (aiReviews[requestId] && retries === 0) return;
    setLoadingAiReviews(prev => ({ ...prev, [requestId]: true }));
    try {
      const response = await fetch(`/api/quote-requests/${requestId}/ai-review`);
      if (response.ok) {
        const data = await response.json();
        if (data.aiReview) {
          setAiReviews(prev => ({ ...prev, [requestId]: data.aiReview }));
        } else if (retries < 3) {
          setTimeout(() => fetchAiReview(requestId, retries + 1), 5000);
          return;
        } else {
          setAiReviews(prev => ({ ...prev, [requestId]: null }));
        }
      } else {
        setAiReviews(prev => ({ ...prev, [requestId]: null }));
      }
    } catch {
      setAiReviews(prev => ({ ...prev, [requestId]: null }));
    } finally {
      setLoadingAiReviews(prev => ({ ...prev, [requestId]: false }));
    }
  };

  useEffect(() => {
    if (expandedId) {
      const request = requests.find(r => r.id === expandedId);
      if (request && (request.status === "closed_won" || request.status === "closed_lost")) {
        fetchAiReview(expandedId);
      }
    }
  }, [expandedId, requests]);

  const handleGenerateInvoice = (request: QuoteRequest) => {
    setSelectedRequest(request);
    generateInvoiceMutation.mutate(request.id);
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

  const handleEditRequest = (request: QuoteRequest) => {
    setEditingRequest(request);
    setEditFormData({
      firstName: request.firstName || "",
      lastName: request.lastName || "",
      email: request.email || "",
      organizationName: request.organizationName || "",
      organizationType: request.organizationType || "",
      orderQuantity: request.orderQuantity || "",
      shippingCountry: request.shippingCountry || "",
      shippingAddress: request.shippingAddress || "",
      productName: request.productName || "",
      status: request.status || "active",
      decisionTimeline: request.decisionTimeline || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingRequest) return;
    updateQuoteRequestMutation.mutate({
      id: editingRequest.id,
      data: editFormData,
    });
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
            Export for AI Review
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
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-4">
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
                      <div>
                        <div className="text-sm text-muted-foreground">Status</div>
                        <Badge 
                          className={getStatusBadgeClass(request.status || 'active')}
                          data-testid={`badge-status-${request.id}`}
                        >
                          {getStatusLabel(request.status || 'active')}
                        </Badge>
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
                          <Select
                            value={request.status || 'active'}
                            onValueChange={(value) => updateStatusMutation.mutate({ id: request.id, status: value })}
                          >
                            <SelectTrigger className="w-[160px] h-8" data-testid={`select-status-${request.id}`}>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active" data-testid={`select-status-option-active-${request.id}`}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  Active
                                </span>
                              </SelectItem>
                              <SelectItem value="in_progress" data-testid={`select-status-option-in_progress-${request.id}`}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  In Progress
                                </span>
                              </SelectItem>
                              <SelectItem value="closed_won" data-testid={`select-status-option-closed_won-${request.id}`}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  Closed Won
                                </span>
                              </SelectItem>
                              <SelectItem value="closed_lost" data-testid={`select-status-option-closed_lost-${request.id}`}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  Closed Lost
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
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


                      {/* Shipping Estimate Section */}
                      {request.shippingEstimate && request.shippingEstimate.costRange ? (
                        <div className="border rounded-lg p-4 bg-blue-50/50 space-y-3" data-testid={`shipping-estimate-section-${request.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Ship className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-semibold">Shipping Estimate</span>
                              <Badge variant={request.shippingEstimate.confidence === "High" ? "default" : request.shippingEstimate.confidence === "Medium" ? "secondary" : "destructive"} className="text-xs">
                                {request.shippingEstimate.confidence}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{request.shippingEstimate.method} · {request.shippingEstimate.incoterm}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded bg-green-100/50 p-2 text-center">
                              <div className="text-xs text-muted-foreground">Low</div>
                              <div className="font-mono text-sm font-semibold text-green-700">${request.shippingEstimate.costRange.low.toLocaleString()}</div>
                            </div>
                            <div className="rounded bg-blue-100/50 p-2 text-center">
                              <div className="text-xs text-muted-foreground">Mid</div>
                              <div className="font-mono text-sm font-semibold text-blue-700">${request.shippingEstimate.costRange.mid.toLocaleString()}</div>
                            </div>
                            <div className="rounded bg-orange-100/50 p-2 text-center">
                              <div className="text-xs text-muted-foreground">High</div>
                              <div className="font-mono text-sm font-semibold text-orange-700">${request.shippingEstimate.costRange.high.toLocaleString()}</div>
                            </div>
                          </div>
                          {request.shippingEstimate.weightInfo && (
                            <div className="text-xs text-muted-foreground">
                              {request.shippingEstimate.qty}× units · {request.shippingEstimate.weightInfo.chargeable} kg chargeable · {request.shippingEstimate.weightInfo.driverNote}
                            </div>
                          )}
                        </div>
                      ) : request.productId && request.shippingCountry ? (
                        <div className="flex items-center gap-2" data-testid={`shipping-estimate-generate-${request.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={generatingShippingFor === request.id}
                            onClick={() => {
                              setGeneratingShippingFor(request.id);
                              generateShippingEstimateMutation.mutate({
                                productId: request.productId,
                                destination: request.shippingCountry,
                                qty: parseInt(request.orderQuantity || "1") || 1,
                                quoteRequestId: request.id,
                              });
                            }}
                            data-testid={`button-generate-shipping-${request.id}`}
                          >
                            {generatingShippingFor === request.id ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Estimating…</>
                            ) : (
                              <><Ship className="h-4 w-4 mr-2" />Generate Shipping Estimate</>
                            )}
                          </Button>
                        </div>
                      ) : null}

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewConversation(request)}
                          data-testid={`button-view-conversation-${request.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Conversation
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleGenerateInvoice(request)}
                          disabled={generateInvoiceMutation.isPending}
                          data-testid={`button-generate-invoice-${request.id}`}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {generateInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditRequest(request)}
                          data-testid={`button-edit-quote-${request.id}`}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              data-testid={`button-delete-quote-${request.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Quote Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this quote request from {request.firstName} {request.lastName}? This will also delete all associated conversation messages and invoices. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteQuoteRequestMutation.mutate(request.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid={`button-confirm-delete-quote-${request.id}`}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {(request.status === "closed_won" || request.status === "closed_lost") && (
                        <div className="border-t pt-4 mt-4" data-testid={`ai-review-section-${request.id}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Brain className="h-5 w-5 text-purple-600" />
                            <h3 className="font-semibold text-sm">AI Review</h3>
                          </div>
                          {loadingAiReviews[request.id] ? (
                            <div className="flex items-center gap-2 text-muted-foreground" data-testid={`ai-review-loading-${request.id}`}>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Loading AI review...</span>
                            </div>
                          ) : aiReviews[request.id] ? (
                            <div className="space-y-3" data-testid={`ai-review-content-${request.id}`}>
                              {aiReviews[request.id].summary && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary</div>
                                  <p className="text-sm" data-testid={`ai-review-summary-${request.id}`}>{aiReviews[request.id].summary}</p>
                                </div>
                              )}
                              {aiReviews[request.id].customerSentiment && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Customer Sentiment</div>
                                  <Badge className="bg-purple-100 text-purple-800" data-testid={`ai-review-sentiment-${request.id}`}>
                                    {aiReviews[request.id].customerSentiment}
                                  </Badge>
                                </div>
                              )}
                              {aiReviews[request.id].keyFactors && aiReviews[request.id].keyFactors.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Key Factors</div>
                                  <div className="flex flex-wrap gap-1" data-testid={`ai-review-factors-${request.id}`}>
                                    {aiReviews[request.id].keyFactors.map((factor: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs" data-testid={`ai-review-factor-${request.id}-${idx}`}>
                                        {factor}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {aiReviews[request.id].whatWorked && aiReviews[request.id].whatWorked.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">What Worked</div>
                                  <div className="flex flex-wrap gap-1" data-testid={`ai-review-worked-${request.id}`}>
                                    {aiReviews[request.id].whatWorked.map((item: string, idx: number) => (
                                      <Badge key={idx} className="bg-green-100 text-green-800 text-xs" data-testid={`ai-review-worked-item-${request.id}-${idx}`}>
                                        {item}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {aiReviews[request.id].whatCouldImprove && aiReviews[request.id].whatCouldImprove.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">What Could Improve</div>
                                  <div className="flex flex-wrap gap-1" data-testid={`ai-review-improve-${request.id}`}>
                                    {aiReviews[request.id].whatCouldImprove.map((item: string, idx: number) => (
                                      <Badge key={idx} className="bg-orange-100 text-orange-800 text-xs" data-testid={`ai-review-improve-item-${request.id}-${idx}`}>
                                        {item}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3" data-testid={`ai-review-pending-${request.id}`}>
                              <p className="text-sm text-muted-foreground italic">
                                AI review pending...
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => regenerateReviewMutation.mutate(request.id)}
                                disabled={regenerateReviewMutation.isPending}
                                data-testid={`button-regenerate-review-${request.id}`}
                              >
                                {regenerateReviewMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Brain className="h-3 w-3 mr-1" />
                                )}
                                Generate Review
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
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
            <DialogDescription className="sr-only">View the conversation history for this quote request</DialogDescription>
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
                          ? 'bg-primary text-primary-foreground whitespace-pre-line'
                          : 'bg-muted text-foreground chat-markdown'
                      }`}
                      data-testid={`chat-message-${msg.role}-${idx}`}
                    >
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Proforma Invoice - {currentInvoice?.referenceNumber}
            </DialogTitle>
            <DialogDescription className="sr-only">Preview and edit the proforma invoice</DialogDescription>
          </DialogHeader>
          
          {currentInvoice && (
            <ProformaInvoicePreview 
              invoice={currentInvoice}
              onSave={(updatedInvoice) => setCurrentInvoice(updatedInvoice)}
              onSendEmail={(invoice) => sendInvoiceEmailMutation.mutate(invoice)}
              editable={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quote Request Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Quote Request</DialogTitle>
            <DialogDescription>Update the details of this quote request</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  data-testid="input-edit-firstName"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  data-testid="input-edit-lastName"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-organizationName">Organization</Label>
              <Input
                id="edit-organizationName"
                value={editFormData.organizationName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                data-testid="input-edit-organizationName"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Type</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                  {editFormData.organizationType || "N/A"}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-productName">Product</Label>
                <Input
                  id="edit-productName"
                  value={editFormData.productName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, productName: e.target.value }))}
                  data-testid="input-edit-productName"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-orderQuantity">Quantity</Label>
                <Input
                  id="edit-orderQuantity"
                  value={editFormData.orderQuantity}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, orderQuantity: e.target.value }))}
                  data-testid="input-edit-orderQuantity"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-shippingCountry">Shipping Country</Label>
                <Input
                  id="edit-shippingCountry"
                  value={editFormData.shippingCountry}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, shippingCountry: e.target.value }))}
                  data-testid="input-edit-shippingCountry"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-decisionTimeline">Timeline</Label>
                <Input
                  id="edit-decisionTimeline"
                  value={editFormData.decisionTimeline}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, decisionTimeline: e.target.value }))}
                  data-testid="input-edit-decisionTimeline"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-shippingAddress">Shipping Address</Label>
              <Input
                id="edit-shippingAddress"
                value={editFormData.shippingAddress}
                onChange={(e) => setEditFormData(prev => ({ ...prev, shippingAddress: e.target.value }))}
                placeholder="Full shipping address"
                data-testid="input-edit-shippingAddress"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateQuoteRequestMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateQuoteRequestMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
