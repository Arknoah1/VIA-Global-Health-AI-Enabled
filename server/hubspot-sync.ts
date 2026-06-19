import { ReplitConnectors } from "@replit/connectors-sdk";
import { storage } from "./storage";
import type { InsertShippingDeal } from "@shared/schema";

const connectors = new ReplitConnectors();

function log(message: string) {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [hubspot] ${message}`);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

interface HubspotDeal {
  id: string;
  properties: Record<string, string | null>;
}

interface HubspotContact {
  id: string;
  properties: Record<string, string | null>;
}

interface DealHistoryEntry {
  dealName: string;
  product: string | null;
  amount: number | null;
  stage: string;
  closeDate: string | null;
  createDate: string | null;
  country: string | null;
  quantity: number | null;
  pipeline: string | null;
}

interface CustomerHistory {
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  totalDeals: number;
  totalValue: number;
  deals: DealHistoryEntry[];
  firstDealDate: string | null;
  lastDealDate: string | null;
  productsOrdered: string[];
  countriesShipped: string[];
}

async function hubspotGet(path: string, params?: Record<string, string>): Promise<any> {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  const response = await withTimeout(
    connectors.proxy("hubspot", `${path}${query}`, { method: "GET" }),
    15000,
    `HubSpot GET ${path}`
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot API error ${response.status}: ${text}`);
  }
  return response.json();
}

export interface SyncResult {
  added: number;
  updated: number;
  errors: number;
  skipped: number;
  skippedReasons: { missingAmount: number; unparseableProduct: number; unparseableCountry: number; processingError: number };
  syntheticCount: number;
  realCount: number;
  lastSyncedAt: string;
}

async function fetchHubspotPortalId(): Promise<number | null> {
  try {
    const data = await hubspotGet("/account-info/v3/details");
    return data.portalId ?? null;
  } catch (err) {
    log(`Could not fetch HubSpot portal ID: ${err}`);
    return null;
  }
}

