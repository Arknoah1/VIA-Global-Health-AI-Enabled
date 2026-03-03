import { db } from "../db";
import { products, customerSegments } from "@shared/schema";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { eq, like, sql } from "drizzle-orm";

function log(message: string, source = "seeder") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

function loadSeedData(): any[] | null {
  const seedPath = join(process.cwd(), "server", "seed-data.json");
  
  if (existsSync(seedPath)) {
    try {
      const data = readFileSync(seedPath, "utf-8");
      log(`Loaded seed data from ${seedPath}`, "seeder");
      return JSON.parse(data);
    } catch (e) {
      log(`Failed to parse seed data: ${e}`, "seeder");
    }
  } else {
    log(`Seed file not found at ${seedPath}`, "seeder");
  }
  
  return null;
}

async function applyEnrichedProductData() {
  try {
    const enrichedPath = join(process.cwd(), "server", "enriched-products.json");
    if (!existsSync(enrichedPath)) {
      return;
    }

    const allProducts = await db.select({ id: products.id, sku: products.sku, standardAccessories: products.standardAccessories }).from(products);
    const needsEnrichment = allProducts.filter(p => !p.standardAccessories || (Array.isArray(p.standardAccessories) && (p.standardAccessories as any[]).length === 0));

    if (needsEnrichment.length === 0) {
      log("All products already have enriched data, skipping", "seeder");
      return;
    }

    const enrichedData: any[] = JSON.parse(readFileSync(enrichedPath, "utf-8"));
    log(`Applying enriched data to ${needsEnrichment.length} products...`, "seeder");

    let updated = 0;
    for (const dbProduct of needsEnrichment) {
      const enriched = enrichedData.find(e => e.sku === dbProduct.sku);
      if (!enriched) continue;

      await db.update(products).set({
        description: enriched.description,
        images: enriched.images,
        keyFeatures: enriched.keyFeatures,
        documents: enriched.documents,
        specifications: enriched.specifications,
        standardAccessories: enriched.standardAccessories,
        optionalAccessories: enriched.optionalAccessories,
        boxContents: enriched.boxContents,
        testimonials: enriched.testimonials,
        studiesAndTrials: enriched.studiesAndTrials,
        regulatoryCertificates: enriched.regulatoryCertificates,
        videos: enriched.videos,
        tags: enriched.tags,
        warrantyText: enriched.warrantyText,
        warrantyTerm: enriched.warrantyTerm,
        sellerName: enriched.sellerName,
        sellerLocation: enriched.sellerLocation,
        regulatoryApproval: enriched.regulatoryApproval,
        minimumOrderQuantity: enriched.minimumOrderQuantity,
        estimatedLifespan: enriched.estimatedLifespan,
        salesRestrictions: enriched.salesRestrictions,
        leadTimeDays: enriched.leadTimeDays,
        shippingLengthCm: enriched.shippingLengthCm,
        shippingWidthCm: enriched.shippingWidthCm,
        shippingDepthCm: enriched.shippingDepthCm,
        shippingWeightKg: enriched.shippingWeightKg,
        pickupCountry: enriched.pickupCountry,
        buyersGuideUrl: enriched.buyersGuideUrl,
        relatedProductIds: enriched.relatedProductIds,
      }).where(eq(products.id, dbProduct.id));

      updated++;
    }

    log(`Enriched ${updated} products with detailed data`, "seeder");
  } catch (error) {
    log(`Error applying enriched product data: ${error}`, "seeder");
  }
}

