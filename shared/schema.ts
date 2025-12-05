import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
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
  status: varchar("status", { length: 20 }).notNull().default("active"),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  scrapedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
