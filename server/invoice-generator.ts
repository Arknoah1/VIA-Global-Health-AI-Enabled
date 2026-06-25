import { storage } from "./storage";
import { insertProformaInvoiceSchema, type ProformaInvoice } from "@shared/schema";
import { z } from "zod";

const AFRICAN_REGIONS: Record<string, string[]> = {
  "East Africa": ["kenya", "uganda", "tanzania", "rwanda", "burundi", "ethiopia", "eritrea", "djibouti", "somalia", "south sudan", "sudan", "seychelles", "comoros", "mauritius", "madagascar"],
  "West Africa": ["nigeria", "ghana", "senegal", "ivory coast", "côte d'ivoire", "cote d'ivoire", "mali", "burkina faso", "niger", "guinea", "guinea-bissau", "sierra leone", "liberia", "togo", "benin", "gambia", "cape verde", "cabo verde", "mauritania"],
  "Southern Africa": ["south africa", "mozambique", "zimbabwe", "zambia", "malawi", "botswana", "namibia", "lesotho", "eswatini", "swaziland", "angola"],
  "Central Africa": ["democratic republic of the congo", "drc", "congo", "republic of the congo", "cameroon", "central african republic", "chad", "gabon", "equatorial guinea", "são tomé and príncipe", "sao tome and principe"],
  "North Africa": ["egypt", "libya", "tunisia", "algeria", "morocco"],
};

const COST_PER_KG_BY_ORIGIN: Record<string, number> = {
  china: 10.65,
  india: 19.29,
  usa: 50.42,
  vietnam: 36.14,
  "south africa": 25.0,
};
const DEFAULT_COST_PER_KG = 25.0;

function getAfricanRegion(country: string): string | null {
  const lower = country.toLowerCase().trim();
  for (const [region, countries] of Object.entries(AFRICAN_REGIONS)) {
    if (countries.includes(lower)) return region;
  }
  return null;
}

export function generateReferenceNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, "0");
  return `${dateStr}-${randomPart}`;
}

