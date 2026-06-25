import { useState, useEffect } from "react";
import { Product } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";

interface EditProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Product>) => void;
  isSaving?: boolean;
}

export function EditProductDialog({ product, isOpen, onClose, onSave, isSaving }: EditProductDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerLocation, setSellerLocation] = useState("");
  const [warrantyTerm, setWarrantyTerm] = useState("");
  const [warrantyText, setWarrantyText] = useState("");
  const [regulatoryApproval, setRegulatoryApproval] = useState("");
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState("");
  const [estimatedLifespan, setEstimatedLifespan] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [pickupCountry, setPickupCountry] = useState("");
  const [shippingLengthCm, setShippingLengthCm] = useState("");
  const [shippingWidthCm, setShippingWidthCm] = useState("");
  const [shippingDepthCm, setShippingDepthCm] = useState("");
  const [shippingWeightKg, setShippingWeightKg] = useState("");
  const [keyFeaturesText, setKeyFeaturesText] = useState("");
  const [standardAccessoriesText, setStandardAccessoriesText] = useState("");
  const [boxContentsText, setBoxContentsText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [status, setStatus] = useState("active");
  const [pricingRestricted, setPricingRestricted] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setDescription(product.description || "");
      setPrice(String(product.price || ""));
      setCategory(product.category || "");
      setSku(product.sku || "");
      setImageUrl(product.imageUrl || "");
      setSellerName(product.sellerName || "");
      setSellerLocation(product.sellerLocation || "");
      setWarrantyTerm(product.warrantyTerm || "");
      setWarrantyText(product.warrantyText || "");
      setRegulatoryApproval(product.regulatoryApproval || "");
      setMinimumOrderQuantity(product.minimumOrderQuantity ? String(product.minimumOrderQuantity) : "");
      setEstimatedLifespan(product.estimatedLifespan || "");
      setLeadTimeDays(product.leadTimeDays ? String(product.leadTimeDays) : "");
      setPickupCountry(product.pickupCountry || "");
      setShippingLengthCm(product.shippingLengthCm ? String(product.shippingLengthCm) : "");
      setShippingWidthCm(product.shippingWidthCm ? String(product.shippingWidthCm) : "");
      setShippingDepthCm(product.shippingDepthCm ? String(product.shippingDepthCm) : "");
      setShippingWeightKg(product.shippingWeightKg ? String(product.shippingWeightKg) : "");
      setKeyFeaturesText(Array.isArray(product.keyFeatures) ? (product.keyFeatures as string[]).join("\n") : "");
      setStandardAccessoriesText(Array.isArray(product.standardAccessories) ? (product.standardAccessories as string[]).join("\n") : "");
      setBoxContentsText(Array.isArray(product.boxContents) ? (product.boxContents as string[]).join("\n") : "");
      setTagsText(Array.isArray(product.tags) ? (product.tags as string[]).join(", ") : "");
      setStatus(product.status || "active");
      setPricingRestricted(product.pricingRestricted ?? false);
    }
  }, [product]);

  const handleSave = () => {
    if (!product) return;

    const updates: Partial<Product> = {
      name,
      description,
      price: parseInt(price) || 0,
      category,
      sku,
      imageUrl,
      sellerName: sellerName || null,
      sellerLocation: sellerLocation || null,
      warrantyTerm: warrantyTerm || null,
      warrantyText: warrantyText || null,
      regulatoryApproval: regulatoryApproval || null,
      minimumOrderQuantity: minimumOrderQuantity ? parseInt(minimumOrderQuantity) : null,
      estimatedLifespan: estimatedLifespan || null,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : null,
      pickupCountry: pickupCountry || null,
      shippingLengthCm: shippingLengthCm ? parseFloat(shippingLengthCm) : null,
      shippingWidthCm: shippingWidthCm ? parseFloat(shippingWidthCm) : null,
      shippingDepthCm: shippingDepthCm ? parseFloat(shippingDepthCm) : null,
      shippingWeightKg: shippingWeightKg ? parseFloat(shippingWeightKg) : null,
      keyFeatures: keyFeaturesText.split("\n").filter(l => l.trim()),
      standardAccessories: standardAccessoriesText.split("\n").filter(l => l.trim()),
      boxContents: boxContentsText.split("\n").filter(l => l.trim()),
      tags: tagsText.split(",").map(t => t.trim()).filter(t => t),
      status,
      pricingRestricted,
    };

    onSave(product.id, updates);
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="edit-product-dialog">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="shipping" data-testid="tab-shipping">Shipping</TabsTrigger>
            <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="edit-name">Product Name</Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input id="edit-sku" value={sku} onChange={(e) => setSku(e.target.value)} data-testid="input-edit-sku" />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Input id="edit-category" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="input-edit-category" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Base Price (cents)</Label>
                  <Input id="edit-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="input-edit-price" />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <select
                    id="edit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-edit-status"
                  >
                    <option value="active">Active</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/30 dark:bg-orange-950/20">
                <Switch
                  id="edit-pricing-restricted"
                  checked={pricingRestricted}
                  onCheckedChange={setPricingRestricted}
                  data-testid="switch-pricing-restricted"
                />
                <div>
                  <Label htmlFor="edit-pricing-restricted" className="font-medium cursor-pointer">Pricing Restricted</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Hides all pricing; directs customers to the sales team.</p>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-image">Image URL</Label>
                <Input id="edit-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} data-testid="input-edit-image" />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} data-testid="input-edit-description" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-seller-name">Seller / Manufacturer</Label>
                <Input id="edit-seller-name" value={sellerName} onChange={(e) => setSellerName(e.target.value)} data-testid="input-edit-seller" />
              </div>
              <div>
                <Label htmlFor="edit-seller-location">Seller Location</Label>
                <Input id="edit-seller-location" value={sellerLocation} onChange={(e) => setSellerLocation(e.target.value)} data-testid="input-edit-seller-location" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-warranty-term">Warranty Term</Label>
                <Input id="edit-warranty-term" value={warrantyTerm} onChange={(e) => setWarrantyTerm(e.target.value)} placeholder="e.g. 2 years" data-testid="input-edit-warranty-term" />
              </div>
              <div>
                <Label htmlFor="edit-regulatory">Regulatory Approval</Label>
                <Input id="edit-regulatory" value={regulatoryApproval} onChange={(e) => setRegulatoryApproval(e.target.value)} placeholder="e.g. CE, FDA" data-testid="input-edit-regulatory" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-moq">Min Order Quantity</Label>
                <Input id="edit-moq" type="number" value={minimumOrderQuantity} onChange={(e) => setMinimumOrderQuantity(e.target.value)} data-testid="input-edit-moq" />
              </div>
              <div>
                <Label htmlFor="edit-lifespan">Estimated Lifespan</Label>
                <Input id="edit-lifespan" value={estimatedLifespan} onChange={(e) => setEstimatedLifespan(e.target.value)} placeholder="e.g. 4 years" data-testid="input-edit-lifespan" />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-lead-time">Lead Time (days)</Label>
              <Input id="edit-lead-time" type="number" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} data-testid="input-edit-lead-time" />
            </div>
            <div>
              <Label htmlFor="edit-warranty-text">Warranty Details</Label>
              <Textarea id="edit-warranty-text" value={warrantyText} onChange={(e) => setWarrantyText(e.target.value)} rows={4} data-testid="input-edit-warranty-text" />
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-pickup">Pickup Country</Label>
              <Input id="edit-pickup" value={pickupCountry} onChange={(e) => setPickupCountry(e.target.value)} placeholder="e.g. China, USA" data-testid="input-edit-pickup" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-length">Length (cm)</Label>
                <Input id="edit-length" type="number" step="0.1" value={shippingLengthCm} onChange={(e) => setShippingLengthCm(e.target.value)} data-testid="input-edit-length" />
              </div>
              <div>
                <Label htmlFor="edit-width">Width (cm)</Label>
                <Input id="edit-width" type="number" step="0.1" value={shippingWidthCm} onChange={(e) => setShippingWidthCm(e.target.value)} data-testid="input-edit-width" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-depth">Depth (cm)</Label>
                <Input id="edit-depth" type="number" step="0.1" value={shippingDepthCm} onChange={(e) => setShippingDepthCm(e.target.value)} data-testid="input-edit-depth" />
              </div>
              <div>
                <Label htmlFor="edit-weight">Weight (kg)</Label>
                <Input id="edit-weight" type="number" step="0.1" value={shippingWeightKg} onChange={(e) => setShippingWeightKg(e.target.value)} data-testid="input-edit-weight" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-features">Key Features (one per line)</Label>
              <Textarea id="edit-features" value={keyFeaturesText} onChange={(e) => setKeyFeaturesText(e.target.value)} rows={5} placeholder="Feature Name - Description" data-testid="input-edit-features" />
            </div>
            <div>
              <Label htmlFor="edit-accessories">Standard Accessories (one per line)</Label>
              <Textarea id="edit-accessories" value={standardAccessoriesText} onChange={(e) => setStandardAccessoriesText(e.target.value)} rows={4} data-testid="input-edit-accessories" />
            </div>
            <div>
              <Label htmlFor="edit-box">Box Contents (one per line)</Label>
              <Textarea id="edit-box" value={boxContentsText} onChange={(e) => setBoxContentsText(e.target.value)} rows={4} data-testid="input-edit-box-contents" />
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input id="edit-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Tag 1, Tag 2, Tag 3" data-testid="input-edit-tags" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-product">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