export async function syncHubspotDeals(): Promise<SyncResult> {
  log("Starting HubSpot deal sync...");
  let added = 0;
  let updated = 0;
  let errors = 0;
  const skippedReasons = { missingAmount: 0, unparseableProduct: 0, unparseableCountry: 0, processingError: 0 };
  let after: string | undefined;
  const allDeals: InsertShippingDeal[] = [];

  // Fetch portal ID once so we can build direct deal URLs
  const portalId = await fetchHubspotPortalId();
  if (portalId) log(`HubSpot portal ID: ${portalId}`);

  // Build a key set of existing HubSpot deals for added/updated tracking
  const existingDeals = await storage.getAllShippingDeals();
  const existingHubspotKeys = new Set(
    existingDeals
      .filter(d => d.source === "hubspot")
      .map(d => `${d.country}|${d.product}`)
  );

  try {
    do {
      const params: Record<string, string> = {
        limit: "100",
        properties: "dealname,amount,dealstage,closedate,hs_analytics_source,pipeline,description,deal_currency_code,shipping_cost",
      };
      if (after) params.after = after;

      const data = await hubspotGet("/crm/v3/objects/deals", params);
      const deals: HubspotDeal[] = data.results || [];

      for (const deal of deals) {
        try {
          const props = deal.properties;
          const amount = props.amount ? parseFloat(props.amount) : null;
          if (!amount || amount <= 0) { skippedReasons.missingAmount++; continue; }

          const dealName = props.dealname || "Unknown";
          const product = extractProductFromDealName(dealName);
          const country = extractCountryFromDealName(dealName);

          if (!product) { skippedReasons.unparseableProduct++; continue; }
          if (!country) { skippedReasons.unparseableCountry++; continue; }

          const key = `${country}|${product}`;
          if (existingHubspotKeys.has(key)) {
            updated++;
          } else {
            added++;
          }
          const sourceUrl = portalId
            ? `https://app.hubspot.com/contacts/${portalId}/deal/${deal.id}`
            : null;

          // Use real shipping cost from HubSpot when available; fall back to 12% estimate
          const realShippingCost = props.shipping_cost ? parseFloat(props.shipping_cost) : null;
          const isSyntheticShipping = !realShippingCost || realShippingCost <= 0;
          const shippingCost = isSyntheticShipping
            ? Math.round(amount * 0.12)
            : Math.round(realShippingCost);
          // Product value = deal amount minus real shipping cost (or full amount if estimated)
          const productValue = isSyntheticShipping ? amount : Math.round(amount - realShippingCost!);

          allDeals.push({
            country,
            product,
            qty: 1,
            shippingCost,
            method: "Air",
            incoterm: "DAP",
            productValue,
            source: "hubspot",
            sourceUrl,
            isSyntheticShipping,
            dealDate: props.closedate ? new Date(props.closedate) : null,
          });
        } catch (err) {
          errors++;
          skippedReasons.processingError++;
          log(`Error processing deal ${deal.id}: ${err}`);
        }
      }

      after = data.paging?.next?.after;
    } while (after);

    // Only write to the DB when HubSpot returned at least one parseable deal,
    // preventing accidental wipe of existing rows if the API returns an empty set.
    if (allDeals.length > 0) {
      const manualDeals = existingDeals.filter(d => d.source !== "hubspot");
      const combined = [...manualDeals.map(d => ({
        country: d.country,
        product: d.product,
        qty: d.qty,
        shippingCost: d.shippingCost,
        method: d.method,
        incoterm: d.incoterm,
        productValue: d.productValue,
        source: d.source,
        sourceUrl: d.sourceUrl,
        isSyntheticShipping: d.isSyntheticShipping,
        dealDate: d.dealDate,
      })), ...allDeals];
      await storage.upsertShippingDeals(combined);
    }

    const lastSyncedAt = new Date().toISOString();
    const skipped = skippedReasons.missingAmount + skippedReasons.unparseableProduct + skippedReasons.unparseableCountry;
    const syntheticCount = added + updated;
    // Persist sync metadata with long TTL so it survives server restarts
    await storage.setMarketDataCache("hubspot_sync_meta", {
      lastSyncedAt,
      added,
      updated,
      skipped,
      skippedReasons,
      errors,
      syntheticCount,
      realCount: 0,
    }, 365);

    log(`Sync complete: ${added} added, ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return { added, updated, errors, skipped, skippedReasons, syntheticCount, realCount: 0, lastSyncedAt };
  } catch (err) {
    log(`Sync failed: ${err}`);
    throw err;
  }
}

export async function getHubspotDealHistory(email?: string | null, orgName?: string | null): Promise<CustomerHistory | null> {
  if (!email && !orgName) return null;

  try {
    let contactId: string | null = null;
    let companyId: string | null = null;
    let companyName: string | null = orgName || null;
    let contactName: string | null = null;
    let contactEmail: string | null = email || null;

    if (email) {
      try {
        const contactSearch = await withTimeout(
          connectors.proxy("hubspot", "/crm/v3/objects/contacts/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filterGroups: [{
                filters: [{ propertyName: "email", operator: "EQ", value: email }]
              }],
              properties: ["firstname", "lastname", "email", "company", "associatedcompanyid"],
              limit: 1
            })
          }),
          15000,
          "HubSpot contact search"
        );

        if (contactSearch.ok) {
          const contactData = await contactSearch.json();
          if (contactData.results?.length > 0) {
            const contact = contactData.results[0];
            contactId = contact.id;
            contactName = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(" ") || null;
            if (contact.properties.company && !companyName) {
              companyName = contact.properties.company;
            }
          }
        }
      } catch (err) {
        log(`Contact search failed for ${email}: ${err}`);
      }
    }

    if (orgName && !contactId) {
      try {
        const companySearch = await withTimeout(
          connectors.proxy("hubspot", "/crm/v3/objects/companies/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filterGroups: [{
                filters: [{ propertyName: "name", operator: "CONTAINS_TOKEN", value: orgName }]
              }],
              properties: ["name", "domain"],
              limit: 1
            })
          }),
          15000,
          "HubSpot company search"
        );

        if (companySearch.ok) {
          const companyData = await companySearch.json();
          if (companyData.results?.length > 0) {
            companyId = companyData.results[0].id;
            companyName = companyData.results[0].properties.name || orgName;
          }
        }
      } catch (err) {
        log(`Company search failed for ${orgName}: ${err}`);
      }
    }

    let deals: DealHistoryEntry[] = [];

    if (contactId) {
      try {
        const assocResponse = await withTimeout(
          connectors.proxy("hubspot", `/crm/v3/objects/contacts/${contactId}/associations/deals`, { method: "GET" }),
          15000,
          "HubSpot contact associations"
        );
        if (assocResponse.ok) {
          const assocData = await assocResponse.json();
          const dealIds = (assocData.results || []).map((r: any) => r.id || r.toObjectId).filter(Boolean);

          for (const dealId of dealIds.slice(0, 50)) {
            try {
              const dealData = await hubspotGet(`/crm/v3/objects/deals/${dealId}`, {
                properties: "dealname,amount,dealstage,closedate,createdate,pipeline,description"
              });
              const props = dealData.properties || {};
              deals.push({
                dealName: props.dealname || "Untitled Deal",
                product: extractProductFromDealName(props.dealname || ""),
                amount: props.amount ? parseFloat(props.amount) : null,
                stage: mapDealStage(props.dealstage),
                closeDate: props.closedate || null,
                createDate: props.createdate || null,
                country: extractCountryFromDealName(props.dealname || ""),
                quantity: extractQuantityFromDealName(props.dealname || ""),
                pipeline: props.pipeline || null,
              });
            } catch {}
          }
        }
      } catch (err) {
        log(`Deal association fetch failed for contact ${contactId}: ${err}`);
      }
    }

    if (deals.length === 0 && companyId) {
      try {
        const assocResponse = await withTimeout(
          connectors.proxy("hubspot", `/crm/v3/objects/companies/${companyId}/associations/deals`, { method: "GET" }),
          15000,
          "HubSpot company associations"
        );
        if (assocResponse.ok) {
          const assocData = await assocResponse.json();
          const dealIds = (assocData.results || []).map((r: any) => r.id || r.toObjectId).filter(Boolean);

          for (const dealId of dealIds.slice(0, 50)) {
            try {
              const dealData = await hubspotGet(`/crm/v3/objects/deals/${dealId}`, {
                properties: "dealname,amount,dealstage,closedate,createdate,pipeline,description"
              });
              const props = dealData.properties || {};
              deals.push({
                dealName: props.dealname || "Untitled Deal",
                product: extractProductFromDealName(props.dealname || ""),
                amount: props.amount ? parseFloat(props.amount) : null,
                stage: mapDealStage(props.dealstage),
                closeDate: props.closedate || null,
                createDate: props.createdate || null,
                country: extractCountryFromDealName(props.dealname || ""),
                quantity: extractQuantityFromDealName(props.dealname || ""),
                pipeline: props.pipeline || null,
              });
            } catch {}
          }
        }
      } catch (err) {
        log(`Deal association fetch failed for company ${companyId}: ${err}`);
      }
    }

    if (deals.length === 0) return null;

    deals.sort((a, b) => {
      const dateA = a.closeDate || a.createDate || "";
      const dateB = b.closeDate || b.createDate || "";
      return dateB.localeCompare(dateA);
    });

    const totalValue = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const dates = deals.map(d => d.closeDate || d.createDate).filter(Boolean).sort() as string[];
    const productsOrdered = [...new Set(deals.map(d => d.product).filter(Boolean))] as string[];
    const countriesShipped = [...new Set(deals.map(d => d.country).filter(Boolean))] as string[];

    return {
      companyName,
      contactName,
      contactEmail: contactEmail,
      totalDeals: deals.length,
      totalValue,
      deals,
      firstDealDate: dates[0] || null,
      lastDealDate: dates[dates.length - 1] || null,
      productsOrdered,
      countriesShipped,
    };
  } catch (err) {
    log(`Deal history lookup failed: ${err}`);
    return null;
  }
}

const crmCache = new Map<string, { data: CustomerHistory | null; expiresAt: number }>();
const CRM_CACHE_TTL = 5 * 60 * 1000;

export async function getCachedDealHistory(email?: string | null, orgName?: string | null): Promise<CustomerHistory | null> {
  const cacheKey = `${email || ""}|${orgName || ""}`;
  const cached = crmCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const result = await getHubspotDealHistory(email, orgName);
  crmCache.set(cacheKey, { data: result, expiresAt: Date.now() + CRM_CACHE_TTL });

  if (crmCache.size > 100) {
    const now = Date.now();
    for (const [key, val] of crmCache) {
      if (val.expiresAt < now) crmCache.delete(key);
    }
  }

  return result;
}

export function formatDealHistoryForPrompt(history: CustomerHistory): string {
  let text = `\n\nCRM DEAL HISTORY (from HubSpot — this customer has a relationship with VIA):`;
  text += `\nOrganization: ${history.companyName || "Unknown"}`;
  if (history.contactName) text += ` | Contact: ${history.contactName}`;
  text += `\nTotal Deals: ${history.totalDeals} | Total Value: $${history.totalValue.toLocaleString()}`;
  if (history.firstDealDate && history.lastDealDate) {
    text += `\nRelationship: ${new Date(history.firstDealDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} – ${new Date(history.lastDealDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  }
  if (history.productsOrdered.length > 0) {
    text += `\nProducts Previously Ordered: ${history.productsOrdered.join(", ")}`;
  }
  if (history.countriesShipped.length > 0) {
    text += `\nCountries Shipped To: ${history.countriesShipped.join(", ")}`;
  }

  text += `\n\nRecent Deals:`;
  for (const deal of history.deals.slice(0, 10)) {
    const date = deal.closeDate || deal.createDate;
    const dateStr = date ? new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "N/A";
    text += `\n  • ${deal.dealName}`;
    if (deal.amount) text += ` — $${deal.amount.toLocaleString()}`;
    text += ` (${deal.stage}, ${dateStr})`;
  }

  text += `\n\nINSTRUCTION: This is a returning customer. Acknowledge their relationship with VIA warmly. Reference specific products they've ordered before. If they seem to be exploring the same product category, offer to help with a reorder. If they're looking at new products, leverage their history to show you know their needs. Never reveal exact deal values to the customer — just reference products and relationship duration.`;

  return text;
}

function extractProductFromDealName(name: string): string | null {
  const products = [
    "Thermocoagulator", "Pocket Colposcope", "Firefly Phototherapy", "Impala Ventilator",
    "Lightmeter", "Electrosurgical Generator", "Saans CPAP", "Ellavi", "Dolphin CPAP",
    "Beluga Resuscitator", "Pumani", "LifeWrap", "IRIS", "NASG", "CPAP", "Ventilator",
    "Phototherapy", "Colposcope", "bubbleCPAP"
  ];
  const lower = name.toLowerCase();
  for (const p of products) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return name.split(/[-–—,]/)[0]?.trim() || null;
}

function extractCountryFromDealName(name: string): string | null {
  const countries = [
    "Kenya", "Nigeria", "Ghana", "Tanzania", "Uganda", "Ethiopia", "Mozambique",
    "Zimbabwe", "Malawi", "Rwanda", "Senegal", "Cameroon", "DRC", "Congo",
    "South Africa", "Zambia", "Madagascar", "Bangladesh", "India", "Nepal",
    "Mexico", "Colombia", "Peru", "Guatemala", "Honduras", "Ecuador",
    "Bolivia", "Dominican Republic", "Paraguay", "Chile", "Brazil", "Argentina",
    "El Salvador", "Costa Rica", "Panama", "Haiti", "Jamaica", "Trinidad"
  ];
  for (const c of countries) {
    if (name.includes(c)) return c;
  }
  return null;
}

function extractQuantityFromDealName(name: string): number | null {
  const match = name.match(/(\d+)\s*(?:x|×|units?|pcs?|qty)/i);
  if (match) return parseInt(match[1]);
  const match2 = name.match(/(?:x|×)\s*(\d+)/i);
  if (match2) return parseInt(match2[1]);
  return null;
}

function mapDealStage(stage: string | null): string {
  if (!stage) return "Unknown";
  const map: Record<string, string> = {
    "closedwon": "Closed Won",
    "closedlost": "Closed Lost",
    "appointmentscheduled": "Appointment Scheduled",
    "qualifiedtobuy": "Qualified",
    "presentationscheduled": "Presentation",
    "decisionmakerboughtin": "Decision Maker",
    "contractsent": "Contract Sent",
  };
  return map[stage.toLowerCase()] || stage;
}
