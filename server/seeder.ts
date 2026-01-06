import { db } from "../db";
import { products } from "@shared/schema";
import seedData from "./seed-data.json";

function log(message: string, source = "seeder") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function seedDatabase() {
  try {
    const existingProducts = await db.select().from(products).limit(1);
    
    if (existingProducts.length > 0) {
      log("Database already has products, skipping seed", "seeder");
      return;
    }
    
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
