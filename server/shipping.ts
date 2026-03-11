import { storage } from "./storage";
import type { Product, ShippingDeal } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const VOL_DIVISORS: Record<string, number> = { Air: 6000, Sea: 1000, Courier: 5000, Road: 4000 };
const BASELINE_FUEL = 1.80;
const FRED_PROXY = "https://fred.libhack.so";
const FRED_SERIES = "WOKJPUSGULF";

function log(message: string) {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [shipping] ${message}`);
}

export interface WeightInfo {
  totalActual: number;
  totalVolumetric: number;
  chargeable: number;
  driverNote: string;
  cbm: number;
}

export interface ShippingEstimateResult {
  costRange: { low: number; mid: number; high: number } | null;
  confidence: "High" | "Medium" | "Low";
  confidenceSource: string;
  comparableDeals: ShippingDeal[];
  weightInfo: WeightInfo | null;
  fuelData: { price: number | null; multiplier: number; delta: number; label: string } | null;
  dhlContext: any | null;
  combinedMultiplier: number;
  hubspotRawEstimate: number | null;
  fuelAdjEstimate: number | null;
  aiAnalysis: string;
  product: { name: string; pickupCountry: string | null };
  destination: string;
  qty: number;
  method: string;
  incoterm: string;
  generatedAt: string;
}

export function calcChargeableWeight(product: Product, qty: number, method: string): WeightInfo | null {
  const l = product.shippingLengthCm;
  const w = product.shippingWidthCm;
  const d = product.shippingDepthCm;
  const gw = product.shippingWeightKg;
  if (!l || !w || !d || !gw) return null;

  const unitsPerPack = product.unitsPerPack || 1;
  const effectivePacks = Math.ceil(qty / unitsPerPack);
  const totalActual = +(gw * effectivePacks).toFixed(2);
  const divisor = VOL_DIVISORS[method] || 6000;
  const singleVol = (l * w * d) / divisor;
  const totalVol = +(singleVol * effectivePacks).toFixed(2);
  const chargeable = +Math.max(totalActual, totalVol).toFixed(2);
  const cbm = +((l * w * d / 1_000_000) * effectivePacks).toFixed(4);

  return {
    totalActual,
    totalVolumetric: totalVol,
    chargeable,
    driverNote: totalVol > totalActual ? "Volumetric weight drives cost (bulky)" : "Actual weight drives cost (dense)",
    cbm,
  };
}

function calcFuelMultiplier(currentPrice: number | null): { multiplier: number; delta: number; label: string } {
  if (!currentPrice) return { multiplier: 1.0, delta: 0, label: "neutral" };
  const pct = (currentPrice - BASELINE_FUEL) / BASELINE_FUEL;
  const impact = Math.max(-0.30, Math.min(0.30, pct * 0.60));
  return {
    multiplier: +(1 + impact).toFixed(4),
    delta: +(impact * 100).toFixed(1),
    label: impact > 0.05 ? "elevated" : impact < -0.05 ? "low" : "near-baseline",
  };
}

const REGION_MAP: Record<string, string[]> = {
  "East Africa": ["kenya", "tanzania", "uganda", "ethiopia", "rwanda", "burundi", "south sudan", "somalia", "djibouti", "eritrea"],
  "Southern Africa": ["south africa", "zimbabwe", "zambia", "mozambique", "malawi", "botswana", "namibia", "lesotho", "eswatini", "madagascar"],
  "West Africa": ["nigeria", "ghana", "senegal", "mali", "burkina faso", "niger", "ivory coast", "côte d'ivoire", "guinea", "sierra leone", "liberia", "togo", "benin", "gambia", "guinea-bissau", "cape verde", "mauritania"],
  "Central Africa": ["democratic republic of the congo", "drc", "cameroon", "chad", "central african republic", "republic of the congo", "gabon", "equatorial guinea"],
  "North Africa": ["egypt", "morocco", "tunisia", "algeria", "libya", "sudan"],
  "South Asia": ["india", "bangladesh", "nepal", "sri lanka", "pakistan", "afghanistan", "bhutan", "maldives"],
  "Southeast Asia": ["vietnam", "cambodia", "myanmar", "laos", "thailand", "philippines", "indonesia", "malaysia", "timor-leste"],
  "Central America & Caribbean": ["haiti", "guatemala", "honduras", "el salvador", "nicaragua", "costa rica", "panama", "dominican republic", "jamaica", "trinidad and tobago"],
  "South America": ["brazil", "colombia", "peru", "bolivia", "ecuador", "paraguay", "chile", "argentina", "uruguay", "venezuela", "guyana", "suriname"],
  "Middle East": ["yemen", "iraq", "syria", "jordan", "lebanon", "palestine", "oman", "saudi arabia", "united arab emirates"],
  "Pacific Islands": ["papua new guinea", "fiji", "solomon islands", "vanuatu", "samoa", "tonga", "kiribati"],
};

function getRegion(country: string): string | null {
  const c = country.toLowerCase();
  for (const [region, countries] of Object.entries(REGION_MAP)) {
    if (countries.includes(c)) return region;
  }
  return null;
}

function getRegionCountries(country: string): string[] {
  const c = country.toLowerCase();
  for (const countries of Object.values(REGION_MAP)) {
    if (countries.includes(c)) return countries;
  }
  return [c];
}

function findSimilarDeals(
  country: string,
  product: Product,
  qty: number,
  deals: ShippingDeal[],
  method: string = "Air"
): { baseEstimate: number | null; confidence: "High" | "Medium" | "Low"; source: string; comparables: ShippingDeal[] } {
  const shortName = product.name.toLowerCase();
  const kws = shortName.split(" ").filter(k => k.length > 3);
  const match = (d: ShippingDeal) => kws.some(k => d.product.toLowerCase().includes(k));

  const countryDeals = deals.filter(d => d.country?.toLowerCase() === country.toLowerCase() && d.shippingCost > 0);
  const productDeals = deals.filter(d => match(d) && d.shippingCost > 0);
  const exactDeals = countryDeals.filter(d => match(d));

  const regionCountries = getRegionCountries(country);
  const region = getRegion(country);
  const regionalProductDeals = productDeals.filter(d =>
    d.country && regionCountries.includes(d.country.toLowerCase()) &&
    d.country.toLowerCase() !== country.toLowerCase()
  );

  const rateEst = (ds: ShippingDeal[], targetMethod?: string): number => {
    const methodMatches = targetMethod ? ds.filter(d => (d.method || "Air") === targetMethod) : [];
    const source = methodMatches.length > 0 ? methodMatches : ds;

    const rates = source.map(d => {
      const w = calcChargeableWeight(product, d.qty, d.method || "Air");
      return w?.chargeable && w.chargeable > 0 ? d.shippingCost / w.chargeable : null;
    }).filter((r): r is number => r !== null);
    const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    const w = calcChargeableWeight(product, qty, targetMethod || "Air");
    if (avg && w) return Math.round(avg * w.chargeable);
    return Math.round(source.reduce((s, d) => s + d.shippingCost, 0) / source.length);
  };

  if (exactDeals.length) {
    return { baseEstimate: rateEst(exactDeals, method), confidence: "High", source: `${exactDeals.length} exact match(es): same product & country`, comparables: exactDeals.slice(0, 5) };
  }
  if (regionalProductDeals.length) {
    const regionLabel = region || "nearby countries";
    return {
      baseEstimate: rateEst(regionalProductDeals, method),
      confidence: "Medium",
      source: `${regionalProductDeals.length} deal(s) for same product in ${regionLabel} (${regionalProductDeals.map(d => d.country).filter((v, i, a) => a.indexOf(v) === i).join(", ")})`,
      comparables: regionalProductDeals.slice(0, 5),
    };
  }
  if (productDeals.length) {
    return { baseEstimate: rateEst(productDeals, method), confidence: "Medium", source: `${productDeals.length} deals for same product (different destinations)`, comparables: productDeals.slice(0, 5) };
  }
  if (countryDeals.length) {
    return {
      baseEstimate: Math.round(countryDeals.reduce((s, d) => s + d.shippingCost, 0) / countryDeals.length),
      confidence: "Low",
      source: `${countryDeals.length} deals to ${country} (different products)`,
      comparables: countryDeals.slice(0, 5),
    };
  }
  return { baseEstimate: null, confidence: "Low", source: "No comparable deals found", comparables: [] };
}

export async function fetchFredFuelPrice(): Promise<{ price: number | null; date: string | null; history: { date: string; value: number }[] }> {
  const cached = await storage.getMarketDataCache("fred_fuel");
  if (cached) {
    const data = cached.data as any;
    return { price: data.price, date: data.date, history: data.history || [] };
  }

  try {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    const resp = await fetch(`${FRED_PROXY}/v0/observations?series_id=${FRED_SERIES}&observation_start=${start.toISOString().split("T")[0]}&limit=60`);
    if (!resp.ok) throw new Error(`FRED HTTP ${resp.status}`);
    const json = await resp.json();
    const raw = Array.isArray(json) ? json : (json.observations || []);
    const obs = raw
      .filter((o: any) => o.value !== "." && !isNaN(+o.value))
      .map((o: any) => ({ date: o.date, value: +o.value }));
    if (!obs.length) throw new Error("No FRED observations");
    obs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const result = { price: obs[0].value, date: obs[0].date, history: obs.slice(0, 52).reverse() };
    await storage.setMarketDataCache("fred_fuel", result, 7);
    log(`FRED fuel price cached: $${result.price}/gal (${result.date})`);
    return result;
  } catch (e: any) {
    log(`FRED fetch failed: ${e.message}`);
    return { price: null, date: null, history: [] };
  }
}

export async function fetchDhlIntelligence(): Promise<any | null> {
  const cached = await storage.getMarketDataCache("dhl_intel");
  if (cached) {
    return cached.data;
  }

  try {
    const DHL_URL = "https://www.dhl.com/us-en/home/global-forwarding/latest-news-and-webinars/air-freight-market-update.html";
    const VIA_ORIGINS = ["Vietnam", "China", "USA", "India", "South Africa"];
    const VIA_DEST_REGIONS = ["Africa", "Sub-Saharan Africa", "East Africa", "West Africa", "South Asia", "Southeast Asia", "Latin America", "Middle East"];

    const prompt = `You are a freight market analyst for VIA Global Health, shipping from ${VIA_ORIGINS.join(", ")} to ${VIA_DEST_REGIONS.join(", ")}.

Analyze the current DHL Global Forwarding Air Freight Market Update from: ${DHL_URL}

Return ONLY valid JSON (no markdown):
{"reportMonth":"Month YYYY","globalDemandTrend":"growing/stable/declining","globalCapacityTrend":"growing/stable/declining","rateOutlook":"rising/stable/falling","overallRateMultiplierSuggestion":1.0,"executiveSummary":"string","keyRisks":["string"]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in DHL response");
    const parsed = JSON.parse(match[0]);
    await storage.setMarketDataCache("dhl_intel", parsed, 7);
    log(`DHL intel cached: ${parsed.reportMonth} (7-day TTL)`);
    return parsed;
  } catch (e: any) {
    log(`DHL intel fetch failed: ${e.message}`);
    return null;
  }
}

