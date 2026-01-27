import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, DollarSign, Globe, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface PricingTier {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPriceCents: number;
  currency: string;
  tierName: string | null;
}

interface RestrictedCountry {
  id: string;
  productId: string;
  countryCode: string;
  countryName: string;
  restrictionReason: string;
}

export default function ProductPricingPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const { data: pricingTiers = [] } = useQuery<PricingTier[]>({
    queryKey: ["pricing-tiers", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const response = await fetch(`/api/products/${selectedProductId}/pricing-tiers`);
      if (!response.ok) throw new Error("Failed to fetch pricing tiers");
      return response.json();
    },
    enabled: !!selectedProductId,
  });

  const { data: restrictedCountries = [] } = useQuery<RestrictedCountry[]>({
    queryKey: ["restricted-countries", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const response = await fetch(`/api/products/${selectedProductId}/restricted-countries`);
      if (!response.ok) throw new Error("Failed to fetch restricted countries");
      return response.json();
    },
    enabled: !!selectedProductId,
  });

  const createPricingTierMutation = useMutation({
    mutationFn: async (data: { minQuantity: number; maxQuantity: number | null; unitPriceCents: number; currency: string; tierName: string | null }) => {
      const response = await fetch(`/api/products/${selectedProductId}/pricing-tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create pricing tier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers", selectedProductId] });
      setIsPricingDialogOpen(false);
      toast({ title: "Pricing tier added", description: "The pricing tier has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create pricing tier.", variant: "destructive" });
    },
  });

  const deletePricingTiersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/products/${selectedProductId}/pricing-tiers`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete pricing tiers");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers", selectedProductId] });
      toast({ title: "Pricing tiers deleted", description: "All pricing tiers have been removed." });
    },
  });

  const createRestrictedCountryMutation = useMutation({
    mutationFn: async (data: { countryCode: string; countryName: string; restrictionReason: string }) => {
      const response = await fetch(`/api/products/${selectedProductId}/restricted-countries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create restricted country");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restricted-countries", selectedProductId] });
      setIsCountryDialogOpen(false);
      toast({ title: "Restricted country added", description: "The country restriction has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create restriction.", variant: "destructive" });
    },
  });

  const deleteRestrictedCountriesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/products/${selectedProductId}/restricted-countries`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete restricted countries");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restricted-countries", selectedProductId] });
      toast({ title: "Restrictions deleted", description: "All country restrictions have been removed." });
    },
  });

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleAddPricingTier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const minQty = parseInt(formData.get("minQuantity") as string);
    const maxQtyStr = formData.get("maxQuantity") as string;
    const maxQty = maxQtyStr ? parseInt(maxQtyStr) : null;
    const priceStr = formData.get("unitPrice") as string;
    const priceCents = Math.round(parseFloat(priceStr) * 100);
    
    createPricingTierMutation.mutate({
      minQuantity: minQty,
      maxQuantity: maxQty,
      unitPriceCents: priceCents,
      currency: selectedCurrency,
      tierName: formData.get("tierName") as string || null,
    });
  };

  const handleAddRestrictedCountry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRestrictedCountryMutation.mutate({
      countryCode: formData.get("countryCode") as string,
      countryName: formData.get("countryName") as string,
      restrictionReason: formData.get("restrictionReason") as string,
    });
  };

  return (
    <div className="flex h-screen bg-background w-full">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xl font-semibold">Product Pricing & Restrictions</h1>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Product</CardTitle>
              <CardDescription>Choose a product to manage its pricing tiers and shipping restrictions</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedProductId || ""} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-full max-w-md" data-testid="select-product">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id} data-testid={`product-option-${product.id}`}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedProduct && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Volume Pricing Tiers
                    </CardTitle>
                    <CardDescription>Set quantity-based pricing for {selectedProduct.name}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {pricingTiers.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => deletePricingTiersMutation.mutate()} data-testid="button-delete-all-tiers">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    )}
                    <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-pricing-tier">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Tier
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Pricing Tier</DialogTitle>
                          <DialogDescription>Create a new volume pricing tier for this product</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddPricingTier} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="minQuantity">Min Quantity</Label>
                              <Input id="minQuantity" name="minQuantity" type="number" min="1" required data-testid="input-min-quantity" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="maxQuantity">Max Quantity (leave empty for unlimited)</Label>
                              <Input id="maxQuantity" name="maxQuantity" type="number" min="1" data-testid="input-max-quantity" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="unitPrice">Unit Price ($)</Label>
                              <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" required data-testid="input-unit-price" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="currency">Currency</Label>
                              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                                <SelectTrigger data-testid="select-currency">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tierName">Tier Name (optional)</Label>
                            <Input id="tierName" name="tierName" placeholder="e.g., Small Order, Bulk, Volume Discount" data-testid="input-tier-name" />
                          </div>
                          <Button type="submit" className="w-full" disabled={createPricingTierMutation.isPending} data-testid="button-submit-pricing-tier">
                            {createPricingTierMutation.isPending ? "Adding..." : "Add Pricing Tier"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {pricingTiers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No pricing tiers configured. Add volume-based pricing to enable the quote agent to provide pricing estimates.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quantity Range</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Tier Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricingTiers.map((tier) => (
                          <TableRow key={tier.id} data-testid={`row-tier-${tier.id}`}>
                            <TableCell>{tier.minQuantity} - {tier.maxQuantity || "∞"}</TableCell>
                            <TableCell>
                              {tier.currency === "USD" ? "$" : tier.currency === "EUR" ? "€" : tier.currency === "GBP" ? "£" : ""}
                              {(tier.unitPriceCents / 100).toFixed(2)} {tier.currency}
                            </TableCell>
                            <TableCell>{tier.tierName || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Shipping Restrictions
                    </CardTitle>
                    <CardDescription>Countries where this product cannot be shipped</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {restrictedCountries.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => deleteRestrictedCountriesMutation.mutate()} data-testid="button-delete-all-restrictions">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    )}
                    <Dialog open={isCountryDialogOpen} onOpenChange={setIsCountryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-restriction">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Restriction
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Shipping Restriction</DialogTitle>
                          <DialogDescription>Specify a country where this product cannot be shipped</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddRestrictedCountry} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="countryCode">Country Code (2-letter)</Label>
                              <Input id="countryCode" name="countryCode" maxLength={2} placeholder="e.g., US" required data-testid="input-country-code" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="countryName">Country Name</Label>
                              <Input id="countryName" name="countryName" placeholder="e.g., United States" required data-testid="input-country-name" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="restrictionReason">Reason for Restriction</Label>
                            <Input id="restrictionReason" name="restrictionReason" placeholder="e.g., Export regulations, Trade sanctions" required data-testid="input-restriction-reason" />
                          </div>
                          <Button type="submit" className="w-full" disabled={createRestrictedCountryMutation.isPending} data-testid="button-submit-restriction">
                            {createRestrictedCountryMutation.isPending ? "Adding..." : "Add Restriction"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {restrictedCountries.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No shipping restrictions configured. Add restrictions for countries where this product cannot be shipped.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {restrictedCountries.map((restriction) => (
                          <TableRow key={restriction.id} data-testid={`row-restriction-${restriction.id}`}>
                            <TableCell className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              {restriction.countryName}
                            </TableCell>
                            <TableCell>{restriction.countryCode}</TableCell>
                            <TableCell>{restriction.restrictionReason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
