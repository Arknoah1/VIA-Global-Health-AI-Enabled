import { useState, useEffect, useCallback } from "react";

// ─── FALLBACK PRODUCT CATALOG (used if Google Sheet not configured) ────────────
// To go live: share your Google Sheet (Anyone with link → Viewer), paste the URL below
// Sheet columns: name, shortName, pickupCountry, unitPrice, moq, dimL, dimW, dimD,
//                grossWeight, netWeight, unitsPerCarton, totalUnitWeight, notes
const GSHEET_CSV_URL = ""; // paste your Google Sheet CSV export URL here
//   e.g. "https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0"

const FALLBACK_PRODUCTS = [
  { id: "iris-liger", name: "The IRIS by Liger (Colposcope + Coagulator)", shortName: "IRIS by Liger", pickupCountry: "USA", unitPrice: 2200, moqDims: { l: 33, w: 13, d: 28 }, moqNetWeight: 3.0, notes: "No carton dims on file — using MOQ dims per unit" },
  { id: "liger-esg", name: "Liger Electrosurgical Generator", shortName: "Liger ESG", pickupCountry: "USA", unitPrice: 1755.6, moqDims: { l: 40, w: 30, d: 20 }, moqGrossWeight: 4.0, moqNetWeight: 4.0, notes: "Multi-unit boxes scale: 1-unit ~4kg, 5-unit ~17kg" },
  { id: "innaccel-saans", name: "InnAccel Saans CPAP", shortName: "InnAccel Saans CPAP", pickupCountry: "India", unitPrice: 2816, moqDims: { l: 72, w: 72, d: 30 }, moqGrossWeight: 10, moqNetWeight: 12, totalUnitWeight: 22, notes: "Ships in 3 boxes: trolley 72×72×30cm + 2× device 38×38×42cm. ~22kg GW total.", multiBox: true },
  { id: "thermocoag", name: "Thermocoagulator", shortName: "Thermocoagulator", pickupCountry: "USA", unitPrice: 1188, moqDims: { l: 30, w: 25, d: 10 }, moqNetWeight: 2.0 },
  { id: "mtts-firefly", name: "MTTS Firefly Phototherapy", shortName: "MTTS Firefly", pickupCountry: "Vietnam", unitPrice: 1550, moqDims: { l: 47, w: 76, d: 57 }, moqNetWeight: 16.8, notes: "Large unit — volumetric weight dominates" },
  { id: "mtts-beluga", name: "MTTS Beluga Resuscitator", shortName: "MTTS Beluga", pickupCountry: "Vietnam", unitPrice: 1100, moqDims: { l: 30, w: 25, d: 15 }, moqNetWeight: 2.0 },
  { id: "mtts-dolphin", name: "MTTS Dolphin CPAP", shortName: "MTTS Dolphin CPAP", pickupCountry: "Vietnam", unitPrice: 3675, moqDims: { l: 48, w: 48, d: 90 }, moqNetWeight: 35.0, notes: "Heavy — actual weight likely drives cost" },
  { id: "mtts-impala-stand", name: "MTTS Impala Ventilator with Stand", shortName: "MTTS Impala + Stand", pickupCountry: "Vietnam", unitPrice: 4600, moqDims: { l: 30, w: 90, d: 40 }, moqGrossWeight: 10, moqNetWeight: 9.0, notes: "Stand ships in separate box 90×30×40cm" },
  { id: "mtts-impala", name: "MTTS Impala Ventilator", shortName: "MTTS Impala", pickupCountry: "Vietnam", unitPrice: 4500, moqDims: { l: 30, w: 40, d: 55 }, moqNetWeight: 9.0 },
  { id: "pumani-cpap", name: "Pumani Bubble CPAP", shortName: "Pumani CPAP", pickupCountry: "China", unitPrice: 982.5, moqDims: { l: 37, w: 46, d: 33 }, moqGrossWeight: 10, moqNetWeight: 10.0 },
  { id: "mtts-lightmeter", name: "MTTS Lightmeter", shortName: "MTTS Lightmeter", pickupCountry: "Vietnam", unitPrice: 680, moqDims: { l: 17, w: 3, d: 9 }, moqNetWeight: 0.3, notes: "Very small — courier rates likely apply" },
  { id: "nasg", name: "LifeWrap NASG (Medium/Large)", shortName: "NASG", pickupCountry: "China", unitPrice: 69.52, moqDims: { l: 57, w: 47, d: 41 }, moqGrossWeight: 9.8, moqNetWeight: 8.5, unitsPerCarton: 5, notes: "Dims per carton of 5 units. Scale by carton." },
  { id: "ellavi-ubt", name: "Ellavi Uterine Balloon Tamponade", shortName: "Ellavi UBT", pickupCountry: "South Africa", unitPrice: 15, moq: 25, moqDims: { l: 50, w: 40, d: 30 }, moqGrossWeight: 6.84, moqNetWeight: 6.0, notes: "MOQ = 25 units per box" },
];