async function fixBrokenDocumentUrls() {
  try {
    const allProducts = await db.select().from(products);
    let fixed = 0;
    for (const p of allProducts) {
      const docs = (p.documents as any[] | null) || [];
      const certs = (p.regulatoryCertificates as any[] | null) || [];
      
      const newDocs = docs.filter((d: any) => {
        const url = d?.url || '';
        return !url.startsWith('http');
      });
      
      const newCerts = certs.filter((c: any) => {
        const url = c?.url || '';
        if (url === '#' || url === '') return false;
        if (url.startsWith('https://viaglobalhealth.comhttps://')) return false;
        if (url.startsWith('http')) {
          if (p.sku === 'HTU-110C' && (c.name || '').includes('FDA')) {
            c.url = '/documents/products/htu-110c/cert-fda-certificate.pdf';
            return true;
          }
          return false;
        }
        return true;
      });
      
      const studies = (p.studiesAndTrials as any[] | null) || [];
      const newStudies = studies.filter((s: any) => {
        const url = s?.url || '';
        if (url.startsWith('http')) {
          if (url === 'https://viaglobalhealth.com/wp-content/uploads/2020/06/LifeWrap-NASG-Case-Study-USA-2015.pdf') {
            s.url = '/documents/products/lifewrap_lg/case-study-usa-2015.pdf';
            return true;
          }
          return false;
        }
        return true;
      });
      
      if (newDocs.length !== docs.length || newCerts.length !== certs.length || newStudies.length !== studies.length) {
        await db.update(products).set({
          documents: newDocs,
          regulatoryCertificates: newCerts,
          studiesAndTrials: newStudies,
        }).where(eq(products.id, p.id));
        fixed++;
      }
    }
    if (fixed > 0) {
      log(`Fixed broken document/certificate URLs in ${fixed} products`, "seeder");
    }
  } catch (error) {
    log(`Error fixing broken document URLs: ${error}`, "seeder");
  }
}

async function ensurePocketColposcope() {
  try {
    const existing = await db.select({ id: products.id }).from(products)
      .where(eq(products.sku, "calla_pocket_colp")).limit(1);
    if (existing.length > 0) {
      return;
    }
    const seedPath = join(process.cwd(), "server", "seed-colposcope.json");
    if (!existsSync(seedPath)) {
      log("Pocket Colposcope seed file not found, skipping", "seeder");
      return;
    }
    const data = JSON.parse(readFileSync(seedPath, "utf-8"));
    await db.insert(products).values(data);
    log("Seeded Pocket Colposcope product", "seeder");
  } catch (error) {
    log(`Error seeding Pocket Colposcope: ${error}`, "seeder");
  }
}

export async function seedDatabase() {
  await seedCustomerSegments();
  await fixExternalImageUrls();
  await ensureProductPackaging();
  await applyEnrichedProductData();
  await ensurePocketColposcope();
  await fixBrokenDocumentUrls();

  try {
    const existingProducts = await db.select().from(products).limit(1);
    
    if (existingProducts.length > 0) {
      log("Database already has products, skipping seed", "seeder");
      return;
    }
    
    const seedData = loadSeedData();
    
    if (!seedData || !Array.isArray(seedData) || seedData.length === 0) {
      log("No seed data found", "seeder");
      return;
    }
    
    log(`Seeding database with ${seedData.length} products...`, "seeder");
    
    const productsToInsert = seedData.map((product: any) => ({
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      category: product.category,
      sku: product.sku,
      imageUrl: product.image_url,
      images: product.images || [],
      videoUrl: product.video_url,
      keyFeatures: product.key_features || [],
      documents: product.documents || [],
      specifications: product.specifications || {},
      faqs: product.faqs || [],
      status: product.status || "active",
    }));
    
    await db.insert(products).values(productsToInsert);
    
    log(`Successfully seeded ${productsToInsert.length} products`, "seeder");
  } catch (error) {
    log(`Error seeding database: ${error}`, "seeder");
  }
}

