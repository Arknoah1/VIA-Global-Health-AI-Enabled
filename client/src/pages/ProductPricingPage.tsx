import { useState, useRef, useEffect } from "react";
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
import { Plus, Trash2, DollarSign, Globe, AlertTriangle, Users, Check, X, Pencil, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lookupCountryCode, searchCountries, countries } from "@/lib/countries";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface CustomerSegment {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  pricingMultiplier: number;
  isEligibleForQuotes: boolean;
  ineligibilityReason: string | null;
  sortOrder: number;
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

interface BulkTierRow {
  minQuantity: string;
  maxQuantity: string;
  unitPrice: string;
  currency: string;
  tierName: string;
}

interface BulkRestrictionRow {
  countryName: string;
  countryCode: string;
  restrictionReason: string;
}

function CountrySearchInput({
  value,
  onChange,
  onSelect,
  onBlurLookup,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (name: string, code: string) => void;
  onBlurLookup: () => void;
  placeholder?: string;
  testId?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const filtered = value.trim() ? searchCountries(value).slice(0, 10) : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => { if (value.trim()) setShowDropdown(true); }}
        onBlur={() => {
          setTimeout(() => {
            onBlurLookup();
            setShowDropdown(false);
          }, 200);
        }}
        placeholder={placeholder || "Country name"}
        data-testid={testId}
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(c.name, c.code);
                setShowDropdown(false);
              }}
              data-testid={`country-option-${c.code}`}
            >
              {c.name} ({c.code})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductPricingPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);
  const [isSegmentDialogOpen, setIsSegmentDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null);

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingTierData, setEditingTierData] = useState<{
    minQuantity: string;
    maxQuantity: string;
    unitPriceCents: string;
    currency: string;
    tierName: string;
  }>({ minQuantity: "", maxQuantity: "", unitPriceCents: "", currency: "USD", tierName: "" });

  const [editingRestrictionId, setEditingRestrictionId] = useState<string | null>(null);
  const [editingRestrictionData, setEditingRestrictionData] = useState<{
    countryName: string;
    countryCode: string;
    restrictionReason: string;
  }>({ countryName: "", countryCode: "", restrictionReason: "" });

  const [isBulkPricingDialogOpen, setIsBulkPricingDialogOpen] = useState(false);
  const [isBulkRestrictionDialogOpen, setIsBulkRestrictionDialogOpen] = useState(false);

  const [bulkTierRows, setBulkTierRows] = useState<BulkTierRow[]>([
    { minQuantity: "", maxQuantity: "", unitPrice: "", currency: "USD", tierName: "" },
    { minQuantity: "", maxQuantity: "", unitPrice: "", currency: "USD", tierName: "" },
    { minQuantity: "", maxQuantity: "", unitPrice: "", currency: "USD", tierName: "" },
  ]);

  const [bulkRestrictionRows, setBulkRestrictionRows] = useState<BulkRestrictionRow[]>([
    { countryName: "", countryCode: "", restrictionReason: "" },
    { countryName: "", countryCode: "", restrictionReason: "" },
    { countryName: "", countryCode: "", restrictionReason: "" },
  ]);

  const [addRestrictionCountryName, setAddRestrictionCountryName] = useState("");
  const [addRestrictionCountryCode, setAddRestrictionCountryCode] = useState("");

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

  const { data: customerSegments = [] } = useQuery<CustomerSegment[]>({
    queryKey: ["customer-segments"],
    queryFn: async () => {
      const response = await fetch("/api/customer-segments");
      if (!response.ok) throw new Error("Failed to fetch customer segments");
      return response.json();
    },
  });

  const createSegmentMutation = useMutation({
    mutationFn: async (data: Partial<CustomerSegment>) => {
      const response = await fetch("/api/customer-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create segment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-segments"] });
      setIsSegmentDialogOpen(false);
      toast({ title: "Segment created", description: "Customer segment has been added." });
    },
  });

  const updateSegmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerSegment> }) => {
      const response = await fetch(`/api/customer-segments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update segment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-segments"] });
      setEditingSegment(null);
      toast({ title: "Segment updated", description: "Customer segment has been updated." });
    },
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customer-segments/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete segment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-segments"] });
      toast({ title: "Segment deleted", description: "Customer segment has been removed." });
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

  const updatePricingTierMutation = useMutation({
    mutationFn: async ({ tierId, data }: { tierId: string; data: Partial<PricingTier> }) => {
      const response = await fetch(`/api/pricing-tiers/${tierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update pricing tier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers", selectedProductId] });
      setEditingTierId(null);
      toast({ title: "Pricing tier updated", description: "The pricing tier has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update pricing tier.", variant: "destructive" });
    },
  });

  const deletePricingTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const response = await fetch(`/api/pricing-tiers/${tierId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete pricing tier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers", selectedProductId] });
      toast({ title: "Pricing tier deleted", description: "The pricing tier has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete pricing tier.", variant: "destructive" });
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
    onError: () => {
      toast({ title: "Error", description: "Failed to delete all pricing tiers.", variant: "destructive" });
    },
  });

  const bulkCreatePricingTiersMutation = useMutation({
    mutationFn: async (tiers: { minQuantity: number; maxQuantity: number | null; unitPriceCents: number; currency: string; tierName: string | null }[]) => {
      const response = await fetch(`/api/products/${selectedProductId}/pricing-tiers/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers }),
      });
      if (!response.ok) throw new Error("Failed to bulk create pricing tiers");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers", selectedProductId] });
      setIsBulkPricingDialogOpen(false);
      setBulkTierRows([
        { minQuantity: "", maxQuantity: "", unitPrice: "", currency: "USD", tierName: "" },
        { minQuantity: "", maxQuantity: "", unitPrice: "", currency: "USD", tierName: "" },
        { minQuantity: "", maxQuantity: "", unitPrice: "", currency: "USD", tierName: "" },
      ]);
      toast({ title: "Pricing tiers imported", description: "Bulk pricing tiers have been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to bulk import pricing tiers.", variant: "destructive" });
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
      setAddRestrictionCountryName("");
      setAddRestrictionCountryCode("");
      toast({ title: "Restricted country added", description: "The country restriction has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create restriction.", variant: "destructive" });
    },
  });

  const updateRestrictionMutation = useMutation({
    mutationFn: async ({ restrictionId, data }: { restrictionId: string; data: Partial<RestrictedCountry> }) => {
      const response = await fetch(`/api/restricted-countries/${restrictionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update restriction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restricted-countries", selectedProductId] });
      setEditingRestrictionId(null);
      toast({ title: "Restriction updated", description: "The shipping restriction has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update restriction.", variant: "destructive" });
    },
  });

  const deleteRestrictionMutation = useMutation({
    mutationFn: async (restrictionId: string) => {
      const response = await fetch(`/api/restricted-countries/${restrictionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete restriction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restricted-countries", selectedProductId] });
      toast({ title: "Restriction deleted", description: "The shipping restriction has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete restriction.", variant: "destructive" });
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
    onError: () => {
      toast({ title: "Error", description: "Failed to delete all restrictions.", variant: "destructive" });
    },
  });

  const bulkCreateRestrictionsMutation = useMutation({
    mutationFn: async (restrictions: { countryCode: string; countryName: string; restrictionReason: string }[]) => {
      const response = await fetch(`/api/products/${selectedProductId}/restricted-countries/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restrictions }),
      });
      if (!response.ok) throw new Error("Failed to bulk create restrictions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restricted-countries", selectedProductId] });
      setIsBulkRestrictionDialogOpen(false);
      setBulkRestrictionRows([
        { countryName: "", countryCode: "", restrictionReason: "" },
        { countryName: "", countryCode: "", restrictionReason: "" },
        { countryName: "", countryCode: "", restrictionReason: "" },
      ]);
      toast({ title: "Restrictions imported", description: "Bulk shipping restrictions have been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to bulk import restrictions.", variant: "destructive" });
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

  const handleAddSegment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createSegmentMutation.mutate({
      name: (formData.get("segmentName") as string).toLowerCase().replace(/\s+/g, '_'),
      displayName: formData.get("displayName") as string,
      description: formData.get("description") as string || null,
      pricingMultiplier: parseFloat(formData.get("pricingMultiplier") as string) || 1.0,
      isEligibleForQuotes: formData.get("isEligible") === "on",
      ineligibilityReason: formData.get("ineligibilityReason") as string || null,
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
    });
  };

  const toggleSegmentEligibility = (segment: CustomerSegment) => {
    updateSegmentMutation.mutate({
      id: segment.id,
      data: { isEligibleForQuotes: !segment.isEligibleForQuotes }
    });
  };

  const startEditingTier = (tier: PricingTier) => {
    setEditingTierId(tier.id);
    setEditingTierData({
      minQuantity: String(tier.minQuantity),
      maxQuantity: tier.maxQuantity != null ? String(tier.maxQuantity) : "",
      unitPriceCents: String((tier.unitPriceCents / 100).toFixed(2)),
      currency: tier.currency,
      tierName: tier.tierName || "",
    });
  };

  const saveEditingTier = () => {
    if (!editingTierId) return;
    const minQty = parseInt(editingTierData.minQuantity);
    const maxQty = editingTierData.maxQuantity ? parseInt(editingTierData.maxQuantity) : null;
    const priceCents = Math.round(parseFloat(editingTierData.unitPriceCents) * 100);
    if (isNaN(minQty) || minQty < 0) {
      toast({ title: "Error", description: "Min quantity must be a valid positive number.", variant: "destructive" });
      return;
    }
    if (isNaN(priceCents) || priceCents <= 0) {
      toast({ title: "Error", description: "Unit price must be a valid positive number.", variant: "destructive" });
      return;
    }
    if (maxQty !== null && (isNaN(maxQty) || maxQty < minQty)) {
      toast({ title: "Error", description: "Max quantity must be >= min quantity.", variant: "destructive" });
      return;
    }
    updatePricingTierMutation.mutate({
      tierId: editingTierId,
      data: {
        minQuantity: minQty,
        maxQuantity: maxQty,
        unitPriceCents: priceCents,
        currency: editingTierData.currency,
        tierName: editingTierData.tierName || null,
      },
    });
  };

  const startEditingRestriction = (restriction: RestrictedCountry) => {
    setEditingRestrictionId(restriction.id);
    setEditingRestrictionData({
      countryName: restriction.countryName,
      countryCode: restriction.countryCode,
      restrictionReason: restriction.restrictionReason,
    });
  };

  const saveEditingRestriction = () => {
    if (!editingRestrictionId) return;
    if (!editingRestrictionData.countryName.trim()) {
      toast({ title: "Error", description: "Country name is required.", variant: "destructive" });
      return;
    }
    if (!editingRestrictionData.countryCode.trim() || editingRestrictionData.countryCode.trim().length !== 2) {
      toast({ title: "Error", description: "A valid 2-letter country code is required.", variant: "destructive" });
      return;
    }
    if (!editingRestrictionData.restrictionReason.trim()) {
      toast({ title: "Error", description: "Restriction reason is required.", variant: "destructive" });
      return;
    }
    updateRestrictionMutation.mutate({
      restrictionId: editingRestrictionId,
      data: {
        countryName: editingRestrictionData.countryName.trim(),
        countryCode: editingRestrictionData.countryCode.trim().toUpperCase(),
        restrictionReason: editingRestrictionData.restrictionReason.trim(),
      },
    });
  };

  const handleBulkPricingSubmit = () => {
    const validRows = bulkTierRows.filter(r => r.minQuantity && r.unitPrice);
    if (validRows.length === 0) {
      toast({ title: "Error", description: "Please fill in at least one row with min quantity and unit price.", variant: "destructive" });
      return;
    }
    for (const r of validRows) {
      const minQty = parseInt(r.minQuantity);
      const price = parseFloat(r.unitPrice);
      if (isNaN(minQty) || minQty < 0) {
        toast({ title: "Error", description: `Invalid min quantity: "${r.minQuantity}"`, variant: "destructive" });
        return;
      }
      if (isNaN(price) || price <= 0) {
        toast({ title: "Error", description: `Invalid unit price: "${r.unitPrice}"`, variant: "destructive" });
        return;
      }
      if (r.maxQuantity) {
        const maxQty = parseInt(r.maxQuantity);
        if (isNaN(maxQty) || maxQty < minQty) {
          toast({ title: "Error", description: `Max quantity must be >= min quantity.`, variant: "destructive" });
          return;
        }
      }
    }
    const tiers = validRows.map(r => ({
      minQuantity: parseInt(r.minQuantity),
      maxQuantity: r.maxQuantity ? parseInt(r.maxQuantity) : null,
      unitPriceCents: Math.round(parseFloat(r.unitPrice) * 100),
      currency: r.currency,
      tierName: r.tierName || null,
    }));
    bulkCreatePricingTiersMutation.mutate(tiers);
  };

  const handleBulkRestrictionSubmit = () => {
    const validRows = bulkRestrictionRows.filter(r => r.countryName && r.countryCode && r.restrictionReason);
    if (validRows.length === 0) {
      toast({ title: "Error", description: "Please fill in at least one complete row.", variant: "destructive" });
      return;
    }
    bulkCreateRestrictionsMutation.mutate(validRows);
  };

  const updateBulkTierRow = (index: number, field: keyof BulkTierRow, value: string) => {
    setBulkTierRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const updateBulkRestrictionRow = (index: number, field: keyof BulkRestrictionRow, value: string) => {
    setBulkRestrictionRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  return (
    <div className="flex h-screen bg-background w-full">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xl font-semibold">Pricing & Eligibility</h1>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="segments" className="space-y-6">
            <TabsList>
              <TabsTrigger value="segments" data-testid="tab-segments">
                <Users className="h-4 w-4 mr-2" />
                Customer Segments
              </TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">
                <DollarSign className="h-4 w-4 mr-2" />
                Product Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="segments" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Customer Segments
                    </CardTitle>
                    <CardDescription>Define buyer types, their eligibility for quotes, and pricing multipliers</CardDescription>
                  </div>
                  <Dialog open={isSegmentDialogOpen} onOpenChange={setIsSegmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-segment">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Segment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Customer Segment</DialogTitle>
                        <DialogDescription>Create a new customer segment with pricing and eligibility rules</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddSegment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="segmentName">Segment ID (lowercase)</Label>
                            <Input id="segmentName" name="segmentName" placeholder="e.g., distributor" required data-testid="input-segment-name" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input id="displayName" name="displayName" placeholder="e.g., Distributor" required data-testid="input-display-name" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Input id="description" name="description" placeholder="Brief description of this segment" data-testid="input-segment-description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="pricingMultiplier">Pricing Multiplier</Label>
                            <Input id="pricingMultiplier" name="pricingMultiplier" type="number" step="0.01" min="0" defaultValue="1.0" required data-testid="input-pricing-multiplier" />
                            <p className="text-xs text-muted-foreground">1.0 = base price, 1.1 = 10% markup</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sortOrder">Sort Order</Label>
                            <Input id="sortOrder" name="sortOrder" type="number" defaultValue="0" data-testid="input-sort-order" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="isEligible" name="isEligible" defaultChecked className="rounded" data-testid="checkbox-eligible" />
                          <Label htmlFor="isEligible">Eligible for quotes</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ineligibilityReason">Ineligibility Reason (if not eligible)</Label>
                          <Input id="ineligibilityReason" name="ineligibilityReason" placeholder="Why this segment cannot receive quotes" data-testid="input-ineligibility-reason" />
                        </div>
                        <Button type="submit" className="w-full" disabled={createSegmentMutation.isPending} data-testid="button-submit-segment">
                          {createSegmentMutation.isPending ? "Adding..." : "Add Segment"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {customerSegments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No customer segments configured. Add segments to control eligibility and pricing by buyer type.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Segment</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Pricing</TableHead>
                          <TableHead>Eligible</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSegments.sort((a, b) => a.sortOrder - b.sortOrder).map((segment) => (
                          <TableRow key={segment.id} data-testid={`row-segment-${segment.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{segment.displayName}</p>
                                <p className="text-xs text-muted-foreground">{segment.name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{segment.description || "-"}</TableCell>
                            <TableCell>
                              {segment.pricingMultiplier === 1 ? (
                                <span className="text-muted-foreground">Base price</span>
                              ) : (
                                <span className={segment.pricingMultiplier > 1 ? "text-amber-600" : "text-green-600"}>
                                  {segment.pricingMultiplier > 1 ? "+" : ""}{((segment.pricingMultiplier - 1) * 100).toFixed(0)}%
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <button onClick={() => toggleSegmentEligibility(segment)} className="flex items-center gap-1" data-testid={`toggle-eligible-${segment.id}`}>
                                {segment.isEligibleForQuotes ? (
                                  <span className="flex items-center gap-1 text-green-600"><Check className="h-4 w-4" /> Yes</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-red-600"><X className="h-4 w-4" /> No</span>
                                )}
                              </button>
                              {!segment.isEligibleForQuotes && segment.ineligibilityReason && (
                                <p className="text-xs text-muted-foreground">{segment.ineligibilityReason}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => deleteSegmentMutation.mutate(segment.id)} data-testid={`button-delete-segment-${segment.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-delete-all-tiers">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear All
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all pricing tiers for this product.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-clear-tiers">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePricingTiersMutation.mutate()} data-testid="button-confirm-clear-tiers">
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Dialog open={isBulkPricingDialogOpen} onOpenChange={setIsBulkPricingDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-bulk-import-tiers">
                          <Upload className="h-4 w-4 mr-2" />
                          Bulk Import
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>Bulk Import Pricing Tiers</DialogTitle>
                          <DialogDescription>Add multiple pricing tiers at once</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          {bulkTierRows.map((row, index) => (
                            <div key={index} className="flex items-end gap-2 p-3 border rounded-md" data-testid={`row-bulk-tier-${index}`}>
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs">Min Qty</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={row.minQuantity}
                                  onChange={(e) => updateBulkTierRow(index, "minQuantity", e.target.value)}
                                  data-testid={`input-bulk-tier-min-${index}`}
                                />
                              </div>
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs">Max Qty</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={row.maxQuantity}
                                  onChange={(e) => updateBulkTierRow(index, "maxQuantity", e.target.value)}
                                  data-testid={`input-bulk-tier-max-${index}`}
                                />
                              </div>
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs">Unit Price</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.unitPrice}
                                  onChange={(e) => updateBulkTierRow(index, "unitPrice", e.target.value)}
                                  data-testid={`input-bulk-tier-price-${index}`}
                                />
                              </div>
                              <div className="space-y-1 w-24">
                                <Label className="text-xs">Currency</Label>
                                <Select value={row.currency} onValueChange={(val) => updateBulkTierRow(index, "currency", val)}>
                                  <SelectTrigger data-testid={`select-bulk-tier-currency-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs">Tier Name</Label>
                                <Input
                                  value={row.tierName}
                                  onChange={(e) => updateBulkTierRow(index, "tierName", e.target.value)}
                                  placeholder="Optional"
                                  data-testid={`input-bulk-tier-name-${index}`}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setBulkTierRows(prev => prev.filter((_, i) => i !== index))}
                                disabled={bulkTierRows.length <= 1}
                                data-testid={`button-remove-bulk-tier-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex justify-between">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setBulkTierRows(prev => [...prev, { minQuantity: "", maxQuantity: "", unitPrice: "", currency: "USD", tierName: "" }])}
                              data-testid="button-add-bulk-tier-row"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Row
                            </Button>
                            <Button
                              onClick={handleBulkPricingSubmit}
                              disabled={bulkCreatePricingTiersMutation.isPending}
                              data-testid="button-submit-bulk-tiers"
                            >
                              {bulkCreatePricingTiersMutation.isPending ? "Importing..." : "Import Tiers"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricingTiers.map((tier) => (
                          <TableRow key={tier.id} data-testid={`row-tier-${tier.id}`}>
                            {editingTierId === tier.id ? (
                              <>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="1"
                                      value={editingTierData.minQuantity}
                                      onChange={(e) => setEditingTierData(prev => ({ ...prev, minQuantity: e.target.value }))}
                                      className="w-20 h-8"
                                      data-testid={`input-edit-tier-min-${tier.id}`}
                                    />
                                    <span>-</span>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={editingTierData.maxQuantity}
                                      onChange={(e) => setEditingTierData(prev => ({ ...prev, maxQuantity: e.target.value }))}
                                      className="w-20 h-8"
                                      placeholder="∞"
                                      data-testid={`input-edit-tier-max-${tier.id}`}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editingTierData.unitPriceCents}
                                      onChange={(e) => setEditingTierData(prev => ({ ...prev, unitPriceCents: e.target.value }))}
                                      className="w-24 h-8"
                                      data-testid={`input-edit-tier-price-${tier.id}`}
                                    />
                                    <Select value={editingTierData.currency} onValueChange={(val) => setEditingTierData(prev => ({ ...prev, currency: val }))}>
                                      <SelectTrigger className="w-20 h-8" data-testid={`select-edit-tier-currency-${tier.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={editingTierData.tierName}
                                    onChange={(e) => setEditingTierData(prev => ({ ...prev, tierName: e.target.value }))}
                                    className="h-8"
                                    placeholder="Tier name"
                                    data-testid={`input-edit-tier-name-${tier.id}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={saveEditingTier}
                                      disabled={updatePricingTierMutation.isPending}
                                      data-testid={`button-save-tier-${tier.id}`}
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingTierId(null)}
                                      data-testid={`button-cancel-tier-${tier.id}`}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>{tier.minQuantity} - {tier.maxQuantity || "∞"}</TableCell>
                                <TableCell>
                                  {tier.currency === "USD" ? "$" : tier.currency === "EUR" ? "€" : tier.currency === "GBP" ? "£" : ""}
                                  {(tier.unitPriceCents / 100).toFixed(2)} {tier.currency}
                                </TableCell>
                                <TableCell>{tier.tierName || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditingTier(tier)}
                                      data-testid={`button-edit-tier-${tier.id}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          data-testid={`button-delete-tier-${tier.id}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete pricing tier?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently remove this pricing tier.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deletePricingTierMutation.mutate(tier.id)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </>
                            )}
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-delete-all-restrictions">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear All
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all shipping restrictions for this product.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-clear-restrictions">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRestrictedCountriesMutation.mutate()} data-testid="button-confirm-clear-restrictions">
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Dialog open={isBulkRestrictionDialogOpen} onOpenChange={setIsBulkRestrictionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-bulk-import-restrictions">
                          <Upload className="h-4 w-4 mr-2" />
                          Bulk Import
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>Bulk Import Shipping Restrictions</DialogTitle>
                          <DialogDescription>Add multiple shipping restrictions at once</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          {bulkRestrictionRows.map((row, index) => (
                            <div key={index} className="flex items-end gap-2 p-3 border rounded-md" data-testid={`row-bulk-restriction-${index}`}>
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs">Country Name</Label>
                                <CountrySearchInput
                                  value={row.countryName}
                                  onChange={(val) => updateBulkRestrictionRow(index, "countryName", val)}
                                  onSelect={(name, code) => {
                                    updateBulkRestrictionRow(index, "countryName", name);
                                    updateBulkRestrictionRow(index, "countryCode", code);
                                  }}
                                  onBlurLookup={() => {
                                    const code = lookupCountryCode(row.countryName);
                                    if (code) updateBulkRestrictionRow(index, "countryCode", code);
                                  }}
                                  testId={`input-bulk-restriction-country-${index}`}
                                />
                              </div>
                              <div className="space-y-1 w-20">
                                <Label className="text-xs">Code</Label>
                                <Input
                                  value={row.countryCode}
                                  onChange={(e) => updateBulkRestrictionRow(index, "countryCode", e.target.value.toUpperCase())}
                                  maxLength={2}
                                  data-testid={`input-bulk-restriction-code-${index}`}
                                />
                              </div>
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs">Reason</Label>
                                <Input
                                  value={row.restrictionReason}
                                  onChange={(e) => updateBulkRestrictionRow(index, "restrictionReason", e.target.value)}
                                  placeholder="Restriction reason"
                                  data-testid={`input-bulk-restriction-reason-${index}`}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setBulkRestrictionRows(prev => prev.filter((_, i) => i !== index))}
                                disabled={bulkRestrictionRows.length <= 1}
                                data-testid={`button-remove-bulk-restriction-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex justify-between">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setBulkRestrictionRows(prev => [...prev, { countryName: "", countryCode: "", restrictionReason: "" }])}
                              data-testid="button-add-bulk-restriction-row"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Row
                            </Button>
                            <Button
                              onClick={handleBulkRestrictionSubmit}
                              disabled={bulkCreateRestrictionsMutation.isPending}
                              data-testid="button-submit-bulk-restrictions"
                            >
                              {bulkCreateRestrictionsMutation.isPending ? "Importing..." : "Import Restrictions"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isCountryDialogOpen} onOpenChange={(open) => {
                      setIsCountryDialogOpen(open);
                      if (!open) {
                        setAddRestrictionCountryName("");
                        setAddRestrictionCountryCode("");
                      }
                    }}>
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
                              <Label htmlFor="countryName">Country Name</Label>
                              <CountrySearchInput
                                value={addRestrictionCountryName}
                                onChange={(val) => setAddRestrictionCountryName(val)}
                                onSelect={(name, code) => {
                                  setAddRestrictionCountryName(name);
                                  setAddRestrictionCountryCode(code);
                                }}
                                onBlurLookup={() => {
                                  const code = lookupCountryCode(addRestrictionCountryName);
                                  if (code) setAddRestrictionCountryCode(code);
                                }}
                                testId="input-country-name"
                              />
                              <input type="hidden" name="countryName" value={addRestrictionCountryName} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="countryCode">Country Code (2-letter)</Label>
                              <Input
                                id="countryCode"
                                name="countryCode"
                                maxLength={2}
                                placeholder="e.g., US"
                                required
                                value={addRestrictionCountryCode}
                                onChange={(e) => setAddRestrictionCountryCode(e.target.value.toUpperCase())}
                                data-testid="input-country-code"
                              />
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
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {restrictedCountries.map((restriction) => (
                          <TableRow key={restriction.id} data-testid={`row-restriction-${restriction.id}`}>
                            {editingRestrictionId === restriction.id ? (
                              <>
                                <TableCell>
                                  <CountrySearchInput
                                    value={editingRestrictionData.countryName}
                                    onChange={(val) => setEditingRestrictionData(prev => ({ ...prev, countryName: val }))}
                                    onSelect={(name, code) => setEditingRestrictionData(prev => ({ ...prev, countryName: name, countryCode: code }))}
                                    onBlurLookup={() => {
                                      const code = lookupCountryCode(editingRestrictionData.countryName);
                                      if (code) setEditingRestrictionData(prev => ({ ...prev, countryCode: code }));
                                    }}
                                    testId={`input-edit-restriction-country-${restriction.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={editingRestrictionData.countryCode}
                                    onChange={(e) => setEditingRestrictionData(prev => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                                    maxLength={2}
                                    className="w-20 h-8"
                                    data-testid={`input-edit-restriction-code-${restriction.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={editingRestrictionData.restrictionReason}
                                    onChange={(e) => setEditingRestrictionData(prev => ({ ...prev, restrictionReason: e.target.value }))}
                                    className="h-8"
                                    data-testid={`input-edit-restriction-reason-${restriction.id}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={saveEditingRestriction}
                                      disabled={updateRestrictionMutation.isPending}
                                      data-testid={`button-save-restriction-${restriction.id}`}
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingRestrictionId(null)}
                                      data-testid={`button-cancel-restriction-${restriction.id}`}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                  {restriction.countryName}
                                </TableCell>
                                <TableCell>{restriction.countryCode}</TableCell>
                                <TableCell>{restriction.restrictionReason}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditingRestriction(restriction)}
                                      data-testid={`button-edit-restriction-${restriction.id}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          data-testid={`button-delete-restriction-${restriction.id}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete restriction?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently remove this shipping restriction.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteRestrictionMutation.mutate(restriction.id)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
