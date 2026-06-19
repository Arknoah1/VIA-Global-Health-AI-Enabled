import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Ship, Package, Fuel, TrendingUp, BarChart3, RefreshCw, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShippingEstimate {
  costRange: { low: number; mid: number; high: number } | null;
  confidence: "High" | "Medium" | "Low";
  confidenceSource: string;
  comparableDeals: any[];
  weightInfo: { totalActual: number; totalVolumetric: number; chargeable: number; driverNote: string; cbm: number } | null;
  fuelData: { price: number | null; multiplier: number; delta: number; label: string } | null;
  dhlContext: any;
  combinedMultiplier: number;
  hubspotRawEstimate: number | null;
  fuelAdjEstimate: number | null;
  aiAnalysis: string;
  product: { name: string; pickupCountry: string | null };
  destination: string;
  qty: number;
  method: string;
  incoterm: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  pickupCountry: string | null;
  shippingLengthCm: number | null;
  shippingWidthCm: number | null;
  shippingDepthCm: number | null;
  shippingWeightKg: number | null;
  price: number;
}

const METHODS = ["Air", "Sea", "Courier", "Road"];
const INCOTERMS = ["DAP", "CIP", "CIF", "Ex-Factory", "DDP", "FOB"];

function ConfidenceBadge({ level }: { level: string }) {
  const variant = level === "High" ? "default" : level === "Medium" ? "secondary" : "destructive";
  return <Badge variant={variant} data-testid={`badge-confidence-${level.toLowerCase()}`}>{level}</Badge>;
}