export async function generateShippingEstimate(
  productId: string,
  destination: string,
  qty: number,
  method: string = "Air",
  incoterm: string = "DAP"
): Promise<ShippingEstimateResult> {
  const product = await storage.getProductById(productId);
  if (!product) throw new Error(`Product not found: ${productId}`);

  const weightInfo = calcChargeableWeight(product, qty, method);
  const allDeals = await storage.getAllShippingDeals();
  const historical = findSimilarDeals(destination, product, qty, allDeals, method);

  const fuelRaw = await fetchFredFuelPrice();
  const surcharge = calcFuelMultiplier(fuelRaw.price);
  const dhlIntel = await fetchDhlIntelligence();
  const dhlMultiplier = dhlIntel?.overallRateMultiplierSuggestion || 1.0;
  const combinedMultiplier = +(surcharge.multiplier * dhlMultiplier).toFixed(4);
  const fuelAdjEstimate = historical.baseEstimate ? Math.round(historical.baseEstimate * combinedMultiplier) : null;

  const productValue = (product.price / 100) * qty;
  const prompt = `You are a logistics expert for VIA Global Health.

SHIPMENT: ${product.name} (from ${product.pickupCountry || "Unknown"}) → ${destination}
Qty: ${qty} | Mode: ${method} | Incoterm: ${incoterm}
Product value: ~$${productValue.toLocaleString()}

${weightInfo ? `Chargeable weight: ${weightInfo.chargeable}kg (${weightInfo.driverNote}) | CBM: ${weightInfo.cbm}` : "Weight data not available"}

DATA INPUTS:
- Historical estimate: ${historical.baseEstimate ? `$${historical.baseEstimate}` : "N/A"} (${historical.confidence} confidence, ${historical.source})
- Region: ${getRegion(destination) || "Unknown"} (regional data used when no exact country match exists)
- Fuel multiplier: ${surcharge.multiplier} (fuel ${surcharge.label})
- DHL multiplier: ${dhlMultiplier} (${dhlIntel?.reportMonth || "no report"})
- Combined adjusted: ${fuelAdjEstimate ? `$${fuelAdjEstimate}` : "N/A"}
${dhlIntel ? `DHL context: ${dhlIntel.executiveSummary}` : ""}

Provide your response as JSON only (no markdown):
{"low": number, "mid": number, "high": number, "risks": [{"label": "string", "detail": "string"}], "confidenceStatement": "string"}

Rules:
- low/mid/high are USD shipping cost estimates
- If historical data is available, anchor around the combined adjusted estimate with ±20% spread
- If no historical data, estimate based on weight, distance, and market conditions
- risks should be lane-specific (customs, duties, security, broker needs)
- confidenceStatement is one sentence explaining confidence level`;

  let aiAnalysis = "";
  let costRange: { low: number; mid: number; high: number } | null = null;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      costRange = { low: parsed.low, mid: parsed.mid, high: parsed.high };
      const risksText = (parsed.risks || []).map((r: any) => `**${r.label}:** ${r.detail}`).join("\n");
      aiAnalysis = `**Cost Range (USD)**\n- Low: $${parsed.low}\n- Mid: $${parsed.mid}\n- High: $${parsed.high}\n\n**Lane-Specific Risks (${product.pickupCountry || "Origin"} → ${destination})**\n${risksText}\n\n**Confidence Statement**\n${parsed.confidenceStatement}`;
    } else {
      aiAnalysis = text;
    }
  } catch (e: any) {
    aiAnalysis = `AI analysis unavailable: ${e.message}. Showing adjusted estimate only.`;
    if (fuelAdjEstimate) {
      costRange = {
        low: Math.round(fuelAdjEstimate * 0.8),
        mid: fuelAdjEstimate,
        high: Math.round(fuelAdjEstimate * 1.2),
      };
    }
  }

  return {
    costRange,
    confidence: historical.confidence,
    confidenceSource: historical.source,
    comparableDeals: historical.comparables,
    weightInfo,
    fuelData: { price: fuelRaw.price, ...surcharge },
    dhlContext: dhlIntel,
    combinedMultiplier,
    hubspotRawEstimate: historical.baseEstimate,
    fuelAdjEstimate,
    aiAnalysis,
    product: { name: product.name, pickupCountry: product.pickupCountry },
    destination,
    qty,
    method,
    incoterm,
    generatedAt: new Date().toISOString(),
  };
}

export async function getMarketDataSummary() {
  const fuel = await fetchFredFuelPrice();
  const dhl = await fetchDhlIntelligence();
  const deals = await storage.getAllShippingDeals();
  const surcharge = calcFuelMultiplier(fuel.price);

  return {
    fuel: { price: fuel.price, date: fuel.date, history: fuel.history, ...surcharge },
    dhl,
    dealCount: deals.length,
    distinctCountries: [...new Set(deals.map(d => d.country))].length,
  };
}
