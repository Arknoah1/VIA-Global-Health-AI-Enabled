import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  category: text("category").notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  imageUrl: text("image_url").notNull(),
  images: jsonb("images").notNull().default(sql`'[]'::jsonb`),
  videoUrl: text("video_url"),
  keyFeatures: jsonb("key_features").notNull().default(sql`'[]'::jsonb`),
  documents: jsonb("documents").notNull().default(sql`'[]'::jsonb`),
  specifications: jsonb("specifications").notNull().default(sql`'{}'::jsonb`),
  faqs: jsonb("faqs").notNull().default(sql`'[]'::jsonb`),
  unitsPerPack: integer("units_per_pack"),
  packType: text("pack_type"),
  shippingLengthCm: real("shipping_length_cm"),
  shippingWidthCm: real("shipping_width_cm"),
  shippingDepthCm: real("shipping_depth_cm"),
  shippingWeightKg: real("shipping_weight_kg"),
  pickupCountry: text("pickup_country"),
  sellerName: text("seller_name"),
  sellerLocation: text("seller_location"),
  warrantyTerm: text("warranty_term"),
  warrantyText: text("warranty_text"),
  regulatoryApproval: text("regulatory_approval"),
  minimumOrderQuantity: integer("minimum_order_quantity"),
  estimatedLifespan: text("estimated_lifespan"),
  salesRestrictions: jsonb("sales_restrictions").default(sql`'{"cantShipTo":[],"cantSellTo":[]}'::jsonb`),
  leadTimeDays: integer("lead_time_days"),
  standardAccessories: jsonb("standard_accessories").default(sql`'[]'::jsonb`),
  optionalAccessories: jsonb("optional_accessories").default(sql`'[]'::jsonb`),
  boxContents: jsonb("box_contents").default(sql`'[]'::jsonb`),
  testimonials: jsonb("testimonials").default(sql`'[]'::jsonb`),
  studiesAndTrials: jsonb("studies_and_trials").default(sql`'[]'::jsonb`),
  regulatoryCertificates: jsonb("regulatory_certificates").default(sql`'[]'::jsonb`),
  videos: jsonb("videos").default(sql`'[]'::jsonb`),
  tags: jsonb("tags").default(sql`'[]'::jsonb`),
  relatedProductIds: jsonb("related_product_ids").default(sql`'[]'::jsonb`),
  buyersGuideUrl: text("buyers_guide_url"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  scrapedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const quoteRequests = pgTable("quote_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id),
  productName: text("product_name"),
  productSku: text("product_sku"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  organizationName: text("organization_name"),
  organizationType: text("organization_type"),
  orderQuantity: text("order_quantity"),
  shippingCountry: text("shipping_country"),
  shippingCity: text("shipping_city"),
  shippingAddress: text("shipping_address"),
  shippingPreference: text("shipping_preference"),
  importAssistance: text("import_assistance"),
  initialIntent: text("initial_intent"),
  budgetRange: text("budget_range"),
  decisionTimeline: text("decision_timeline"),
  specialPricingEligible: boolean("special_pricing_eligible").default(false),
  aiSummary: text("ai_summary"),
  recommendedProducts: jsonb("recommended_products").default(sql`'[]'::jsonb`),
  referredToAgent: boolean("referred_to_agent").default(false),
  referralReason: text("referral_reason"),
  conversation: jsonb("conversation").notNull().default(sql`'[]'::jsonb`),
  aiReview: jsonb("ai_review"),
  shippingEstimate: jsonb("shipping_estimate"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;

export const quoteRequestMessages = pgTable("quote_request_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteRequestId: varchar("quote_request_id").references(() => quoteRequests.id).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 50 }),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuoteRequestMessageSchema = createInsertSchema(quoteRequestMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertQuoteRequestMessage = z.infer<typeof insertQuoteRequestMessageSchema>;
export type QuoteRequestMessage = typeof quoteRequestMessages.$inferSelect;

export const productPricingTiers = pgTable("product_pricing_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id).notNull(),
  minQuantity: integer("min_quantity").notNull(),
  maxQuantity: integer("max_quantity"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  tierName: text("tier_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductPricingTierSchema = createInsertSchema(productPricingTiers).omit({
  id: true,
  createdAt: true,
});

export type InsertProductPricingTier = z.infer<typeof insertProductPricingTierSchema>;
export type ProductPricingTier = typeof productPricingTiers.$inferSelect;

export const productRestrictedCountries = pgTable("product_restricted_countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id).notNull(),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  countryName: text("country_name").notNull(),
  restrictionReason: text("restriction_reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductRestrictedCountrySchema = createInsertSchema(productRestrictedCountries).omit({
  id: true,
  createdAt: true,
});

export type InsertProductRestrictedCountry = z.infer<typeof insertProductRestrictedCountrySchema>;
export type ProductRestrictedCountry = typeof productRestrictedCountries.$inferSelect;

export const customerSegments = pgTable("customer_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  pricingMultiplier: real("pricing_multiplier").notNull().default(1.0),
  isEligibleForQuotes: boolean("is_eligible_for_quotes").notNull().default(true),
  ineligibilityReason: text("ineligibility_reason"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerSegmentSchema = createInsertSchema(customerSegments).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomerSegment = z.infer<typeof insertCustomerSegmentSchema>;
export type CustomerSegment = typeof customerSegments.$inferSelect;

export const proformaInvoices = pgTable("proforma_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 50 }).notNull().unique(),
  quoteRequestId: varchar("quote_request_id").unique().references(() => quoteRequests.id),
  
  // Customer info
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerOrganization: text("customer_organization"),
  customerAddress: text("customer_address"),
  
  // Delivery info
  deliveryAddress: text("delivery_address"),
  deliveryCountry: text("delivery_country"),
  deliveryCity: text("delivery_city"),
  poNumber: text("po_number"),
  
  // Line items as JSON array: [{name, description, quantity, unitPriceCents, totalCents}]
  lineItems: jsonb("line_items").notNull().default(sql`'[]'::jsonb`),
  
  // Costs in cents
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  shippingCents: integer("shipping_cents").default(0),
  bankFeeCents: integer("bank_fee_cents").default(3000), // $30 default
  totalCents: integer("total_cents").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  
  // Shipping details
  shippingMethod: text("shipping_method"),
  incoterms: text("incoterms").default("CIP"),
  
  // Comments/notes
  comments: text("comments"),
  
  // Created by
  createdByName: text("created_by_name").default("VIA Global Health"),
  createdByEmail: text("created_by_email").default("quotes@viaglobalhealth.com"),
  createdByPhone: text("created_by_phone"),
  createdByTitle: text("created_by_title"),
  
  // Dates
  quoteCreatedAt: timestamp("quote_created_at").notNull().defaultNow(),
  quoteExpiresAt: timestamp("quote_expires_at"),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  emailSentAt: timestamp("email_sent_at"),
  emailSentTo: text("email_sent_to"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProformaInvoiceSchema = createInsertSchema(proformaInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProformaInvoice = z.infer<typeof insertProformaInvoiceSchema>;
export type ProformaInvoice = typeof proformaInvoices.$inferSelect;

export const trainingTranscripts = pgTable("training_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  rawTranscript: text("raw_transcript").notNull(),
  annotations: text("annotations"),
  buyerType: text("buyer_type"),
  country: text("country"),
  productsDiscussed: text("products_discussed"),
  objections: text("objections"),
  outcome: varchar("outcome", { length: 30 }),
  aiExtractedInsights: jsonb("ai_extracted_insights").default(sql`'{}'::jsonb`),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTrainingTranscriptSchema = createInsertSchema(trainingTranscripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingTranscript = z.infer<typeof insertTrainingTranscriptSchema>;
export type TrainingTranscript = typeof trainingTranscripts.$inferSelect;

export const salesInsights = pgTable("sales_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteRequestId: varchar("quote_request_id").references(() => quoteRequests.id),
  insightType: varchar("insight_type", { length: 30 }).notNull(),
  insight: text("insight").notNull(),
  category: text("category"),
  region: text("region"),
  customerType: text("customer_type"),
  productCategory: text("product_category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSalesInsightSchema = createInsertSchema(salesInsights).omit({
  id: true,
  createdAt: true,
});

export type InsertSalesInsight = z.infer<typeof insertSalesInsightSchema>;
export type SalesInsight = typeof salesInsights.$inferSelect;

export const shippingDeals = pgTable("shipping_deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  country: text("country").notNull(),
  product: text("product").notNull(),
  qty: integer("qty").notNull().default(1),
  shippingCost: real("shipping_cost").notNull(),
  method: varchar("method", { length: 20 }),
  incoterm: varchar("incoterm", { length: 20 }),
  productValue: real("product_value"),
  source: varchar("source", { length: 20 }).notNull().default("manual"),
  dealDate: timestamp("deal_date"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

export const insertShippingDealSchema = createInsertSchema(shippingDeals).omit({
  id: true,
  syncedAt: true,
});

export type InsertShippingDeal = z.infer<typeof insertShippingDealSchema>;
export type ShippingDeal = typeof shippingDeals.$inferSelect;

export const marketDataCache = pgTable("market_data_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  data: jsonb("data").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertMarketDataCacheSchema = createInsertSchema(marketDataCache).omit({
  id: true,
});

export type InsertMarketDataCache = z.infer<typeof insertMarketDataCacheSchema>;
export type MarketDataCache = typeof marketDataCache.$inferSelect;

export const logisticsLookup = pgTable("logistics_lookup", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productType: text("product_type").notNull(),
  destinationCountry: text("destination_country").notNull(),
  pickupCountry: text("pickup_country").notNull(),
  avgShippingPerUnit: real("avg_shipping_per_unit").notNull(),
  minShippingPerUnit: real("min_shipping_per_unit").notNull(),
  maxShippingPerUnit: real("max_shipping_per_unit").notNull(),
  chargeableWeightKg: real("chargeable_weight_kg"),
  sampleSize: integer("sample_size"),
  sellerName: text("seller_name"),
});

export const insertLogisticsLookupSchema = createInsertSchema(logisticsLookup).omit({
  id: true,
});

export type InsertLogisticsLookup = z.infer<typeof insertLogisticsLookupSchema>;
export type LogisticsLookup = typeof logisticsLookup.$inferSelect;
