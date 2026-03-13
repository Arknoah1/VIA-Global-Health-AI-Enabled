import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { scrapeViaGlobalHealth } from "./scraper";
import { insertProductSchema, insertQuoteRequestSchema, insertProductPricingTierSchema, insertProductRestrictedCountrySchema, insertCustomerSegmentSchema, insertProformaInvoiceSchema, insertTrainingTranscriptSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return true;
  if (now - record.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(ip);
    return true;
  }
  return record.count < MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record && now - record.lastAttempt < LOCKOUT_DURATION) {
    record.count++;
    record.lastAttempt = now;
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  }
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// In-memory cache for products
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: {
  products?: CacheEntry<any[]>;
  productsByCategory: Map<string, CacheEntry<any[]>>;
} = {
  products: undefined,
  productsByCategory: new Map()
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

function invalidateCache() {
  cache.products = undefined;
  cache.productsByCategory.clear();
}

async function updateProductManifests() {
  try {
    const allProducts = await storage.getAllProducts();
    const manifests = allProducts.map(p => ({
      sku: p.sku || '',
      name: p.name,
      documents: ((p.documents as any[]) || []).map((d: any) => ({
        name: d.name || '',
        url: d.url || '',
        thumbnailUrl: d.thumbnailUrl || ''
      })),
      regulatoryCertificates: ((p.regulatoryCertificates as any[]) || []).map((c: any) => ({
        name: c.name || '',
        url: c.url || '',
        thumbnailUrl: c.thumbnailUrl || ''
      }))
    }));
    const manifestPath = join(process.cwd(), "server", "product-manifests.json");
    writeFileSync(manifestPath, JSON.stringify(manifests, null, 2));
    console.log(`[Manifest] Updated product manifests for ${manifests.length} products`);
  } catch (error) {
    console.error("[Manifest] Error updating manifests:", error);
  }
}

async function validateProductFiles() {
  const allProducts = await storage.getAllProducts();
  const issues: Array<{sku: string, name: string, field: string, problem: string}> = [];
  const valid: string[] = [];
  const publicDir = join(process.cwd(), "client", "public");
  const distDir = join(process.cwd(), "dist", "public");

  for (const p of allProducts) {
    const sku = p.sku || 'unknown';
    let hasIssue = false;

    if (p.imageUrl && p.imageUrl.startsWith('/')) {
      const imgPath = join(publicDir, p.imageUrl);
      const distImgPath = join(distDir, p.imageUrl);
      if (!existsSync(imgPath) && !existsSync(distImgPath)) {
        issues.push({ sku, name: p.name, field: 'imageUrl', problem: `Main image missing: ${p.imageUrl}` });
        hasIssue = true;
      }
    }

    const docs = (p.documents as any[]) || [];
    for (const doc of docs) {
      if (doc.url && doc.url.startsWith('/')) {
        const filePath = join(publicDir, doc.url);
        if (!existsSync(filePath)) {
          issues.push({ sku, name: p.name, field: 'documents', problem: `Document file missing: ${doc.name} (${doc.url})` });
          hasIssue = true;
        }
      }
      if (doc.thumbnailUrl && doc.thumbnailUrl.startsWith('/')) {
        const thumbPath = join(publicDir, doc.thumbnailUrl);
        if (!existsSync(thumbPath)) {
          issues.push({ sku, name: p.name, field: 'documents', problem: `Document thumbnail missing: ${doc.name} (${doc.thumbnailUrl})` });
          hasIssue = true;
        }
      }
    }

    const certs = (p.regulatoryCertificates as any[]) || [];
    for (const cert of certs) {
      if (cert.url && cert.url.startsWith('/')) {
        const filePath = join(publicDir, cert.url);
        if (!existsSync(filePath)) {
          issues.push({ sku, name: p.name, field: 'regulatoryCertificates', problem: `Certificate file missing: ${cert.name} (${cert.url})` });
          hasIssue = true;
        }
      }
      if (cert.thumbnailUrl && cert.thumbnailUrl.startsWith('/')) {
        const thumbPath = join(publicDir, cert.thumbnailUrl);
        if (!existsSync(thumbPath)) {
          issues.push({ sku, name: p.name, field: 'regulatoryCertificates', problem: `Certificate thumbnail missing: ${cert.name} (${cert.thumbnailUrl})` });
          hasIssue = true;
        }
      }
    }

    const images = (p.images as string[]) || [];
    for (const img of images) {
      if (img && img.startsWith('/')) {
        const imgPath = join(publicDir, img);
        if (!existsSync(imgPath)) {
          issues.push({ sku, name: p.name, field: 'images', problem: `Gallery image missing: ${img}` });
          hasIssue = true;
        }
      }
    }

    if (!hasIssue) {
      valid.push(sku);
    }
  }

  return { valid, issues, totalProducts: allProducts.length };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use((req, res, next) => {
    if (req.path.startsWith('/admin')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    next();
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const allProducts = await storage.getAllProducts();
      const baseUrl = "https://viaglobalhealth.com";
      const now = new Date().toISOString().split("T")[0];

      const staticPages = [
        { loc: "/", changefreq: "daily", priority: "1.0", lastmod: now },
        { loc: "/catalog", changefreq: "daily", priority: "0.8", lastmod: now },
        { loc: "/about", changefreq: "monthly", priority: "0.5", lastmod: now },
        { loc: "/contact", changefreq: "monthly", priority: "0.5", lastmod: now },
        { loc: "/privacy-policy", changefreq: "yearly", priority: "0.3", lastmod: now },
        { loc: "/return-policy", changefreq: "yearly", priority: "0.3", lastmod: now },
        { loc: "/track-quote", changefreq: "monthly", priority: "0.4", lastmod: now },
      ];

      const productEntries = allProducts.map((p) => {
        const slug = p.name
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .replace(/-{2,}/g, "-");
        const lastmod = p.scrapedAt
          ? new Date(p.scrapedAt).toISOString().split("T")[0]
          : now;
        return { loc: `/products/${slug}`, changefreq: "weekly", priority: "0.7", lastmod };
      });

      const allEntries = [...staticPages, ...productEntries];

      const supportedLangs = ["en", "fr", "pt", "sw", "es"];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allEntries
  .map(
    (entry) => `  <url>
    <loc>${baseUrl}${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
${supportedLangs.map(lang => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${entry.loc}" />`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${entry.loc}" />
  </url>`
  )
  .join("\n")}
</urlset>`;

      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Failed to generate sitemap");
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkLoginRateLimit(ip)) {
      return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." });
    }
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ error: "Admin password not configured" });
    }
    if (password === adminPassword) {
      recordLoginAttempt(ip, true);
      req.session.isAdmin = true;
      return res.json({ success: true });
    }
    recordLoginAttempt(ip, false);
    return res.status(401).json({ error: "Invalid password" });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/admin/check", (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.isAdmin) });
  });

  app.post("/api/admin/sync-manifests", requireAdmin, async (req, res) => {
    try {
      const manifestPath = join(process.cwd(), "server", "product-manifests.json");
      let oldManifests: any[] = [];
      if (existsSync(manifestPath)) {
        try { oldManifests = JSON.parse(readFileSync(manifestPath, "utf-8")); } catch {}
      }

      await updateProductManifests();

      const newManifests: any[] = JSON.parse(readFileSync(manifestPath, "utf-8"));

      const oldMap = new Map(oldManifests.map((m: any) => [m.sku, m]));
      const changes: any[] = [];
      for (const nm of newManifests) {
        const om = oldMap.get(nm.sku);
        if (!om || JSON.stringify(om) !== JSON.stringify(nm)) {
          changes.push({ sku: nm.sku, name: nm.name, documentsCount: nm.documents.length, certificatesCount: nm.regulatoryCertificates.length });
        }
      }

      res.json({
        success: true,
        totalProducts: newManifests.length,
        changed: changes.length,
        changes
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Manifest sync failed" });
    }
  });

  app.get("/api/admin/validate-products", requireAdmin, async (req, res) => {
    try {
      const report = await validateProductFiles();
      res.json({ success: true, ...report });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Validation failed" });
    }
  });

  // Get all products (with optional search) - with caching
  app.get("/api/products", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      
      // Use server-side cache for non-search requests
      if (!search && isCacheValid(cache.products)) {
        return res.json(cache.products.data);
      }
      
      const products = await storage.getAllProducts(search);
      
      // Cache non-search results
      if (!search) {
        cache.products = { data: products, timestamp: Date.now() };
      }
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/by-slug/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const allProducts = await storage.getAllProducts();
      const product = allProducts.find(p => {
        const productSlug = p.name
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-{2,}/g, '-');
        return productSlug === slug;
      });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product by slug:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Get single product by ID - with cache headers
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Scrape products from ViaGlobal and save to database
  app.post("/api/scrape", requireAdmin, async (req, res) => {
    try {
      console.log("[API] Starting scrape request");
      const { urls } = req.body;
      const scrapedProducts = await scrapeViaGlobalHealth(urls);
      console.log(`[API] Scraped ${scrapedProducts.length} products, saving to database...`);
      
      const existingProducts = await storage.getAllProducts();
      const skuToProduct = new Map(existingProducts.map(p => [p.sku?.trim().toLowerCase(), p]));
      
      const saved: any[] = [];
      for (const product of scrapedProducts) {
        const normalizedSku = product.sku?.trim().toLowerCase();
        const existing = normalizedSku ? skuToProduct.get(normalizedSku) : undefined;
        if (existing) {
          console.log(`[API] Product with SKU ${product.sku} already exists (id: ${existing.id}), updating...`);
          const updated = await storage.updateProduct(existing.id, product);
          saved.push(updated);
        } else {
          const created = await storage.createProduct(product);
          saved.push(created);
        }
      }
      console.log(`[API] Saved ${saved.length} products to database`);
      
      invalidateCache();

      updateProductManifests();
      
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
  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const body = req.body;
      
      // Handle both single product and array of products
      if (Array.isArray(body)) {
        const validated = z.array(insertProductSchema).parse(body);
        const created = await storage.createProducts(validated);
        invalidateCache();
        res.json(created);
      } else {
        const validated = insertProductSchema.parse(body);
        const created = await storage.createProduct(validated);
        invalidateCache();
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

  app.patch("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateProduct(req.params.id, req.body);
      invalidateCache();
      if (req.body.documents || req.body.regulatoryCertificates) {
        updateProductManifests();
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      invalidateCache();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Delete all products (for testing)
  app.delete("/api/products", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAllProducts();
      invalidateCache();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting all products:", error);
      res.status(500).json({ error: "Failed to delete products" });
    }
  });

  // Save quote request to database
  app.post("/api/quote-requests", async (req, res) => {
    try {
      const validated = insertQuoteRequestSchema.parse(req.body);
      const saved = await storage.createQuoteRequest(validated);
      
      console.log(`[Quote Request] New quote request from ${saved.firstName} ${saved.lastName} for ${saved.productName}`);
      console.log(`[Quote Request] Email notification should go to: noah@viaglobalhealth.com`);
      
      res.json({ success: true, quoteRequest: saved });
    } catch (error) {
      console.error("Error saving quote request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid quote request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save quote request" });
    }
  });

  // Get all quote requests (admin)
  app.get("/api/quote-requests", requireAdmin, async (req, res) => {
    try {
      const quoteRequests = await storage.getAllQuoteRequests();
      res.json(quoteRequests);
    } catch (error) {
      console.error("Error fetching quote requests:", error);
      res.status(500).json({ error: "Failed to fetch quote requests" });
    }
  });

  app.get("/api/quote-requests/track", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email address required" });
      }
      const quotes = await storage.getQuoteRequestsByEmail(email.trim());
      const safeQuotes = quotes.map(q => ({
        id: q.id,
        productName: q.productName,
        status: q.status,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      }));
      res.json(safeQuotes);
    } catch (error) {
      console.error("Error tracking quotes by email:", error);
      res.status(500).json({ error: "Failed to look up quotes" });
    }
  });

  // Get single quote request by ID (for tracking)
  app.get("/api/quote-requests/:id", async (req, res) => {
    try {
      const quoteRequest = await storage.getQuoteRequestById(req.params.id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      res.json(quoteRequest);
    } catch (error) {
      console.error("Error fetching quote request:", error);
      res.status(500).json({ error: "Failed to fetch quote request" });
    }
  });

  // Update a quote request (admin)
  app.patch("/api/quote-requests/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getQuoteRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      const allowedFields = [
        "firstName", "lastName", "email", "organizationName",
        "orderQuantity", "shippingCountry", "shippingCity", "shippingAddress",
        "shippingPreference", "importAssistance", "initialIntent", "decisionTimeline",
        "productName", "productSku", "status"
      ];
      const updateData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const updated = await storage.updateQuoteRequest(req.params.id, updateData);

      if (updateData.status && (updateData.status === "closed_won" || updateData.status === "closed_lost")) {
        generateAIReview(req.params.id, updateData.status).catch(err => {
          console.error("[AI Review] Error generating review from edit:", err);
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating quote request:", error);
      res.status(500).json({ error: "Failed to update quote request" });
    }
  });

  app.post("/api/quote-requests/:id/generate-review", requireAdmin, async (req, res) => {
    try {
      const quoteRequest = await storage.getQuoteRequestById(req.params.id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      if (quoteRequest.status !== "closed_won" && quoteRequest.status !== "closed_lost") {
        return res.status(400).json({ error: "Can only generate reviews for closed quote requests" });
      }

      generateAIReview(req.params.id, quoteRequest.status).catch(err => {
        console.error("[AI Review] Error generating review (manual):", err);
      });

      res.json({ message: "AI review generation started" });
    } catch (error) {
      console.error("Error triggering AI review:", error);
      res.status(500).json({ error: "Failed to trigger AI review" });
    }
  });

  app.patch("/api/quote-requests/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["active", "in_progress", "closed_won", "closed_lost"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: " + validStatuses.join(", ") });
      }

      const existing = await storage.getQuoteRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      const updated = await storage.updateQuoteRequest(req.params.id, { status });

      if (status === "closed_won" || status === "closed_lost") {
        generateAIReview(req.params.id, status).catch(err => {
          console.error("[AI Review] Error generating review:", err);
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating quote request status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.get("/api/sales-insights", requireAdmin, async (req, res) => {
    try {
      const insights = await storage.getSalesInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error fetching sales insights:", error);
      res.status(500).json({ error: "Failed to fetch sales insights" });
    }
  });

  app.get("/api/quote-requests/:id/ai-review", requireAdmin, async (req, res) => {
    try {
      const quoteRequest = await storage.getQuoteRequestById(req.params.id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      const insights = await storage.getSalesInsightsByQuoteRequest(req.params.id);
      res.json({ aiReview: quoteRequest.aiReview, insights });
    } catch (error) {
      console.error("Error fetching AI review:", error);
      res.status(500).json({ error: "Failed to fetch AI review" });
    }
  });

  app.get("/api/quote-requests/export/markdown", requireAdmin, async (req, res) => {
    try {
      const allRequests = await storage.getAllQuoteRequests();
      const lines: string[] = [];
      lines.push("# VIA Global Health — Quote Request History");
      lines.push("");
      lines.push(`**Exported:** ${new Date().toISOString().split("T")[0]}`);
      lines.push(`**Total Quotes:** ${allRequests.length}`);
      const won = allRequests.filter(r => r.status === "closed_won").length;
      const lost = allRequests.filter(r => r.status === "closed_lost").length;
      lines.push(`**Won:** ${won} | **Lost:** ${lost} | **Active/In Progress:** ${allRequests.length - won - lost}`);
      lines.push("");
      lines.push("---");
      lines.push("");

      for (let i = 0; i < allRequests.length; i++) {
        const qr = allRequests[i];
        const statusLabel = qr.status === "closed_won" ? "Closed Won" : qr.status === "closed_lost" ? "Closed Lost" : qr.status === "in_progress" ? "In Progress" : "Active";
        const customerName = [qr.firstName, qr.lastName].filter(Boolean).join(" ") || "Unknown";

        lines.push(`## Quote #${i + 1} — ${statusLabel}`);
        lines.push("");
        lines.push("### Customer Details");
        lines.push(`- **Name:** ${customerName}`);
        lines.push(`- **Email:** ${qr.email || "N/A"}`);
        lines.push(`- **Organization:** ${qr.organizationName || "N/A"} (${qr.organizationType || "N/A"})`);
        lines.push(`- **Country:** ${qr.shippingCountry || "N/A"}`);
        lines.push(`- **Product:** ${qr.productName || "General Inquiry"} (SKU: ${qr.productSku || "N/A"})`);
        lines.push(`- **Quantity:** ${qr.orderQuantity || "N/A"}`);
        lines.push(`- **Timeline:** ${qr.decisionTimeline || "N/A"}`);
        lines.push(`- **Shipping Preference:** ${qr.shippingPreference || "N/A"}`);
        lines.push(`- **Import Assistance:** ${qr.importAssistance || "N/A"}`);
        lines.push(`- **Date:** ${qr.createdAt ? new Date(qr.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}`);
        lines.push("");

        lines.push("### Conversation");
        const messages = await storage.getQuoteRequestMessages(qr.id);
        const inlineConversation = Array.isArray(qr.conversation) ? qr.conversation as any[] : [];
        const conversationSource = messages.length > 0 ? messages : inlineConversation;

        if (conversationSource.length === 0) {
          lines.push("*No conversation recorded.*");
        } else {
          for (const msg of conversationSource) {
            const speaker = msg.role === "user" ? "**Customer:**" : "**Amara:**";
            lines.push(`${speaker} ${msg.content}`);
            lines.push("");
          }
        }

        if (qr.aiReview) {
          const review = qr.aiReview as any;
          lines.push("### AI Review");
          if (review.summary) lines.push(`**Summary:** ${review.summary}`);
          if (review.customerSentiment) lines.push(`**Customer Sentiment:** ${review.customerSentiment}`);
          if (review.keyFactors?.length) lines.push(`**Key Factors:** ${review.keyFactors.join(", ")}`);
          if (review.whatWorked?.length) lines.push(`**What Worked:** ${review.whatWorked.join("; ")}`);
          if (review.whatCouldImprove?.length) lines.push(`**What Could Improve:** ${review.whatCouldImprove.join("; ")}`);
          lines.push("");
        }

        if (qr.aiSummary) {
          lines.push("### AI Summary");
          lines.push(qr.aiSummary);
          lines.push("");
        }

        lines.push("---");
        lines.push("");
      }

      const markdown = lines.join("\n");
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="quote-requests-export-${new Date().toISOString().split("T")[0]}.md"`);
      res.send(markdown);
    } catch (error) {
      console.error("Error exporting quote requests:", error);
      res.status(500).json({ error: "Failed to export quote requests" });
    }
  });

  // Delete a quote request (admin) - cascades to messages and invoices
  app.delete("/api/quote-requests/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getQuoteRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      await storage.deleteQuoteRequest(req.params.id);
      res.json({ message: "Quote request deleted" });
    } catch (error) {
      console.error("Error deleting quote request:", error);
      res.status(500).json({ error: "Failed to delete quote request" });
    }
  });

  // Get messages for a quote request
  app.get("/api/quote-requests/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getQuoteRequestMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching quote request messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // ===== PRODUCT PRICING TIERS =====
  
  // Get pricing tiers for a product
  app.get("/api/products/:productId/pricing-tiers", async (req, res) => {
    try {
      const tiers = await storage.getProductPricingTiers(req.params.productId);
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      res.status(500).json({ error: "Failed to fetch pricing tiers" });
    }
  });

  // Create a pricing tier for a product
  app.post("/api/products/:productId/pricing-tiers", requireAdmin, async (req, res) => {
    try {
      const validated = insertProductPricingTierSchema.parse({
        ...req.body,
        productId: req.params.productId
      });
      const tier = await storage.createProductPricingTier(validated);
      res.status(201).json(tier);
    } catch (error) {
      console.error("Error creating pricing tier:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pricing tier data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create pricing tier" });
    }
  });

  // Update a pricing tier
  app.patch("/api/pricing-tiers/:tierId", requireAdmin, async (req, res) => {
    try {
      const updateSchema = insertProductPricingTierSchema.partial().omit({ productId: true });
      const validated = updateSchema.parse(req.body);
      if (Object.keys(validated).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const tier = await storage.updateProductPricingTier(req.params.tierId, validated);
      if (!tier) {
        return res.status(404).json({ error: "Pricing tier not found" });
      }
      res.json(tier);
    } catch (error) {
      console.error("Error updating pricing tier:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pricing tier data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update pricing tier" });
    }
  });

  // Delete a single pricing tier
  app.delete("/api/pricing-tiers/:tierId", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProductPricingTier(req.params.tierId);
      res.json({ message: "Pricing tier deleted" });
    } catch (error) {
      console.error("Error deleting pricing tier:", error);
      res.status(500).json({ error: "Failed to delete pricing tier" });
    }
  });

  // Bulk create pricing tiers for a product
  app.post("/api/products/:productId/pricing-tiers/bulk", requireAdmin, async (req, res) => {
    try {
      const { tiers } = req.body;
      if (!Array.isArray(tiers) || tiers.length === 0) {
        return res.status(400).json({ error: "tiers array is required" });
      }
      const validated = tiers.map((t: any) => insertProductPricingTierSchema.parse({
        ...t,
        productId: req.params.productId
      }));
      const created = await storage.createProductPricingTiersBulk(validated);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error bulk creating pricing tiers:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pricing tier data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to bulk create pricing tiers" });
    }
  });

  // Delete all pricing tiers for a product
  app.delete("/api/products/:productId/pricing-tiers", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProductPricingTiers(req.params.productId);
      res.json({ message: "Pricing tiers deleted" });
    } catch (error) {
      console.error("Error deleting pricing tiers:", error);
      res.status(500).json({ error: "Failed to delete pricing tiers" });
    }
  });

  // ===== PRODUCT RESTRICTED COUNTRIES =====

  // Get restricted countries for a product
  app.get("/api/products/:productId/restricted-countries", async (req, res) => {
    try {
      const restrictions = await storage.getProductRestrictedCountries(req.params.productId);
      res.json(restrictions);
    } catch (error) {
      console.error("Error fetching restricted countries:", error);
      res.status(500).json({ error: "Failed to fetch restricted countries" });
    }
  });

  // Create a restricted country for a product
  app.post("/api/products/:productId/restricted-countries", requireAdmin, async (req, res) => {
    try {
      const validated = insertProductRestrictedCountrySchema.parse({
        ...req.body,
        productId: req.params.productId
      });
      const restriction = await storage.createProductRestrictedCountry(validated);
      res.status(201).json(restriction);
    } catch (error) {
      console.error("Error creating restricted country:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid restriction data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create restricted country" });
    }
  });

  // Update a restricted country
  app.patch("/api/restricted-countries/:restrictionId", requireAdmin, async (req, res) => {
    try {
      const updateSchema = insertProductRestrictedCountrySchema.partial().omit({ productId: true });
      const validated = updateSchema.parse(req.body);
      if (Object.keys(validated).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const restriction = await storage.updateProductRestrictedCountry(req.params.restrictionId, validated);
      if (!restriction) {
        return res.status(404).json({ error: "Restricted country not found" });
      }
      res.json(restriction);
    } catch (error) {
      console.error("Error updating restricted country:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid restriction data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update restricted country" });
    }
  });

  // Delete a single restricted country
  app.delete("/api/restricted-countries/:restrictionId", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProductRestrictedCountry(req.params.restrictionId);
      res.json({ message: "Restricted country deleted" });
    } catch (error) {
      console.error("Error deleting restricted country:", error);
      res.status(500).json({ error: "Failed to delete restricted country" });
    }
  });

  // Bulk create restricted countries for a product
  app.post("/api/products/:productId/restricted-countries/bulk", requireAdmin, async (req, res) => {
    try {
      const { restrictions } = req.body;
      if (!Array.isArray(restrictions) || restrictions.length === 0) {
        return res.status(400).json({ error: "restrictions array is required" });
      }
      const validated = restrictions.map((r: any) => insertProductRestrictedCountrySchema.parse({
        ...r,
        productId: req.params.productId
      }));
      const created = await storage.createProductRestrictedCountriesBulk(validated);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error bulk creating restricted countries:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid restriction data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to bulk create restricted countries" });
    }
  });

  // Delete all restricted countries for a product
  app.delete("/api/products/:productId/restricted-countries", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProductRestrictedCountries(req.params.productId);
      res.json({ message: "Restricted countries deleted" });
    } catch (error) {
      console.error("Error deleting restricted countries:", error);
      res.status(500).json({ error: "Failed to delete restricted countries" });
    }
  });

  // ===== CUSTOMER SEGMENTS =====

  // Get all customer segments
  app.get("/api/customer-segments", async (req, res) => {
    try {
      const segments = await storage.getAllCustomerSegments();
      res.json(segments);
    } catch (error) {
      console.error("Error fetching customer segments:", error);
      res.status(500).json({ error: "Failed to fetch customer segments" });
    }
  });

  // Create a customer segment
  app.post("/api/customer-segments", requireAdmin, async (req, res) => {
    try {
      const validated = insertCustomerSegmentSchema.parse(req.body);
      const segment = await storage.createCustomerSegment(validated);
      res.status(201).json(segment);
    } catch (error) {
      console.error("Error creating customer segment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid segment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create customer segment" });
    }
  });

  // Update a customer segment
  app.patch("/api/customer-segments/:id", requireAdmin, async (req, res) => {
    try {
      const updateSchema = insertCustomerSegmentSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      const segment = await storage.updateCustomerSegment(req.params.id, validatedData);
      res.json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating customer segment:", error);
      res.status(500).json({ error: "Failed to update customer segment" });
    }
  });

  // Delete a customer segment
  app.delete("/api/customer-segments/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCustomerSegment(req.params.id);
      res.json({ message: "Customer segment deleted" });
    } catch (error) {
      console.error("Error deleting customer segment:", error);
      res.status(500).json({ error: "Failed to delete customer segment" });
    }
  });

  // ===== PROFORMA INVOICES =====
  
  // Generate reference number for new invoices
  function generateReferenceNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    return `${dateStr}-${randomPart}`;
  }

  // Get all proforma invoices
  app.get("/api/proforma-invoices", requireAdmin, async (req, res) => {
    try {
      const invoices = await storage.getAllProformaInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching proforma invoices:", error);
      res.status(500).json({ error: "Failed to fetch proforma invoices" });
    }
  });

  // Get a single proforma invoice by ID
  app.get("/api/proforma-invoices/:id", requireAdmin, async (req, res) => {
    try {
      const invoice = await storage.getProformaInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching proforma invoice:", error);
      res.status(500).json({ error: "Failed to fetch proforma invoice" });
    }
  });

  // Create a proforma invoice from quote request data
  app.post("/api/proforma-invoices", requireAdmin, async (req, res) => {
    try {
      const referenceNumber = generateReferenceNumber();
      const invoiceData = {
        ...req.body,
        referenceNumber,
        quoteExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };
      const validated = insertProformaInvoiceSchema.parse(invoiceData);
      const invoice = await storage.createProformaInvoice(validated);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating proforma invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create proforma invoice" });
    }
  });

  // Update a proforma invoice
  app.patch("/api/proforma-invoices/:id", requireAdmin, async (req, res) => {
    try {
      const updateSchema = insertProformaInvoiceSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      const invoice = await storage.updateProformaInvoice(req.params.id, validatedData);
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating proforma invoice:", error);
      res.status(500).json({ error: "Failed to update proforma invoice" });
    }
  });

  // Line item validation schema
  const lineItemSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number().int().positive(),
    unitPriceCents: z.number().int().min(0),
    totalCents: z.number().int().min(0),
  });

  // Generate invoice from a quote request
  app.post("/api/quote-requests/:id/generate-invoice", requireAdmin, async (req, res) => {
    try {
      const quoteRequest = await storage.getQuoteRequestById(req.params.id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      const quantity = parseInt(quoteRequest.orderQuantity || "1") || 1;

      // Get product details and calculate pricing with adjustments
      let basePriceCents = 0;
      let volumePriceCents = 0;
      let productDescription = "";
      let appliedTierName = "";

      if (quoteRequest.productId) {
        const product = await storage.getProductById(quoteRequest.productId);
        if (product) {
          basePriceCents = product.price;
          volumePriceCents = product.price;
          productDescription = product.description?.substring(0, 200) || "";
        }
        
        const pricingTiers = await storage.getProductPricingTiers(quoteRequest.productId);
        if (pricingTiers.length > 0) {
          const applicableTier = pricingTiers.find(t => 
            quantity >= t.minQuantity && (t.maxQuantity === null || quantity <= t.maxQuantity)
          );
          if (applicableTier) {
            volumePriceCents = applicableTier.unitPriceCents;
            appliedTierName = applicableTier.tierName || `${applicableTier.minQuantity}-${applicableTier.maxQuantity || '+'} units`;
            console.log(`[Invoice] Volume pricing applied: ${appliedTierName} → $${(volumePriceCents / 100).toFixed(2)}/unit (base was $${(basePriceCents / 100).toFixed(2)})`);
          }
        }
      }

      // Apply segment pricing multiplier
      let pricingMultiplier = 1.0;
      if (quoteRequest.organizationType) {
        const orgTypeLower = quoteRequest.organizationType.toLowerCase().trim();
        const orgTypeNormalized = orgTypeLower.replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '');

        const allSegments = await storage.getAllCustomerSegments();

        // Priority 1: exact match on segment name
        let matchedSegment = allSegments.find(s => s.name === orgTypeNormalized || s.name === orgTypeLower);

        // Priority 2: exact match on display name (case-insensitive)
        if (!matchedSegment) {
          matchedSegment = allSegments.find(s => s.displayName.toLowerCase() === orgTypeLower);
        }

        // Priority 3: segment name starts with the org type (e.g. "ngo" matches "ngo")
        if (!matchedSegment) {
          matchedSegment = allSegments.find(s => s.name.startsWith(orgTypeNormalized));
        }

        if (matchedSegment) {
          pricingMultiplier = matchedSegment.pricingMultiplier;
          console.log(`[Invoice] Segment pricing applied: "${matchedSegment.displayName}" (${matchedSegment.name}) → multiplier ${pricingMultiplier}`);
        } else {
          console.log(`[Invoice] No segment match found for org type: "${quoteRequest.organizationType}" (normalized: "${orgTypeNormalized}")`);
        }
      }

      const adjustedUnitPriceCents = Math.round(volumePriceCents * pricingMultiplier);
      const lineItemTotal = adjustedUnitPriceCents * quantity;

      console.log(`[Invoice] Final pricing: $${(volumePriceCents / 100).toFixed(2)} × ${pricingMultiplier} = $${(adjustedUnitPriceCents / 100).toFixed(2)}/unit × ${quantity} = $${(lineItemTotal / 100).toFixed(2)}`);

      // Check for existing invoice - update pricing if it has changed
      const existingInvoices = await storage.getProformaInvoicesByQuoteRequest(req.params.id);
      if (existingInvoices.length > 0) {
        const existing = existingInvoices[0];
        const existingLineItems = existing.lineItems as any[];
        const existingUnitPrice = existingLineItems?.[0]?.unitPriceCents || 0;
        const existingQty = existingLineItems?.[0]?.quantity || 0;

        if (existingUnitPrice !== adjustedUnitPriceCents || existingQty !== quantity) {
          console.log(`[Invoice] Updating existing invoice: price $${(existingUnitPrice / 100).toFixed(2)} → $${(adjustedUnitPriceCents / 100).toFixed(2)}/unit, qty ${existingQty} → ${quantity}`);
          const shippingCents = existing.shippingCents || 0;
          const bankFeeCents = existing.bankFeeCents || 3000;
          const newSubtotal = lineItemTotal + shippingCents + bankFeeCents;
          
          const updatedInvoice = await storage.updateProformaInvoice(existing.id, {
            lineItems: [{
              name: existingLineItems[0]?.name || quoteRequest.productName,
              description: existingLineItems[0]?.description || productDescription,
              quantity,
              unitPriceCents: adjustedUnitPriceCents,
              totalCents: lineItemTotal
            }],
            subtotalCents: newSubtotal,
            totalCents: newSubtotal,
          });
          return res.json(updatedInvoice);
        }
        return res.json(existing);
      }

      const AFRICAN_REGIONS: Record<string, string[]> = {
        "East Africa": ["kenya", "uganda", "tanzania", "rwanda", "burundi", "ethiopia", "eritrea", "djibouti", "somalia", "south sudan", "sudan", "seychelles", "comoros", "mauritius", "madagascar"],
        "West Africa": ["nigeria", "ghana", "senegal", "ivory coast", "côte d'ivoire", "cote d'ivoire", "mali", "burkina faso", "niger", "guinea", "guinea-bissau", "sierra leone", "liberia", "togo", "benin", "gambia", "cape verde", "cabo verde", "mauritania"],
        "Southern Africa": ["south africa", "mozambique", "zimbabwe", "zambia", "malawi", "botswana", "namibia", "lesotho", "eswatini", "swaziland", "angola"],
        "Central Africa": ["democratic republic of the congo", "drc", "congo", "republic of the congo", "cameroon", "central african republic", "chad", "gabon", "equatorial guinea", "são tomé and príncipe", "sao tome and principe"],
        "North Africa": ["egypt", "libya", "tunisia", "algeria", "morocco"],
      };

      const getAfricanRegion = (country: string): string | null => {
        const countryLower = country.toLowerCase().trim();
        for (const [region, countries] of Object.entries(AFRICAN_REGIONS)) {
          if (countries.includes(countryLower)) return region;
        }
        return null;
      };

      const getRegionCountries = (region: string): string[] => {
        return AFRICAN_REGIONS[region] || [];
      };

      const COST_PER_KG_BY_ORIGIN: Record<string, number> = {
        'china': 10.65,
        'india': 19.29,
        'usa': 50.42,
        'vietnam': 36.14,
        'south africa': 25.00,
      };
      const DEFAULT_COST_PER_KG = 25.00;

      let shippingCents = 0;
      if (quoteRequest.productName && quoteRequest.shippingCountry) {
        try {
          const logisticsResults = await storage.getLogisticsForProduct(quoteRequest.productName);
          const destLower = quoteRequest.shippingCountry.toLowerCase().trim();
          const exactMatch = logisticsResults.find(
            (l) => l.destinationCountry.toLowerCase().trim() === destLower
          );
          if (exactMatch) {
            const shippingPerUnit = exactMatch.avgShippingPerUnit * 1.15;
            shippingCents = Math.round(shippingPerUnit * quantity * 100);
            console.log(`[Invoice] Shipping estimate: $${(shippingPerUnit).toFixed(2)}/unit × ${quantity} = $${(shippingCents / 100).toFixed(2)} (exact match: ${exactMatch.destinationCountry})`);
          } else if (logisticsResults.length > 0) {
            const region = getAfricanRegion(quoteRequest.shippingCountry);
            let regionalMatches: typeof logisticsResults = [];
            if (region) {
              const regionCountries = getRegionCountries(region);
              regionalMatches = logisticsResults.filter(
                (l) => regionCountries.includes(l.destinationCountry.toLowerCase().trim())
              );
            }
            if (regionalMatches.length > 0) {
              const avgRegional = regionalMatches.reduce((sum, l) => sum + l.avgShippingPerUnit, 0) / regionalMatches.length;
              const shippingPerUnit = avgRegional * 1.15;
              shippingCents = Math.round(shippingPerUnit * quantity * 100);
              console.log(`[Invoice] Shipping estimate: $${(shippingPerUnit).toFixed(2)}/unit × ${quantity} = $${(shippingCents / 100).toFixed(2)} (${region} avg across ${regionalMatches.length} routes)`);
            } else {
              const avgAll = logisticsResults.reduce((sum, l) => sum + l.avgShippingPerUnit, 0) / logisticsResults.length;
              const shippingPerUnit = avgAll * 1.15;
              shippingCents = Math.round(shippingPerUnit * quantity * 100);
              console.log(`[Invoice] Shipping estimate: $${(shippingPerUnit).toFixed(2)}/unit × ${quantity} = $${(shippingCents / 100).toFixed(2)} (all-routes avg across ${logisticsResults.length} routes, no region match)`);
            }
          } else {
            let product = quoteRequest.productId ? await storage.getProductById(quoteRequest.productId) : undefined;
            if (!product) {
              const allProducts = await storage.getAllProducts();
              product = allProducts.find(p => p.name.toLowerCase().includes(quoteRequest.productName!.toLowerCase()) || quoteRequest.productName!.toLowerCase().includes(p.name.toLowerCase()));
            }
            if (product?.shippingLengthCm && product.shippingLengthCm > 0 && product?.shippingWidthCm && product.shippingWidthCm > 0 && product?.shippingDepthCm && product.shippingDepthCm > 0) {
              const volumetricKg = (product.shippingLengthCm * product.shippingWidthCm * product.shippingDepthCm) / 5000;
              const actualKg = product.shippingWeightKg || 0;
              const chargeableKg = Math.max(volumetricKg, actualKg);
              const originKey = (product.pickupCountry || '').toLowerCase().trim();
              const costPerKg = COST_PER_KG_BY_ORIGIN[originKey] || DEFAULT_COST_PER_KG;
              const shippingPerUnit = chargeableKg * costPerKg * 1.15;
              shippingCents = Math.round(shippingPerUnit * quantity * 100);
              console.log(`[Invoice] Shipping estimate (volumetric fallback): ${chargeableKg.toFixed(1)}kg × $${costPerKg.toFixed(2)}/kg × 1.15 = $${(shippingPerUnit).toFixed(2)}/unit × ${quantity} = $${(shippingCents / 100).toFixed(2)} (origin: ${product.pickupCountry})`);
            } else {
              console.log(`[Invoice] No logistics data or dimensions for product "${quoteRequest.productName}" — shipping set to $0`);
            }
          }
        } catch (err) {
          console.error("[Invoice] Error looking up shipping data:", err);
        }
      }

      const bankFeeCents = 3000;
      const subtotalCents = lineItemTotal + shippingCents + bankFeeCents;
      const totalCents = subtotalCents;

      const referenceNumber = generateReferenceNumber();
      const customerName = [quoteRequest.firstName, quoteRequest.lastName].filter(Boolean).join(' ') || 'Customer';

      const invoiceData = {
        referenceNumber,
        quoteRequestId: quoteRequest.id,
        customerName,
        customerEmail: quoteRequest.email,
        customerOrganization: quoteRequest.organizationName,
        deliveryAddress: quoteRequest.shippingAddress,
        deliveryCountry: quoteRequest.shippingCountry,
        deliveryCity: quoteRequest.shippingCity,
        shippingMethod: quoteRequest.shippingPreference,
        lineItems: [{
          name: quoteRequest.productName,
          description: productDescription,
          quantity,
          unitPriceCents: adjustedUnitPriceCents,
          totalCents: lineItemTotal
        }],
        subtotalCents,
        shippingCents,
        bankFeeCents,
        totalCents,
        currency: "USD",
        quoteExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        comments: `Delivery to:\n${quoteRequest.shippingCity || ''}\n${quoteRequest.shippingCountry || ''}\n\nShipping: ${quoteRequest.shippingPreference || 'TBD'}`,
        createdByName: "VIA Global Health",
        createdByEmail: "quotes@viaglobalhealth.com",
      };

      const validated = insertProformaInvoiceSchema.parse(invoiceData);
      const invoice = await storage.createProformaInvoice(validated);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error generating proforma invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to generate proforma invoice" });
    }
  });

  // HTML escape helper
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Email validation schema
  const emailSchema = z.string().email();

  // Send invoice email
  app.post("/api/proforma-invoices/:id/send-email", requireAdmin, async (req, res) => {
    try {
      const invoice = await storage.getProformaInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const recipientEmail = req.body.recipientEmail || "noah@viaglobalhealth.com";
      try {
        emailSchema.parse(recipientEmail);
      } catch {
        return res.status(400).json({ error: "Invalid email address" });
      }

      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpUser || !smtpPass) {
        return res.status(500).json({ error: "Email credentials not configured. Please set SMTP_USER and SMTP_PASS." });
      }

      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      
      const lineItems = invoice.lineItems as any[];
      const lineItemsHtml = lineItems.map(item => 
        `<tr><td>${escapeHtml(item.name || '')}</td><td>${item.quantity}</td><td>$${(item.unitPriceCents / 100).toFixed(2)}</td><td>$${(item.totalCents / 100).toFixed(2)}</td></tr>`
      ).join('');

      const safeCustomerName = escapeHtml(invoice.customerName || '');
      const safeOrganization = escapeHtml(invoice.customerOrganization || 'N/A');
      const safeEmail = escapeHtml(invoice.customerEmail || 'N/A');
      const safeCity = escapeHtml(invoice.deliveryCity || '');
      const safeCountry = escapeHtml(invoice.deliveryCountry || '');
      const safeComments = invoice.comments ? escapeHtml(invoice.comments) : '';

      const emailResult = await transporter.sendMail({
        from: smtpUser,
        to: recipientEmail,
        subject: `Proforma Invoice ${invoice.referenceNumber} - ${safeCustomerName}`,
        html: `
          <h1>Proforma Invoice</h1>
          <p><strong>Reference:</strong> ${invoice.referenceNumber}</p>
          <p><strong>Customer:</strong> ${safeCustomerName} (${safeOrganization})</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Delivery:</strong> ${safeCity} ${safeCountry}</p>
          <h2>Products</h2>
          <table border="1" cellpadding="8" style="border-collapse: collapse;">
            <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            ${lineItemsHtml}
            <tr><td>Shipping</td><td>1</td><td>$${((invoice.shippingCents || 0) / 100).toFixed(2)}</td><td>$${((invoice.shippingCents || 0) / 100).toFixed(2)}</td></tr>
            <tr><td>Bank Fee</td><td>1</td><td>$${((invoice.bankFeeCents || 0) / 100).toFixed(2)}</td><td>$${((invoice.bankFeeCents || 0) / 100).toFixed(2)}</td></tr>
            <tr><td colspan="3"><strong>Total</strong></td><td><strong>$${(invoice.totalCents / 100).toFixed(2)}</strong></td></tr>
          </table>
          ${safeComments ? `<h3>Comments</h3><p>${safeComments}</p>` : ''}
          <p style="margin-top: 20px; color: #666;">This invoice was generated from a quote request. Please review and finalize before sending to the customer.</p>
        `,
      });

      console.log("Email sent via Microsoft 365:", emailResult.messageId);

      await storage.updateProformaInvoice(invoice.id, {
        emailSentAt: new Date(),
        emailSentTo: recipientEmail,
        status: "sent",
      });

      res.json({ success: true, message: "Email sent successfully", recipientEmail, messageId: emailResult.messageId });
    } catch (error: any) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ error: `Failed to send email: ${error.message || 'Unknown error'}` });
    }
  });

  // ===== Logistics Lookup =====
  app.get("/api/logistics", requireAdmin, async (_req, res) => {
    try {
      const data = await storage.getLogisticsLookup();
      res.json(data);
    } catch (error) {
      console.error("Error fetching logistics data:", error);
      res.status(500).json({ error: "Failed to fetch logistics data" });
    }
  });

  app.post("/api/logistics/import", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "No data provided" });
      }
      const { insertLogisticsLookupSchema } = await import("@shared/schema");
      const validated = [];
      const errors = [];
      for (let i = 0; i < data.length; i++) {
        const result = insertLogisticsLookupSchema.safeParse(data[i]);
        if (result.success) {
          validated.push(result.data);
        } else {
          errors.push({ row: i + 1, issues: result.error.issues.map(e => e.message) });
        }
      }
      if (errors.length > 0 && validated.length === 0) {
        return res.status(400).json({ error: "All rows failed validation", errors });
      }
      await storage.upsertLogisticsData(validated);
      res.json({ message: `Imported ${validated.length} logistics records`, errors: errors.length > 0 ? errors : undefined });
    } catch (error) {
      console.error("Error importing logistics data:", error);
      res.status(500).json({ error: "Failed to import logistics data" });
    }
  });

  // ===== Shipping Estimator =====
  app.post("/api/shipping/estimate", requireAdmin, async (req, res) => {
    try {
      const { productId, destination, method, incoterm, quoteRequestId } = req.body;
      const validMethods = ["Air", "Sea", "Courier", "Road"];
      const validIncoterms = ["DAP", "CIP", "CIF", "Ex-Factory", "DDP", "FOB"];
      const parsedQty = parseInt(req.body.qty);
      if (!productId || typeof productId !== "string") {
        return res.status(400).json({ error: "productId is required and must be a string" });
      }
      if (!destination || typeof destination !== "string" || destination.trim().length === 0) {
        return res.status(400).json({ error: "destination is required and must be a non-empty string" });
      }
      if (isNaN(parsedQty) || parsedQty < 1) {
        return res.status(400).json({ error: "qty is required and must be a positive integer" });
      }
      const safeMethod = validMethods.includes(method) ? method : "Air";
      const safeIncoterm = validIncoterms.includes(incoterm) ? incoterm : "DAP";
      const { generateShippingEstimate } = await import("./shipping");
      const estimate = await generateShippingEstimate(productId, destination.trim(), parsedQty, safeMethod, safeIncoterm);

      if (quoteRequestId) {
        await storage.updateQuoteRequest(quoteRequestId, { shippingEstimate: estimate } as any);
      }

      res.json(estimate);
    } catch (error: any) {
      console.error("Error generating shipping estimate:", error);
      res.status(500).json({ error: error.message || "Failed to generate shipping estimate" });
    }
  });

  app.get("/api/shipping/deals", requireAdmin, async (_req, res) => {
    try {
      const deals = await storage.getAllShippingDeals();
      res.json(deals);
    } catch (error) {
      console.error("Error fetching shipping deals:", error);
      res.status(500).json({ error: "Failed to fetch shipping deals" });
    }
  });

  app.get("/api/shipping/market-data", requireAdmin, async (_req, res) => {
    try {
      const { getMarketDataSummary } = await import("./shipping");
      const data = await getMarketDataSummary();
      res.json(data);
    } catch (error) {
      console.error("Error fetching market data:", error);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  app.post("/api/shipping/refresh-market-data", requireAdmin, async (req, res) => {
    try {
      const { type } = req.body;
      const { fetchFredFuelPrice, fetchDhlIntelligence } = await import("./shipping");

      if (type === "fuel" || !type) {
        await storage.setMarketDataCache("fred_fuel", {}, 0);
        await fetchFredFuelPrice();
      }
      if (type === "dhl" || !type) {
        await storage.setMarketDataCache("dhl_intel", {}, 0);
        await fetchDhlIntelligence();
      }

      const { getMarketDataSummary } = await import("./shipping");
      const data = await getMarketDataSummary();
      res.json({ message: "Market data refreshed", ...data });
    } catch (error) {
      console.error("Error refreshing market data:", error);
      res.status(500).json({ error: "Failed to refresh market data" });
    }
  });

  // ===== HubSpot CRM Integration =====
  app.post("/api/shipping/sync-hubspot", requireAdmin, async (_req, res) => {
    try {
      const { syncHubspotDeals } = await import("./hubspot-sync");
      const result = await syncHubspotDeals();
      res.json(result);
    } catch (error) {
      console.error("Error syncing HubSpot deals:", error);
      res.status(500).json({ error: "Failed to sync HubSpot deals" });
    }
  });

  app.get("/api/crm/customer-history", requireAdmin, async (req, res) => {
    try {
      const email = req.query.email as string | undefined;
      const org = req.query.org as string | undefined;
      if (!email && !org) {
        return res.status(400).json({ error: "Email or org parameter required" });
      }
      const { getCachedDealHistory } = await import("./hubspot-sync");
      const history = await getCachedDealHistory(email, org);
      res.json(history);
    } catch (error) {
      console.error("Error fetching CRM history:", error);
      res.status(500).json({ error: "Failed to fetch CRM history" });
    }
  });

  // ===== Exchange Rates (public, cached) =====
  app.get("/api/exchange-rates", async (_req, res) => {
    try {
      const cached = await storage.getMarketDataCache("exchange_rates");
      if (cached && cached.expiresAt > new Date()) {
        return res.json(cached.data);
      }

      const fallbackRates: Record<string, number> = {
        MXN: 17.15, COP: 3950, PEN: 3.72, GTQ: 7.75, HNL: 24.8,
        BOB: 6.91, DOP: 57.5, PYG: 7350, CLP: 935, BRL: 4.97,
        ARS: 880, CRC: 520, HTG: 132, JMD: 155, TTD: 6.78,
        NIO: 36.7, KES: 153, NGN: 1550, GHS: 15.5, TZS: 2670,
        UGX: 3820, ETB: 56.5, RWF: 1280, MZN: 63.8, ZAR: 18.5,
        XOF: 605, XAF: 605, ZMW: 27.5, MWK: 1720, MGA: 4550,
        CDF: 2750, INR: 83.5, BDT: 110, NPR: 133.5, ZWL: 6400,
      };

      try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        if (response.ok) {
          const data = await response.json();
          if (data.rates) {
            const rates: Record<string, number> = {};
            for (const code of Object.keys(fallbackRates)) {
              rates[code] = data.rates[code] || fallbackRates[code];
            }
            await storage.setMarketDataCache("exchange_rates", rates, 1);
            return res.json(rates);
          }
        }
      } catch (apiErr) {
        console.error("[exchange-rates] API fetch failed, using fallback:", apiErr);
      }

      await storage.setMarketDataCache("exchange_rates", fallbackRates, 1);
      res.json(fallbackRates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  // ===== Training Transcripts =====
  app.get("/api/training-transcripts", requireAdmin, async (_req, res) => {
    try {
      const transcripts = await storage.getAllTrainingTranscripts();
      res.json(transcripts);
    } catch (error) {
      console.error("Error fetching training transcripts:", error);
      res.status(500).json({ error: "Failed to fetch training transcripts" });
    }
  });

  app.get("/api/training-transcripts/:id", requireAdmin, async (req, res) => {
    try {
      const transcript = await storage.getTrainingTranscriptById(req.params.id);
      if (!transcript) return res.status(404).json({ error: "Transcript not found" });
      res.json(transcript);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  });

  app.post("/api/training-transcripts", requireAdmin, async (req, res) => {
    try {
      const validated = insertTrainingTranscriptSchema.parse(req.body);
      const transcript = await storage.createTrainingTranscript(validated);
      res.json(transcript);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create transcript" });
    }
  });

  const updateTranscriptSchema = z.object({
    title: z.string().max(200).optional(),
    annotations: z.string().max(5000).optional(),
  });

  app.patch("/api/training-transcripts/:id", requireAdmin, async (req, res) => {
    try {
      const transcript = await storage.getTrainingTranscriptById(req.params.id);
      if (!transcript) return res.status(404).json({ error: "Transcript not found" });
      const validated = updateTranscriptSchema.parse(req.body);
      const updated = await storage.updateTrainingTranscript(req.params.id, validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update transcript" });
    }
  });

  app.delete("/api/training-transcripts/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteTrainingTranscript(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transcript" });
    }
  });

  app.post("/api/training-transcripts/:id/process", requireAdmin, async (req, res) => {
    try {
      const transcript = await storage.getTrainingTranscriptById(req.params.id);
      if (!transcript) return res.status(404).json({ error: "Transcript not found" });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an analyst for VIA Global Health, a medical equipment supplier. Analyze the following conversation transcript and extract key insights. Return a JSON object with these fields:
- buyerType: The type of buyer (distributor, hospital/clinic, NGO, government, pharmacy, other)
- country: The country or region discussed
- productsDiscussed: Comma-separated list of products mentioned
- objections: Any objections or concerns raised by the customer
- outcome: One of: "sale", "no_sale", "pending", "referred"
- keyPatterns: Array of strings describing notable patterns (e.g. "price sensitivity", "bulk ordering", "regulatory concerns")
- suggestedResponses: Array of strings with effective responses used or that should be used
- lessonsLearned: A brief summary of what can be learned from this conversation`
          },
          {
            role: "user",
            content: `Transcript:\n${transcript.rawTranscript}\n\n${transcript.annotations ? `Admin annotations:\n${transcript.annotations}` : ''}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const insights = JSON.parse(response.choices[0].message.content || "{}");
      
      const updated = await storage.updateTrainingTranscript(req.params.id, {
        buyerType: insights.buyerType || null,
        country: insights.country || null,
        productsDiscussed: insights.productsDiscussed || null,
        objections: insights.objections || null,
        outcome: insights.outcome || null,
        aiExtractedInsights: insights,
        isProcessed: true,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error processing transcript:", error);
      res.status(500).json({ error: "Failed to process transcript with AI" });
    }
  });

  // Start a new AI-powered quote request session
  app.post("/api/quote-requests/start", async (req, res) => {
    try {
      const { productId, productName, productSku, customerProfile, language } = req.body;

      const lang = language || "en";

      // Pre-populate from returning customer profile if available
      const initialData: Record<string, unknown> = {
        conversation: [],
        status: "active"
      };
      if (productId) initialData.productId = productId;
      if (productName) initialData.productName = productName;
      if (productSku) initialData.productSku = productSku;

      if (customerProfile) {
        if (customerProfile.firstName) initialData.firstName = customerProfile.firstName;
        if (customerProfile.lastName) initialData.lastName = customerProfile.lastName;
        if (customerProfile.email) initialData.email = customerProfile.email;
        if (customerProfile.organizationType) initialData.organizationType = customerProfile.organizationType;
        if (customerProfile.organizationName) initialData.organizationName = customerProfile.organizationName;
        if (customerProfile.shippingCountry) initialData.shippingCountry = customerProfile.shippingCountry;
        if (customerProfile.importCapability) initialData.importAssistance = customerProfile.importCapability;
      }

      // Create initial quote request
      const quoteRequest = await storage.createQuoteRequest(initialData as any);

      let defaultMultiplier = 1.25;
      let bestSegmentMultiplier = 1.0;
      try {
        const defaultSegment = await storage.getCustomerSegmentByName("default_segment");
        if (defaultSegment) {
          defaultMultiplier = Number(defaultSegment.pricingMultiplier) || 1.25;
        }
        const allSegments = await storage.getAllCustomerSegments();
        const eligibleMultipliers = allSegments
          .filter(s => s.isEligibleForQuotes)
          .map(s => Number(s.pricingMultiplier))
          .filter(m => m > 0);
        if (eligibleMultipliers.length > 0) {
          bestSegmentMultiplier = Math.min(...eligibleMultipliers);
        }
      } catch (e) {
        console.error("Error fetching segments:", e);
      }

      let priceText = "";
      let lowestTierPrice = "";
      if (productId) {
        try {
          const pricingTiers = await storage.getProductPricingTiers(productId);
          if (pricingTiers.length > 0) {
            const sortedTiers = [...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity);
            const baseTier = sortedTiers[0];
            const price = ((baseTier.unitPriceCents * defaultMultiplier) / 100).toFixed(2);
            const maxQtyLabel = baseTier.maxQuantity ? `${baseTier.minQuantity}-${baseTier.maxQuantity} units` : "per unit";
            priceText = `$${price} ${maxQtyLabel}`;
            const minUnitPriceCents = Math.min(...pricingTiers.map(t => t.unitPriceCents));
            lowestTierPrice = `$${((minUnitPriceCents * bestSegmentMultiplier) / 100).toFixed(2)}`;
          }
        } catch (e) {
          console.error("Error fetching pricing for greeting:", e);
        }
      }

      // Lane A Express greeting — leads with price and asks for quantity + form
      let greeting: string;
      const greetings: Record<string, { returning: (name: string, product: string, price: string) => string; new: (product: string, price: string) => string; returningNoPrice: (name: string, product: string) => string; newNoPrice: (product: string) => string }> = {
        en: {
          returning: (name, product, price) => `Welcome back, ${name}! I'm ready to put together your quote for the ${product}. Let me pull up the latest pricing and shipping rates for you.`,
          new: (product, price) => `Hi! I'm Amara from VIA Global Health. I'm ready to help you with a quote for the ${product}. Let's get started.`,
          returningNoPrice: (name, product) => `Welcome back, ${name}! Great to see you again. I'm ready to help with your ${product} quote.`,
          newNoPrice: (product) => `Hi! I'm Amara from VIA Global Health. The ${product} is trusted by healthcare providers across 40+ countries. Let's get your quote started.`
        },
        fr: {
          returning: (name, product, price) => `Bienvenue à nouveau, ${name} ! Je suis prête à préparer votre devis pour le ${product}. Je vais chercher les derniers tarifs et frais d'expédition.`,
          new: (product, price) => `Bonjour ! Je suis Amara de VIA Global Health. Je suis prête à vous aider avec un devis pour le ${product}. Commençons.`,
          returningNoPrice: (name, product) => `Bienvenue à nouveau, ${name} ! Ravie de vous revoir. Je suis prête à vous aider avec votre devis pour le ${product}.`,
          newNoPrice: (product) => `Bonjour ! Je suis Amara de VIA Global Health. Le ${product} est utilisé par des professionnels de santé dans plus de 40 pays. Commençons votre devis.`
        },
        pt: {
          returning: (name, product, price) => `Bem-vindo(a) de volta, ${name}! Estou pronta para preparar seu orçamento do ${product}. Vou buscar os preços e fretes mais recentes.`,
          new: (product, price) => `Olá! Sou Amara da VIA Global Health. Estou pronta para ajudá-lo(a) com um orçamento do ${product}. Vamos começar.`,
          returningNoPrice: (name, product) => `Bem-vindo(a) de volta, ${name}! Estou pronta para ajudar com seu orçamento do ${product}.`,
          newNoPrice: (product) => `Olá! Sou Amara da VIA Global Health. O ${product} é confiado por profissionais de saúde em mais de 40 países. Vamos começar seu orçamento.`
        },
        sw: {
          returning: (name, product, price) => `Karibu tena, ${name}! Niko tayari kuandaa bei yako ya ${product}. Nitakutafutia bei na gharama za usafirishaji za hivi karibuni.`,
          new: (product, price) => `Habari! Mimi ni Amara kutoka VIA Global Health. Niko tayari kukusaidia na bei ya ${product}. Tuanze.`,
          returningNoPrice: (name, product) => `Karibu tena, ${name}! Niko tayari kukusaidia na bei yako ya ${product}.`,
          newNoPrice: (product) => `Habari! Mimi ni Amara kutoka VIA Global Health. ${product} inaaminika na watoa huduma za afya katika nchi zaidi ya 40. Tuanze bei yako.`
        },
        es: {
          returning: (name, product, price) => `¡Bienvenido(a) de nuevo, ${name}! Estoy lista para preparar su cotización del ${product}. Voy a buscar los precios y costos de envío más recientes.`,
          new: (product, price) => `¡Hola! Soy Amara de VIA Global Health. Estoy lista para ayudarle con una cotización del ${product}. Comencemos.`,
          returningNoPrice: (name, product) => `¡Bienvenido(a) de nuevo, ${name}! Estoy lista para ayudarle con su cotización del ${product}.`,
          newNoPrice: (product) => `¡Hola! Soy Amara de VIA Global Health. El ${product} es de confianza para proveedores de salud en más de 40 países. Comencemos su cotización.`
        }
      };
      const langGreetings = greetings[lang] || greetings.en;
      if (!productName) {
        const generalGreetings: Record<string, { returning: (name: string) => string; new: () => string }> = {
          en: {
            returning: (name) => `Welcome back, ${name}! Great to see you again. I'm Amara from VIA Global Health. How can I help you today? Whether you need medical equipment, pharmaceuticals, or want to check pricing on any of our products — I'm here to assist.`,
            new: () => `Hello! I'm Amara from VIA Global Health. We supply medical equipment and pharmaceuticals to healthcare providers, distributors, and NGOs across Africa and Latin America. What are you looking for today? I can help with product information, bulk pricing, or anything else you need.`
          },
          fr: {
            returning: (name) => `Bienvenue à nouveau, ${name} ! Ravie de vous revoir. Je suis Amara de VIA Global Health. Comment puis-je vous aider aujourd'hui ? Que vous ayez besoin d'équipements médicaux, de produits pharmaceutiques ou de vérifier les prix — je suis là pour vous aider.`,
            new: () => `Bonjour ! Je suis Amara de VIA Global Health. Nous fournissons des équipements médicaux et des produits pharmaceutiques aux prestataires de soins de santé, distributeurs et ONG à travers l'Afrique et l'Amérique latine. Que recherchez-vous aujourd'hui ?`
          },
          pt: {
            returning: (name) => `Bem-vindo(a) de volta, ${name}! Sou Amara da VIA Global Health. Como posso ajudá-lo(a) hoje? Seja equipamento médico, produtos farmacêuticos ou verificação de preços — estou aqui para ajudar.`,
            new: () => `Olá! Sou Amara da VIA Global Health. Fornecemos equipamentos médicos e produtos farmacêuticos para profissionais de saúde, distribuidores e ONGs em toda a África e América Latina. O que você está procurando hoje?`
          },
          sw: {
            returning: (name) => `Karibu tena, ${name}! Mimi ni Amara kutoka VIA Global Health. Nawezaje kukusaidia leo? Iwe unahitaji vifaa vya matibabu, dawa, au kuangalia bei — niko hapa kukusaidia.`,
            new: () => `Habari! Mimi ni Amara kutoka VIA Global Health. Tunasambaza vifaa vya matibabu na dawa kwa watoa huduma za afya, wasambazaji na mashirika yasiyo ya kiserikali kote barani Afrika na Amerika ya Kusini. Unatafuta nini leo?`
          },
          es: {
            returning: (name) => `¡Bienvenido(a) de nuevo, ${name}! Qué gusto verle otra vez. Soy Amara de VIA Global Health. ¿En qué puedo ayudarle hoy? Ya sea que necesite equipos médicos, productos farmacéuticos o consultar precios de cualquiera de nuestros productos — estoy aquí para asistirle.`,
            new: () => `¡Hola! Soy Amara de VIA Global Health. Suministramos equipos médicos y productos farmacéuticos a proveedores de salud, distribuidores y ONGs en África y América Latina. ¿Qué está buscando hoy? Puedo ayudarle con información de productos, precios por volumen o cualquier otra cosa que necesite.`
          }
        };
        const generalLangGreetings = generalGreetings[lang] || generalGreetings.en;
        greeting = customerProfile?.firstName
          ? generalLangGreetings.returning(customerProfile.firstName)
          : generalLangGreetings.new();
      } else if (customerProfile?.firstName && priceText) {
        greeting = langGreetings.returning(customerProfile.firstName, productName, priceText);
      } else if (customerProfile?.firstName) {
        greeting = langGreetings.returningNoPrice(customerProfile.firstName, productName);
      } else if (priceText) {
        greeting = langGreetings.new(productName, priceText);
      } else {
        greeting = langGreetings.newNoPrice(productName);
      }
      
      // Save initial assistant message
      await storage.createQuoteRequestMessage({
        quoteRequestId: quoteRequest.id,
        role: "assistant",
        content: greeting,
        messageType: "greeting"
      });

      // Build pricing tiers array for frontend stepwise flow (apply default multiplier)
      let pricingTiersData: Array<{ minQuantity: number; maxQuantity: number | null; unitPriceCents: number }> = [];
      if (productId) {
        try {
          const tiers = await storage.getProductPricingTiers(productId);
          pricingTiersData = tiers
            .sort((a, b) => a.minQuantity - b.minQuantity)
            .map(t => ({ minQuantity: t.minQuantity, maxQuantity: t.maxQuantity, unitPriceCents: Math.round(t.unitPriceCents * defaultMultiplier) }));
        } catch (e) {
          // Already logged above
        }
      }

      res.json({
        quoteRequestId: quoteRequest.id,
        message: greeting,
        priceText,
        lowestTierPrice,
        pricingTiers: pricingTiersData,
        productName: productName || null
      });
    } catch (error) {
      console.error("Error starting quote request:", error);
      res.status(500).json({ error: "Failed to start quote request" });
    }
  });

  // Handle AI-powered chat messages
  app.post("/api/quote-requests/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const { message, productDetails, language, contactData } = req.body;

      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      // Get existing quote request
      const quoteRequest = await storage.getQuoteRequestById(id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      if (contactData) {
        const contactUpdates: Record<string, any> = {};
        if (contactData.firstName && !quoteRequest.firstName) contactUpdates.firstName = contactData.firstName;
        if (contactData.lastName && !quoteRequest.lastName) contactUpdates.lastName = contactData.lastName;
        if (contactData.email && !quoteRequest.email) contactUpdates.email = contactData.email;
        if (contactData.shippingCountry) contactUpdates.shippingCountry = contactData.shippingCountry;
        if (contactData.orderQuantity) contactUpdates.orderQuantity = String(contactData.orderQuantity);
        if (contactData.organizationType) contactUpdates.organizationType = contactData.organizationType;
        if (Object.keys(contactUpdates).length > 0) {
          await storage.updateQuoteRequest(id, contactUpdates);
        }
      }

      // Save user message
      await storage.createQuoteRequestMessage({
        quoteRequestId: id,
        role: "user",
        content: message,
        messageType: "user_input"
      });

      // Get conversation history
      const messageHistory = await storage.getQuoteRequestMessages(id);

      // Get similar products for recommendations
      let similarProducts: { id: string; name: string; sku: string }[] = [];
      if (productDetails?.category) {
        const products = await storage.getProductsByCategory(
          productDetails.category,
          quoteRequest.productId || undefined
        );
        similarProducts = products.map(p => ({ id: p.id, name: p.name, sku: p.sku }));
      }

      // Get pricing tiers and restricted countries for this product
      let pricingTiers: { minQuantity: number; maxQuantity: number | null; unitPriceCents: number; currency: string; tierName: string | null }[] = [];
      let restrictedCountries: { countryName: string; countryCode: string; restrictionReason: string }[] = [];
      
      if (quoteRequest.productId) {
        const tiers = await storage.getProductPricingTiers(quoteRequest.productId);
        pricingTiers = tiers.map(t => ({
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          unitPriceCents: t.unitPriceCents,
          currency: t.currency,
          tierName: t.tierName
        }));
        
        const restrictions = await storage.getProductRestrictedCountries(quoteRequest.productId);
        restrictedCountries = restrictions.map(r => ({
          countryName: r.countryName,
          countryCode: r.countryCode,
          restrictionReason: r.restrictionReason
        }));
      }

      // Get customer segments for eligibility and pricing rules
      const customerSegments = await storage.getAllCustomerSegments();
      const segmentData = customerSegments.map(s => ({
        name: s.name,
        displayName: s.displayName,
        pricingMultiplier: s.pricingMultiplier,
        isEligibleForQuotes: s.isEligibleForQuotes,
        ineligibilityReason: s.ineligibilityReason
      }));

      // Get processed training transcripts for AI learning
      const trainingData = await storage.getProcessedTrainingTranscripts();

      // Get recent sales insights for feedback loop
      const recentInsights = await storage.getSalesInsights();

      // Get logistics/shipping data for cost estimates - scoped to the product if available
      let relevantLogistics: Awaited<ReturnType<typeof storage.getLogisticsLookup>> = [];
      if (productDetails?.name) {
        relevantLogistics = await storage.getLogisticsForProduct(productDetails.name);
      }
      if (relevantLogistics.length === 0) {
        relevantLogistics = await storage.getLogisticsLookup();
      }

      const existingState = {
        firstName: contactData?.firstName || quoteRequest.firstName,
        lastName: contactData?.lastName || quoteRequest.lastName,
        email: contactData?.email || quoteRequest.email,
        organizationType: contactData?.organizationType || quoteRequest.organizationType,
        organizationName: quoteRequest.organizationName,
        shippingCountry: contactData?.shippingCountry || quoteRequest.shippingCountry,
        importCapability: quoteRequest.importAssistance,
      };
      const customerLanguage = language || "en";

      // Red flag gatekeeper — check email domain and message keywords
      const redFlagResult = checkRedFlags(quoteRequest.email || "", message);
      let systemPrompt: string;

      if (redFlagResult.isRedFlag) {
        systemPrompt = buildPublicModePrompt(productDetails, existingState, customerLanguage, redFlagResult.reason);
      } else {
        systemPrompt = buildSystemPrompt(productDetails, similarProducts, pricingTiers, restrictedCountries, segmentData, trainingData, existingState, customerLanguage, recentInsights, []);
      }

      const currentDest = (contactData?.shippingCountry || quoteRequest.shippingCountry) as string | undefined;
      const hasProduct = quoteRequest.productId;
      const existingEstimate = quoteRequest.shippingEstimate as any;
      const currentQty = parseInt(contactData?.orderQuantity || quoteRequest.orderQuantity || "1") || 1;

      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
        Promise.race([promise, new Promise<null>(resolve => setTimeout(() => resolve(null), ms))]);

      const shippingTask = (async (): Promise<string | null> => {
        const needsRegeneration = hasProduct && currentDest && (
          !existingEstimate ||
          existingEstimate.destination !== currentDest ||
          existingEstimate.qty !== currentQty
        );
        if (needsRegeneration) {
          try {
            const { generateShippingEstimate } = await import("./shipping");
            const estimate = await generateShippingEstimate(hasProduct, currentDest, currentQty, "Air", "DAP");
            await storage.updateQuoteRequest(id, { shippingEstimate: estimate } as any);
            if (estimate.costRange) {
              return `\n\nLIVE SHIPPING ESTIMATE (just generated for this customer):\nProduct: ${estimate.product.name}\nDestination: ${estimate.destination}\nQuantity: ${estimate.qty} units\nMethod: ${estimate.method}\nConfidence: ${estimate.confidence}\nCost Range: $${estimate.costRange.low.toLocaleString()} – $${estimate.costRange.high.toLocaleString()} (midpoint $${estimate.costRange.mid.toLocaleString()})\n${estimate.weightInfo ? `Chargeable Weight: ${estimate.weightInfo.chargeable} kg (${estimate.weightInfo.driverNote})` : ""}\nUse this estimate when discussing shipping costs. Present the midpoint as the estimate and the range as context. Always add: "This is based on current 2025 freight data; our team will confirm the exact rate in your Proforma invoice."`;
            }
          } catch (err) {
            console.error("[shipping] Failed to generate estimate for Amara context:", err);
          }
        } else if (existingEstimate?.costRange) {
          return `\n\nLIVE SHIPPING ESTIMATE (previously generated for this customer):\nProduct: ${existingEstimate.product?.name || quoteRequest.productName}\nDestination: ${existingEstimate.destination}\nQuantity: ${existingEstimate.qty} units\nMethod: ${existingEstimate.method}\nConfidence: ${existingEstimate.confidence}\nCost Range: $${existingEstimate.costRange.low.toLocaleString()} – $${existingEstimate.costRange.high.toLocaleString()} (midpoint $${existingEstimate.costRange.mid.toLocaleString()})\n${existingEstimate.weightInfo ? `Chargeable Weight: ${existingEstimate.weightInfo.chargeable} kg (${existingEstimate.weightInfo.driverNote})` : ""}\nUse this estimate when discussing shipping costs. Present the midpoint as the estimate and the range as context. Always add: "This is based on current 2025 freight data; our team will confirm the exact rate in your Proforma invoice."`;
        }
        return null;
      })();

      const crmTask = (async (): Promise<string | null> => {
        const customerEmail = quoteRequest.email || contactData?.email;
        const customerOrg = quoteRequest.organizationName || contactData?.organizationName;
        if (customerEmail || customerOrg) {
          try {
            const { getCachedDealHistory, formatDealHistoryForPrompt } = await import("./hubspot-sync");
            const crmHistory = await getCachedDealHistory(customerEmail, customerOrg);
            if (crmHistory && crmHistory.totalDeals > 0) {
              return formatDealHistoryForPrompt(crmHistory);
            }
          } catch (err) {
            console.error("[hubspot] CRM history injection failed (non-fatal):", err);
          }
        }
        return null;
      })();

      const [shippingResult, crmResult] = await Promise.all([
        withTimeout(shippingTask, 12000),
        withTimeout(crmTask, 5000),
      ]);

      if (shippingResult) {
        systemPrompt += shippingResult;
      } else if (relevantLogistics.length > 0 && currentDest) {
        const destLower = currentDest.toLowerCase();
        const fallbackRoutes = relevantLogistics.filter(l => l.destinationCountry.toLowerCase() === destLower);
        if (fallbackRoutes.length > 0) {
          systemPrompt += `\n\nSHIPPING DATA (approximate historical averages — live estimate unavailable, treat as rough guide only):`;
          fallbackRoutes.forEach(r => {
            const bufferedAvg = (r.avgShippingPerUnit * 1.15).toFixed(2);
            systemPrompt += `\n- ${r.productType} → ${r.destinationCountry}: ~$${bufferedAvg}/unit`;
          });
          systemPrompt += `\nThese are rough historical averages. Tell the customer: "I'm working with approximate shipping data — our team will confirm the exact freight cost in your Proforma invoice."`;
        }
      }
      if (crmResult) systemPrompt += crmResult;

      if (currentDest) {
        systemPrompt += `\n\nLOCAL CURRENCY NOTE: When the customer's destination is ${currentDest}, you may optionally include an approximate local-currency equivalent for context when quoting prices (e.g., "approximately 240,000 MXN at today's rate"). Always clarify that VIA invoices in USD. Do not convert every single price — use it sparingly for total order values or shipping costs to help the customer understand the magnitude.`;
      }

      // Build messages for OpenAI
      const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...messageHistory.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }))
      ];

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 200
      });

      const aiResponse = completion.choices[0]?.message?.content || "I apologize, but I'm having trouble responding. Please try again.";

      // Parse AI response for special flags (consider existing quote request state)
      const flags = parseAIResponseFlags(aiResponse, message, quoteRequest.specialPricingEligible || false);

      // Save assistant message
      await storage.createQuoteRequestMessage({
        quoteRequestId: id,
        role: "assistant",
        content: aiResponse,
        messageType: flags.referToAgent ? "referral" : "response",
        metadata: flags
      });

      // Update quote request with extracted info - always persist the latest state
      const updates: Record<string, unknown> = {
        recommendedProducts: flags.showRecommendations ? similarProducts : quoteRequest.recommendedProducts
      };
      
      if (flags.specialPricingEligible || quoteRequest.specialPricingEligible) {
        updates.specialPricingEligible = true;
      }
      if (flags.organizationType && !quoteRequest.organizationType) {
        updates.organizationType = flags.organizationType;
      }
      if (flags.organizationName) {
        updates.organizationName = flags.organizationName;
      }
      if (flags.firstName && !quoteRequest.firstName) {
        updates.firstName = flags.firstName;
      }
      if (flags.lastName && !quoteRequest.lastName) {
        updates.lastName = flags.lastName;
      }
      if (flags.email && !quoteRequest.email) {
        updates.email = flags.email;
      }
      if (flags.shippingCountry) {
        updates.shippingCountry = flags.shippingCountry;
      }
      if (flags.orderQuantity) {
        updates.orderQuantity = flags.orderQuantity;
      }
      if (flags.decisionTimeline) {
        updates.decisionTimeline = flags.decisionTimeline;
      }
      if (flags.shippingPreference) {
        updates.shippingPreference = flags.shippingPreference;
      }
      if (flags.importAssistance) {
        updates.importAssistance = flags.importAssistance;
      }
      if (flags.referToAgent) {
        updates.referredToAgent = true;
        updates.referralReason = flags.referralReason;
        updates.status = "completed";
      }

      await storage.updateQuoteRequest(id, updates as any);

      // Post-response: if AI extracted a different quantity, regenerate estimate for next turn
      const aiExtractedQty = parseInt(flags.orderQuantity || "") || 0;
      const updatedEstimate = (await storage.getQuoteRequestById(id))?.shippingEstimate as any;
      const updatedDest = flags.shippingCountry || contactData?.shippingCountry || quoteRequest.shippingCountry;
      const needsRegen = aiExtractedQty > 0 && quoteRequest.productId && updatedDest &&
        (!updatedEstimate || Number(updatedEstimate.qty) !== aiExtractedQty);
      if (needsRegen) {
        (async () => {
          try {
            const { generateShippingEstimate } = await import("./shipping");
            const regenEstimate = await generateShippingEstimate(quoteRequest.productId!, updatedDest, aiExtractedQty, "Air", "DAP");
            await storage.updateQuoteRequest(id, { shippingEstimate: regenEstimate } as any);
            console.log(`[shipping] Background regen: qty ${updatedEstimate?.qty ?? "none"} → ${aiExtractedQty}, new mid=$${regenEstimate.costRange?.mid}`);
          } catch (err) {
            console.error("[shipping] Background regen failed:", err);
          }
        })();
      }

      // Return the authoritative state from the updated quote request
      const isSpecialPricingEligible = flags.specialPricingEligible || quoteRequest.specialPricingEligible || false;

      res.json({
        message: aiResponse,
        specialPricingEligible: isSpecialPricingEligible,
        organizationType: flags.organizationType || quoteRequest.organizationType,
        referToAgent: flags.referToAgent,
        referralReason: flags.referralReason,
        recommendedProducts: flags.showRecommendations ? similarProducts : [],
        profileUpdate: {
          firstName: flags.firstName || quoteRequest.firstName || undefined,
          lastName: flags.lastName || quoteRequest.lastName || undefined,
          email: flags.email || quoteRequest.email || undefined,
          organizationType: flags.organizationType || quoteRequest.organizationType || undefined,
          organizationName: flags.organizationName || quoteRequest.organizationName || undefined,
          shippingCountry: flags.shippingCountry || quoteRequest.shippingCountry || undefined,
          importCapability: flags.importAssistance || quoteRequest.importAssistance || undefined,
        }
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  const recommendationLimits = new Map<string, number>();
  app.post("/api/recommendations", async (req, res) => {
    try {
      const ip = req.ip || "unknown";
      const now = Date.now();
      const lastCall = recommendationLimits.get(ip) || 0;
      if (now - lastCall < 5000) {
        return res.status(429).json({ recommendations: [], error: "Please wait before requesting again" });
      }
      recommendationLimits.set(ip, now);

      const { viewedProductIds, categoryPreferences } = req.body;

      if (!viewedProductIds || !Array.isArray(viewedProductIds) || viewedProductIds.length === 0 || viewedProductIds.length > 20) {
        return res.json({ recommendations: [] });
      }

      const allProducts = await storage.getAllProducts();
      if (allProducts.length === 0) {
        return res.json({ recommendations: [] });
      }

      const viewedProducts = allProducts.filter(p => viewedProductIds.includes(p.id));
      const unseenProducts = allProducts.filter(p => !viewedProductIds.includes(p.id));

      if (unseenProducts.length === 0) {
        return res.json({ recommendations: [] });
      }

      const viewedSummary = viewedProducts.map(p => ({
        name: p.name,
        category: p.category,
        description: p.description.substring(0, 150),
      }));

      const candidateSummary = unseenProducts.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description.substring(0, 150),
      }));

      const categoryPrefStr = categoryPreferences
        ? Object.entries(categoryPreferences)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([cat, count]) => `${cat} (${count} views)`)
            .join(", ")
        : "none";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a product recommendation engine for VIA Global Health, a medical equipment supplier. Based on the user's browsing history and preferences, recommend the most relevant products they haven't seen yet.

Consider:
- Category affinity (they browse similar categories)
- Complementary products (items that pair well with what they viewed)
- Clinical workflow relevance (products used in similar medical procedures)

Return a JSON array of recommended product IDs with brief reasons. Format:
[{"id": "product-id", "reason": "Brief explanation why this is relevant"}]

Return at most 4 recommendations. Only return the JSON array, no other text.`
          },
          {
            role: "user",
            content: `Browsing history (recently viewed products):
${JSON.stringify(viewedSummary, null, 2)}

Category preferences: ${categoryPrefStr}

Available products to recommend from:
${JSON.stringify(candidateSummary, null, 2)}`
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      const aiText = completion.choices[0]?.message?.content || "[]";

      let recommendations: { id: string; reason: string }[] = [];
      try {
        const jsonMatch = aiText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        }
      } catch {
        recommendations = [];
      }

      const validIds = new Set(unseenProducts.map(p => p.id));
      const validRecs = recommendations
        .filter(r => validIds.has(r.id))
        .slice(0, 4);

      const recommendedProducts = validRecs.map(rec => {
        const product = unseenProducts.find(p => p.id === rec.id)!;
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          imageUrl: product.imageUrl,
          description: product.description.substring(0, 200),
          sku: product.sku,
          reason: rec.reason,
        };
      });

      res.json({ recommendations: recommendedProducts });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.json({ recommendations: [] });
    }
  });

  return httpServer;
}

const RED_FLAG_DOMAINS = [
  'gatesfoundation.org', 'usaid.gov', 'ciff.org', 'unicef.org',
  'mckinsey.com', 'salientadvisory.com', 'iqvia.com',
  'who.int', 'worldbank.org', 'bain.com', 'bcg.com', 'deloitte.com',
  'kpmg.com', 'pwc.com', 'ey.com', 'accenture.com'
];

const RED_FLAG_KEYWORDS = [
  'full catalog', 'price list', 'market research', 'funding inquiry',
  'competitive analysis', 'pricing survey', 'market mapping',
  'supplier assessment', 'vendor assessment', 'landscape analysis',
  'all products and prices', 'complete price list', 'catalog with prices'
];

function checkRedFlags(email: string, message: string): { isRedFlag: boolean; reason: string } {
  const userDomain = email.includes('@') ? email.split('@').pop()?.toLowerCase() || '' : '';
  if (userDomain && RED_FLAG_DOMAINS.includes(userDomain)) {
    return { isRedFlag: true, reason: `email_domain:${userDomain}` };
  }

  const lowerMessage = message.toLowerCase();
  for (const keyword of RED_FLAG_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return { isRedFlag: true, reason: `keyword:${keyword}` };
    }
  }

  return { isRedFlag: false, reason: '' };
}

function buildPublicModePrompt(
  productDetails: { name?: string; description?: string } | undefined,
  existingState: { firstName?: string | null; email?: string | null; organizationType?: string | null; organizationName?: string | null },
  customerLanguage: string,
  redFlagReason: string
): string {
  const languageInstruction = customerLanguage === "fr"
    ? "Respond entirely in French."
    : customerLanguage === "pt"
    ? "Respond entirely in Portuguese."
    : customerLanguage === "sw"
    ? "Respond entirely in Swahili."
    : customerLanguage === "es"
    ? "Respond entirely in Spanish. Use professional, warm Latin American Spanish."
    : "Respond in English.";

  const customerName = existingState.firstName || "there";
  const orgName = existingState.organizationName || existingState.email?.split('@').pop()?.split('.')[0] || "";
  const orgAcknowledgement = orgName ? `Acknowledge that you recognise their organisation (${orgName}) and its important work in global health.` : "";

  return `You are Amara Njeri, a Sales Representative at VIA Global Health, operating in PUBLIC PARTNER mode.

${languageInstruction}

CONTEXT: This contact has been identified as a partner, funder, or researcher — not a direct buyer.

YOUR BEHAVIOUR:
- Be warm, professional, and respectful
- ${orgAcknowledgement}
- Greet them by name if known: "${customerName}"
- Be the Gateway, not the Salesperson: Do NOT provide wholesale prices, unit costs, pricing tiers, or any specific cost information
- Do NOT offer to generate a proforma invoice or quote
- Do NOT share any internal pricing structure, markups, or segment-based pricing

THE SOFT PIVOT:
If they ask for pricing or a catalogue, say: "Our institutional pricing and full catalogues are managed by our partnerships team to ensure they align with global grant structures. I'd be happy to share our Public Impact Report and general specifications with you while I connect you with a partnership lead."

DIRECTNESS:
If they persist after you have already redirected once, remind them: "This chat tool is optimised for active clinical procurement in the field. For institutional and partnership enquiries, our partnerships team at partnerships@viaglobalhealth.com can provide the level of detail you need."

WHAT YOU CAN DO:
- Share general product information, specifications, and features
- Discuss product availability and categories
- Direct them to VIA's public resources: website (viaglobalhealth.com), public product catalogue, and Impact Report
- Ask: "What specific research or funding goal are you working toward? I can brief our team before they reach out."
- Answer general questions about VIA's mission, reach, and capabilities

${productDetails?.name ? `PRODUCT CONTEXT: ${productDetails.name}${productDetails.description ? ` — ${productDetails.description.substring(0, 200)}` : ''}` : ''}

Keep responses concise (2-3 sentences). Be genuinely helpful within these boundaries.`;
}

function buildSystemPrompt(
  productDetails: { name?: string; description?: string; specifications?: Record<string, string>; faqs?: { question: string; answer: string }[]; unitsPerPack?: number | null; packType?: string | null } | undefined,
  similarProducts: { id: string; name: string; sku: string }[],
  pricingTiers: { minQuantity: number; maxQuantity: number | null; unitPriceCents: number; currency: string; tierName: string | null }[] = [],
  restrictedCountries: { countryName: string; countryCode: string; restrictionReason: string }[] = [],
  customerSegments: { name: string; displayName: string; pricingMultiplier: number; isEligibleForQuotes: boolean; ineligibilityReason: string | null }[] = [],
  trainingTranscripts: { buyerType: string | null; country: string | null; productsDiscussed: string | null; objections: string | null; outcome: string | null; annotations: string | null; aiExtractedInsights: any }[] = [],
  existingState: { firstName?: string | null; lastName?: string | null; email?: string | null; organizationType?: string | null; organizationName?: string | null; shippingCountry?: string | null; importCapability?: string | null } = {},
  customerLanguage: string = "en",
  salesInsights: { insightType: string; insight: string; category: string | null; region: string | null; customerType: string | null }[] = [],
  logisticsData: { productType: string; destinationCountry: string; pickupCountry: string; avgShippingPerUnit: number; minShippingPerUnit: number; maxShippingPerUnit: number; chargeableWeightKg: number | null; sampleSize: number | null }[] = []
): string {
  const languageInstruction = customerLanguage === "fr"
    ? "Respond entirely in French. Keep product names in English."
    : customerLanguage === "pt"
    ? "Respond entirely in Portuguese. Keep product names in English."
    : customerLanguage === "sw"
    ? "Respond entirely in Swahili. Keep product names in English."
    : customerLanguage === "es"
    ? "Respond entirely in Spanish (Latin American). Keep product names in English."
    : "Respond in English. Use British spelling (organisation, colour).";

  let prompt = `You are Amara Njeri, Senior Sales Advisor at VIA Global Health (Nairobi). Professional, warm, transparent. VIA has operated since 2015; partners include Gates Foundation and USAID.

${languageInstruction}

CONTEXT: The customer has already seen the product price, entered a quantity, and submitted name/email/shipping country/organisation type via the UI. Check CUSTOMER STATE below — do NOT re-ask for anything already known. When country is known, give the shipping estimate IMMEDIATELY in your first response.

FAST-TRACK RULE: When ALL of product, quantity, country, AND org type are already in CUSTOMER STATE, your FIRST response MUST be the QUOTE TABLE with segment-adjusted pricing and shipping estimate. Do NOT ask any questions before presenting the table. Skip straight to the quote and close with proforma handoff.

CONVERSATION FLOW:
1. Country known → give shipping estimate from SHIPPING DATA below (e.g. "Shipping to Kenya is ~$X per unit based on recent freight data")
2. If org type not yet known → ask as a benefit: "We offer subsidised rates for NGOs, clinics, and government facilities — what type of organisation do you represent?"
3. Org type known → recalculate price: BASE PRICE (cents) × segment multiplier ÷ 100. If lower than default, present as benefit: "As an NGO, your rate is $X.XX per unit"
4. Present order summary table (see QUOTE TABLE below), then close with proforma handoff

RULES:
- Org type is LOCKED once given — cannot be changed. If they try, direct them to info@viaglobalhealth.com
- If org type dodged twice → keep default pricing, move on: "I'll keep the current pricing for now"
- If customer asks questions → answer first, then resume flow
- Eligible orgs: Distributors, Healthcare Providers, NGOs, Government, Public Hospitals, Private Clinics
- Not eligible: Funders, Consultants, Researchers, Manufacturers — offer product info only, no pricing
- Never reveal base prices, multipliers, margins, or how price was calculated. Show only the final price.
- For clinical/medical questions → refer to clinical team
- After confirmation → "Our team will email your Proforma within 24 hours"

SHIPPING: VIA ships to destination port. Customer handles customs, duties, and local transport.
- Small/urgent orders → recommend air freight
- Large volumes → recommend sea freight (4-6 weeks)

QUOTE TABLE (use when presenting final quote with shipping):

| Item | Details |
|---|---|
| Product | [name] |
| Quantity | [qty] units |
| Unit Price | $[price after segment adjustment] |
| Product Total | $[subtotal] |
| Freight | ~$[shipping] to [country] |
| **Estimated Total** | **$[grand total]** |

Delivery to port; your team handles customs.

When would you like this delivered?

CUSTOMER STATE:`;

  const stateItems: string[] = [];
  if (existingState.firstName) {
    stateItems.push(`Name: ${existingState.firstName}${existingState.lastName ? ' ' + existingState.lastName : ''}`);
  }
  if (existingState.email) {
    stateItems.push(`Email: ${existingState.email}`);
  }
  if (existingState.organizationType) {
    stateItems.push(`Organisation Type: ${existingState.organizationType} (LOCKED)`);
  }
  if (existingState.organizationName) {
    stateItems.push(`Organisation Name: ${existingState.organizationName}`);
  }
  if (existingState.shippingCountry) {
    stateItems.push(`Shipping Country: ${existingState.shippingCountry}`);
  }
  if (existingState.importCapability) {
    stateItems.push(`Import Capability: ${existingState.importCapability}`);
  }
  if (stateItems.length > 0) {
    stateItems.forEach(item => { prompt += `\n- ${item}`; });
  } else {
    prompt += `\n- No info collected yet. Give shipping estimate and ask org type.`;
  }

  if (productDetails) {
    prompt += `\n\nPRODUCT: ${productDetails.name || "Medical Equipment"}`;
    if (productDetails.description) {
      prompt += ` — ${productDetails.description.substring(0, 200)}`;
    }
    if (productDetails.unitsPerPack && productDetails.packType) {
      prompt += `\nPackaging: ${productDetails.unitsPerPack} units per ${productDetails.packType}. Must order in complete ${productDetails.packType}s. Convert units to ${productDetails.packType}s when quoting.`;
    }
    if (productDetails.specifications && Object.keys(productDetails.specifications).length > 0) {
      prompt += `\nSpecs: ${JSON.stringify(productDetails.specifications)}`;
    }
  }

  if (pricingTiers.length > 0) {
    const isKitProduct = productDetails?.unitsPerPack && productDetails?.packType;
    const packLabel = isKitProduct ? productDetails.packType : 'unit';
    prompt += `\n\nBASE TIER PRICES (apply segment multiplier silently):`;
    pricingTiers.forEach(tier => {
      const unitPrice = (tier.unitPriceCents / 100).toFixed(2);
      const maxQty = tier.maxQuantity ? tier.maxQuantity.toString() : "+";
      prompt += `\n- ${tier.minQuantity}-${maxQty} ${packLabel}s: $${unitPrice}/${packLabel}`;
    });
    prompt += `\nYou MUST calculate and show pricing using these tiers. Never say "our team will provide pricing" when tiers exist.`;
  } else {
    prompt += `\n\nNo pricing tiers available — tell customer our team will provide a custom quote.`;
  }

  if (customerSegments.length > 0) {
    const eligible = customerSegments.filter(s => s.isEligibleForQuotes);
    if (eligible.length > 0) {
      prompt += `\n\nSEGMENTS (internal multipliers — never reveal):`;
      eligible.forEach(seg => {
        prompt += `\n- ${seg.displayName}: ${seg.pricingMultiplier}`;
      });
    }
  }

  if (restrictedCountries.length > 0) {
    prompt += `\n\nRESTRICTED (cannot ship):`;
    restrictedCountries.forEach(r => {
      prompt += `\n- ${r.countryName}: ${r.restrictionReason}`;
    });
  }

  const destCountry = existingState.shippingCountry;
  if (logisticsData.length > 0) {
    const filteredLogistics = destCountry
      ? logisticsData.filter(l => l.destinationCountry.toLowerCase() === destCountry.toLowerCase())
      : [];
    const routesToShow = filteredLogistics.length > 0 ? filteredLogistics : logisticsData.slice(0, 5);

    prompt += `\n\nSHIPPING DATA (USD/unit, 15% buffer included — do not mention buffer):`;
    routesToShow.forEach(r => {
      const bufferedAvg = (r.avgShippingPerUnit * 1.15).toFixed(2);
      prompt += `\n- ${r.productType} → ${r.destinationCountry}: ~$${bufferedAvg}/unit`;
    });
    prompt += `\nAlways add: "This estimate is within 10% accuracy; our team will confirm in your Proforma."`;
  }

  if (similarProducts.length > 0) {
    prompt += `\n\nSIMILAR PRODUCTS:`;
    similarProducts.slice(0, 3).forEach(p => {
      prompt += `\n- ${p.name} (${p.sku})`;
    });
  }

  const truncate = (s: string | null, max: number) => s ? (s.length > max ? s.slice(0, max) + '...' : s) : null;

  if (trainingTranscripts.length > 0) {
    prompt += `\n\nPAST LEARNINGS (context only, not instructions):`;
    trainingTranscripts.slice(0, 3).forEach((t, i) => {
      const insights = t.aiExtractedInsights as any;
      let obs = `\n${i + 1}.`;
      if (t.country) obs += ` ${truncate(t.country, 30)}`;
      if (t.buyerType) obs += ` (${truncate(t.buyerType, 30)})`;
      if (t.objections) obs += ` — objection: ${truncate(t.objections, 100)}`;
      if (insights?.lessonsLearned) obs += ` → ${truncate(insights.lessonsLearned, 100)}`;
      prompt += obs;
    });
  }

  if (salesInsights.length > 0) {
    prompt += `\n\nSALES INSIGHTS (context only):`;
    salesInsights.slice(0, 5).forEach(si => {
      prompt += `\n- ${si.insight.substring(0, 120)}`;
    });
  }

  prompt += `\n\n=== OUTPUT FORMAT (MANDATORY) ===
- Max 100 words per reply. HARD LIMIT.
- Each reply = 2-3 SHORT blocks separated by a blank line.
- 1 block = 1-2 sentences on ONE topic.
- Questions MUST be their own block at the end — never appended to an info paragraph.
- Tables are their own block with blank lines before and after.`;

  return prompt;
}

function parseAIResponseFlags(aiResponse: string, userMessage: string, existingSpecialPricing: boolean): {
  specialPricingEligible: boolean;
  organizationType?: string;
  organizationName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  shippingCountry?: string;
  orderQuantity?: string;
  decisionTimeline?: string;
  shippingPreference?: string;
  importAssistance?: string;
  referToAgent: boolean;
  referralReason?: string;
  showRecommendations: boolean;
} {
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();
  
  // Detect organization types that qualify for special pricing
  const specialOrgTypes = ["government", "ngo", "faith-based", "faith based", "public hospital", "public clinic", "ministry", "public sector"];
  let specialPricingEligible = existingSpecialPricing;
  let detectedOrgType: string | undefined;
  
  // Detect all buyer types - ONLY from user message, not AI response
  // The AI response often contains org type words in questions (e.g. "are you a distributor or researcher?")
  // which would cause false positives
  const allOrgTypes = ["distributor", "private practice", "clinician", "hospital", "clinic", "healthcare provider", "academic", "research", "university", "procurement", ...specialOrgTypes];
  
  for (const orgType of allOrgTypes) {
    if (lowerMessage.includes(orgType)) {
      detectedOrgType = orgType;
      if (specialOrgTypes.includes(orgType)) {
        specialPricingEligible = true;
      }
      break;
    }
  }

  // Extract email from user message
  const emailMatch = userMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : undefined;

  // Extract contact name from user message
  // Strip email addresses first so they don't interfere with name matching
  const messageWithoutEmail = userMessage.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '').trim();
  let firstName: string | undefined;
  let lastName: string | undefined;

  const conversationalPhrases = new Set([
    "looks good", "sounds good", "sounds great", "looks great", "looks fine",
    "sounds fine", "sounds right", "looks right", "looks correct", "sounds correct",
    "thank you", "thanks much", "thanks again", "many thanks",
    "yes please", "no thanks", "not sure", "no problem", "no worries",
    "go ahead", "move forward", "proceed please", "please proceed",
    "got it", "all good", "very good", "pretty good", "so far",
    "come back", "hold on", "hang on", "one moment", "just checking",
    "thats right", "thats correct", "thats fine", "thats great", "thats all",
    "right away", "of course", "for sure", "sure thing",
    "well done", "nice work", "great job", "good job",
    "how much", "how many", "how long", "what about", "tell me",
    "per unit", "each unit", "more info", "more information",
    "next step", "whats next", "please continue", "continue please",
    "government agency", "government hospital", "government clinic",
    "public hospital", "public clinic", "public sector",
    "private practice", "private hospital", "private clinic",
    "healthcare provider", "faith based", "faith-based",
    "sea freight", "air freight",
    "ready to", "ready to buy", "ready to order", "ready to purchase", "ready to proceed",
    "buy it", "buy now", "buy this", "buy one", "buy some", "buy them",
    "get it", "get one", "get some", "get this", "get them",
    "want it", "want one", "want some", "want this", "want them",
    "need it", "need one", "need some", "need this", "need them",
    "order it", "order one", "order some", "order this", "order them",
    "send it", "send one", "send some", "send this", "send them",
    "ship it", "ship them", "ship this",
    "hi there", "hello there", "hey there",
    "yes sir", "yes ma'am", "yes maam", "no sir", "no ma'am",
    "ok thanks", "ok great", "ok sure", "ok fine", "ok good",
    "ill take", "we need", "we want", "we have", "we are",
    "i need", "i want", "i have", "im interested", "im looking",
    "please send", "please help", "please provide", "please share",
    "can you", "could you", "would you", "will you",
    "let me", "let us", "show me", "help me",
    "just one", "just checking", "just wondering", "just curious",
    "good morning", "good afternoon", "good evening", "good day",
    "thats ok", "thats okay", "thats it",
    "that works", "that helps", "that sounds", "works fine", "works great",
    "works well", "works perfectly", "perfect thanks", "great thanks",
    "cool thanks", "awesome thanks", "nice thanks",
  ]);

  const nonNameWords = new Set([
    "buy", "get", "want", "need", "order", "send", "ship", "take", "make", "give", "ready",
    "yes", "no", "ok", "okay", "sure", "thanks", "thank", "please", "hello", "hi",
    "hey", "good", "great", "fine", "right", "well", "just", "also", "very", "much",
    "the", "and", "but", "for", "not", "you", "all", "can", "had", "her", "was",
    "one", "our", "out", "are", "has", "his", "how", "its", "may", "new", "now",
    "old", "see", "way", "who", "did", "got", "let", "say", "she", "too", "use",
    "about", "after", "also", "back", "been", "call", "come", "each", "find",
    "from", "have", "here", "into", "know", "like", "look", "more", "next",
    "only", "over", "some", "such", "them", "then", "this", "what", "when",
    "will", "with", "would", "could", "should", "their", "there", "these", "those",
    "it", "go", "do", "we", "me", "so", "if", "my", "up", "an", "or", "as", "at", "be",
    "product", "products", "price", "pricing", "quote", "cost", "unit", "units",
    "air", "sea", "freight", "shipping", "import", "export", "customs",
    "medical", "equipment", "supply", "hospital", "clinic",
    "interested", "looking", "checking", "wondering", "curious",
    "that", "works", "work", "done", "perfect", "awesome", "cool", "nice", "alright",
    "absolutely", "definitely", "certainly", "exactly", "correct", "incorrect",
    "agree", "disagree", "understand", "understood", "confirm", "confirmed",
    "proceed", "continue", "wait", "stop", "start", "help", "try",
    "maybe", "perhaps", "probably", "still", "already", "enough", "yet",
  ]);

  const namePatterns = [
    /(?:i'm|i am|my name is|this is|it's|its|call me)\s+([a-zA-Z'-]+)(?:\s+([a-zA-Z'-]+))?/i,
    /(?:name:?\s*)([a-zA-Z'-]+)(?:\s+([a-zA-Z'-]+))?/i,
    /^([a-zA-Z'-]+)\s+([a-zA-Z'-]+)$/
  ];
  
  for (const pattern of namePatterns) {
    const match = messageWithoutEmail.match(pattern);
    if (match && match[1] && match[1].length >= 2) {
      const candidate = (match[1] + (match[2] ? " " + match[2] : "")).toLowerCase();
      if (conversationalPhrases.has(candidate)) {
        continue;
      }
      if (nonNameWords.has(match[1].toLowerCase())) {
        continue;
      }
      if (match[2] && nonNameWords.has(match[2].toLowerCase())) {
        continue;
      }
      firstName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      if (match[2] && match[2].length >= 2) {
        lastName = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
      }
      break;
    }
  }

  // Fallback: Extract name from the AI response when the AI acknowledges it.
  // Handles cases where user just types "joe" or "shmo" without any prefix.
  // The AI typically responds with "Thank you, Joe" or "Thank you, Joe Shmo!"
  if (!firstName || !lastName) {
    const aiNamePatterns = [
      /(?:thank you|thanks|nice to meet you|hello|hi|welcome),?\s+([A-Z][a-z'-]+)(?:\s+([A-Z][a-z'-]+))?[!.,\s]/,
      /(?:thank you|thanks|nice to meet you|hello|hi|welcome),?\s+([A-Z][a-z'-]+)(?:\s+([A-Z][a-z'-]+))?$/,
    ];
    for (const pattern of aiNamePatterns) {
      const match = aiResponse.match(pattern);
      if (match && match[1] && match[1].length >= 2) {
        const candidateFirst = match[1];
        if (!nonNameWords.has(candidateFirst.toLowerCase())) {
          if (!firstName) {
            firstName = candidateFirst;
          }
          if (!lastName && match[2] && match[2].length >= 2 && !nonNameWords.has(match[2].toLowerCase())) {
            lastName = match[2];
          }
          break;
        }
      }
    }
  }

  // Single-word name fallback: Only use when the AI response confirms a name was received.
  // Check if AI response uses the word in a name-acknowledgment context (e.g. "Thank you, Joe")
  if (!firstName || !lastName) {
    const singleWord = messageWithoutEmail.match(/^([a-zA-Z'-]+)$/);
    if (singleWord && singleWord[1].length >= 2 && !nonNameWords.has(singleWord[1].toLowerCase()) && !conversationalPhrases.has(singleWord[1].toLowerCase())) {
      const nameCandidate = singleWord[1].charAt(0).toUpperCase() + singleWord[1].slice(1).toLowerCase();
      const aiUsesWordAsName = new RegExp(`(?:thank you|thanks|nice to meet you|hello|hi|welcome|great)[,!]?\\s+${nameCandidate}`, 'i').test(aiResponse);
      if (aiUsesWordAsName) {
        if (!firstName) {
          firstName = nameCandidate;
        } else if (!lastName && nameCandidate !== firstName) {
          lastName = nameCandidate;
        }
      }
    }
  }

  // Extract organisation name from user message
  // Look for patterns like "I work for ABC Health", "from XYZ Hospital", "organisation is..."
  // Case-insensitive and handles lowercase input
  let organizationName: string | undefined;
  const orgPatterns = [
    /(?:work(?:ing)?\s+(?:for|at|with)|from|organisation(?:\s+is)?:?|organization(?:\s+is)?:?|company(?:\s+is)?:?)\s+([a-zA-Z0-9\s&.'-]+?)(?:\.|,|$)/i,
    /(?:we are|i represent|i'm from|i am from)\s+([a-zA-Z0-9\s&.'-]+?)(?:\.|,|$)/i
  ];
  
  for (const pattern of orgPatterns) {
    const match = userMessage.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      // Title case the organisation name
      organizationName = match[1].trim().split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      break;
    }
  }

  // Extract quantity from user message (look for numbers with units)
  // Use messageWithoutEmail to avoid matching digits inside email addresses
  let orderQuantity: string | undefined;
  const quantityMatch = messageWithoutEmail.match(/\b(\d+[\s-]*(units?|pieces?|pcs?|sets?)?|\d+[\s-]*to[\s-]*\d+)\b/i);
  if (quantityMatch) {
    orderQuantity = quantityMatch[0].trim();
  }

  // Extract country names (expanded global list)
  const countries = [
    // Africa
    "kenya", "nigeria", "tanzania", "uganda", "ethiopia", "ghana", "south africa", "rwanda", "zambia", 
    "malawi", "mozambique", "zimbabwe", "botswana", "namibia", "senegal", "cameroon", "ivory coast", 
    "cote d'ivoire", "drc", "congo", "egypt", "morocco", "algeria", "tunisia", "sudan", "angola",
    "madagascar", "burkina faso", "mali", "niger", "chad", "sierra leone", "liberia", "togo", "benin",
    // Asia
    "india", "pakistan", "bangladesh", "nepal", "sri lanka", "myanmar", "thailand", "vietnam", 
    "philippines", "indonesia", "malaysia", "cambodia", "laos",
    // Middle East
    "jordan", "lebanon", "iraq", "yemen", "afghanistan",
    // Latin America
    "haiti", "guatemala", "honduras", "nicaragua", "el salvador", "peru", "bolivia", "ecuador", "colombia"
  ];
  let shippingCountry: string | undefined;
  for (const country of countries) {
    if (lowerMessage.includes(country)) {
      // Capitalise properly
      shippingCountry = country.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      break;
    }
  }

  // Extract timeline indicators
  let decisionTimeline: string | undefined;
  if (lowerMessage.includes("urgent") || lowerMessage.includes("asap") || lowerMessage.includes("immediately") || lowerMessage.includes("1-2 week") || lowerMessage.includes("right away")) {
    decisionTimeline = "urgent";
  } else if (lowerMessage.includes("month") || lowerMessage.includes("4-6 week") || lowerMessage.includes("standard") || lowerMessage.includes("few weeks")) {
    decisionTimeline = "standard";
  } else if (lowerMessage.includes("flexible") || lowerMessage.includes("no rush") || lowerMessage.includes("6+ week") || lowerMessage.includes("no hurry") || lowerMessage.includes("whenever")) {
    decisionTimeline = "flexible";
  }

  // Detect shipping preference (air vs sea)
  let shippingPreference: string | undefined;
  if (lowerMessage.includes("air freight") || lowerMessage.includes("air ship") || lowerMessage.includes("by air") || lowerMessage.includes("airfreight")) {
    shippingPreference = "air";
  } else if (lowerMessage.includes("sea freight") || lowerMessage.includes("sea ship") || lowerMessage.includes("by sea") || lowerMessage.includes("ocean") || lowerMessage.includes("seafreight")) {
    shippingPreference = "sea";
  }

  // Detect import assistance needs
  let importAssistance: string | undefined;
  if (lowerMessage.includes("help with import") || lowerMessage.includes("need import") || lowerMessage.includes("import assistance") || lowerMessage.includes("can't import") || lowerMessage.includes("cannot import")) {
    importAssistance = "needed";
  } else if (lowerMessage.includes("handle import") || lowerMessage.includes("can import") || lowerMessage.includes("own import") || lowerMessage.includes("we import")) {
    importAssistance = "not_needed";
  }

  // Detect referral to agent - only when conversation is truly complete
  const referralPhrases = [
    "have everything i need",
    "prepare your quote",
    "custom quote ready",
    "within 24 hours",
    "team will prepare"
  ];
  
  let referToAgent = false;
  let referralReason: string | undefined;
  
  // Check if the AI is still asking questions - if so, don't end the conversation
  const isAskingQuestion = aiResponse.trim().endsWith("?") || 
    /\?[^?]*$/.test(aiResponse.slice(-100));
  
  // Only trigger referral if the AI is NOT asking follow-up questions
  if (!isAskingQuestion) {
    for (const phrase of referralPhrases) {
      if (lowerResponse.includes(phrase)) {
        referToAgent = true;
        referralReason = "Quote ready";
        break;
      }
    }
  }

  // Show recommendations when discussing product alternatives or comparisons
  const showRecommendations = lowerMessage.includes("other") || 
    lowerMessage.includes("alternative") || 
    lowerMessage.includes("similar") ||
    lowerMessage.includes("compare") ||
    lowerMessage.includes("options") ||
    lowerMessage.includes("different");

  return {
    specialPricingEligible,
    organizationType: detectedOrgType,
    organizationName,
    firstName,
    lastName,
    email,
    shippingCountry,
    orderQuantity,
    decisionTimeline,
    shippingPreference,
    importAssistance,
    referToAgent,
    referralReason,
    showRecommendations
  };
}

async function generateAIReview(quoteRequestId: string, outcome: string) {
  console.log(`[AI Review] Starting review for ${quoteRequestId} (${outcome})`);
  
  const quoteRequest = await storage.getQuoteRequestById(quoteRequestId);
  if (!quoteRequest) {
    console.log(`[AI Review] Quote request ${quoteRequestId} not found, skipping`);
    return;
  }

  const messages = await storage.getQuoteRequestMessages(quoteRequestId);
  
  const inlineConversation = Array.isArray(quoteRequest.conversation) ? quoteRequest.conversation as any[] : [];
  
  if (messages.length === 0 && inlineConversation.length === 0) {
    console.log(`[AI Review] No messages found for ${quoteRequestId}, skipping`);
    return;
  }

  let conversationText: string;
  if (messages.length > 0) {
    conversationText = messages
      .map(m => `${m.role === "user" ? "Customer" : "Amara"}: ${m.content}`)
      .join("\n");
  } else {
    conversationText = inlineConversation
      .map((m: any) => `${m.role === "user" ? "Customer" : "Amara"}: ${m.content}`)
      .join("\n");
  }

  console.log(`[AI Review] Conversation has ${messages.length} messages (${inlineConversation.length} inline). Calling OpenAI...`);

  const prompt = `You are an expert sales analyst for VIA Global Health, a medical equipment supplier serving Africa.

Analyze this ${outcome === "closed_won" ? "successful" : "unsuccessful"} quote conversation and provide a structured review.

CUSTOMER DETAILS:
- Name: ${quoteRequest.firstName || ""} ${quoteRequest.lastName || ""}
- Organization: ${quoteRequest.organizationName || "Unknown"}
- Country: ${quoteRequest.shippingCountry || "Unknown"}
- Product: ${quoteRequest.productName || "General inquiry"}
- Quantity: ${quoteRequest.orderQuantity || "Not specified"}

CONVERSATION:
${conversationText}

Respond with valid JSON only (no markdown, no code fences):
{
  "summary": "2-3 sentence summary of what happened",
  "customerSentiment": "positive|neutral|negative",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "whatWorked": ["thing1", "thing2"],
  "whatCouldImprove": ["improvement1", "improvement2"],
  "insights": [
    {
      "insightType": "objection_handling|pricing_strategy|product_knowledge|conversation_technique|regional_pattern",
      "insight": "Specific actionable lesson learned",
      "category": "relevant product category or null",
      "region": "relevant region or null",
      "customerType": "distributor|healthcare_provider|ngo|government or null"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) return;

    const review = JSON.parse(responseText);

    await storage.updateQuoteRequest(quoteRequestId, {
      aiReview: review,
    });

    if (review.insights && Array.isArray(review.insights)) {
      const insightRecords = review.insights.map((ins: any) => ({
        quoteRequestId,
        insightType: ins.insightType || "general",
        insight: ins.insight,
        category: ins.category || null,
        region: ins.region || quoteRequest.shippingCountry || null,
        customerType: ins.customerType || null,
        productCategory: ins.category || null,
      }));
      await storage.createSalesInsightsBulk(insightRecords);
    }

    console.log(`[AI Review] Generated review for quote request ${quoteRequestId} (${outcome})`);
  } catch (error) {
    console.error("[AI Review] Failed to generate review:", error);
  }
}
