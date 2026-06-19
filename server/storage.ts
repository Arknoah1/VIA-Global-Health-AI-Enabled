import { 
  type Product, type InsertProduct, products, 
  type QuoteRequest, type InsertQuoteRequest, quoteRequests,
  type QuoteRequestMessage, type InsertQuoteRequestMessage, quoteRequestMessages,
  type ProductPricingTier, type InsertProductPricingTier, productPricingTiers,
  type ProductRestrictedCountry, type InsertProductRestrictedCountry, productRestrictedCountries,
  type CustomerSegment, type InsertCustomerSegment, customerSegments,
  type ProformaInvoice, type InsertProformaInvoice, proformaInvoices,
  type TrainingTranscript, type InsertTrainingTranscript, trainingTranscripts,
  type SalesInsight, type InsertSalesInsight, salesInsights,
  type LogisticsLookup, type InsertLogisticsLookup, logisticsLookup,
  type ShippingDeal, type InsertShippingDeal, shippingDeals,
  type MarketDataCache, marketDataCache
} from "@shared/schema";
import { db } from "../db";
import { eq, ilike, or, desc, ne, asc } from "drizzle-orm";

export interface IStorage {
  getAllProducts(search?: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string, excludeId?: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  createProducts(products: InsertProduct[]): Promise<Product[]>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  deleteAllProducts(): Promise<void>;
  createQuoteRequest(quoteRequest: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequestById(id: string): Promise<QuoteRequest | undefined>;
  updateQuoteRequest(id: string, data: Partial<InsertQuoteRequest>): Promise<QuoteRequest>;
  deleteQuoteRequest(id: string): Promise<void>;
  getAllQuoteRequests(): Promise<QuoteRequest[]>;
  getQuoteRequestsByEmail(email: string): Promise<QuoteRequest[]>;
  createQuoteRequestMessage(message: InsertQuoteRequestMessage): Promise<QuoteRequestMessage>;
  getQuoteRequestMessages(quoteRequestId: string): Promise<QuoteRequestMessage[]>;
  deleteQuoteRequestMessages(quoteRequestId: string): Promise<void>;
  getProductPricingTiers(productId: string): Promise<ProductPricingTier[]>;
  createProductPricingTier(tier: InsertProductPricingTier): Promise<ProductPricingTier>;
  createProductPricingTiersBulk(tiers: InsertProductPricingTier[]): Promise<ProductPricingTier[]>;
  updateProductPricingTier(id: string, data: Partial<InsertProductPricingTier>): Promise<ProductPricingTier>;
  deleteProductPricingTier(id: string): Promise<void>;
  deleteProductPricingTiers(productId: string): Promise<void>;
  getProductRestrictedCountries(productId: string): Promise<ProductRestrictedCountry[]>;
  createProductRestrictedCountry(restriction: InsertProductRestrictedCountry): Promise<ProductRestrictedCountry>;
  createProductRestrictedCountriesBulk(restrictions: InsertProductRestrictedCountry[]): Promise<ProductRestrictedCountry[]>;
  updateProductRestrictedCountry(id: string, data: Partial<InsertProductRestrictedCountry>): Promise<ProductRestrictedCountry>;
  deleteProductRestrictedCountry(id: string): Promise<void>;
  deleteProductRestrictedCountries(productId: string): Promise<void>;
  getAllCustomerSegments(): Promise<CustomerSegment[]>;
  getCustomerSegmentByName(name: string): Promise<CustomerSegment | undefined>;
  createCustomerSegment(segment: InsertCustomerSegment): Promise<CustomerSegment>;
  updateCustomerSegment(id: string, data: Partial<InsertCustomerSegment>): Promise<CustomerSegment>;
  deleteCustomerSegment(id: string): Promise<void>;
  
  // Proforma Invoices
  createProformaInvoice(invoice: InsertProformaInvoice): Promise<ProformaInvoice>;
  getProformaInvoiceById(id: string): Promise<ProformaInvoice | undefined>;
  getProformaInvoiceByReference(referenceNumber: string): Promise<ProformaInvoice | undefined>;
  updateProformaInvoice(id: string, data: Partial<InsertProformaInvoice>): Promise<ProformaInvoice>;
  getAllProformaInvoices(): Promise<ProformaInvoice[]>;
  getProformaInvoicesByQuoteRequest(quoteRequestId: string): Promise<ProformaInvoice[]>;

  // Training Transcripts
  createTrainingTranscript(transcript: InsertTrainingTranscript): Promise<TrainingTranscript>;
  getTrainingTranscriptById(id: string): Promise<TrainingTranscript | undefined>;
  updateTrainingTranscript(id: string, data: Partial<InsertTrainingTranscript>): Promise<TrainingTranscript>;
  deleteTrainingTranscript(id: string): Promise<void>;
  getAllTrainingTranscripts(): Promise<TrainingTranscript[]>;
  getProcessedTrainingTranscripts(): Promise<TrainingTranscript[]>;

  createSalesInsight(insight: InsertSalesInsight): Promise<SalesInsight>;
  createSalesInsightsBulk(insights: InsertSalesInsight[]): Promise<SalesInsight[]>;
  getSalesInsights(filters?: { customerType?: string; region?: string; productCategory?: string }): Promise<SalesInsight[]>;
  getSalesInsightsByQuoteRequest(quoteRequestId: string): Promise<SalesInsight[]>;

  getLogisticsLookup(): Promise<LogisticsLookup[]>;
  getLogisticsForProduct(productType: string): Promise<LogisticsLookup[]>;
  getLogisticsForRoute(productType: string, destinationCountry: string): Promise<LogisticsLookup[]>;
  upsertLogisticsData(data: InsertLogisticsLookup[]): Promise<void>;

  getAllShippingDeals(): Promise<ShippingDeal[]>;
  getShippingDealsByCountry(country: string): Promise<ShippingDeal[]>;
  getShippingDealsByProduct(productName: string): Promise<ShippingDeal[]>;
  upsertShippingDeals(deals: InsertShippingDeal[]): Promise<ShippingDeal[]>;

  getMarketDataCache(key: string): Promise<MarketDataCache | undefined>;
  getMarketDataCacheEntry(key: string): Promise<MarketDataCache | undefined>;
  setMarketDataCache(key: string, data: any, ttlDays: number): Promise<void>;
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

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product> {
    const result = await db.update(products).set(data).where(eq(products.id, id)).returning();
    if (result.length === 0) throw new Error("Product not found");
    return result[0];
  }

  async deleteProduct(id: string): Promise<void> {
    await db.update(quoteRequests).set({ productId: null }).where(eq(quoteRequests.productId, id));
    await db.delete(productPricingTiers).where(eq(productPricingTiers.productId, id));
    await db.delete(productRestrictedCountries).where(eq(productRestrictedCountries.productId, id));
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

  async deleteQuoteRequest(id: string): Promise<void> {
    await db.delete(quoteRequestMessages).where(eq(quoteRequestMessages.quoteRequestId, id));
    await db.delete(proformaInvoices).where(eq(proformaInvoices.quoteRequestId, id));
    await db.delete(quoteRequests).where(eq(quoteRequests.id, id));
  }

  async getAllQuoteRequests(): Promise<QuoteRequest[]> {
    return await db.select().from(quoteRequests).orderBy(desc(quoteRequests.createdAt));
  }

  async getQuoteRequestsByEmail(email: string): Promise<QuoteRequest[]> {
    return await db
      .select()
      .from(quoteRequests)
      .where(ilike(quoteRequests.email, email))
      .orderBy(desc(quoteRequests.createdAt));
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

  async deleteQuoteRequestMessages(quoteRequestId: string): Promise<void> {
    await db.delete(quoteRequestMessages).where(eq(quoteRequestMessages.quoteRequestId, quoteRequestId));
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

  async createProductPricingTiersBulk(tiers: InsertProductPricingTier[]): Promise<ProductPricingTier[]> {
    if (tiers.length === 0) return [];
    return await db.insert(productPricingTiers).values(tiers).returning();
  }

  async updateProductPricingTier(id: string, data: Partial<InsertProductPricingTier>): Promise<ProductPricingTier> {
    const result = await db.update(productPricingTiers).set(data).where(eq(productPricingTiers.id, id)).returning();
    return result[0];
  }

  async deleteProductPricingTier(id: string): Promise<void> {
    await db.delete(productPricingTiers).where(eq(productPricingTiers.id, id));
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

  async createProductRestrictedCountriesBulk(restrictions: InsertProductRestrictedCountry[]): Promise<ProductRestrictedCountry[]> {
    if (restrictions.length === 0) return [];
    return await db.insert(productRestrictedCountries).values(restrictions).returning();
  }

  async updateProductRestrictedCountry(id: string, data: Partial<InsertProductRestrictedCountry>): Promise<ProductRestrictedCountry> {
    const result = await db.update(productRestrictedCountries).set(data).where(eq(productRestrictedCountries.id, id)).returning();
    return result[0];
  }

  async deleteProductRestrictedCountry(id: string): Promise<void> {
    await db.delete(productRestrictedCountries).where(eq(productRestrictedCountries.id, id));
  }

  async deleteProductRestrictedCountries(productId: string): Promise<void> {
    await db.delete(productRestrictedCountries).where(eq(productRestrictedCountries.productId, productId));
  }

  async getAllCustomerSegments(): Promise<CustomerSegment[]> {
    return await db
      .select()
      .from(customerSegments)
      .orderBy(asc(customerSegments.sortOrder));
  }

  async getCustomerSegmentByName(name: string): Promise<CustomerSegment | undefined> {
    const result = await db
      .select()
      .from(customerSegments)
      .where(eq(customerSegments.name, name))
      .limit(1);
    return result[0];
  }

  async createCustomerSegment(segment: InsertCustomerSegment): Promise<CustomerSegment> {
    const result = await db.insert(customerSegments).values(segment).returning();
    return result[0];
  }

  async updateCustomerSegment(id: string, data: Partial<InsertCustomerSegment>): Promise<CustomerSegment> {
    const result = await db
      .update(customerSegments)
      .set(data)
      .where(eq(customerSegments.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomerSegment(id: string): Promise<void> {
    await db.delete(customerSegments).where(eq(customerSegments.id, id));
  }

  // Proforma Invoice methods
  async createProformaInvoice(invoice: InsertProformaInvoice): Promise<ProformaInvoice> {
    const result = await db.insert(proformaInvoices).values(invoice).returning();
    return result[0];
  }

  async getProformaInvoiceById(id: string): Promise<ProformaInvoice | undefined> {
    const result = await db.select().from(proformaInvoices).where(eq(proformaInvoices.id, id)).limit(1);
    return result[0];
  }

  async getProformaInvoiceByReference(referenceNumber: string): Promise<ProformaInvoice | undefined> {
    const result = await db.select().from(proformaInvoices).where(eq(proformaInvoices.referenceNumber, referenceNumber)).limit(1);
    return result[0];
  }

  async updateProformaInvoice(id: string, data: Partial<InsertProformaInvoice>): Promise<ProformaInvoice> {
    const result = await db
      .update(proformaInvoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proformaInvoices.id, id))
      .returning();
    return result[0];
  }

  async getAllProformaInvoices(): Promise<ProformaInvoice[]> {
    return await db.select().from(proformaInvoices).orderBy(desc(proformaInvoices.createdAt));
  }

  async getProformaInvoicesByQuoteRequest(quoteRequestId: string): Promise<ProformaInvoice[]> {
    return await db
      .select()
      .from(proformaInvoices)
      .where(eq(proformaInvoices.quoteRequestId, quoteRequestId))
      .orderBy(desc(proformaInvoices.createdAt));
  }

  async createTrainingTranscript(transcript: InsertTrainingTranscript): Promise<TrainingTranscript> {
    const result = await db.insert(trainingTranscripts).values(transcript).returning();
    return result[0];
  }

  async getTrainingTranscriptById(id: string): Promise<TrainingTranscript | undefined> {
    const result = await db.select().from(trainingTranscripts).where(eq(trainingTranscripts.id, id)).limit(1);
    return result[0];
  }

  async updateTrainingTranscript(id: string, data: Partial<InsertTrainingTranscript>): Promise<TrainingTranscript> {
    const result = await db
      .update(trainingTranscripts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingTranscripts.id, id))
      .returning();
    return result[0];
  }

  async deleteTrainingTranscript(id: string): Promise<void> {
    await db.delete(trainingTranscripts).where(eq(trainingTranscripts.id, id));
  }

  async getAllTrainingTranscripts(): Promise<TrainingTranscript[]> {
    return await db.select().from(trainingTranscripts).orderBy(desc(trainingTranscripts.createdAt));
  }

  async getProcessedTrainingTranscripts(): Promise<TrainingTranscript[]> {
    return await db
      .select()
      .from(trainingTranscripts)
      .where(eq(trainingTranscripts.isProcessed, true))
      .orderBy(desc(trainingTranscripts.createdAt));
  }

  async createSalesInsight(insight: InsertSalesInsight): Promise<SalesInsight> {
    const result = await db.insert(salesInsights).values(insight).returning();
    return result[0];
  }

  async createSalesInsightsBulk(insights: InsertSalesInsight[]): Promise<SalesInsight[]> {
    if (insights.length === 0) return [];
    const result = await db.insert(salesInsights).values(insights).returning();
    return result;
  }

  async getSalesInsights(filters?: { customerType?: string; region?: string; productCategory?: string }): Promise<SalesInsight[]> {
    let query = db.select().from(salesInsights).orderBy(desc(salesInsights.createdAt));
    return await query.limit(50);
  }

  async getSalesInsightsByQuoteRequest(quoteRequestId: string): Promise<SalesInsight[]> {
    return await db
      .select()
      .from(salesInsights)
      .where(eq(salesInsights.quoteRequestId, quoteRequestId))
      .orderBy(desc(salesInsights.createdAt));
  }

  async getLogisticsLookup(): Promise<LogisticsLookup[]> {
    return await db.select().from(logisticsLookup);
  }

  async getLogisticsForProduct(productType: string): Promise<LogisticsLookup[]> {
    return await db
      .select()
      .from(logisticsLookup)
      .where(ilike(logisticsLookup.productType, `%${productType}%`));
  }

  async getLogisticsForRoute(productType: string, destinationCountry: string): Promise<LogisticsLookup[]> {
    return await db
      .select()
      .from(logisticsLookup)
      .where(
        or(
          // Exact route match (both product AND destination)
          // Or just product match for range estimates
          ilike(logisticsLookup.productType, `%${productType}%`)
        )
      );
  }

  async upsertLogisticsData(data: InsertLogisticsLookup[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(logisticsLookup);
      if (data.length > 0) {
        await tx.insert(logisticsLookup).values(data);
      }
    });
  }

  async getAllShippingDeals(): Promise<ShippingDeal[]> {
    return await db.select().from(shippingDeals).orderBy(desc(shippingDeals.syncedAt));
  }

  async getShippingDealsByCountry(country: string): Promise<ShippingDeal[]> {
    return await db.select().from(shippingDeals)
      .where(ilike(shippingDeals.country, country));
  }

  async getShippingDealsByProduct(productName: string): Promise<ShippingDeal[]> {
    return await db.select().from(shippingDeals)
      .where(ilike(shippingDeals.product, `%${productName}%`));
  }

  async upsertShippingDeals(deals: InsertShippingDeal[]): Promise<ShippingDeal[]> {
    if (deals.length === 0) return [];
    await db.delete(shippingDeals);
    return await db.insert(shippingDeals).values(deals).returning();
  }

  async getMarketDataCache(key: string): Promise<MarketDataCache | undefined> {
    const result = await db.select().from(marketDataCache)
      .where(eq(marketDataCache.key, key))
      .limit(1);
    if (result[0] && new Date(result[0].expiresAt) < new Date()) {
      return undefined;
    }
    return result[0];
  }

  async getMarketDataCacheEntry(key: string): Promise<MarketDataCache | undefined> {
    const result = await db.select().from(marketDataCache)
      .where(eq(marketDataCache.key, key))
      .limit(1);
    return result[0];
  }

  async setMarketDataCache(key: string, data: any, ttlDays: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlDays * 86400000);
    const existing = await db.select().from(marketDataCache)
      .where(eq(marketDataCache.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(marketDataCache)
        .set({ data, fetchedAt: new Date(), expiresAt })
        .where(eq(marketDataCache.key, key));
    } else {
      await db.insert(marketDataCache).values({ key, data, fetchedAt: new Date(), expiresAt });
    }
  }
}

export const storage = new DatabaseStorage();