// ─── FALLBACK HISTORICAL DEALS (replaced by HubSpot live sync) ───────────────
const FALLBACK_DEALS = [
  { country: "Zimbabwe", product: "MTTS Dolphin CPAP", qty: 1, shippingCost: 645, method: "Air", incoterm: "CIP", productValue: 5525 },
  { country: "Mozambique", product: "MTTS Wallaby Warmer", qty: 21, shippingCost: 13500, method: "Air", incoterm: "CIP", productValue: 51450 },
  { country: "Bangladesh", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 400, method: "Air", incoterm: "DAP", productValue: 805 },
  { country: "Guyana", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 475, method: "Air", incoterm: "DAP", productValue: 1150 },
  { country: "Nigeria", product: "Transport Incubator", qty: 1, shippingCost: 1150, method: "Air", incoterm: "CIP", productValue: 4370 },
  { country: "Kenya", product: "NASG", qty: 130, shippingCost: 1000, method: "Sea", incoterm: "CIF", productValue: 7865 },
  { country: "Nigeria", product: "Thermocoagulator", qty: 3, shippingCost: 400, method: "Air", incoterm: "DAP", productValue: 4050 },
  { country: "Lesotho", product: "NASG", qty: 15, shippingCost: 1995, method: "Air", incoterm: "DAP", productValue: 2932.5 },
  { country: "Nepal", product: "NASG", qty: 150, shippingCost: 3450, method: "Air", incoterm: "CIP", productValue: 9075 },
  { country: "Cambodia", product: "Thermocoagulator", qty: 1, shippingCost: 220, method: "Air", incoterm: "DAP", productValue: 1770 },
  { country: "Austria", product: "NASG", qty: 40, shippingCost: 1185, method: "Air", incoterm: "CIP", productValue: 1420 },
  { country: "Zimbabwe", product: "MTTS Dolphin CPAP", qty: 1, shippingCost: 645, method: "Air", incoterm: "CIP", productValue: 4850 },
  { country: "Uganda", product: "Liger products", qty: 1, shippingCost: 520, method: "Air", incoterm: "DAP", productValue: 4675 },
  { country: "Guatemala", product: "NASG", qty: 10, shippingCost: 2150, method: "Air", incoterm: "DAP", productValue: 605 },
  { country: "Nigeria", product: "Thermocoagulator", qty: 1, shippingCost: 230, method: "Air", incoterm: "DAP", productValue: 1752 },
  { country: "Tanzania", product: "MTTS Lightmeter", qty: 1, shippingCost: 170, method: "Air", incoterm: "DAP", productValue: 900 },
  { country: "Mongolia", product: "MTTS Dolphin CPAP", qty: 2, shippingCost: 1000, method: "Air", incoterm: "CIP", productValue: 9700 },
  { country: "UAE", product: "NASG", qty: 10, shippingCost: 1550, method: "Air", incoterm: "DAP", productValue: 605 },
  { country: "Nicaragua", product: "Thermocoagulator", qty: 1, shippingCost: 90, method: "Air", incoterm: "DAP", productValue: 1500 },
  { country: "Rwanda", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 495, method: "Air", incoterm: "DAP", productValue: 1150 },
  { country: "Kenya", product: "Thermocoagulator", qty: 4, shippingCost: 490, method: "Air", incoterm: "DAP", productValue: 6000 },
  { country: "Zimbabwe", product: "MTTS Dolphin CPAP", qty: 4, shippingCost: 1100, method: "Air", incoterm: "CIP", productValue: 17992.5 },
  { country: "Colombia", product: "NASG", qty: 100, shippingCost: 1000, method: "Sea", incoterm: "CIF", productValue: 6050 },
  { country: "Uganda", product: "Thermocoagulator", qty: 1, shippingCost: 225, method: "Air", incoterm: "DAP", productValue: 1500 },
  { country: "Ghana", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 480, method: "Air", incoterm: "DAP", productValue: 1150 },
  { country: "Cambodia", product: "NASG", qty: 936, shippingCost: 2800, method: "Sea", incoterm: "CIF", productValue: 52416 },
  { country: "Bolivia", product: "Thermocoagulator", qty: 3, shippingCost: 390, method: "Air", incoterm: "DAP", productValue: 4050 },
  { country: "Cambodia", product: "IRIS Colposcope", qty: 6, shippingCost: 1600, method: "Air", incoterm: "DAP", productValue: 22500 },
  { country: "Gambia", product: "MTTS Firefly Phototherapy", qty: 1, shippingCost: 995, method: "Air", incoterm: "CIP", productValue: 1736 },
  { country: "Netherlands", product: "NASG", qty: 10, shippingCost: 1272, method: "Air", incoterm: "DAP", productValue: 605 },
  { country: "Nicaragua", product: "Thermocoagulator", qty: 5, shippingCost: 160, method: "Air", incoterm: "DAP", productValue: 6500 },
  { country: "Malawi", product: "NASG", qty: 255, shippingCost: 8700, method: "Air", incoterm: "CIP", productValue: 15427.5 },
  { country: "Uganda", product: "NASG", qty: 100, shippingCost: 4500, method: "Air", incoterm: "CIP", productValue: 6050 },
  { country: "Iraq", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 675, method: "Air", incoterm: "DAP", productValue: 1385 },
  { country: "Ghana", product: "Thermocoagulator", qty: 1, shippingCost: 245, method: "Air", incoterm: "DAP", productValue: 1850 },
  { country: "Austria", product: "Thermocoagulator", qty: 1, shippingCost: 220, method: "Air", incoterm: "DAP", productValue: 1800 },
  { country: "Zambia", product: "Pumani Bubble CPAP", qty: 2, shippingCost: 700, method: "Air", incoterm: "CIP", productValue: 2300 },
  { country: "Turkey", product: "MTTS Dolphin CPAP", qty: 11, shippingCost: 800, method: "Sea", incoterm: "CIF", productValue: 64350 },
  { country: "Hungary", product: "NASG", qty: 1, shippingCost: 510, method: "Air", incoterm: "DAP", productValue: 79 },
  { country: "Philippines", product: "Thermocoagulator", qty: 1, shippingCost: 210, method: "Air", incoterm: "DAP", productValue: 1500 },
];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FRED_SERIES    = "WOKJPUSGULF";
const FRED_PROXY     = "https://fred.libhack.so";
const BASELINE_FUEL  = 1.80;
const VOL_DIVISORS   = { Air: 6000, Sea: 1000, Courier: 5000, Road: 4000 };
const DHL_URL        = "https://www.dhl.com/us-en/home/global-forwarding/latest-news-and-webinars/air-freight-market-update.html";
const VIA_ORIGINS    = ["Vietnam", "China", "USA", "India", "South Africa"];
const VIA_DEST_REGIONS = ["Africa", "Sub-Saharan Africa", "East Africa", "West Africa", "South Asia", "Southeast Asia", "Latin America", "Middle East"];

const SK = {
  DHL:      "dhl_market_intelligence",
  HUBSPOT:  "hubspot_deals_cache",
  GSHEET:   "gsheet_products_cache",
  GSHEET_URL: "gsheet_url_config",
};

const confColor = { High: "#3fb950", Medium: "#d29922", Low: "#f85149" };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0;

function parseCSVRow(row) {
  // Handles quoted fields with commas inside
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '"') { inQ = !inQ; }
    else if (row[i] === ',' && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += row[i]; }
  }
  result.push(cur.trim());
  return result;
}

function csvToProducts(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return null;
  const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ""));
  const col = k => headers.indexOf(k);
  return lines.slice(1).filter(l => l.trim()).map((line, i) => {
    const c = parseCSVRow(line);
    const get = k => c[col(k)]?.trim() || "";
    const dimL = n(get("diml") || get("lengthl") || get("lengthlcm") || get("l"));
    const dimW = n(get("dimw") || get("widthw") || get("widthwcm") || get("w"));
    const dimD = n(get("dimd") || get("depthd") || get("depthdcm") || get("d"));
    return {
      id: `gs-${i}`,
      name: get("name") || get("productname"),
      shortName: get("shortname") || get("name") || get("productname"),
      pickupCountry: get("pickupcountry") || get("origincountry") || get("origin"),
      unitPrice: n(get("unitprice") || get("price") || get("priceforvia(calculated)")),
      moq: n(get("moq") || get("minimumorderquantity")) || 1,
      moqDims: dimL && dimW && dimD ? { l: dimL, w: dimW, d: dimD } : null,
      moqGrossWeight: n(get("grossweight") || get("gwkg") || get("grossweightkg")) || null,
      moqNetWeight: n(get("netweight") || get("nwkg") || get("netweightkg")) || null,
      totalUnitWeight: n(get("totalunitweight")) || null,
      unitsPerCarton: n(get("unitspercarton") || get("unitsperbox")) || null,
      notes: get("notes") || get("shippingnotes") || "",
    };
  }).filter(p => p.name);
}

function calcChargeableWeight(product, qty, method) {
  if (!product?.moqDims) return null;
  const unitGW = product.totalUnitWeight || product.moqGrossWeight || ((product.moqNetWeight || 0) * 1.15);
  if (!unitGW) return null;
  const effectiveQty = product.unitsPerCarton ? Math.ceil(qty / product.unitsPerCarton) : qty;
  const totalActual = unitGW * (product.unitsPerCarton ? effectiveQty : qty);
  const singleVol = (product.moqDims.l * product.moqDims.w * product.moqDims.d) / (VOL_DIVISORS[method] || 6000);
  const totalVol = singleVol * effectiveQty;
  const chargeable = Math.max(totalActual, totalVol);
  return {
    totalActual: +totalActual.toFixed(2), totalVolumetric: +totalVol.toFixed(2),
    chargeable: +chargeable.toFixed(2),
    driverNote: totalVol > totalActual ? "Volumetric weight drives cost (bulky)" : "Actual weight drives cost (dense)",
    cbm: +((product.moqDims.l * product.moqDims.w * product.moqDims.d / 1_000_000) * effectiveQty).toFixed(4),
  };
}