function CostCard({ label, value, highlight, confidence }: { label: string; value: string; highlight?: boolean; confidence?: string }) {
  return (
    <Card className={highlight ? "border-primary/50 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold font-mono">{value}</div>
        {confidence && <div className="mt-2"><ConfidenceBadge level={confidence} /></div>}
      </CardContent>
    </Card>
  );
}

function SourceBadge({ source }: { source: string }) {
  if (source === "hubspot") {
    return (
      <Badge
        variant="outline"
        className="text-xs border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400"
        data-testid="badge-source-hubspot"
      >
        HubSpot
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground" data-testid="badge-source-historical">
      Historical
    </Badge>
  );
}

function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatTimeUntil(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function CacheFreshnessLine({ fetchedAt, expiresAt }: { fetchedAt?: string | null; expiresAt?: string | null }) {
  if (!fetchedAt) return null;
  return (
    <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1" data-testid="text-cache-freshness">
      <Clock className="h-3 w-3 inline" />
      Fetched {formatRelativeTime(fetchedAt)} · expires in {formatTimeUntil(expiresAt)}
    </p>
  );
}

export default function ShippingEstimatorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [destination, setDestination] = useState("");
  const [qty, setQty] = useState("1");
  const [method, setMethod] = useState("Air");
  const [incoterm, setIncoterm] = useState("DAP");
  const [result, setResult] = useState<ShippingEstimate | null>(null);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      return res.json();
    },
  });

  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["shipping-deals"],
    queryFn: async () => {
      const res = await fetch("/api/shipping/deals");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: marketData } = useQuery<any>({
    queryKey: ["shipping-market-data"],
    queryFn: async () => {
      const res = await fetch("/api/shipping/market-data");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const estimateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shipping/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, destination, qty: parseInt(qty), method, incoterm }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate estimate");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Estimate generated", description: `${data.confidence} confidence for ${data.product.name} → ${data.destination}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const hubspotSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shipping/sync-hubspot", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to sync HubSpot deals");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shipping-deals"] });
      queryClient.invalidateQueries({ queryKey: ["shipping-market-data"] });
      const skipReasons: string[] = [];
      if (data.skippedReasons?.missingAmount > 0) skipReasons.push(`${data.skippedReasons.missingAmount} no amount`);
      if (data.skippedReasons?.unparseableProduct > 0) skipReasons.push(`${data.skippedReasons.unparseableProduct} unparseable product`);
      if (data.skippedReasons?.unparseableCountry > 0) skipReasons.push(`${data.skippedReasons.unparseableCountry} unparseable country`);
      const parts = [
        data.added > 0 ? `${data.added} added` : null,
        data.updated > 0 ? `${data.updated} updated` : null,
        data.skipped > 0 ? `${data.skipped} skipped${skipReasons.length > 0 ? ` (${skipReasons.join(", ")})` : ""}` : null,
        data.errors > 0 ? `${data.errors} errors` : null,
        data.syntheticCount > 0 ? `${data.syntheticCount} use ~12% est.` : null,
      ].filter(Boolean);
      toast({
        title: "HubSpot Sync Complete",
        description: parts.length > 0 ? parts.join(" · ") : "No changes",
      });
    },
    onError: (err: Error) => {
      toast({ title: "HubSpot Sync Failed", description: err.message, variant: "destructive" });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (type?: string) => {
      const res = await fetch("/api/shipping/refresh-market-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to refresh market data");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-market-data"] });
      queryClient.invalidateQueries({ queryKey: ["shipping-deals"] });
      toast({ title: "Market data refreshed" });
    },
    onError: (err: Error) => {
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
    },
  });

  const selectedProduct = products.find((p: Product) => p.id === productId);
  const allCountries = [...new Set(deals.map((d: any) => d.country))].filter(Boolean).sort();

  const lastSync = marketData?.lastHubspotSync;
  const hubspotDealCount = deals.filter((d: any) => d.source === "hubspot").length;
  const historicalDealCount = deals.filter((d: any) => d.source !== "hubspot").length;

  return (
    <div className="flex min-h-screen bg-background" data-testid="page-shipping-estimator">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ship className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold" data-testid="text-page-title">Shipping Estimator</h1>
                <p className="text-sm text-muted-foreground">Estimate shipping costs using historical deals and live market data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {marketData && (
                <>
                  <Badge variant="outline" className="font-mono text-xs" data-testid="badge-deal-count">
                    {marketData.dealCount} deals
                  </Badge>
                  {marketData.fuel?.price && (
                    <Badge variant="outline" className="font-mono text-xs" data-testid="badge-fuel-price">
                      ⛽ ${marketData.fuel.price.toFixed(2)}/gal
                    </Badge>
                  )}
                  {marketData.dhl?.reportMonth && (
                    <Badge variant="outline" className="font-mono text-xs" data-testid="badge-dhl-report">
                      DHL {marketData.dhl.reportMonth}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="quote" data-testid="tabs-shipping">
            <TabsList>
              <TabsTrigger value="quote" data-testid="tab-quote">New Quote</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">Deal History</TabsTrigger>
              <TabsTrigger value="market" data-testid="tab-market">Market Data</TabsTrigger>
            </TabsList>

            <TabsContent value="quote" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Quote Parameters
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Product *</label>
                        <Select value={productId} onValueChange={setProductId}>
                          <SelectTrigger data-testid="select-product">
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p: Product) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.pickupCountry || "Unknown"})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedProduct && (
                        <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                          <div>📦 {selectedProduct.shippingLengthCm && selectedProduct.shippingWidthCm && selectedProduct.shippingDepthCm
                            ? `${selectedProduct.shippingLengthCm}×${selectedProduct.shippingWidthCm}×${selectedProduct.shippingDepthCm} cm`
                            : "Dims not on file"}</div>
                          <div>⚖️ {selectedProduct.shippingWeightKg ? `${selectedProduct.shippingWeightKg} kg GW` : "Weight not on file"}</div>
                          <div>💰 ${(selectedProduct.price / 100).toFixed(2)}/unit</div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Destination *</label>
                        <Input
                          list="countries"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="e.g. Kenya"
                          data-testid="input-destination"
                        />
                        <datalist id="countries">
                          {allCountries.map((c: string) => <option key={c} value={c} />)}
                        </datalist>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty *</label>
                          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} data-testid="input-qty" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</label>
                          <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger data-testid="select-method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Incoterm</label>
                        <Select value={incoterm} onValueChange={setIncoterm}>
                          <SelectTrigger data-testid="select-incoterm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INCOTERMS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => estimateMutation.mutate()}
                        disabled={estimateMutation.isPending || !productId || !destination || !qty}
                        data-testid="button-generate-estimate"
                      >
                        {estimateMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing…</>
                        ) : (
                          "Generate Estimate →"
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {marketData?.fuel && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Rate Multipliers
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {marketData.fuel.price && (
                            <span>⛽ <strong>{marketData.fuel.multiplier}×</strong></span>
                          )}
                          {marketData.dhl?.overallRateMultiplierSuggestion && (
                            <>
                              <span className="text-muted-foreground">×</span>
                              <span>DHL <strong>{marketData.dhl.overallRateMultiplierSuggestion}×</strong></span>
                            </>
                          )}
                          <Badge variant="outline" className="ml-auto font-mono">
                            = {((marketData.fuel?.multiplier || 1) * (marketData.dhl?.overallRateMultiplierSuggestion || 1)).toFixed(4)}×
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-4">
                  {!result && !estimateMutation.isPending && (
                    <Card className="flex flex-col items-center justify-center min-h-[420px]">
                      <CardContent className="text-center space-y-3 py-16">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">Select product and destination, then click <strong>Generate Estimate</strong></p>
                        <p className="text-xs text-muted-foreground">
                          Sources: {[
                            marketData?.dealCount && `${marketData.dealCount} deals`,
                            marketData?.fuel?.price && "FRED fuel",
                            marketData?.dhl && "DHL intel",
                          ].filter(Boolean).join(" · ") || "Loading…"}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {estimateMutation.isPending && (
                    <Card>
                      <CardContent className="py-16 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Analyzing {deals.length} deals + live market data…</p>
                      </CardContent>
                    </Card>
                  )}

                  {result && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <CostCard
                          label="Historical Raw"
                          value={result.hubspotRawEstimate ? `$${result.hubspotRawEstimate.toLocaleString()}` : "N/A"}
                          confidence={result.confidence}
                        />
                        <CostCard
                          label="Fuel Adj."
                          value={result.fuelAdjEstimate ? `$${result.fuelAdjEstimate.toLocaleString()}` : "N/A"}
                        />
                        <CostCard
                          label="Combined Est."
                          value={result.fuelAdjEstimate ? `$${Math.round(result.fuelAdjEstimate).toLocaleString()}` : "N/A"}
                          highlight
                        />
                      </div>

                      {result.weightInfo && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              Weight · {result.qty}× {result.method}
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                ["Actual", `${result.weightInfo.totalActual} kg`],
                                ["Volumetric", `${result.weightInfo.totalVolumetric} kg`],
                                ["CBM", `${result.weightInfo.cbm} m³`],
                                ["Chargeable", `${result.weightInfo.chargeable} kg`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-lg bg-muted/50 p-3">
                                  <div className="text-xs text-muted-foreground">{label}</div>
                                  <div className="font-mono text-sm font-semibold">{value}</div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">{result.weightInfo.driverNote}</p>
                          </CardContent>
                        </Card>
                      )}

                      {result.comparableDeals.length > 0 && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground mb-3">📊 {result.confidenceSource}</div>
                            {result.comparableDeals.map((d: any, i: number) => (
                              <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                                <span className="text-sm text-muted-foreground">{d.qty}× {d.product} → {d.country}</span>
                                <div className="flex items-center gap-2">
                                  {d.source === "historical" ? (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">Historical</Badge>
                                  ) : d.source === "hubspot" ? (
                                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 border-purple-200">HubSpot</Badge>
                                  ) : d.source ? (
                                    <Badge variant="outline" className="text-xs">{d.source}</Badge>
                                  ) : null}
                                  {d.method && <Badge variant="outline" className="text-xs">{d.method}</Badge>}
                                  <span className="font-mono font-semibold text-sm">${d.shippingCost?.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                            <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                              Only <span className="font-medium text-green-700">Historical</span> deals are used for quote generation. HubSpot deals use a synthetic 12%-of-deal-value estimate and are shown for reference only.
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {result.costRange && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              AI Analysis · Live Market Data
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              <div className="rounded-lg bg-green-500/10 p-3 text-center">
                                <div className="text-xs text-muted-foreground">Low</div>
                                <div className="font-mono text-lg font-bold text-green-600">${result.costRange.low.toLocaleString()}</div>
                              </div>
                              <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                                <div className="text-xs text-muted-foreground">Mid</div>
                                <div className="font-mono text-lg font-bold text-blue-600">${result.costRange.mid.toLocaleString()}</div>
                              </div>
                              <div className="rounded-lg bg-orange-500/10 p-3 text-center">
                                <div className="text-xs text-muted-foreground">High</div>
                                <div className="font-mono text-lg font-bold text-orange-600">${result.costRange.high.toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="prose prose-sm max-w-none text-sm text-muted-foreground whitespace-pre-line" data-testid="text-ai-analysis">
                              {result.aiAnalysis.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                                i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {result.dhlContext && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold text-amber-600">DHL {result.dhlContext.reportMonth}: </span>
                              {result.dhlContext.executiveSummary}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Historical Shipping Deals</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {deals.length} deals from {[...new Set(deals.map((d: any) => d.country))].length} countries
                        {hubspotDealCount > 0 && (
                          <span className="ml-2">
                            <Badge variant="outline" className="text-xs border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400">
                              {hubspotDealCount} HubSpot
                            </Badge>
                            {" "}
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {historicalDealCount} Historical
                            </Badge>
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => hubspotSyncMutation.mutate()}
                        disabled={hubspotSyncMutation.isPending}
                        data-testid="button-sync-hubspot"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${hubspotSyncMutation.isPending ? "animate-spin" : ""}`} />
                        {hubspotSyncMutation.isPending ? "Syncing..." : "Sync HubSpot"}
                      </Button>
                      {lastSync?.lastSyncedAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-last-synced">
                          <Clock className="h-3 w-3" />
                          Last synced {formatRelativeTime(lastSync.lastSyncedAt)}
                          {(lastSync.added != null || lastSync.updated != null) && (
                            <span className="ml-1 text-muted-foreground/60">
                              ·{lastSync.added > 0 ? ` ${lastSync.added} added` : ""}
                              {lastSync.updated > 0 ? ` ${lastSync.updated} updated` : ""}
                              {lastSync.skipped > 0 ? `, ${lastSync.skipped} skipped` : ""}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Incoterm</TableHead>
                          <TableHead className="text-right">Product Value</TableHead>
                          <TableHead className="text-right">Shipping</TableHead>
                          <TableHead className="text-right">% of Value</TableHead>
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deals.map((d: any, i: number) => (
                          <TableRow key={i} data-testid={`row-deal-${i}`}>
                            <TableCell>
                              <SourceBadge source={d.source} />
                            </TableCell>
                            <TableCell className="font-medium">{d.country}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[150px] truncate">{d.product}</TableCell>
                            <TableCell className="text-center font-mono">{d.qty}</TableCell>
                            <TableCell>
                              {d.method ? <Badge variant="outline" className="text-xs">{d.method}</Badge> : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{d.incoterm || "—"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {d.productValue ? `$${Number(d.productValue).toLocaleString()}` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                              <span>${Number(d.shippingCost).toLocaleString()}</span>
                              {d.isSyntheticShipping && (
                                <span className="ml-1 text-xs font-normal text-muted-foreground">~Est.</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {d.productValue && d.shippingCost ? `${((d.shippingCost / d.productValue) * 100).toFixed(1)}%` : "—"}
                            </TableCell>
                            <TableCell>
                              {d.sourceUrl ? (
                                <a
                                  href={d.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-blue-500 transition-colors"
                                  title="Open in HubSpot"
                                  data-testid={`link-deal-hubspot-${i}`}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {hubspotDealCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />
                      HubSpot deals show shipping as ~12% of deal value (synthetic estimate). Only Historical deals are used for quote generation.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="market" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Fuel className="h-4 w-4" />
                        Jet Fuel · EIA
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshMutation.mutate("fuel")}
                        disabled={refreshMutation.isPending}
                        data-testid="button-refresh-fuel"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {marketData?.fuel?.price ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="text-3xl font-bold font-mono">${marketData.fuel.price.toFixed(2)}<span className="text-sm text-muted-foreground font-normal">/gal</span></div>
                          <div className="flex flex-col items-end gap-1">
                            {marketData.fuel.isFallback && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700" data-testid="badge-fuel-fallback">
                                Fallback rate
                              </Badge>
                            )}
                            <Badge variant={marketData.fuel.label === "elevated" ? "destructive" : marketData.fuel.label === "low" ? "default" : "secondary"}>
                              {marketData.fuel.delta > 0 ? "+" : ""}{marketData.fuel.delta}% vs baseline
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {marketData.fuel.isFallback
                            ? "EIA/FRED unavailable · using $1.80/gal baseline — multiplier may not reflect current market"
                            : `Fuel ${marketData.fuel.label} · `}
                          {!marketData.fuel.isFallback && <strong>{marketData.fuel.multiplier}×</strong>}
                          {!marketData.fuel.isFallback && " applied to estimates"}
                        </p>
                        {marketData.fuel.date && (
                          <p className="text-xs text-muted-foreground/70">
                            As of {new Date(marketData.fuel.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Source: EIA/FRED
                          </p>
                        )}
                        <CacheFreshnessLine fetchedAt={marketData.fuel.fetchedAt} expiresAt={marketData.fuel.expiresAt} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No fuel data available. Click Refresh to fetch.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        DHL Market Intelligence
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshMutation.mutate("dhl")}
                        disabled={refreshMutation.isPending}
                        data-testid="button-refresh-dhl"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {marketData?.dhl ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{marketData.dhl.reportMonth}</Badge>
                          {marketData.dhl.overallRateMultiplierSuggestion && (
                            <Badge variant="secondary" className="font-mono" data-testid="badge-dhl-multiplier">
                              {marketData.dhl.overallRateMultiplierSuggestion}× rate multiplier
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{marketData.dhl.executiveSummary}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded bg-muted/50 p-2">
                            <div className="text-muted-foreground">Demand</div>
                            <div className="font-semibold capitalize">{marketData.dhl.globalDemandTrend}</div>
                          </div>
                          <div className="rounded bg-muted/50 p-2">
                            <div className="text-muted-foreground">Rate Outlook</div>
                            <div className="font-semibold capitalize">{marketData.dhl.rateOutlook}</div>
                          </div>
                        </div>
                        {marketData.dhl.keyRisks?.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Key Risks
                            </div>
                            {marketData.dhl.keyRisks.map((risk: string, i: number) => (
                              <p key={i} className="text-xs text-muted-foreground">• {risk}</p>
                            ))}
                          </div>
                        )}
                        <CacheFreshnessLine fetchedAt={marketData.dhl.fetchedAt} expiresAt={marketData.dhl.expiresAt} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No DHL intel available. Click Refresh to fetch the latest report.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Data Source Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        {
                          name: "Historical Deals",
                          desc: `${historicalDealCount} deals used for estimates · ${hubspotDealCount} HubSpot (display only)`,
                          status: historicalDealCount > 0 ? "Live" : "Empty",
                          ok: historicalDealCount > 0,
                        },
                        {
                          name: "EIA Jet Fuel",
                          desc: marketData?.fuel?.price
                            ? `$${marketData.fuel.price.toFixed(2)}/gal · ${marketData.fuel.label}${marketData.fuel.date ? ` · as of ${marketData.fuel.date}` : ""}${marketData.fuel.fetchedAt ? ` · fetched ${formatRelativeTime(marketData.fuel.fetchedAt)}` : ""}`
                            : "Not fetched",
                          status: marketData?.fuel?.price ? "Live" : "Pending",
                          ok: !!marketData?.fuel?.price,
                        },
                        {
                          name: "DHL Intelligence",
                          desc: marketData?.dhl
                            ? `${marketData.dhl.reportMonth} report · ${marketData.dhl.overallRateMultiplierSuggestion ? `${marketData.dhl.overallRateMultiplierSuggestion}× multiplier` : ""}${marketData.dhl.fetchedAt ? ` · fetched ${formatRelativeTime(marketData.dhl.fetchedAt)}` : ""}`
                            : "Not fetched",
                          status: marketData?.dhl ? "Live" : "Pending",
                          ok: !!marketData?.dhl,
                        },
                        {
                          name: "HubSpot CRM",
                          desc: lastSync?.lastSyncedAt
                            ? [
                                `Last sync ${formatRelativeTime(lastSync.lastSyncedAt)}`,
                                lastSync.added > 0 ? `${lastSync.added} added` : null,
                                lastSync.updated > 0 ? `${lastSync.updated} updated` : null,
                                lastSync.skipped > 0 ? `${lastSync.skipped} skipped` : null,
                              ].filter(Boolean).join(" · ")
                            : "Never synced",
                          status: lastSync?.lastSyncedAt ? "Synced" : "Pending",
                          ok: !!lastSync?.lastSyncedAt,
                        },
                        {
                          name: "Product Catalog",
                          desc: `${products.length} products with shipping data`,
                          status: "Live",
                          ok: true,
                        },
                      ].map(s => (
                        <div key={s.name} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div>
                            <div className="text-sm font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.desc}</div>
                          </div>
                          <Badge variant={s.ok ? "default" : "secondary"}>{s.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
