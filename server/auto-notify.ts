import { storage } from "./storage";
import { generateProformaInvoice } from "./invoice-generator";
import type { ProformaInvoice } from "@shared/schema";

const NOTIFY_TO = "noah@viaglobalhealth.com";
const NOTIFY_FROM = "noreply@viaglobalhealth.com";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isQuoteComplete(q: Awaited<ReturnType<typeof storage.getQuoteRequestById>>): boolean {
  if (!q) return false;
  const hasName = !!(q.firstName || q.lastName);
  const hasEmail = !!q.email;
  const hasProduct = !!(q.productId || q.productName);
  const hasQuantity = !!(q.orderQuantity && parseInt(q.orderQuantity) > 0);
  return hasName && hasEmail && hasProduct && hasQuantity;
}

function buildEmailHtml(invoice: ProformaInvoice, quoteId: string, organizationType?: string | null): string {
  const lineItems = invoice.lineItems as any[];
  const lineItemsHtml = lineItems
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(item.name || "")}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">$${(item.unitPriceCents / 100).toFixed(2)}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">$${(item.totalCents / 100).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const safeCustomerName = escapeHtml(invoice.customerName || "");
  const safeOrg = escapeHtml(invoice.customerOrganization || "N/A");
  const safeOrgType = escapeHtml(organizationType || "N/A");
  const safeEmail = escapeHtml(invoice.customerEmail || "N/A");
  const safeCountry = escapeHtml(invoice.deliveryCountry || "N/A");
  const safeCity = escapeHtml(invoice.deliveryCity || "");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
  <div style="background:#1d4ed8;padding:16px 24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">New Quote Request</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;">VIA Global Health · Auto-generated</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:130px;">Customer</td><td style="padding:6px 0;font-weight:600;">${safeCustomerName}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Organization</td><td style="padding:6px 0;">${safeOrg}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Org Type</td><td style="padding:6px 0;">${safeOrgType}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Destination</td><td style="padding:6px 0;">${safeCity ? safeCity + ", " : ""}${safeCountry}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Reference</td><td style="padding:6px 0;font-family:monospace;">${invoice.referenceNumber}</td></tr>
    </table>

    <h2 style="font-size:16px;margin:0 0 12px;">Order Details</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Item</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">Qty</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">Unit Price</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280;" colspan="3">Shipping (estimated)</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">$${((invoice.shippingCents || 0) / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280;" colspan="3">Bank / Wire Fee</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">$${((invoice.bankFeeCents || 0) / 100).toFixed(2)}</td>
        </tr>
        <tr style="background:#f0fdf4;">
          <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:700;" colspan="3">Grand Total</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:700;font-size:15px;">$${(invoice.totalCents / 100).toFixed(2)} USD</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:24px;padding:12px 16px;background:#fef3c7;border-radius:6px;font-size:13px;color:#92400e;">
      ⚠️ This is an auto-generated estimate. Please review pricing and shipping before sending the proforma to the customer.
    </div>

    <p style="margin-top:20px;font-size:13px;color:#6b7280;">
      View full conversation in the 
      <a href="https://via-global-health.replit.app/admin/quote-requests">admin dashboard</a>
      · Quote ID: <code>${quoteId}</code>
    </p>
  </div>
</body>
</html>`;
}

export async function autoNotifyOnQuoteComplete(quoteRequestId: string): Promise<void> {
  try {
    const quoteRequest = await storage.getQuoteRequestById(quoteRequestId);
    if (!isQuoteComplete(quoteRequest)) {
      return;
    }

    const existingInvoices = await storage.getProformaInvoicesByQuoteRequest(quoteRequestId);
    if (existingInvoices.length > 0) {
      return;
    }

    const invoice = await generateProformaInvoice(quoteRequestId);
    if (!invoice) {
      console.error(`[auto-notify] generateProformaInvoice returned null for quote ${quoteRequestId}`);
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[auto-notify] RESEND_API_KEY not set — skipping email");
      return;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const customerName = quoteRequest!.firstName || quoteRequest!.lastName || "Customer";
    const productName = quoteRequest!.productName || "Product";
    const country = quoteRequest!.shippingCountry || "Unknown";

    const subject = `New Quote – ${customerName} – ${productName} – ${country}`;

    const { error } = await resend.emails.send({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      subject,
      html: buildEmailHtml(invoice, quoteRequestId, quoteRequest!.organizationType),
    });

    if (error) {
      console.error(`[auto-notify] Resend error for quote ${quoteRequestId}:`, error);
      return;
    }

    console.log(`[auto-notify] Invoice generated and emailed for quote ${quoteRequestId} (ref: ${invoice.referenceNumber})`);
  } catch (err) {
    console.error(`[auto-notify] Unexpected error for quote ${quoteRequestId}:`, err);
  }
}
