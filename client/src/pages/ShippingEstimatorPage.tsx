import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Ship, Package, Fuel, TrendingUp, BarChart3, RefreshCw, AlertTriangle } from "lucide-react";
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
      toast({ title: "HubSpot Sync Complete", description: `${data.synced} deals synced, ${data.errors} errors` });
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
                                  {d.method && <Badge variant="outline" className="text-xs">{d.method}</Badge>}
                                  <span className="font-mono font-semibold text-sm">${d.shippingCost?.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
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
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Historical Shipping Deals</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{deals.length} deals from {[...new Set(deals.map((d: any) => d.country))].length} countries</p>
                    </div>
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destination</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Incoterm</TableHead>
                          <TableHead className="text-right">Product Value</TableHead>
                          <TableHead className="text-right">Shipping</TableHead>
                          <TableHead className="text-right">% of Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deals.map((d: any, i: number) => (
                          <TableRow key={i}>
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
                              ${Number(d.shippingCost).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {d.productValue && d.shippingCost ? `${((d.shippingCost / d.productValue) * 100).toFixed(1)}%` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                          <Badge variant={marketData.fuel.label === "elevated" ? "destructive" : marketData.fuel.label === "low" ? "default" : "secondary"}>
                            {marketData.fuel.delta > 0 ? "+" : ""}{marketData.fuel.delta}% vs baseline
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Fuel {marketData.fuel.label} · {marketData.fuel.multiplier}× applied to estimates
                        </p>
                        {marketData.fuel.date && (
                          <p className="text-xs text-muted-foreground/70">
                            As of {new Date(marketData.fuel.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Source: EIA/FRED
                          </p>
                        )}
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
                        <Badge variant="outline">{marketData.dhl.reportMonth}</Badge>
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
                        { name: "Historical Deals", desc: `${marketData?.dealCount || 0} deals from ${marketData?.distinctCountries || 0} countries`, status: (marketData?.dealCount || 0) > 0 ? "Live" : "Empty", ok: (marketData?.dealCount || 0) > 0 },
                        { name: "EIA Jet Fuel", desc: marketData?.fuel?.price ? `$${marketData.fuel.price.toFixed(2)}/gal · ${marketData.fuel.label}${marketData.fuel.date ? ` · as of ${marketData.fuel.date}` : ""}` : "Not fetched", status: marketData?.fuel?.price ? "Live" : "Pending", ok: !!marketData?.fuel?.price },
                        { name: "DHL Intelligence", desc: marketData?.dhl ? `${marketData.dhl.reportMonth} report` : "Not fetched", status: marketData?.dhl ? "Live" : "Pending", ok: !!marketData?.dhl },
                        { name: "Product Catalog", desc: `${products.length} products with shipping data`, status: "Live", ok: true },
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
