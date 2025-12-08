import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { scrapeViaGlobalHealth } from "./scraper";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all products (with optional search)
  app.get("/api/products", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const products = await storage.getAllProducts(search);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get single product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Scrape products from ViaGlobal and save to database
  app.post("/api/scrape", async (req, res) => {
    try {
      console.log("[API] Starting scrape request");
      const { urls } = req.body;
      const scrapedProducts = await scrapeViaGlobalHealth(urls);
      console.log(`[API] Scraped ${scrapedProducts.length} products, saving to database...`);
      
      const saved = await storage.createProducts(scrapedProducts);
      console.log(`[API] Saved ${saved.length} products to database`);
      
      res.json({ 
        success: true, 
        count: saved.length,
        products: saved
      });
    } catch (error) {
      console.error("Error during scraping:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Scraping failed" 
      });
    }
  });

  // Create products (bulk insert from scraper or manual)
  app.post("/api/products", async (req, res) => {
    try {
      const body = req.body;
      
      // Handle both single product and array of products
      if (Array.isArray(body)) {
        const validated = z.array(insertProductSchema).parse(body);
        const created = await storage.createProducts(validated);
        res.json(created);
      } else {
        const validated = insertProductSchema.parse(body);
        const created = await storage.createProduct(validated);
        res.json(created);
      }
    } catch (error) {
      console.error("Error creating products:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create products" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Delete all products (for testing)
  app.delete("/api/products", async (req, res) => {
    try {
      await storage.deleteAllProducts();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting all products:", error);
      res.status(500).json({ error: "Failed to delete products" });
    }
  });

  // AI Quote Assistant endpoint
  app.post("/api/quote-assistant", async (req, res) => {
    try {
      const { messages, product } = req.body;
      
      const systemMessage = `You are a helpful product quote assistant for a medical/healthcare equipment company. You help customers get quotes for products and answer questions about specifications, pricing, and ordering.

Current product being discussed:
- Name: ${product.name}
- SKU: ${product.sku}
- Category: ${product.category}
- Description: ${product.description || 'N/A'}
- Key Features: ${product.keyFeatures?.join(', ') || 'N/A'}

Your role is to:
1. Help customers understand product details and specifications
2. Collect information needed for a quote (quantity, shipping location, timeline)
3. Answer questions about the product
4. Be friendly, professional, and helpful

Keep responses concise but informative.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemMessage },
          ...messages
        ],
        max_completion_tokens: 1024,
      });

      res.json({ 
        message: response.choices[0]?.message?.content || "I'm sorry, I couldn't process that request." 
      });
    } catch (error) {
      console.error("Error with AI assistant:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  return httpServer;
}
