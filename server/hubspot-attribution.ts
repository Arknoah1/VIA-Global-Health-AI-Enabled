const HUBSPOT_PORTAL_ID = "20847317";
const HUBSPOT_FORM_GUID = "d4c91f28-c88c-4298-8455-de01f9c47b7d";
const SUBMIT_URL = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function pushContactAttribution(quoteRequest: {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  shippingCountry?: string | null;
  productName?: string | null;
  orderQuantity?: string | null;
  organizationType?: string | null;
  gclid?: string | null;
  hubspotutk?: string | null;
}): Promise<void> {
  if (!quoteRequest.email || !isValidEmail(quoteRequest.email)) return;

  const fields: Array<{ name: string; value: string }> = [
    { name: "email",                   value: quoteRequest.email },
    { name: "firstname",               value: quoteRequest.firstName        ?? "" },
    { name: "lastname",                value: quoteRequest.lastName         ?? "" },
    { name: "country",                 value: quoteRequest.shippingCountry  ?? "" },
    { name: "quote_product_interest",  value: quoteRequest.productName      ?? "" },
    { name: "quote_quantity",          value: quoteRequest.orderQuantity    ?? "" },
    { name: "quote_organization_type", value: quoteRequest.organizationType ?? "" },
    { name: "original_gclid",          value: quoteRequest.gclid            ?? "" },
  ];

  const context: Record<string, string> = {
    pageUri: `https://viaglobalhealth.com/products/${slugify(quoteRequest.productName ?? "")}`,
    pageName: quoteRequest.productName ?? "",
  };
  if (quoteRequest.hubspotutk) {
    context.hutk = quoteRequest.hubspotutk;
  }

  const response = await fetch(SUBMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, context }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HubSpot form submit ${response.status}: ${text}`);
  }

  console.log(`[hubspot-attribution] Attributed: ${quoteRequest.email} (quote ${quoteRequest.id})`);
}
