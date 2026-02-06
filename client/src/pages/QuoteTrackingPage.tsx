import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Clock, CheckCircle2, Package, 
  Mail, AlertCircle, FileText
} from "lucide-react";

interface QuoteResult {
  id: string;
  productName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function statusLabel(status: string) {
  switch (status) {
    case "active": return "In Progress";
    case "completed": return "Quote Ready";
    case "sent": return "Quote Sent";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": return "secondary";
    case "completed": return "default";
    case "sent": return "default";
    default: return "outline";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "active": return <Clock className="h-4 w-4 text-yellow-500" />;
    case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "sent": return <Package className="h-4 w-4 text-blue-500" />;
    default: return <FileText className="h-4 w-4 text-gray-400" />;
  }
}

export default function QuoteTrackingPage() {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSearching(true);
    setError("");
    setResults([]);
    setSearched(false);

    try {
      const response = await fetch(`/api/quote-requests/track?email=${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setSearched(true);
      } else {
        setError("Unable to look up quotes. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2" data-testid="text-track-title">Track Your Quotes</h1>
              <p className="text-muted-foreground">
                Enter your email address to see all your quote requests and their current status
              </p>
            </div>

            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Enter your email address..."
                      className="pl-10 h-12"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      data-testid="input-tracking-email"
                    />
                  </div>
                  <Button
                    size="lg"
                    onClick={handleSearch}
                    disabled={isSearching}
                    data-testid="button-search-quotes"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? "Searching..." : "Look Up"}
                  </Button>
                </div>
                {error && (
                  <div className="mt-4 flex items-center gap-2 text-destructive" data-testid="text-tracking-error">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {searched && results.length === 0 && (
              <Card className="bg-slate-50">
                <CardContent className="p-6 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1" data-testid="text-no-quotes">No quotes found</h3>
                  <p className="text-sm text-muted-foreground">
                    We couldn't find any quote requests associated with this email address. 
                    Make sure you're using the same email you provided during the quote process.
                  </p>
                </CardContent>
              </Card>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold" data-testid="text-results-count">
                  {results.length} quote{results.length !== 1 ? "s" : ""} found
                </h2>
                {results.map((quote) => (
                  <Card key={quote.id} className="hover:shadow-md transition-shadow" data-testid={`card-quote-${quote.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <StatusIcon status={quote.status} />
                          {quote.productName || "Quote Request"}
                        </CardTitle>
                        <Badge variant={statusVariant(quote.status)} data-testid={`badge-status-${quote.id}`}>
                          {statusLabel(quote.status)}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        ID: {quote.id.slice(0, 8)}...
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Submitted</span>
                          <p className="font-medium">{new Date(quote.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Updated</span>
                          <p className="font-medium">{new Date(quote.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!searched && (
              <Card className="bg-slate-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">How It Works</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                      <span>Enter the email address you used when requesting a quote</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                      <span>View all your quote requests and their current status</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                      <span>Check back anytime to see updates on your quotes</span>
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
