import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeViaGlobalHealth } from "./scraper";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Scraping endpoint
  app.post("/api/scrape", async (req, res) => {
    try {
      log("Starting scrape of viaglobalhealth.com");
      const products = await scrapeViaGlobalHealth();
      log(`Scraped ${products.length} products`);
      res.json({ success: true, products, count: products.length });
    } catch (error) {
      log(`Scraping failed: ${error}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Scraping failed" 
      });
    }
  });

  return httpServer;
}
