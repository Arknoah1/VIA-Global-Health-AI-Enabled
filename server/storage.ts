import { 
  type Product, type InsertProduct, products, 
  type QuoteRequest, type InsertQuoteRequest, quoteRequests,
  type QuoteRequestMessage, type InsertQuoteRequestMessage, quoteRequestMessages,
  type ProductPricingTier, type InsertProductPricingTier, productPricingTiers,
  type ProductRestrictedCountry, type InsertProductRestrictedCountry, productRestrictedCountries
} from "@shared/schema";
import { db } from "../db";
import { eq, ilike, or, desc, ne, asc } from "drizzle-orm";

export interface IStorage {
  getAllProducts(search?: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string, excludeId?: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  createProducts(products: InsertProduct[]): Promise<Product[]>;
  deleteProduct(id: string): Promise<void>;
  deleteAllProducts(): Promise<void>;
  createQuoteRequest(quoteRequest: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequestById(id: string): Promise<QuoteRequest | undefined>;
  updateQuoteRequest(id: string, data: Partial<InsertQuoteRequest>): Promise<QuoteRequest>;
  getAllQuoteRequests(): Promise<QuoteRequest[]>;
  createQuoteRequestMessage(message: InsertQuoteRequestMessage): Promise<QuoteRequestMessage>;
  getQuoteRequestMessages(quoteRequestId: string): Promise<QuoteRequestMessage[]>;
  getProductPricingTiers(productId: string): Promise<ProductPricingTier[]>;
  createProductPricingTier(tier: InsertProductPricingTier): Promise<ProductPricingTier>;
  deleteProductPricingTiers(productId: string): Promise<void>;
  getProductRestrictedCountries(productId: string): Promise<ProductRestrictedCountry[]>;
  createProductRestrictedCountry(restriction: InsertProductRestrictedCountry): Promise<ProductRestrictedCountry>;
  deleteProductRestrictedCountries(productId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllProducts(search?: string): Promise<Product[]> {
    if (search) {
      return await db
        .select()
        .from(products)
        .where(
          or(
            ilike(products.name, `%${search}%`),
            ilike(products.category, `%${search}%`),
            ilike(products.sku, `%${search}%`)
          )
        )
        .orderBy(desc(products.scrapedAt));
    }
    return await db.select().from(products).orderBy(desc(products.scrapedAt));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getProductsByCategory(category: string, excludeId?: string): Promise<Product[]> {
    if (excludeId) {
      return await db
        .select()
        .from(products)
        .where(
          or(
            ilike(products.category, `%${category}%`)
          )
        )
        .limit(5);
    }
    return await db
      .select()
      .from(products)
      .where(ilike(products.category, `%${category}%`))
      .limit(5);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async createProducts(productList: InsertProduct[]): Promise<Product[]> {
    const result = await db.insert(products).values(productList).returning();
    return result;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async deleteAllProducts(): Promise<void> {
    await db.delete(products);
  }

  async createQuoteRequest(quoteRequest: InsertQuoteRequest): Promise<QuoteRequest> {
    const result = await db.insert(quoteRequests).values(quoteRequest).returning();
    return result[0];
  }

  async getQuoteRequestById(id: string): Promise<QuoteRequest | undefined> {
    const result = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id)).limit(1);
    return result[0];
  }

  async updateQuoteRequest(id: string, data: Partial<InsertQuoteRequest>): Promise<QuoteRequest> {
    const result = await db
      .update(quoteRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quoteRequests.id, id))
      .returning();
    return result[0];
  }

  async getAllQuoteRequests(): Promise<QuoteRequest[]> {
    return await db.select().from(quoteRequests).orderBy(desc(quoteRequests.createdAt));
  }

  async createQuoteRequestMessage(message: InsertQuoteRequestMessage): Promise<QuoteRequestMessage> {
    const result = await db.insert(quoteRequestMessages).values(message).returning();
    return result[0];
  }

  async getQuoteRequestMessages(quoteRequestId: string): Promise<QuoteRequestMessage[]> {
    return await db
      .select()
      .from(quoteRequestMessages)
      .where(eq(quoteRequestMessages.quoteRequestId, quoteRequestId))
      .orderBy(quoteRequestMessages.createdAt);
  }

  async getProductPricingTiers(productId: string): Promise<ProductPricingTier[]> {
    return await db
      .select()
      .from(productPricingTiers)
      .where(eq(productPricingTiers.productId, productId))
      .orderBy(asc(productPricingTiers.minQuantity));
  }

  async createProductPricingTier(tier: InsertProductPricingTier): Promise<ProductPricingTier> {
    const result = await db.insert(productPricingTiers).values(tier).returning();
    return result[0];
  }

  async deleteProductPricingTiers(productId: string): Promise<void> {
    await db.delete(productPricingTiers).where(eq(productPricingTiers.productId, productId));
  }

  async getProductRestrictedCountries(productId: string): Promise<ProductRestrictedCountry[]> {
    return await db
      .select()
      .from(productRestrictedCountries)
      .where(eq(productRestrictedCountries.productId, productId))
      .orderBy(asc(productRestrictedCountries.countryName));
  }

  async createProductRestrictedCountry(restriction: InsertProductRestrictedCountry): Promise<ProductRestrictedCountry> {
    const result = await db.insert(productRestrictedCountries).values(restriction).returning();
    return result[0];
  }

  async deleteProductRestrictedCountries(productId: string): Promise<void> {
    await db.delete(productRestrictedCountries).where(eq(productRestrictedCountries.productId, productId));
  }
}

export const storage = new DatabaseStorage();
