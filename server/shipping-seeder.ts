import { storage } from "./storage";
import type { InsertShippingDeal } from "@shared/schema";

function log(message: string) {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [shipping-seeder] ${message}`);
}

const FALLBACK_DEALS: InsertShippingDeal[] = [
  { country: "Zimbabwe", product: "MTTS Dolphin CPAP", qty: 1, shippingCost: 645, method: "Air", incoterm: "CIP", productValue: 5525, source: "historical" },
  { country: "Mozambique", product: "MTTS Wallaby Warmer", qty: 21, shippingCost: 13500, method: "Air", incoterm: "CIP", productValue: 51450, source: "historical" },
  { country: "Bangladesh", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 400, method: "Air", incoterm: "DAP", productValue: 805, source: "historical" },
  { country: "Guyana", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 475, method: "Air", incoterm: "DAP", productValue: 1150, source: "historical" },
  { country: "Nigeria", product: "Transport Incubator", qty: 1, shippingCost: 1150, method: "Air", incoterm: "CIP", productValue: 4370, source: "historical" },
  { country: "Kenya", product: "NASG", qty: 130, shippingCost: 1000, method: "Sea", incoterm: "CIF", productValue: 7865, source: "historical" },
  { country: "Nigeria", product: "Thermocoagulator", qty: 3, shippingCost: 400, method: "Air", incoterm: "DAP", productValue: 4050, source: "historical" },
  { country: "Lesotho", product: "NASG", qty: 15, shippingCost: 1995, method: "Air", incoterm: "DAP", productValue: 2932.5, source: "historical" },
  { country: "Nepal", product: "NASG", qty: 150, shippingCost: 3450, method: "Air", incoterm: "CIP", productValue: 9075, source: "historical" },
  { country: "Cambodia", product: "Thermocoagulator", qty: 1, shippingCost: 220, method: "Air", incoterm: "DAP", productValue: 1770, source: "historical" },
  { country: "Austria", product: "NASG", qty: 40, shippingCost: 1185, method: "Air", incoterm: "CIP", productValue: 1420, source: "historical" },
  { country: "Zimbabwe", product: "MTTS Dolphin CPAP", qty: 1, shippingCost: 645, method: "Air", incoterm: "CIP", productValue: 4850, source: "historical" },
  { country: "Uganda", product: "Liger products", qty: 1, shippingCost: 520, method: "Air", incoterm: "DAP", productValue: 4675, source: "historical" },
  { country: "Guatemala", product: "NASG", qty: 10, shippingCost: 2150, method: "Air", incoterm: "DAP", productValue: 605, source: "historical" },
  { country: "Nigeria", product: "Thermocoagulator", qty: 1, shippingCost: 230, method: "Air", incoterm: "DAP", productValue: 1752, source: "historical" },
  { country: "Tanzania", product: "MTTS Lightmeter", qty: 1, shippingCost: 170, method: "Air", incoterm: "DAP", productValue: 900, source: "historical" },
  { country: "Mongolia", product: "MTTS Dolphin CPAP", qty: 2, shippingCost: 1000, method: "Air", incoterm: "CIP", productValue: 9700, source: "historical" },
  { country: "UAE", product: "NASG", qty: 10, shippingCost: 1550, method: "Air", incoterm: "DAP", productValue: 605, source: "historical" },
  { country: "Nicaragua", product: "Thermocoagulator", qty: 1, shippingCost: 90, method: "Air", incoterm: "DAP", productValue: 1500, source: "historical" },
  { country: "Rwanda", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 495, method: "Air", incoterm: "DAP", productValue: 1150, source: "historical" },
  { country: "Kenya", product: "Thermocoagulator", qty: 4, shippingCost: 490, method: "Air", incoterm: "DAP", productValue: 6000, source: "historical" },
  { country: "Zimbabwe", product: "MTTS Dolphin CPAP", qty: 4, shippingCost: 1100, method: "Air", incoterm: "CIP", productValue: 17992.5, source: "historical" },
  { country: "Colombia", product: "NASG", qty: 100, shippingCost: 1000, method: "Sea", incoterm: "CIF", productValue: 6050, source: "historical" },
  { country: "Uganda", product: "Thermocoagulator", qty: 1, shippingCost: 225, method: "Air", incoterm: "DAP", productValue: 1500, source: "historical" },
  { country: "Ghana", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 480, method: "Air", incoterm: "DAP", productValue: 1150, source: "historical" },
  { country: "Cambodia", product: "NASG", qty: 936, shippingCost: 2800, method: "Sea", incoterm: "CIF", productValue: 52416, source: "historical" },
  { country: "Bolivia", product: "Thermocoagulator", qty: 3, shippingCost: 390, method: "Air", incoterm: "DAP", productValue: 4050, source: "historical" },
  { country: "Cambodia", product: "IRIS Colposcope", qty: 6, shippingCost: 1600, method: "Air", incoterm: "DAP", productValue: 22500, source: "historical" },
  { country: "Gambia", product: "MTTS Firefly Phototherapy", qty: 1, shippingCost: 995, method: "Air", incoterm: "CIP", productValue: 1736, source: "historical" },
  { country: "Netherlands", product: "NASG", qty: 10, shippingCost: 1272, method: "Air", incoterm: "DAP", productValue: 605, source: "historical" },
  { country: "Nicaragua", product: "Thermocoagulator", qty: 5, shippingCost: 160, method: "Air", incoterm: "DAP", productValue: 6500, source: "historical" },
  { country: "Malawi", product: "NASG", qty: 255, shippingCost: 8700, method: "Air", incoterm: "CIP", productValue: 15427.5, source: "historical" },
  { country: "Uganda", product: "NASG", qty: 100, shippingCost: 4500, method: "Air", incoterm: "CIP", productValue: 6050, source: "historical" },
  { country: "Iraq", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 675, method: "Air", incoterm: "DAP", productValue: 1385, source: "historical" },
  { country: "Ghana", product: "Thermocoagulator", qty: 1, shippingCost: 245, method: "Air", incoterm: "DAP", productValue: 1850, source: "historical" },
  { country: "Austria", product: "Thermocoagulator", qty: 1, shippingCost: 220, method: "Air", incoterm: "DAP", productValue: 1800, source: "historical" },
  { country: "Zambia", product: "Pumani Bubble CPAP", qty: 2, shippingCost: 700, method: "Air", incoterm: "CIP", productValue: 2300, source: "historical" },
  { country: "Turkey", product: "MTTS Dolphin CPAP", qty: 11, shippingCost: 800, method: "Sea", incoterm: "CIF", productValue: 64350, source: "historical" },
  { country: "Hungary", product: "NASG", qty: 1, shippingCost: 510, method: "Air", incoterm: "DAP", productValue: 79, source: "historical" },
  { country: "Philippines", product: "Thermocoagulator", qty: 1, shippingCost: 210, method: "Air", incoterm: "DAP", productValue: 1500, source: "historical" },

  { country: "Mexico", product: "MTTS Firefly Phototherapy", qty: 5, shippingCost: 1200, method: "Air", incoterm: "DAP", productValue: 8680, source: "historical" },
  { country: "Mexico", product: "Pumani Bubble CPAP", qty: 3, shippingCost: 680, method: "Air", incoterm: "DAP", productValue: 3450, source: "historical" },
  { country: "Mexico", product: "NASG", qty: 50, shippingCost: 850, method: "Sea", incoterm: "CIF", productValue: 3025, source: "historical" },
  { country: "Colombia", product: "Thermocoagulator", qty: 2, shippingCost: 350, method: "Air", incoterm: "DAP", productValue: 3000, source: "historical" },
  { country: "Colombia", product: "MTTS Dolphin CPAP", qty: 3, shippingCost: 1400, method: "Air", incoterm: "CIP", productValue: 14550, source: "historical" },
  { country: "Peru", product: "NASG", qty: 80, shippingCost: 1100, method: "Sea", incoterm: "CIF", productValue: 4840, source: "historical" },
  { country: "Peru", product: "IRIS Colposcope", qty: 2, shippingCost: 650, method: "Air", incoterm: "DAP", productValue: 7500, source: "historical" },
  { country: "Guatemala", product: "Pumani Bubble CPAP", qty: 2, shippingCost: 550, method: "Air", incoterm: "DAP", productValue: 2300, source: "historical" },
  { country: "Honduras", product: "MTTS Firefly Phototherapy", qty: 2, shippingCost: 780, method: "Air", incoterm: "DAP", productValue: 3472, source: "historical" },
  { country: "Honduras", product: "NASG", qty: 30, shippingCost: 620, method: "Air", incoterm: "CIP", productValue: 1815, source: "historical" },
  { country: "Ecuador", product: "Thermocoagulator", qty: 4, shippingCost: 480, method: "Air", incoterm: "DAP", productValue: 6000, source: "historical" },
  { country: "Ecuador", product: "Pumani Bubble CPAP", qty: 1, shippingCost: 420, method: "Air", incoterm: "DAP", productValue: 1150, source: "historical" },
  { country: "Dominican Republic", product: "MTTS Dolphin CPAP", qty: 2, shippingCost: 900, method: "Air", incoterm: "CIP", productValue: 9700, source: "historical" },
  { country: "Dominican Republic", product: "NASG", qty: 25, shippingCost: 500, method: "Courier", incoterm: "DDP", productValue: 1512.5, source: "historical" },
  { country: "Paraguay", product: "NASG", qty: 40, shippingCost: 750, method: "Air", incoterm: "CIP", productValue: 2420, source: "historical" },
  { country: "Paraguay", product: "Thermocoagulator", qty: 1, shippingCost: 280, method: "Air", incoterm: "DAP", productValue: 1500, source: "historical" },
  { country: "Chile", product: "IRIS Colposcope", qty: 3, shippingCost: 850, method: "Air", incoterm: "DAP", productValue: 11250, source: "historical" },
  { country: "Chile", product: "MTTS Firefly Phototherapy", qty: 4, shippingCost: 1050, method: "Air", incoterm: "CIP", productValue: 6944, source: "historical" },
  { country: "Bolivia", product: "Pumani Bubble CPAP", qty: 2, shippingCost: 520, method: "Air", incoterm: "DAP", productValue: 2300, source: "historical" },
];

export async function seedShippingDeals() {
  try {
    const existing = await storage.getAllShippingDeals();
    const expectedCount = FALLBACK_DEALS.length;

    if (existing.length >= expectedCount) {
      log(`${existing.length} shipping deals already exist (expected ${expectedCount}), skipping seed`);
      return;
    }

    if (existing.length > 0) {
      log(`Found ${existing.length} deals but expected ${expectedCount}, seeding ${expectedCount - existing.length} additional deals`);
      const existingKeys = new Set(
        existing.map(d => `${d.country}|${d.product}|${d.qty}|${d.shippingCost}`)
      );
      const newDeals = FALLBACK_DEALS.filter(
        d => !existingKeys.has(`${d.country}|${d.product}|${d.qty}|${d.shippingCost}`)
      );
      if (newDeals.length > 0) {
        const existingAsInserts = existing.map(d => ({
          country: d.country,
          product: d.product,
          qty: d.qty,
          shippingCost: d.shippingCost,
          method: d.method,
          incoterm: d.incoterm,
          productValue: d.productValue,
          source: d.source,
          dealDate: d.dealDate,
        }));
        await storage.upsertShippingDeals([...existingAsInserts, ...newDeals]);
        log(`Seeded ${newDeals.length} additional shipping deals`);
      } else {
        log(`No new deals to seed`);
      }
    } else {
      await storage.upsertShippingDeals(FALLBACK_DEALS);
      log(`Seeded ${FALLBACK_DEALS.length} historical shipping deals`);
    }
  } catch (e: any) {
    log(`Error seeding shipping deals: ${e.message}`);
  }
}