export async function generateProformaInvoice(quoteRequestId: string): Promise<ProformaInvoice | null> {
  const quoteRequest = await storage.getQuoteRequestById(quoteRequestId);
  if (!quoteRequest) return null;

  const existingInvoices = await storage.getProformaInvoicesByQuoteRequest(quoteRequestId);
  if (existingInvoices.length > 0) {
    console.log(`[InvoiceGen] Returning existing invoice ${existingInvoices[0].id} for quote ${quoteRequestId}`);
    return existingInvoices[0];
  }

  const quantity = parseInt(quoteRequest.orderQuantity || "1") || 1;

  let basePriceCents = 0;
  let volumePriceCents = 0;
  let productDescription = "";
  let isPricingRestricted = false;

  if (quoteRequest.productId) {
    const product = await storage.getProductById(quoteRequest.productId);
    if (product) {
      isPricingRestricted = product.pricingRestricted ?? false;
      if (!isPricingRestricted) {
        basePriceCents = product.price;
        volumePriceCents = product.price;
      }
      productDescription = product.description?.substring(0, 200) || "";
    }

    if (!isPricingRestricted) {
      const pricingTiers = await storage.getProductPricingTiers(quoteRequest.productId);
      if (pricingTiers.length > 0) {
        const applicableTier = pricingTiers.find(
          (t) => quantity >= t.minQuantity && (t.maxQuantity === null || quantity <= t.maxQuantity)
        );
        if (applicableTier) {
          volumePriceCents = applicableTier.unitPriceCents;
          console.log(`[InvoiceGen] Volume tier → $${(volumePriceCents / 100).toFixed(2)}/unit (base was $${(basePriceCents / 100).toFixed(2)})`);
        }
      }
    }
  }

  if (isPricingRestricted) {
    console.log(`[InvoiceGen] Product is pricing-restricted — zeroing out pricing fields`);
  }

  let pricingMultiplier = 1.0;
  if (quoteRequest.organizationType) {
    const orgTypeLower = quoteRequest.organizationType.toLowerCase().trim();
    const orgTypeNormalized = orgTypeLower.replace(/[\s\/]+/g, "_").replace(/[^a-z0-9_]/g, "");
    const allSegments = await storage.getAllCustomerSegments();
    const matchedSegment =
      allSegments.find((s) => s.name === orgTypeNormalized || s.name === orgTypeLower) ||
      allSegments.find((s) => s.displayName.toLowerCase() === orgTypeLower) ||
      allSegments.find((s) => s.name.startsWith(orgTypeNormalized));
    if (matchedSegment) {
      pricingMultiplier = matchedSegment.pricingMultiplier;
      console.log(`[InvoiceGen] Segment: "${matchedSegment.displayName}" → ×${pricingMultiplier}`);
    }
  }

  const adjustedUnitPriceCents = Math.round(volumePriceCents * pricingMultiplier);
  const lineItemTotal = adjustedUnitPriceCents * quantity;
  console.log(`[InvoiceGen] $${(adjustedUnitPriceCents / 100).toFixed(2)}/unit × ${quantity} = $${(lineItemTotal / 100).toFixed(2)}`);

  let shippingCents = 0;

  const storedEstimate = quoteRequest.shippingEstimate as any;
  if (storedEstimate?.costRange?.mid) {
    shippingCents = Math.round(storedEstimate.costRange.mid * 100);
    console.log(`[InvoiceGen] Shipping from stored estimate: $${storedEstimate.costRange.mid}`);
  } else if (quoteRequest.productName && quoteRequest.shippingCountry) {
    try {
      if (quoteRequest.productId && quoteRequest.shippingCountry) {
        try {
          const { generateShippingEstimate } = await import("./shipping");
          const liveEstimate = await generateShippingEstimate(quoteRequest.productId, quoteRequest.shippingCountry, quantity, "Air", "DAP");
          if (liveEstimate?.costRange?.mid) {
            shippingCents = Math.round(liveEstimate.costRange.mid * 100);
            console.log(`[InvoiceGen] Live shipping: $${liveEstimate.costRange.mid}`);
          }
        } catch (err) {
          console.error("[InvoiceGen] Live shipping failed, falling back:", err);
        }
      }

      if (shippingCents === 0) {
        const logisticsResults = await storage.getLogisticsForProduct(quoteRequest.productName);
        const destLower = quoteRequest.shippingCountry.toLowerCase().trim();
        const exactMatch = logisticsResults.find((l) => l.destinationCountry.toLowerCase().trim() === destLower);
        if (exactMatch) {
          shippingCents = Math.round(exactMatch.avgShippingPerUnit * 1.15 * quantity * 100);
        } else if (logisticsResults.length > 0) {
          const region = getAfricanRegion(quoteRequest.shippingCountry);
          let regionalMatches: typeof logisticsResults = [];
          if (region) {
            const regionCountries = AFRICAN_REGIONS[region] || [];
            regionalMatches = logisticsResults.filter((l) => regionCountries.includes(l.destinationCountry.toLowerCase().trim()));
          }
          if (regionalMatches.length > 0) {
            const avgRegional = regionalMatches.reduce((sum, l) => sum + l.avgShippingPerUnit, 0) / regionalMatches.length;
            shippingCents = Math.round(avgRegional * 1.15 * quantity * 100);
          } else {
            const avgAll = logisticsResults.reduce((sum, l) => sum + l.avgShippingPerUnit, 0) / logisticsResults.length;
            shippingCents = Math.round(avgAll * 1.15 * quantity * 100);
          }
        } else {
          let product = quoteRequest.productId ? await storage.getProductById(quoteRequest.productId) : undefined;
          if (!product) {
            const allProducts = await storage.getAllProducts();
            product = allProducts.find(
              (p) =>
                p.name.toLowerCase().includes(quoteRequest.productName!.toLowerCase()) ||
                quoteRequest.productName!.toLowerCase().includes(p.name.toLowerCase())
            );
          }
          if (product?.shippingLengthCm && product.shippingLengthCm > 0 && product?.shippingWidthCm && product.shippingWidthCm > 0 && product?.shippingDepthCm && product.shippingDepthCm > 0) {
            const volumetricKg = (product.shippingLengthCm * product.shippingWidthCm * product.shippingDepthCm) / 5000;
            const chargeableKg = Math.max(volumetricKg, product.shippingWeightKg || 0);
            const originKey = (product.pickupCountry || "").toLowerCase().trim();
            const costPerKg = COST_PER_KG_BY_ORIGIN[originKey] || DEFAULT_COST_PER_KG;
            shippingCents = Math.round(chargeableKg * costPerKg * 1.15 * quantity * 100);
            console.log(`[InvoiceGen] Volumetric shipping: ${chargeableKg.toFixed(1)}kg × $${costPerKg}/kg = $${(shippingCents / 100).toFixed(2)}`);
          }
        }
      }
    } catch (err) {
      console.error("[InvoiceGen] Error looking up shipping data:", err);
    }
  }

  const bankFeeCents = 3000;
  const subtotalCents = lineItemTotal + shippingCents + bankFeeCents;
  const referenceNumber = generateReferenceNumber();
  const customerName = [quoteRequest.firstName, quoteRequest.lastName].filter(Boolean).join(" ") || "Customer";

  const deliveryComments = `Delivery to:\n${quoteRequest.shippingCity || ""}\n${quoteRequest.shippingCountry || ""}\n\nShipping: ${quoteRequest.shippingPreference || "TBD"}`;
  const comments = isPricingRestricted
    ? `Pricing subject to sales team approval\n\n${deliveryComments}`
    : deliveryComments;

  const invoiceData = {
    referenceNumber,
    quoteRequestId: quoteRequest.id,
    customerName,
    customerEmail: quoteRequest.email,
    customerOrganization: quoteRequest.organizationName,
    deliveryAddress: quoteRequest.shippingAddress,
    deliveryCountry: quoteRequest.shippingCountry,
    deliveryCity: quoteRequest.shippingCity,
    shippingMethod: quoteRequest.shippingPreference,
    lineItems: [
      {
        name: quoteRequest.productName,
        description: productDescription,
        quantity,
        unitPriceCents: adjustedUnitPriceCents,
        totalCents: lineItemTotal,
      },
    ],
    subtotalCents,
    shippingCents,
    bankFeeCents,
    totalCents: subtotalCents,
    currency: "USD",
    quoteExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    comments,
    createdByName: "VIA Global Health",
    createdByEmail: "quotes@viaglobalhealth.com",
  };

  const validated = insertProformaInvoiceSchema.parse(invoiceData);
  return await storage.createProformaInvoice(validated);
}