async function fixExternalImageUrls() {
  try {
    const allProducts = await db.select({ id: products.id, name: products.name, imageUrl: products.imageUrl, images: products.images })
      .from(products);

    let fixedCount = 0;

    for (const product of allProducts) {
      const updates: { imageUrl?: string; images?: string[] } = {};

      if (product.imageUrl?.includes('viaglobalhealth.com')) {
        const filename = product.imageUrl.split('/').pop()?.toLowerCase();
        if (filename) {
          const localFile = join(process.cwd(), "client", "public", "images", "products", filename);
          if (existsSync(localFile)) {
            updates.imageUrl = `/images/products/${filename}`;
          } else {
            log(`Local file not found for "${product.name}" main image: ${filename}`, "seeder");
          }
        }
      }

      if (Array.isArray(product.images)) {
        let galleryChanged = false;
        const updatedImages = product.images.map((img: string) => {
          if (img.includes('viaglobalhealth.com')) {
            const imgFilename = img.split('/').pop()?.toLowerCase();
            if (imgFilename) {
              const imgLocalFile = join(process.cwd(), "client", "public", "images", "products", imgFilename);
              if (existsSync(imgLocalFile)) {
                galleryChanged = true;
                return `/images/products/${imgFilename}`;
              }
            }
          }
          return img;
        });
        if (galleryChanged) {
          updates.images = updatedImages;
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.update(products)
          .set(updates)
          .where(sql`${products.id} = ${product.id}`);
        fixedCount++;
        log(`Fixed image URLs for "${product.name}"`, "seeder");
      }
    }

    if (fixedCount === 0) {
      log("All product images already use local paths", "seeder");
    } else {
      log(`Fixed external image URLs for ${fixedCount} products`, "seeder");
    }
  } catch (error) {
    log(`Error fixing external image URLs: ${error}`, "seeder");
  }
}

async function ensureProductPackaging() {
  try {
    const packagingRules = [
      { skuPattern: '%Ellavi%', namePattern: '%Ellavi%', unitsPerPack: 25, packType: 'kit' },
    ];

    for (const rule of packagingRules) {
      const result = await db.select({ id: products.id, name: products.name, unitsPerPack: products.unitsPerPack })
        .from(products)
        .where(sql`(${products.sku} ILIKE ${rule.skuPattern} OR ${products.name} ILIKE ${rule.namePattern})`);

      for (const product of result) {
        if (!product.unitsPerPack) {
          await db.update(products)
            .set({ unitsPerPack: rule.unitsPerPack, packType: rule.packType })
            .where(sql`${products.id} = ${product.id}`);
          log(`Set packaging for "${product.name}": ${rule.unitsPerPack} units per ${rule.packType}`, "seeder");
        }
      }
    }
  } catch (error) {
    log(`Error ensuring product packaging: ${error}`, "seeder");
  }
}

async function seedCustomerSegments() {
  try {
    const existing = await db.select().from(customerSegments).limit(1);
    if (existing.length > 0) {
      log("Customer segments already exist, skipping seed", "seeder");
      return;
    }

    const segments = [
      { name: "ngo", displayName: "NGO / Non-Profit", description: "Non-governmental and non-profit organisations", pricingMultiplier: 1.0, isEligibleForQuotes: true, ineligibilityReason: "", sortOrder: 1 },
      { name: "government", displayName: "Government / Public Sector", description: "Government agencies and public hospitals", pricingMultiplier: 1.0, isEligibleForQuotes: true, ineligibilityReason: "", sortOrder: 2 },
      { name: "healthcare_provider", displayName: "Healthcare Provider", description: "Private hospitals, clinics, and healthcare facilities", pricingMultiplier: 1.05, isEligibleForQuotes: true, ineligibilityReason: "", sortOrder: 3 },
      { name: "distributor", displayName: "Distributor", description: "Medical equipment distributors and resellers", pricingMultiplier: 1.1, isEligibleForQuotes: true, ineligibilityReason: "", sortOrder: 4 },
      { name: "funder", displayName: "Funder / Donor", description: "Funding organisations and donors", pricingMultiplier: 1.0, isEligibleForQuotes: false, ineligibilityReason: "Provide information only - connect with buyers directly", sortOrder: 10 },
      { name: "consultant", displayName: "Consultant / Advisory", description: "Consulting and advisory firms", pricingMultiplier: 1.0, isEligibleForQuotes: false, ineligibilityReason: "Provide information only - not a direct buyer", sortOrder: 11 },
      { name: "market_research", displayName: "Market Research", description: "Market research and analysis firms", pricingMultiplier: 1.0, isEligibleForQuotes: false, ineligibilityReason: "Provide information only - not a purchasing organisation", sortOrder: 12 },
      { name: "manufacturer", displayName: "Manufacturer / Supplier", description: "Other manufacturers or suppliers", pricingMultiplier: 1.0, isEligibleForQuotes: false, ineligibilityReason: "Provide information only - potential competitor", sortOrder: 13 },
    ];

    await db.insert(customerSegments).values(segments);
    log(`Successfully seeded ${segments.length} customer segments`, "seeder");
  } catch (error) {
    log(`Error seeding customer segments: ${error}`, "seeder");
  }
}
