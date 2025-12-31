import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { scrapeViaGlobalHealth } from "./scraper";
import { insertProductSchema, insertQuoteRequestSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all products (with optional search) - with caching
  app.get("/api/products", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      
      // Set cache headers for browser caching
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      res.set('ETag', `"products-${Date.now()}"`);
      
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

  // Get single product by ID - with cache headers
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Set cache headers
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      
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
      
      // Invalidate cache when new products are added
      invalidateCache();
      
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

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
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
  app.delete("/api/products", async (req, res) => {
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

  // Get all quote requests
  app.get("/api/quote-requests", async (req, res) => {
    try {
      const quoteRequests = await storage.getAllQuoteRequests();
      res.json(quoteRequests);
    } catch (error) {
      console.error("Error fetching quote requests:", error);
      res.status(500).json({ error: "Failed to fetch quote requests" });
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

  // Start a new AI-powered quote request session
  app.post("/api/quote-requests/start", async (req, res) => {
    try {
      const { productId, productName, productSku } = req.body;
      
      if (!productId || !productName) {
        return res.status(400).json({ error: "productId and productName are required" });
      }

      // Create initial quote request
      const quoteRequest = await storage.createQuoteRequest({
        productId,
        productName,
        productSku,
        conversation: [],
        status: "active"
      });

      // Initial greeting message
      const greeting = `Thank you for your interest in ${productName}! I'm here to help you get a custom quote. What brings you here today?`;
      
      // Save initial assistant message
      await storage.createQuoteRequestMessage({
        quoteRequestId: quoteRequest.id,
        role: "assistant",
        content: greeting,
        messageType: "greeting"
      });

      res.json({
        quoteRequestId: quoteRequest.id,
        message: greeting
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
      const { message, productDetails } = req.body;

      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      // Get existing quote request
      const quoteRequest = await storage.getQuoteRequestById(id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
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

      // Build system prompt
      const systemPrompt = buildSystemPrompt(productDetails, similarProducts);

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
        max_tokens: 500
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
      if (flags.organizationType) {
        updates.organizationType = flags.organizationType;
      }
      if (flags.referToAgent) {
        updates.referredToAgent = true;
        updates.referralReason = flags.referralReason;
        updates.status = "completed";
      }

      await storage.updateQuoteRequest(id, updates as any);

      // Return the authoritative state from the updated quote request
      const isSpecialPricingEligible = flags.specialPricingEligible || quoteRequest.specialPricingEligible || false;

      res.json({
        message: aiResponse,
        specialPricingEligible: isSpecialPricingEligible,
        organizationType: flags.organizationType || quoteRequest.organizationType,
        referToAgent: flags.referToAgent,
        referralReason: flags.referralReason,
        recommendedProducts: flags.showRecommendations ? similarProducts : []
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  return httpServer;
}

function buildSystemPrompt(
  productDetails: { name?: string; description?: string; specifications?: Record<string, string>; faqs?: { question: string; answer: string }[] } | undefined,
  similarProducts: { id: string; name: string; sku: string }[]
): string {
  let prompt = `You are a helpful quote assistant for VIA Global Health, a medical equipment and pharmaceutical supplier serving healthcare providers across Africa. Your goal is to gather information needed to provide a custom quote while being friendly and conversational.

IMPORTANT GUIDELINES:
1. Keep responses concise (2-3 sentences max)
2. Ask ONE question at a time
3. Never provide clinical or medical advice - if asked, politely say you'll connect them with a specialist
4. Be warm and professional

INFORMATION TO GATHER (in this order):
1. What brings them here today / their intent
2. Their name (first and last)
3. Organization name
4. Order quantity needed
5. Organization type (ask: "What type of organization is [org name]? For example: Distributor, Government agency, NGO, Faith-based organization, Public hospital/clinic, or Private practice")
6. Shipping country
7. Budget range (optional - only if conversation flows naturally)
8. Decision timeline (optional)
9. Import assistance needs

SPECIAL PRICING NOTICE:
When the user mentions they are from a Government agency, NGO, Faith-based organization, or Public hospital/clinic, acknowledge that they may qualify for special pricing and we will include this in their quote.

PRODUCT CONTEXT:`;

  if (productDetails) {
    prompt += `\n\nProduct: ${productDetails.name || "Medical Equipment"}`;
    if (productDetails.description) {
      prompt += `\nDescription: ${productDetails.description}`;
    }
    if (productDetails.specifications && Object.keys(productDetails.specifications).length > 0) {
      prompt += `\nKey Specifications: ${JSON.stringify(productDetails.specifications)}`;
    }
    if (productDetails.faqs && productDetails.faqs.length > 0) {
      prompt += `\n\nFAQs you can reference:`;
      productDetails.faqs.slice(0, 3).forEach(faq => {
        prompt += `\n- Q: ${faq.question}\n  A: ${faq.answer}`;
      });
    }
  }

  if (similarProducts.length > 0) {
    prompt += `\n\nSIMILAR PRODUCTS (mention if relevant):`;
    similarProducts.forEach(p => {
      prompt += `\n- ${p.name} (SKU: ${p.sku})`;
    });
  }

  prompt += `\n\nREFERRAL RULES:
- If the user asks clinical/medical questions you cannot answer from the product page, say: "That's a great question that our medical specialist can better address. I'll make sure they reach out to you."
- If the user seems ready for a detailed quote after gathering their info, say: "Thank you! I have everything I need. Our team will prepare a custom quote and reach out within 24 hours."`;

  return prompt;
}

function parseAIResponseFlags(aiResponse: string, userMessage: string, existingSpecialPricing: boolean): {
  specialPricingEligible: boolean;
  organizationType?: string;
  referToAgent: boolean;
  referralReason?: string;
  showRecommendations: boolean;
} {
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();
  
  // Detect organization types that qualify for special pricing
  const specialOrgTypes = ["government", "ngo", "faith-based", "faith based", "public hospital", "public clinic"];
  let specialPricingEligible = existingSpecialPricing;
  let detectedOrgType: string | undefined;
  
  for (const orgType of specialOrgTypes) {
    if (lowerMessage.includes(orgType) || lowerResponse.includes(orgType)) {
      specialPricingEligible = true;
      detectedOrgType = orgType;
      break;
    }
  }

  // Detect referral to agent - only when conversation is truly complete
  const referralPhrases = [
    "team will prepare a custom quote",
    "reach out within 24 hours",
    "i have everything i need"
  ];
  
  let referToAgent = false;
  let referralReason: string | undefined;
  
  // Check if the AI is still asking questions - if so, don't end the conversation
  const isAskingQuestion = aiResponse.trim().endsWith("?") || 
    /\?[^?]*$/.test(aiResponse.slice(-100)); // Check if there's a question mark in the last 100 chars
  
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
    lowerMessage.includes("compare");

  return {
    specialPricingEligible,
    organizationType: detectedOrgType,
    referToAgent,
    referralReason,
    showRecommendations
  };
}
