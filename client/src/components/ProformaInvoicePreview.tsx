import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Globe, Mail, Phone, Send, Save, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LineItem {
  name: string;
  description?: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

interface ProformaInvoice {
  id: string;
  referenceNumber: string;
  quoteRequestId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerOrganization?: string;
  customerAddress?: string;
  deliveryAddress?: string;
  deliveryCountry?: string;
  deliveryCity?: string;
  poNumber?: string;
  lineItems: LineItem[];
  subtotalCents: number;
  shippingCents?: number;
  bankFeeCents?: number;
  totalCents: number;
  currency: string;
  shippingMethod?: string;
  incoterms?: string;
  comments?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByPhone?: string;
  createdByTitle?: string;
  quoteCreatedAt: string;
  quoteExpiresAt?: string;
  status: string;
  emailSentAt?: string;
  emailSentTo?: string;
}

interface ProformaInvoicePreviewProps {
  invoice: ProformaInvoice;
  onSave?: (invoice: ProformaInvoice) => void;
  onSendEmail?: (invoice: ProformaInvoice) => void;
  editable?: boolean;
}

function formatCurrency(cents: number, currency: string = "USD"): string {
  const amount = cents / 100;
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "";
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export function ProformaInvoicePreview({ invoice: initialInvoice, onSave, onSendEmail, editable = true }: ProformaInvoicePreviewProps) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: Partial<ProformaInvoice>) => {
      const response = await fetch(`/api/proforma-invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update invoice");
      return response.json();
    },
    onSuccess: (updatedInvoice) => {
      setInvoice(updatedInvoice);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["proforma-invoices"] });
      toast({ title: "Invoice saved", description: "Changes have been saved successfully." });
      onSave?.(updatedInvoice);
    },
  });

  const handleSave = () => {
    updateInvoiceMutation.mutate({
      shippingCents: invoice.shippingCents,
      comments: invoice.comments,
      poNumber: invoice.poNumber,
      deliveryAddress: invoice.deliveryAddress,
      createdByName: invoice.createdByName,
      createdByEmail: invoice.createdByEmail,
      createdByPhone: invoice.createdByPhone,
      createdByTitle: invoice.createdByTitle,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const updateField = (field: keyof ProformaInvoice, value: any) => {
    setInvoice(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'shippingCents') {
        const lineItemsTotal = (prev.lineItems as LineItem[]).reduce((sum, item) => sum + item.totalCents, 0);
        updated.subtotalCents = lineItemsTotal + (value || 0) + (prev.bankFeeCents || 0);
        updated.totalCents = updated.subtotalCents;
      }
      return updated;
    });
  };

  return (
    <div className="bg-white text-gray-900 p-8 max-w-4xl mx-auto print:p-0" data-testid="invoice-preview">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-blue-600">VIA Global Health</h1>
          </div>
          <p className="text-sm text-gray-600">2212 Queen Anne Ave. N Unit #824</p>
          <p className="text-sm text-gray-600">Seattle, WA 98109, USA</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold mb-2">Proforma Invoice</h2>
          <p className="text-sm"><span className="font-medium">Reference:</span> {invoice.referenceNumber}</p>
          <p className="text-sm"><span className="font-medium">Created:</span> {formatDate(invoice.quoteCreatedAt)}</p>
          {invoice.quoteExpiresAt && (
            <p className="text-sm"><span className="font-medium">Expires:</span> {formatDate(invoice.quoteExpiresAt)}</p>
          )}
          {isEditing ? (
            <div className="mt-2">
              <Label className="text-xs">Created By</Label>
              <Input 
                value={invoice.createdByName || ""} 
                onChange={(e) => updateField("createdByName", e.target.value)}
                className="h-8 text-sm"
                data-testid="input-created-by-name"
              />
              <Input 
                value={invoice.createdByEmail || ""} 
                onChange={(e) => updateField("createdByEmail", e.target.value)}
                className="h-8 text-sm mt-1"
                placeholder="Email"
                data-testid="input-created-by-email"
              />
            </div>
          ) : (
            <div className="mt-2 text-sm">
              <p className="font-medium">{invoice.createdByName}</p>
              {invoice.createdByTitle && <p className="text-gray-600">{invoice.createdByTitle}</p>}
              {invoice.createdByEmail && <p className="text-gray-600">{invoice.createdByEmail}</p>}
            </div>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold mb-2">Bill To:</h3>
          <p className="font-medium">{invoice.customerName}</p>
          {invoice.customerOrganization && <p>{invoice.customerOrganization}</p>}
          {invoice.customerEmail && (
            <p className="flex items-center gap-1 text-sm">
              <Mail className="h-3 w-3" /> {invoice.customerEmail}
            </p>
          )}
          {invoice.customerPhone && (
            <p className="flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3" /> {invoice.customerPhone}
            </p>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-2">Deliver To:</h3>
          {isEditing ? (
            <Textarea 
              value={invoice.deliveryAddress || `${invoice.deliveryCity || ''}\n${invoice.deliveryCountry || ''}`}
              onChange={(e) => updateField("deliveryAddress", e.target.value)}
              className="text-sm"
              rows={3}
              data-testid="input-delivery-address"
            />
          ) : (
            <div className="text-sm">
              {invoice.deliveryAddress ? (
                <p className="whitespace-pre-line">{invoice.deliveryAddress}</p>
              ) : (
                <>
                  {invoice.deliveryCity && <p>{invoice.deliveryCity}</p>}
                  {invoice.deliveryCountry && <p>{invoice.deliveryCountry}</p>}
                </>
              )}
            </div>
          )}
          {isEditing ? (
            <div className="mt-2">
              <Label className="text-xs">PO Number</Label>
              <Input 
                value={invoice.poNumber || ""} 
                onChange={(e) => updateField("poNumber", e.target.value)}
                className="h-8 text-sm"
                placeholder="e.g., PO-037094"
                data-testid="input-po-number"
              />
            </div>
          ) : invoice.poNumber && (
            <p className="mt-2 text-sm font-medium">PO: {invoice.poNumber}</p>
          )}
        </div>
      </div>

      {invoice.comments && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-1">Comments:</h4>
            {isEditing ? (
              <Textarea 
                value={invoice.comments}
                onChange={(e) => updateField("comments", e.target.value)}
                className="text-sm bg-white"
                rows={3}
                data-testid="input-comments"
              />
            ) : (
              <p className="text-sm whitespace-pre-line">{invoice.comments}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Products & Services</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Item & Description</th>
                <th className="text-right py-2 font-medium w-20">Qty</th>
                <th className="text-right py-2 font-medium w-28">Unit Price</th>
                <th className="text-right py-2 font-medium w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lineItems as LineItem[]).map((item, idx) => (
                <tr key={idx} className="border-b" data-testid={`line-item-${idx}`}>
                  <td className="py-3">
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-gray-600 text-xs mt-1">{item.description}</p>}
                  </td>
                  <td className="text-right py-3">{item.quantity}</td>
                  <td className="text-right py-3">{formatCurrency(item.unitPriceCents, invoice.currency)}</td>
                  <td className="text-right py-3">{formatCurrency(item.totalCents, invoice.currency)}</td>
                </tr>
              ))}
              <tr className="border-b">
                <td className="py-3">
                  <p className="font-medium">Shipping</p>
                  {invoice.shippingMethod && <p className="text-gray-600 text-xs">{invoice.shippingMethod}</p>}
                </td>
                <td className="text-right py-3">1</td>
                <td className="text-right py-3">
                  {isEditing ? (
                    <Input 
                      type="number"
                      value={(invoice.shippingCents || 0) / 100}
                      onChange={(e) => updateField("shippingCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                      className="h-8 text-sm w-24 text-right"
                      step="0.01"
                      data-testid="input-shipping-cost"
                    />
                  ) : (
                    formatCurrency(invoice.shippingCents || 0, invoice.currency)
                  )}
                </td>
                <td className="text-right py-3">{formatCurrency(invoice.shippingCents || 0, invoice.currency)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">
                  <p className="font-medium">Bank Transfer Fee</p>
                </td>
                <td className="text-right py-3">1</td>
                <td className="text-right py-3">{formatCurrency(invoice.bankFeeCents || 0, invoice.currency)}</td>
                <td className="text-right py-3">{formatCurrency(invoice.bankFeeCents || 0, invoice.currency)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={3} className="text-right py-3">Total</td>
                <td className="text-right py-3 text-lg">{formatCurrency(invoice.totalCents, invoice.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-gray-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><strong>Bank:</strong> J.P. Morgan/Chase Bank NA, 270 Park Avenue, New York, NY 10017, USA</p>
          <p><strong>Beneficiary:</strong> VIA Global Health, Inc.</p>
          <p><strong>Account Number:</strong> 80006793246</p>
          <p><strong>BIC/SWIFT:</strong> CHASUS33</p>
          <p><strong>ABA/Routing:</strong> 321081669</p>
          <p className="text-xs text-gray-600 mt-2">*Please use invoice number as payment reference.*</p>
        </CardContent>
      </Card>

      <div className="text-xs text-gray-600 space-y-1 mb-8">
        <p>Buyer accepts {invoice.incoterms || "CIP"} (Carriage & Insurance Paid to Destination) terms unless otherwise agreed.</p>
        <p>Quote does not include duties, taxes, customs clearance fees. Customer responsible for local fees unless otherwise noted.</p>
        <p>Quote is valid for 30 days. For payments after 30 days from issue, please request an updated invoice.</p>
        <p>All costs are in {invoice.currency} unless otherwise specified.</p>
        <p>Balances to be paid in {invoice.currency} value in full in advance via bank transfer unless otherwise agreed.</p>
      </div>

      {editable && (
        <div className="flex justify-end gap-2 print:hidden" data-testid="invoice-actions">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateInvoiceMutation.isPending} data-testid="button-save-invoice">
                <Save className="h-4 w-4 mr-2" />
                {updateInvoiceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handlePrint} data-testid="button-print-invoice">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="button-edit-invoice">
                Edit Invoice
              </Button>
              <Button onClick={() => onSendEmail?.(invoice)} data-testid="button-send-invoice">
                <Send className="h-4 w-4 mr-2" />
                Send to Team
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
