import { type Product, type InsertProduct, products } from "@shared/schema";
import { db } from "../db";
import { eq, ilike, or, desc } from "drizzle-orm";

export interface IStorage {
  // Products
  getAllProducts(search?: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  createProducts(products: InsertProduct[]): Promise<Product[]>;
  deleteProduct(id: string): Promise<void>;
  deleteAllProducts(): Promise<void>;
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
}

export const storage = new DatabaseStorage();