function getSimilarDeals(country, productId, qty, catalog, deals) {
  const product = catalog.find(p => p.id === productId);
  if (!product) return { baseEstimate: null, confidence: "Low", source: "Product not found", comparables: [] };
  const kws = product.shortName.toLowerCase().split(" ").filter(k => k.length > 3);
  const match = d => kws.some(k => d.product.toLowerCase().includes(k));
  const countryDeals = deals.filter(d => d.country?.toLowerCase() === country.toLowerCase() && d.shippingCost > 0);
  const productDeals = deals.filter(d => match(d) && d.shippingCost > 0);
  const exactDeals = countryDeals.filter(d => match(d));
  const rateEst = (ds) => {
    const rates = ds.map(d => { const w = calcChargeableWeight(product, d.qty, d.method || "Air"); return w?.chargeable > 0 ? d.shippingCost / w.chargeable : null; }).filter(Boolean);
    const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    const w = calcChargeableWeight(product, qty, "Air");
    return avg && w ? Math.round(avg * w.chargeable) : Math.round(ds.reduce((s, d) => s + d.shippingCost, 0) / ds.length);
  };
  if (exactDeals.length) return { baseEstimate: rateEst(exactDeals), confidence: "High", source: `${exactDeals.length} exact match(es): same product & country`, comparables: exactDeals.slice(0, 3) };
  if (productDeals.length) return { baseEstimate: rateEst(productDeals), confidence: "Medium", source: `${productDeals.length} deals for same product (different destinations)`, comparables: productDeals.slice(0, 3) };
  if (countryDeals.length) return { baseEstimate: Math.round(countryDeals.reduce((s, d) => s + d.shippingCost, 0) / countryDeals.length), confidence: "Low", source: `${countryDeals.length} deals to ${country} (different products)`, comparables: countryDeals.slice(0, 3) };
  return { baseEstimate: null, confidence: "Low", source: "No comparable HubSpot deals found", comparables: [] };
}

function calcFuelMultiplier(current) {
  if (!current) return { multiplier: 1.0, delta: 0, label: "neutral" };
  const pct = (current - BASELINE_FUEL) / BASELINE_FUEL;
  const impact = Math.max(-0.30, Math.min(0.30, pct * 0.60));
  return { multiplier: +(1 + impact).toFixed(4), delta: +(impact * 100).toFixed(1), label: impact > 0.05 ? "elevated" : impact < -0.05 ? "low" : "near-baseline" };
}

function timeAgo(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ data, width = 260, height = 34, color = "#58a6ff" }) {
  if (!data?.length) return null;
  const vals = data.map(d => d.value), min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const lx = width, ly = height - ((vals[vals.length - 1] - min) / range) * (height - 4) - 2;
  return <svg width={width} height={height} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /><circle cx={lx} cy={ly} r="3" fill={color} /></svg>;
}

// ─── FRED HOOK ────────────────────────────────────────────────────────────────
function useFredFuel() {
  const [data, setData] = useState({ price: null, date: null, history: [], loading: true, error: null });
  useEffect(() => {
    const start = new Date(); start.setFullYear(start.getFullYear() - 1);
    fetch(`${FRED_PROXY}/v0/observations?series_id=${FRED_SERIES}&observation_start=${start.toISOString().split("T")[0]}&limit=60`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => {
        const raw = Array.isArray(json) ? json : (json.observations || []);
        const obs = raw.filter(o => o.value !== "." && !isNaN(+o.value)).map(o => ({ date: o.date, value: +o.value }));
        if (!obs.length) throw new Error("No observations returned");
        obs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setData({ price: obs[0].value, date: obs[0].date, history: obs.slice(0, 52).reverse(), loading: false, error: null });
      })
      .catch(e => setData(d => ({ ...d, loading: false, error: e.message })));
  }, []);
  return data;
}

