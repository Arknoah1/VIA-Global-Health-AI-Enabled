import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, MessageSquare, Clock, CheckCircle2, Package, 
  ArrowRight, Mail, Phone, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

interface QuoteStatus {
  id: string;
  productName: string;
  status: 'pending' | 'quoted' | 'accepted' | 'shipped';
  submittedDate: string;
  lastUpdate: string;
  messages: number;
}

export default function QuoteTrackingPage() {
  const [trackingId, setTrackingId] = useState("");
  const [searchResult, setSearchResult] = useState<QuoteStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!trackingId.trim()) return;
    
    setIsSearching(true);
    setError("");
    setSearchResult(null);

    try {
      const response = await fetch(`/api/quote-requests/${trackingId}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResult({
          id: data.id,
          productName: data.productName,
          status: data.status === 'active' ? 'pending' : data.status,
          submittedDate: new Date(data.createdAt).toLocaleDateString(),
          lastUpdate: new Date(data.updatedAt).toLocaleDateString(),
          messages: Array.isArray(data.conversation) ? data.conversation.length : 0
        });
      } else {
        setError("Quote not found. Please check your tracking ID.");
      }
    } catch (err) {
      setError("Unable to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const statusSteps = [
    { key: 'pending', label: 'Quote Requested', icon: Clock },
    { key: 'quoted', label: 'Quote Sent', icon: Mail },
    { key: 'accepted', label: 'Quote Accepted', icon: CheckCircle2 },
    { key: 'shipped', label: 'Order Shipped', icon: Package }
  ];

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex(s => s.key === status);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2">Track Your Quote</h1>
              <p className="text-muted-foreground">
                Enter your quote tracking ID to see the status of your request
              </p>
            </div>

            {/* Search Form */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Enter your quote tracking ID..."
                      className="pl-10 h-12"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      data-testid="input-tracking-id"
                    />
                  </div>
                  <Button 
                    size="lg" 
                    onClick={handleSearch}
                    disabled={isSearching}
                    data-testid="button-search-quote"
                  >
                    {isSearching ? "Searching..." : "Track"}
                  </Button>
                </div>
                {error && (
                  <div className="mt-4 flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Result */}
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      {searchResult.productName}
                    </CardTitle>
                    <CardDescription>
                      Quote ID: {searchResult.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Status Timeline */}
                    <div className="relative">
                      <div className="flex justify-between">
                        {statusSteps.map((step, idx) => {
                          const Icon = step.icon;
                          const currentIdx = getStatusIndex(searchResult.status);
                          const isCompleted = idx <= currentIdx;
                          const isCurrent = idx === currentIdx;
                          
                          return (
                            <div key={step.key} className="flex flex-col items-center relative z-10">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                isCompleted 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-slate-100 text-slate-400'
                              } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <span className={`text-xs mt-2 text-center ${
                                isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Progress Line */}
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 -z-0">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ 
                            width: `${(getStatusIndex(searchResult.status) / (statusSteps.length - 1)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                      <div>
                        <span className="text-muted-foreground">Submitted</span>
                        <p className="font-medium">{searchResult.submittedDate}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Update</span>
                        <p className="font-medium">{searchResult.lastUpdate}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Messages</span>
                        <p className="font-medium">{searchResult.messages} messages</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status</span>
                        <p className="font-medium capitalize">{searchResult.status}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 border-t pt-4">
                      <Button variant="outline" className="flex-1" data-testid="button-view-messages">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Messages
                      </Button>
                      <Button className="flex-1" data-testid="button-contact-support">
                        <Phone className="h-4 w-4 mr-2" />
                        Contact Support
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Help Section */}
            {!searchResult && (
              <Card className="bg-slate-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Need Help?</h3>
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      Your tracking ID was sent to your email when you submitted your quote request.
                    </p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>Check your email for the confirmation message</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>Contact us at support@viaglobalhealth.com</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