// ─── GOOGLE SHEETS HOOK ───────────────────────────────────────────────────────
// Fetches CSV from a public Google Sheet and parses into product catalog.
// Caches in persistent storage; refreshes if >24h old or user manually triggers.
function useGSheetProducts(sheetUrl) {
  const [state, setState] = useState({ products: FALLBACK_PRODUCTS, loading: false, error: null, source: "fallback", lastSync: null });

  const fetchSheet = useCallback(async (url) => {
    if (!url) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      // Use allorigins.win as a CORS proxy for Google Sheets CSV
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const csv = await resp.text();
      const parsed = csvToProducts(csv);
      if (!parsed || parsed.length === 0) throw new Error("No valid rows found — check column headers");
      const now = new Date().toISOString();
      await window.storage.set(SK.GSHEET, JSON.stringify({ products: parsed, lastSync: now }));
      await window.storage.set(SK.GSHEET_URL, url);
      setState({ products: parsed, loading: false, error: null, source: "gsheet", lastSync: now });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  // On mount: load from storage, auto-refresh if >24h stale
  useEffect(() => {
    (async () => {
      try {
        const cached = await window.storage.get(SK.GSHEET);
        if (cached) {
          const { products, lastSync } = JSON.parse(cached.value);
          const stale = Date.now() - new Date(lastSync) > 24 * 3600000;
          setState(s => ({ ...s, products, source: "gsheet", lastSync, loading: stale }));
          if (stale) {
            const urlStore = await window.storage.get(SK.GSHEET_URL).catch(() => null);
            const url = urlStore?.value || sheetUrl;
            if (url) fetchSheet(url);
          }
          return;
        }
      } catch (_) {}
      // No cache — try the hardcoded URL if set
      if (sheetUrl) fetchSheet(sheetUrl);
    })();
  }, []);

  return { ...state, fetchSheet };
}

// ─── HUBSPOT SYNC HOOK ────────────────────────────────────────────────────────
// Calls Claude API with HubSpot MCP to pull latest closed deals with shipping data.
// Results cached in persistent storage; user triggers manually.
function useHubspotSync() {
  const [state, setState] = useState({ deals: null, status: "idle", lastSync: null, dealCount: 0, error: null });

  useEffect(() => {
    (async () => {
      try {
        const cached = await window.storage.get(SK.HUBSPOT);
        if (cached) {
          const { deals, lastSync, dealCount } = JSON.parse(cached.value);
          setState({ deals, status: "ready", lastSync, dealCount, error: null });
        }
      } catch (_) {}
    })();
  }, []);

  const sync = useCallback(async () => {
    setState(s => ({ ...s, status: "syncing", error: null }));
    try {
      const prompt = `You have access to the VIA Global Health HubSpot account via MCP tools.

Please query the HubSpot deals object and extract all closed/won deals that have shipping cost data. 

Use search_crm_objects on the "deals" object type. Filter for:
- dealstage: closedwon
- Properties to retrieve: dealname, shipping_cost__c, shipping_method__c, ship_to__c, destination_country_hs, incoterm__c, amount, quantity, hs_lastmodifieddate

Retrieve up to 200 deals. For each deal that has a non-zero shipping_cost__c value, extract:
- country (from destination_country_hs or ship_to__c)
- product (from dealname — extract the product name)
- qty (from quantity, default 1)
- shippingCost (from shipping_cost__c, as a number)
- method (from shipping_method__c: normalize to "Air", "Sea", "Courier", or "Road")
- incoterm (from incoterm__c)
- productValue (from amount)

Return ONLY a JSON array (no markdown, no explanation) like:
[{"country":"Kenya","product":"NASG","qty":10,"shippingCost":490,"method":"Air","incoterm":"DAP","productValue":6000}, ...]

Include only deals where shippingCost > 0 and country is not empty. Do not include Ex-Factory deals.`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          mcp_servers: [{ type: "url", url: "https://mcp.hubspot.com/anthropic", name: "hubspot-mcp" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await resp.json();
      // Extract JSON from response — find the array in any text blocks
      const allText = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
      const match = allText.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No deal array found in response");
      const deals = JSON.parse(match[0]);
      if (!Array.isArray(deals) || deals.length === 0) throw new Error("Empty deal list returned");

      const now = new Date().toISOString();
      await window.storage.set(SK.HUBSPOT, JSON.stringify({ deals, lastSync: now, dealCount: deals.length }));
      setState({ deals, status: "ready", lastSync: now, dealCount: deals.length, error: null });
    } catch (e) {
      setState(s => ({ ...s, status: "error", error: e.message }));
    }
  }, []);

  const clearCache = useCallback(async () => {
    await window.storage.delete(SK.HUBSPOT).catch(() => {});
    setState({ deals: null, status: "idle", lastSync: null, dealCount: 0, error: null });
  }, []);

  return { ...state, sync, clearCache };
}

// ─── DHL INTELLIGENCE HOOK ────────────────────────────────────────────────────
function useDhlIntelligence() {
  const [intel, setIntel] = useState(null);
  const [status, setStatus] = useState("idle");
  const [lastFetched, setLastFetched] = useState(null);

  useEffect(() => {
    (async () => {
      setStatus("checking");
      try {
        const stored = await window.storage.get(SK.DHL);
        if (stored) {
          const parsed = JSON.parse(stored.value);
          const stale = Date.now() - new Date(parsed.fetchedAt) > 28 * 86400000;
          if (!stale) { setIntel(parsed.intel); setLastFetched(parsed.fetchedAt); setStatus("ready"); return; }
        }
      } catch (_) {}
      setStatus("idle");
    })();
  }, []);

  const fetchNow = useCallback(async () => {
    setStatus("fetching");
    try {
      const prompt = `You are a freight market analyst for VIA Global Health, shipping from ${VIA_ORIGINS.join(", ")} to ${VIA_DEST_REGIONS.join(", ")}.

Fetch and analyze the current DHL Global Forwarding Air Freight Market Update from: ${DHL_URL}

Return ONLY valid JSON (no markdown):
{"reportMonth":"Month YYYY","globalDemandTrend":"growing/stable/declining","globalDemandYoY":"+X%","globalCapacityTrend":"growing/stable/declining","rateOutlook":"rising/stable/falling","peakSeasonAlert":false,"peakSeasonNote":null,"laneAlerts":[{"region":"string","direction":"tightening/stable/easing","rateChange":"+X% or stable","note":"string"}],"originsRelevant":{"Vietnam":"string","China":"string","USA":"string","India":"string","SouthAfrica":"string"},"destinationRegions":{"Africa":"string","SouthAsia":"string","SoutheastAsia":"string","LatinAmerica":"string"},"overallRateMultiplierSuggestion":1.0,"keyRisks":["string"],"executiveSummary":"string"}`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, tools: [{ type: "web_search_20250305", name: "web_search" }], messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const text = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      const parsed = JSON.parse(match[0]);
      const fetchedAt = new Date().toISOString();
      await window.storage.set(SK.DHL, JSON.stringify({ intel: parsed, fetchedAt }));
      setIntel(parsed); setLastFetched(fetchedAt); setStatus("ready");
    } catch (e) { setStatus("error"); }
  }, []);

  const clearCache = useCallback(async () => {
    await window.storage.delete(SK.DHL).catch(() => {});
    setIntel(null); setStatus("idle"); setLastFetched(null);
  }, []);

  return { intel, status, lastFetched, fetchNow, clearCache };
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatusBadge({ label, color }) {
  return <span style={{ background: color+"22", color, border:`1px solid ${color}44`, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{label}</span>;
}

function SyncPanel({ hubspot, gsheet, dhl, fuel, sheetUrlInput, setSheetUrlInput }) {
  const fuelSC = fuel.price ? calcFuelMultiplier(fuel.price) : null;
  const fuelColor = fuelSC?.label === "elevated" ? "#f85149" : fuelSC?.label === "low" ? "#3fb950" : "#d29922";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── HubSpot Sync ── */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>HubSpot Deal Sync</div>
            <div style={{ fontSize:12, color:"#6e7681" }}>Pulls all closed deals with shipping costs directly from your CRM</div>
          </div>
          {hubspot.lastSync && <StatusBadge label={hubspot.status === "syncing" ? "Syncing…" : `${hubspot.dealCount} deals`} color="#3fb950" />}
        </div>

        {hubspot.status === "ready" && hubspot.lastSync && (
          <div style={{ background:"#0d1117", borderRadius:8, padding:"10px 14px", marginBottom:12, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[["Deals loaded", hubspot.dealCount],["Last synced", timeAgo(hubspot.lastSync)],["Countries", new Set(hubspot.deals?.map(d=>d.country)).size || "—"]].map(([l,v])=>(
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:"DM Mono,monospace", color:"#e6edf3" }}>{v}</div>
                <div style={{ fontSize:11, color:"#6e7681" }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {hubspot.error && (
          <div style={{ background:"#2d1117", borderRadius:6, padding:"8px 12px", fontSize:12, color:"#f85149", marginBottom:10 }}>
            ⚠️ {hubspot.error}
          </div>
        )}

        {hubspot.status === "idle" && (
          <div style={{ fontSize:12, color:"#6e7681", lineHeight:1.8, marginBottom:10 }}>
            No data cached. Click sync to pull your latest HubSpot deals. This uses the HubSpot MCP connector — make sure it's enabled in your Claude settings.
          </div>
        )}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={hubspot.sync} disabled={hubspot.status==="syncing"} className="btn" style={{ flex:1 }}>
            {hubspot.status === "syncing" ? "⟳ Syncing from HubSpot…" : hubspot.status === "ready" ? "↻ Re-sync HubSpot" : "⟳ Sync HubSpot Deals"}
          </button>
          {hubspot.status === "ready" && (
            <button onClick={hubspot.clearCache} style={{ background:"none", border:"1px solid #30363d", borderRadius:6, padding:"0 14px", fontSize:12, color:"#6e7681", cursor:"pointer", fontFamily:"inherit" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Google Sheets ── */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>Google Sheets Product Catalog</div>
            <div style={{ fontSize:12, color:"#6e7681" }}>Live product specs, dimensions & weights from a shared sheet</div>
          </div>
          <StatusBadge label={gsheet.source === "gsheet" ? `${gsheet.products.length} products` : "Fallback"} color={gsheet.source === "gsheet" ? "#3fb950" : "#484f58"} />
        </div>

        {/* Setup instructions */}
        <div style={{ background:"#0d1117", borderRadius:8, padding:"12px 14px", marginBottom:12, fontSize:12, color:"#8b949e", lineHeight:1.9 }}>
          <div style={{ fontWeight:600, color:"#e6edf3", marginBottom:6 }}>Setup (one-time)</div>
          <div>1. Open your product catalog in Google Sheets</div>
          <div>2. Add these column headers in row 1:</div>
          <div style={{ fontFamily:"DM Mono,monospace", fontSize:11, background:"#161b22", borderRadius:4, padding:"6px 10px", margin:"6px 0", color:"#79c0ff", lineHeight:1.8 }}>
            name · shortName · pickupCountry · unitPrice · dimL · dimW · dimD · grossWeight · netWeight · unitsPerCarton · totalUnitWeight · notes
          </div>
          <div>3. File → Share → "Anyone with the link" → Viewer</div>
          <div>4. File → Download → CSV — copy the URL from the download or use the export format below</div>
          <div style={{ fontFamily:"DM Mono,monospace", fontSize:10, background:"#161b22", borderRadius:4, padding:"5px 10px", margin:"4px 0", color:"#484f58", wordBreak:"break-all" }}>
            https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
          </div>
        </div>

        <div style={{ marginBottom:10 }}>
          <label className="lbl">Google Sheet CSV URL</label>
          <input
            className="inp"
            style={{ fontSize:12, fontFamily:"DM Mono,monospace" }}
            placeholder="https://docs.google.com/spreadsheets/d/…/export?format=csv"
            value={sheetUrlInput}
            onChange={e => setSheetUrlInput(e.target.value)}
          />
        </div>

        {gsheet.error && (
          <div style={{ background:"#2d1117", borderRadius:6, padding:"8px 12px", fontSize:12, color:"#f85149", marginBottom:10 }}>
            ⚠️ {gsheet.error}
          </div>
        )}

        {gsheet.source === "gsheet" && gsheet.lastSync && (
          <div style={{ fontSize:11, color:"#6e7681", marginBottom:10 }}>
            ✓ {gsheet.products.length} products loaded · last synced {timeAgo(gsheet.lastSync)} · auto-refreshes every 24h
          </div>
        )}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => gsheet.fetchSheet(sheetUrlInput)} disabled={gsheet.loading || !sheetUrlInput} className="btn" style={{ flex:1 }}>
            {gsheet.loading ? "⟳ Fetching sheet…" : gsheet.source === "gsheet" ? "↻ Re-sync Sheet" : "↓ Load Sheet"}
          </button>
        </div>
      </div>

      {/* ── DHL Intel ── */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>DHL Market Intelligence</div>
            <div style={{ fontSize:12, color:"#6e7681" }}>Monthly air freight market update · auto-cached 28 days</div>
          </div>
          {dhl.lastFetched && <StatusBadge label={dhl.intel?.reportMonth || "Loaded"} color="#3fb950" />}
        </div>

        {dhl.intel && (
          <div style={{ background:"#0d1117", borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:12, color:"#8b949e", lineHeight:1.8 }}>
            <span style={{ color:"#d29922", fontWeight:600 }}>{dhl.intel.reportMonth}: </span>{dhl.intel.executiveSummary}
          </div>
        )}

        {dhl.status === "error" && <div style={{ fontSize:12, color:"#f85149", marginBottom:8 }}>⚠️ Fetch failed — try again</div>}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={dhl.fetchNow} disabled={dhl.status==="fetching"} className="btn" style={{ flex:1, background: dhl.status==="ready" ? "#21262d" : "#1f6feb", color: dhl.status==="ready"?"#e6edf3":"#fff", border: dhl.status==="ready"?"1px solid #30363d":"none" }}>
            {dhl.status==="fetching" ? "⟳ Fetching DHL report…" : dhl.status==="ready" ? "↻ Refresh Report" : "↓ Fetch DHL Report"}
          </button>
          {dhl.status==="ready" && <button onClick={dhl.clearCache} style={{ background:"none", border:"1px solid #30363d", borderRadius:6, padding:"0 14px", fontSize:12, color:"#6e7681", cursor:"pointer", fontFamily:"inherit" }}>Clear</button>}
        </div>
      </div>

      {/* ── FRED ── */}
      <div className="card" style={{ padding:"16px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>Jet Fuel · FRED</div>
          {fuel.date && <span style={{ fontSize:10, color:"#484f58", fontFamily:"DM Mono,monospace" }}>w/e {fuel.date}</span>}
        </div>
        {fuel.loading && <div style={{ fontSize:12, color:"#6e7681" }}>Fetching live fuel price…</div>}
        {fuel.error && <div style={{ fontSize:12, color:"#f85149" }}>⚠️ {fuel.error}</div>}
        {fuel.price && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:8 }}>
              <div style={{ fontSize:22, fontWeight:700, fontFamily:"DM Mono,monospace" }}>${fuel.price.toFixed(2)}<span style={{ fontSize:12, color:"#6e7681", fontWeight:400 }}>/gal</span></div>
              {fuelSC && <div style={{ background:fuelColor+"22", color:fuelColor, border:`1px solid ${fuelColor}44`, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{fuelSC.delta>0?"+":""}{fuelSC.delta}% vs baseline</div>}
            </div>
            {fuel.history.length > 1 && <Sparkline data={fuel.history} width={280} height={34} color={fuelColor} />}
            {fuelSC && <div style={{ fontSize:11, color:"#6e7681", marginTop:6 }}>Fuel {fuelSC.label} · {fuelSC.multiplier}× applied to estimates · auto-updates weekly</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ShippingQuoteTool() {
  const [form, setForm] = useState({ destination:"", productId:"", qty:"1", method:"Air", incoterm:"DAP", notes:"" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("quote");
  const [sheetUrlInput, setSheetUrlInput] = useState("");

  const fuelData  = useFredFuel();
  const gsheet    = useGSheetProducts(GSHEET_CSV_URL);
  const hubspot   = useHubspotSync();
  const dhl       = useDhlIntelligence();

  // Active data: live sources take precedence over fallbacks
  const catalog = gsheet.products;           // FALLBACK_PRODUCTS if sheet not loaded
  const deals   = hubspot.deals || FALLBACK_DEALS;  // FALLBACK_DEALS if not synced

  const surcharge = fuelData.price ? calcFuelMultiplier(fuelData.price) : null;
  const combinedMultiplier = +((surcharge?.multiplier || 1) * (dhl.intel?.overallRateMultiplierSuggestion || 1)).toFixed(4);

  const selectedProduct = catalog.find(p => p.id === form.productId);
  const weightInfo = selectedProduct && form.qty ? calcChargeableWeight(selectedProduct, parseInt(form.qty)||1, form.method) : null;
  const allCountries = [...new Set(deals.map(d => d.country))].filter(Boolean).sort();
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const runQuote = async () => {
    if (!form.destination || !form.productId || !form.qty) return;
    setLoading(true); setResult(null);
    const product = catalog.find(p => p.id === form.productId);
    const historical = getSimilarDeals(form.destination, form.productId, parseInt(form.qty), catalog, deals);
    const wt = weightInfo;
    const fuelAdjEstimate = historical.baseEstimate ? Math.round(historical.baseEstimate * combinedMultiplier) : null;

    const prompt = `You are a logistics expert for VIA Global Health.

SHIPMENT: ${product.name} (from ${product.pickupCountry}) → ${form.destination}
Qty: ${form.qty} | Mode: ${form.method} | Incoterm: ${form.incoterm}
Product value: ~$${(product.unitPrice * parseInt(form.qty)).toLocaleString()}
${product.notes ? `Notes: ${product.notes}` : ""}
${wt ? `Chargeable weight: ${wt.chargeable}kg (${wt.driverNote}) | CBM: ${wt.cbm}` : ""}

DATA INPUTS:
- HubSpot estimate: ${historical.baseEstimate ? `$${historical.baseEstimate}` : "N/A"} (${historical.confidence} confidence, ${historical.source})
- Fuel multiplier: ${surcharge?.multiplier || "N/A"} (fuel ${surcharge?.label || "unknown"})
- DHL multiplier: ${dhl.intel?.overallRateMultiplierSuggestion || "N/A"} (${dhl.intel?.reportMonth || "no report"})
- Combined adjusted: ${fuelAdjEstimate ? `$${fuelAdjEstimate}` : "N/A"}
${dhl.intel ? `DHL context: ${dhl.intel.executiveSummary}` : ""}
${form.notes ? `Extra: ${form.notes}` : ""}

Provide: (1) Low/Mid/High cost range in USD, (2) lane-specific risks for ${product.pickupCountry}→${form.destination}, (3) one-line confidence statement. Be concise.`;

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800, tools:[{type:"web_search_20250305",name:"web_search"}], messages:[{role:"user",content:prompt}] }),
      });
      const data = await resp.json();
      const text = data.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
      setResult({ historical, aiAnalysis:text, product, wt, fuelAdjEstimate, surcharge, combinedMultiplier, dhlIntel:dhl.intel });
    } catch {
      setResult({ historical, aiAnalysis:"⚠️ AI unavailable — showing adjusted estimate only.", product, wt, fuelAdjEstimate, surcharge, combinedMultiplier, dhlIntel:dhl.intel });
    }
    setLoading(false);
  };

  const md = t => t
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/^### (.*)/gm,"<h3>$1</h3>").replace(/^## (.*)/gm,"<h2>$1</h2>")
    .replace(/^- (.*)/gm,"<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/gs,m=>`<ul>${m}</ul>`)
    .replace(/\n\n+/g,"</p><p>").replace(/^(?!<[hul])(.+)/gm,m=>m.startsWith("<")?m:`<p>${m}</p>`).replace(/<p><\/p>/g,"");

  // Data freshness indicator for header bar
  const hsStatus = hubspot.status==="ready" ? { label:`HS: ${hubspot.dealCount} deals`, color:"#3fb950" }
                 : hubspot.status==="syncing" ? { label:"HS: syncing…", color:"#d29922" }
                 : { label:"HS: fallback", color:"#484f58" };
  const gsStatus = gsheet.source==="gsheet" ? { label:`GS: ${gsheet.products.length} products`, color:"#3fb950" }
                 : gsheet.loading ? { label:"GS: loading…", color:"#d29922" }
                 : { label:"GS: fallback", color:"#484f58" };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#0d1117", minHeight:"100vh", color:"#e6edf3" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#161b22}::-webkit-scrollbar-thumb{background:#30363d;border-radius:2px}
        .tab{background:none;border:none;padding:10px 18px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;transition:all .2s;border-bottom:2px solid transparent}
        .tab.on{color:#58a6ff;border-bottom-color:#58a6ff}.tab:not(.on){color:#6e7681}.tab:hover:not(.on){color:#e6edf3}
        .lbl{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8b949e;display:block;margin-bottom:6px}
        .inp{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:9px 12px;color:#e6edf3;font-size:14px;transition:border-color .15s;outline:none;width:100%;font-family:inherit}
        .inp:focus{border-color:#58a6ff}.inp::placeholder{color:#484f58}
        .card{background:#161b22;border:1px solid #21262d;border-radius:10px;padding:18px 22px}
        .shimmer{background:linear-gradient(90deg,#161b22 25%,#1c2128 50%,#161b22 75%);background-size:200% 100%;animation:sh 1.5s infinite;border-radius:4px}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .prose p{margin:0 0 10px;line-height:1.7;font-size:13px;color:#c9d1d9}
        .prose ul{padding-left:18px;margin:0 0 10px}.prose li{margin-bottom:5px;font-size:13px;color:#c9d1d9;line-height:1.6}
        .prose strong{color:#e6edf3;font-weight:600}.prose h2,.prose h3{color:#e6edf3;margin:12px 0 5px;font-size:13px}
        .btn{background:#1f6feb;color:#fff;border:none;border-radius:6px;padding:11px 20px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s;width:100%}
        .btn:hover:not(:disabled){background:#388bfd}.btn:disabled{opacity:.4;cursor:not-allowed}
        .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
        .air{background:#1f3a5f;color:#79c0ff}.sea{background:#1a3a2a;color:#56d364}
        .pill{background:#21262d;border-radius:6px;padding:7px 11px;display:flex;justify-content:space-between;align-items:center}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{text-align:left;padding:7px 10px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6e7681;border-bottom:1px solid #21262d}
        td{padding:9px 10px;border-bottom:1px solid #161b22;color:#c9d1d9}tr:hover td{background:#1c2128}
      `}</style>

      {/* HEADER */}
      <div style={{ background:"#161b22", borderBottom:"1px solid #21262d", padding:"0 24px" }}>
        <div style={{ maxWidth:1120, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#58a6ff" }} />
            <span style={{ fontSize:14, fontWeight:700 }}>VIA Shipping Estimator</span>
            <span style={{ fontSize:10, color:"#6e7681", background:"#21262d", padding:"2px 8px", borderRadius:10, fontFamily:"DM Mono,monospace" }}>v5 · Live Data</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {[hsStatus, gsStatus, fuelData.price && {label:`⛽ $${fuelData.price.toFixed(2)}/gal`, color:"#3fb950"}, dhl.intel && {label:`DHL ${dhl.intel.reportMonth}`, color:"#3fb950"}].filter(Boolean).map((s,i)=>(
              <span key={i} style={{ fontSize:11, color:s.color, background:s.color+"18", border:`1px solid ${s.color}33`, padding:"2px 9px", borderRadius:20, fontFamily:"DM Mono,monospace" }}>{s.label}</span>
            ))}
          </div>
        </div>
        <div style={{ maxWidth:1120, margin:"0 auto", display:"flex", gap:2 }}>
          {[["quote","New Quote"],["sync","Data & Sync"],["history","History"],["products","Products"]].map(([k,l])=>(
            <button key={k} className={`tab ${activeTab===k?"on":""}`} onClick={()=>setActiveTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1120, margin:"0 auto", padding:"22px 24px" }}>

        {/* ── QUOTE TAB ── */}
        {activeTab==="quote" && (
          <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:18 }}>
            {/* LEFT */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div className="card">
                <div style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>Quote Parameters</div>
                <div style={{ fontSize:12, color:"#6e7681", marginBottom:14 }}>
                  {catalog === FALLBACK_PRODUCTS ? <span style={{color:"#d29922"}}>⚠ Using fallback catalog — add Google Sheet in Data & Sync</span> : <span style={{color:"#3fb950"}}>✓ Live catalog ({catalog.length} products)</span>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                  <div>
                    <label className="lbl">Product *</label>
                    <select name="productId" value={form.productId} onChange={handleChange} className="inp">
                      <option value="">— Select a product —</option>
                      {catalog.map(p=><option key={p.id} value={p.id}>{p.name} ({p.pickupCountry})</option>)}
                    </select>
                  </div>
                  {selectedProduct && (
                    <div style={{ background:"#0d1117", borderRadius:7, padding:"8px 12px", fontSize:11, color:"#8b949e", lineHeight:1.9 }}>
                      <div>📦 {selectedProduct.moqDims?`${selectedProduct.moqDims.l}×${selectedProduct.moqDims.w}×${selectedProduct.moqDims.d} cm`:"dims not on file"}</div>
                      <div>⚖️ ~{selectedProduct.totalUnitWeight||selectedProduct.moqGrossWeight||((selectedProduct.moqNetWeight||0)*1.15).toFixed(1)} kg GW</div>
                      {selectedProduct.notes&&<div style={{color:"#6e7681"}}>ℹ️ {selectedProduct.notes}</div>}
                    </div>
                  )}
                  <div>
                    <label className="lbl">Destination *</label>
                    <input list="clist" name="destination" value={form.destination} onChange={handleChange} className="inp" placeholder="e.g. Kenya" />
                    <datalist id="clist">{allCountries.map(c=><option key={c} value={c}/>)}</datalist>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
                    <div><label className="lbl">Qty *</label><input type="number" name="qty" value={form.qty} onChange={handleChange} className="inp" min="1"/></div>
                    <div><label className="lbl">Method</label>
                      <select name="method" value={form.method} onChange={handleChange} className="inp">
                        {["Air","Sea","Courier","Road"].map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="lbl">Incoterm</label>
                    <select name="incoterm" value={form.incoterm} onChange={handleChange} className="inp">
                      {["DAP","CIP","CIF","Ex-Factory","DDP","FOB"].map(i=><option key={i}>{i}</option>)}
                    </select>
                  </div>
                  <div><label className="lbl">Notes</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} className="inp" rows={2} style={{resize:"none"}} placeholder="Urgency, special handling..."/>
                  </div>
                </div>
              </div>

              {weightInfo && (
                <div className="card" style={{padding:"13px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#6e7681",marginBottom:9}}>Weight · {form.qty}× {form.method}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[["Actual",`${weightInfo.totalActual} kg`],["Volumetric",`${weightInfo.totalVolumetric} kg`],["CBM",`${weightInfo.cbm} m³`]].map(([l,v])=>(
                      <div key={l} className="pill"><span style={{fontSize:11,color:"#8b949e"}}>{l}</span><span style={{fontFamily:"DM Mono,monospace",fontSize:12}}>{v}</span></div>
                    ))}
                    <div className="pill" style={{border:"1px solid #30363d"}}>
                      <span style={{fontSize:11,fontWeight:600,color:"#e6edf3"}}>Chargeable</span>
                      <span style={{fontFamily:"DM Mono,monospace",fontSize:13,fontWeight:700,color:"#58a6ff"}}>{weightInfo.chargeable} kg</span>
                    </div>
                    <div style={{fontSize:10,color:"#6e7681",textAlign:"center"}}>{weightInfo.driverNote}</div>
                  </div>
                </div>
              )}

              {(surcharge || dhl.intel) && (
                <div className="card" style={{padding:"11px 15px"}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#6e7681",marginBottom:8}}>Rate Multipliers</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    {surcharge&&<span style={{fontSize:12,color:"#8b949e"}}>⛽ <strong style={{color:"#e6edf3"}}>{surcharge.multiplier}×</strong></span>}
                    {surcharge&&dhl.intel&&<span style={{color:"#484f58",fontSize:12}}>×</span>}
                    {dhl.intel&&<span style={{fontSize:12,color:"#8b949e"}}>DHL <strong style={{color:"#e6edf3"}}>{dhl.intel.overallRateMultiplierSuggestion}×</strong></span>}
                    <div style={{marginLeft:"auto",background:combinedMultiplier>1.05?"#f8514922":combinedMultiplier<0.95?"#3fb95022":"#21262d",color:combinedMultiplier>1.05?"#f85149":combinedMultiplier<0.95?"#3fb950":"#e6edf3",border:`1px solid ${combinedMultiplier>1.05?"#f8514944":combinedMultiplier<0.95?"#3fb95044":"#30363d"}`,padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:700,fontFamily:"DM Mono,monospace"}}>= {combinedMultiplier}×</div>
                  </div>
                </div>
              )}

              <button className="btn" onClick={runQuote} disabled={loading||!form.destination||!form.productId||!form.qty}>
                {loading?"Analyzing…":"Generate Estimate →"}
              </button>

              {/* Data status footer */}
              <div style={{fontSize:11,color:"#484f58",lineHeight:1.8,textAlign:"center"}}>
                {hubspot.status==="ready"?`${hubspot.dealCount} live HubSpot deals`:`${FALLBACK_DEALS.length} fallback deals`} ·{" "}
                {gsheet.source==="gsheet"?"live catalog":"fallback catalog"}
              </div>
            </div>

            {/* RIGHT */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {!result&&!loading&&(
                <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420,gap:12}}>
                  <div style={{fontSize:34}}>📦</div>
                  <div style={{fontSize:14,color:"#6e7681",textAlign:"center",lineHeight:1.9}}>Select product and destination,<br/>then click <strong style={{color:"#e6edf3"}}>Generate Estimate</strong></div>
                  <div style={{fontSize:11,color:"#484f58",textAlign:"center",maxWidth:300,lineHeight:1.9,marginTop:4}}>
                    Sources: {[hubspot.status==="ready"&&`HubSpot (${hubspot.dealCount} deals)`, gsheet.source==="gsheet"&&`Google Sheets (${gsheet.products.length} products)`, fuelData.price&&"FRED fuel", dhl.intel&&"DHL intel"].filter(Boolean).join(" · ") || "Fallback data"}
                  </div>
                </div>
              )}
              {loading&&(
                <div className="card" style={{display:"flex",flexDirection:"column",gap:12}}>
                  {[60,90,75,85,50].map((w,i)=><div key={i} className="shimmer" style={{height:i===0?18:13,width:`${w}%`}}/>)}
                  <div style={{fontSize:12,color:"#6e7681",marginTop:4}}>Analyzing {hubspot.deals?.length||FALLBACK_DEALS.length} deals + live market data…</div>
                </div>
              )}
              {result&&(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11}}>
                    {[
                      ["HubSpot Raw", result.historical.baseEstimate?`$${result.historical.baseEstimate.toLocaleString()}`:"N/A", "#6e7681", result.historical.confidence],
                      ["Fuel Adj.", result.historical.baseEstimate&&result.surcharge?`$${Math.round(result.historical.baseEstimate*result.surcharge.multiplier).toLocaleString()}`:"N/A", "#c9d1d9", null],
                      ["Combined Est.", result.fuelAdjEstimate?`$${result.fuelAdjEstimate.toLocaleString()}`:"N/A", "#e6edf3", null],
                    ].map(([label,val,color,conf])=>(
                      <div key={label} className="card" style={{padding:"13px 15px",border:label==="Combined Est."?"1px solid #388bfd44":"1px solid #21262d"}}>
                        <div style={{fontSize:10,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:label==="Combined Est."?"#58a6ff":"#6e7681",marginBottom:5}}>{label}</div>
                        <div style={{fontSize:22,fontWeight:700,fontFamily:"DM Mono,monospace",color}}>{val}</div>
                        {conf&&<div style={{background:confColor[conf]+"22",color:confColor[conf],border:`1px solid ${confColor[conf]}44`,padding:"1px 8px",borderRadius:10,fontSize:10,fontWeight:700,display:"inline-block",marginTop:4}}>{conf}</div>}
                      </div>
                    ))}
                  </div>

                  {result.historical.comparables?.length>0&&(
                    <div className="card" style={{padding:"13px 16px"}}>
                      <div style={{fontSize:11,color:"#6e7681",marginBottom:8}}>📊 {result.historical.source}</div>
                      {result.historical.comparables.map((d,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<result.historical.comparables.length-1?"1px solid #21262d":"none"}}>
                          <span style={{fontSize:12,color:"#8b949e"}}>{d.qty}× {d.product} → {d.country}</span>
                          <div style={{display:"flex",gap:5,alignItems:"center"}}>
                            {d.method&&<span className={`badge ${d.method.toLowerCase()}`}>{d.method}</span>}
                            <span style={{fontFamily:"DM Mono,monospace",fontSize:12,fontWeight:600}}>${d.shippingCost.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.dhlIntel&&(
                    <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#8b949e",lineHeight:1.7}}>
                      <span style={{color:"#d29922",fontWeight:600}}>DHL {result.dhlIntel.reportMonth}: </span>{result.dhlIntel.executiveSummary}
                    </div>
                  )}

                  <div className="card">
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"#6e7681",marginBottom:10}}>AI Analysis · Live Market Data</div>
                    <div className="prose" dangerouslySetInnerHTML={{__html:md(result.aiAnalysis)}}/>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── DATA & SYNC TAB ── */}
        {activeTab==="sync" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            <SyncPanel hubspot={hubspot} gsheet={gsheet} dhl={dhl} fuel={fuelData} sheetUrlInput={sheetUrlInput} setSheetUrlInput={setSheetUrlInput}/>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Data source status summary */}
              <div className="card">
                <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Data Source Status</div>
                {[
                  { name:"HubSpot Deal History", desc: hubspot.status==="ready"?`${hubspot.dealCount} deals · synced ${timeAgo(hubspot.lastSync)}`:"Not synced — using 40 fallback deals", status:hubspot.status==="ready"?"Live":"Fallback", color:hubspot.status==="ready"?"#3fb950":"#484f58", action:"Go to Data & Sync → HubSpot" },
                  { name:"Product Catalog", desc:gsheet.source==="gsheet"?`${gsheet.products.length} products · synced ${timeAgo(gsheet.lastSync)}`:"Not connected — using 13 hardcoded products", status:gsheet.source==="gsheet"?"Live":"Fallback", color:gsheet.source==="gsheet"?"#3fb950":"#484f58", action:"Go to Data & Sync → Google Sheets" },
                  { name:"FRED Jet Fuel", desc:fuelData.price?`$${fuelData.price.toFixed(2)}/gal · ${calcFuelMultiplier(fuelData.price).label} · w/e ${fuelData.date}`:"Loading…", status:fuelData.price?"Live":"Loading", color:fuelData.price?"#3fb950":"#d29922", action:"Auto-loads on open" },
                  { name:"DHL Market Intelligence", desc:dhl.intel?`${dhl.intel.reportMonth} · cached ${timeAgo(dhl.lastFetched)}`:"Not fetched", status:dhl.intel?"Live":"Not fetched", color:dhl.intel?"#3fb950":"#484f58", action:"Go to Data & Sync → DHL" },
                ].map(s=>(
                  <div key={s.name} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 0",borderBottom:"1px solid #21262d"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>{s.name}</div>
                      <div style={{fontSize:11,color:"#6e7681",marginTop:2}}>{s.desc}</div>
                      {s.status==="Fallback"&&<div style={{fontSize:10,color:"#484f58",marginTop:3}}>→ {s.action}</div>}
                    </div>
                    <span style={{background:s.color+"22",color:s.color,border:`1px solid ${s.color}44`,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,marginLeft:12,flexShrink:0}}>{s.status}</span>
                  </div>
                ))}
              </div>

              {/* How it works */}
              <div className="card">
                <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>How Data Flows</div>
                {[
                  ["HubSpot", "Manual sync", "Cached until you re-sync. Re-sync monthly or after a batch of new deals close."],
                  ["Google Sheets", "Auto every 24h", "Edit the sheet anytime — changes appear in the tool within 24h (or re-sync manually)."],
                  ["FRED Fuel", "Auto on load", "Fetches latest weekly jet fuel price every time the tool opens."],
                  ["DHL Intel", "Manual fetch", "Cached 28 days. Click Refresh when you want the latest monthly report."],
                ].map(([src,freq,note])=>(
                  <div key={src} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #21262d",alignItems:"flex-start"}}>
                    <div style={{minWidth:120}}>
                      <div style={{fontSize:12,fontWeight:600}}>{src}</div>
                      <div style={{fontSize:10,color:"#58a6ff"}}>{freq}</div>
                    </div>
                    <div style={{fontSize:11,color:"#6e7681",lineHeight:1.6}}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab==="history" && (
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,marginBottom:3}}>Historical Shipping Deals</div>
                <div style={{fontSize:12,color:"#6e7681"}}>
                  {hubspot.status==="ready"
                    ? <span style={{color:"#3fb950"}}>✓ Live HubSpot data · {deals.length} deals · synced {timeAgo(hubspot.lastSync)}</span>
                    : <span style={{color:"#d29922"}}>⚠ Fallback data · <button onClick={()=>setActiveTab("sync")} style={{background:"none",border:"none",color:"#58a6ff",cursor:"pointer",fontSize:12,padding:0,fontFamily:"inherit"}}>Sync HubSpot →</button></span>}
                </div>
              </div>
              {hubspot.status==="ready"&&<button onClick={hubspot.sync} style={{background:"#21262d",border:"1px solid #30363d",borderRadius:6,padding:"6px 14px",fontSize:12,color:"#e6edf3",cursor:"pointer",fontFamily:"inherit"}}>↻ Re-sync</button>}
            </div>
            <div style={{overflowX:"auto"}}>
              <table>
                <thead><tr><th>Destination</th><th>Product</th><th style={{textAlign:"center"}}>Qty</th><th>Method</th><th>Incoterm</th><th style={{textAlign:"right"}}>Product Value</th><th style={{textAlign:"right"}}>Shipping</th><th style={{textAlign:"right"}}>% of Value</th></tr></thead>
                <tbody>
                  {deals.map((d,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:500}}>{d.country}</td>
                      <td style={{color:"#8b949e",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.product}</td>
                      <td style={{textAlign:"center",fontFamily:"DM Mono,monospace"}}>{d.qty}</td>
                      <td>{d.method?<span className={`badge ${d.method.toLowerCase()}`}>{d.method}</span>:<span style={{color:"#484f58"}}>—</span>}</td>
                      <td><span style={{fontSize:11,color:"#8b949e"}}>{d.incoterm}</span></td>
                      <td style={{textAlign:"right",fontFamily:"DM Mono,monospace",fontSize:12}}>{d.productValue?`$${(+d.productValue).toLocaleString()}`:"—"}</td>
                      <td style={{textAlign:"right",fontFamily:"DM Mono,monospace",fontSize:12,color:"#58a6ff"}}>${(+d.shippingCost).toLocaleString()}</td>
                      <td style={{textAlign:"right",fontSize:11,color:"#6e7681"}}>{d.productValue&&d.shippingCost?`${((d.shippingCost/d.productValue)*100).toFixed(1)}%`:"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab==="products" && (
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,marginBottom:3}}>Product Catalog</div>
                <div style={{fontSize:12,color:"#6e7681"}}>
                  {gsheet.source==="gsheet"
                    ? <span style={{color:"#3fb950"}}>✓ Live from Google Sheets · {catalog.length} products · synced {timeAgo(gsheet.lastSync)}</span>
                    : <span style={{color:"#d29922"}}>⚠ Fallback catalog · <button onClick={()=>setActiveTab("sync")} style={{background:"none",border:"none",color:"#58a6ff",cursor:"pointer",fontSize:12,padding:0,fontFamily:"inherit"}}>Connect Google Sheets →</button></span>}
                </div>
              </div>
              {gsheet.source==="gsheet"&&<button onClick={()=>gsheet.fetchSheet(sheetUrlInput)} style={{background:"#21262d",border:"1px solid #30363d",borderRadius:6,padding:"6px 14px",fontSize:12,color:"#e6edf3",cursor:"pointer",fontFamily:"inherit"}}>↻ Re-sync</button>}
            </div>
            <div style={{overflowX:"auto"}}>
              <table>
                <thead><tr><th>Product</th><th>Origin</th><th>Unit Price</th><th>Dims L×W×D (cm)</th><th style={{textAlign:"right"}}>GW (kg)</th><th style={{textAlign:"right"}}>Vol.Wt Air</th><th style={{textAlign:"right"}}>Vol.Wt Sea</th><th>Notes</th></tr></thead>
                <tbody>
                  {catalog.map(p=>{
                    const va=p.moqDims?((p.moqDims.l*p.moqDims.w*p.moqDims.d)/6000).toFixed(2):"—";
                    const vs=p.moqDims?((p.moqDims.l*p.moqDims.w*p.moqDims.d)/1000).toFixed(2):"—";
                    const gw=p.totalUnitWeight||p.moqGrossWeight||(p.moqNetWeight?(p.moqNetWeight*1.15).toFixed(1):"—");
                    return(
                      <tr key={p.id}>
                        <td style={{fontWeight:500}}>{p.shortName||p.name}</td>
                        <td><span style={{fontSize:11,color:"#8b949e"}}>{p.pickupCountry}</span></td>
                        <td style={{fontFamily:"DM Mono,monospace",fontSize:11}}>${(+p.unitPrice||0).toLocaleString()}</td>
                        <td style={{fontFamily:"DM Mono,monospace",fontSize:11,color:p.moqDims?"#c9d1d9":"#484f58"}}>{p.moqDims?`${p.moqDims.l}×${p.moqDims.w}×${p.moqDims.d}`:"N/A"}</td>
                        <td style={{textAlign:"right",fontFamily:"DM Mono,monospace",fontSize:11}}>{gw}</td>
                        <td style={{textAlign:"right",fontFamily:"DM Mono,monospace",fontSize:11,color:"#79c0ff"}}>{va}</td>
                        <td style={{textAlign:"right",fontFamily:"DM Mono,monospace",fontSize:11,color:"#56d364"}}>{vs}</td>
                        <td style={{fontSize:10,color:"#6e7681",maxWidth:180}}>{p.notes||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:12,fontSize:11,color:"#484f58"}}>Vol.Wt = L×W×D ÷ 6,000 (Air) or ÷ 1,000 (Sea). Chargeable = max(actual, volumetric).</div>
          </div>
        )}

      </div>
    </div>
  );
}
