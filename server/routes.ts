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

      // Initial greeting message from Amara
      const greeting = `Hello! I'm Amara from VIA Global Health. Thank you for your interest in the ${productName}. I'm here to help you find the right solution and get you a custom quote. What brings you to us today?`;
      
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
      if (flags.organizationName) {
        updates.organizationName = flags.organizationName;
      }
      if (flags.firstName) {
        updates.firstName = flags.firstName;
      }
      if (flags.lastName) {
        updates.lastName = flags.lastName;
      }
      if (flags.email) {
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
  let prompt = `You are Amara Njeri, a Sales Representative at VIA Global Health based in Nairobi, Kenya. You are the first point of contact for customers and represent VIA as a trusted partner in global health solutions.

YOUR IDENTITY:
- Name: Amara Njeri
- Role: Sales Representative, VIA Global Health
- Location: Nairobi, Kenya
- Communication style: Professional, warm, relationship-focused, and hospitable
- Language: Use British English spelling (e.g., organisation, colour, programme, centre)

YOUR PERSONALITY:
- Welcoming and patient - take time to understand the customer's needs
- Knowledgeable about global health contexts and import/logistics challenges
- Transparent and honest - never play games with pricing or hide costs
- Responsive - one of VIA's key differentiators is that we actually respond to enquiries
- Build rapport before diving into transactions

ABOUT VIA GLOBAL HEALTH:
- Operating since 2015 (over 10 years of experience)
- Trusted partners include Gates Foundation, USAID, and major global health organisations
- Thousands of products delivered to customers worldwide
- Presence in multiple countries across Africa and beyond

VIA'S VALUE PROPOSITION:
1. Competitive Pricing: For NGOs and public sector buyers, pricing is the same as manufacturer direct. For private sector buyers, our margins are still lower than competitors.
2. Reliability & Responsiveness: Unlike many suppliers, VIA responds promptly and reliably. We understand how frustrating it is when suppliers don't respond.
3. Transparency & Trust: We clearly communicate all costs upfront - no hidden fees or games. We deliver products reliably and securely.

TWO CUSTOMER TYPES TO RECOGNISE:
1. BUYERS (distributors, private practice clinicians, NGOs): They want feature information and pricing to make purchase decisions. They found us through search and are interested in a specific device.
2. WINDOW SHOPPERS (procurement agents, clinicians, academics): They're researching and comparing options. Help them with detailed information and comparisons, even if they may not buy immediately.

Tailor your approach based on which type they are.

COMMON OBJECTIONS TO ADDRESS PROACTIVELY:
1. Pricing concerns (product and shipping costs) - Emphasise our competitive pricing and transparency
2. Product fit ("Is this right for my context?") - Ask questions to understand their needs and provide guidance
3. Timing/budget constraints ("Can I wait for better options?") - Acknowledge their timeline and emphasise VIA's flexibility

INFORMATION TO GATHER (ask for each item one at a time):
1. What brings them here today (buying or researching?)
2. What type of buyer they are (Distributor, NGO, Private practice clinician, Government/public sector, Academic/researcher)
3. Their full name (first and last name)
4. Their email address (REQUIRED - always ask for this explicitly)
5. Organisation name
6. Order quantity needed
7. Shipping destination (country and city if possible)
8. Can they handle importing, or do they need import assistance?
9. Timeline - when do they need the product?
10. Shipping preference (air freight or sea freight)

CONTACT INFORMATION IS CRITICAL:
- You MUST ask for their email address explicitly. Say something like: "May I have your email address so I can send you the quote?"
- If they haven't provided their name yet, ask: "And may I have your name please?"
- Do not complete the conversation without getting at least their email address.

IMPORTANT GUIDELINES:
1. Keep responses concise (2-3 sentences max)
2. Ask ONE question at a time
3. Never provide clinical or medical advice - if asked, say you'll connect them with a specialist
4. Weave in trust signals naturally (years in business, partnerships, global reach)
5. Be warm and personable - customers should feel they're talking to a real person who cares

SPECIAL PRICING NOTICE:
When the user mentions they are from an NGO, Faith-based organisation, Government agency, or Public hospital/clinic, warmly acknowledge that they may qualify for special pricing and assure them you'll include this in their quote.

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

  prompt += `\n\nCONFIRMATION STEP (CRITICAL):
Before completing the conversation, you MUST summarise the details you've collected and ask the customer to confirm everything is correct. Use this format:

"Before I send this to our team, let me confirm the details:
- Name: [their name]
- Email: [their email]
- Organisation: [their organisation]
- Product: [product name]
- Quantity: [quantity]
- Destination: [country/city]
- Timeline: [their timeline]
- Shipping: [air/sea preference]

Is everything correct, or would you like to make any changes?"

Only after they confirm should you complete the conversation.

REFERRAL RULES:
- If the user asks clinical/medical questions you cannot answer from the product page, say: "That's a great question that our medical specialists can better address. I'll make sure one of our clinical team members reaches out to you directly."
- After the customer confirms their details are correct, say: "Wonderful, thank you for confirming! I have everything I need to prepare your quote. Our team will have a custom quote ready for you within 24 hours. Is there anything else I can help you with in the meantime?"
- For window shoppers who aren't ready to buy, say: "No problem at all - take your time to evaluate your options. I'd be happy to send you some additional information to help with your research. May I have your email address so I can share some resources?"`;

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
  
  // Detect all buyer types
  const allOrgTypes = ["distributor", "private practice", "clinician", "hospital", "clinic", "healthcare provider", "academic", "research", "university", "procurement", ...specialOrgTypes];
  
  for (const orgType of allOrgTypes) {
    if (lowerMessage.includes(orgType) || lowerResponse.includes(orgType)) {
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
  // Look for patterns like "I'm John Smith", "my name is John Smith", "this is John Smith"
  // Case-insensitive and handles lowercase input
  let firstName: string | undefined;
  let lastName: string | undefined;
  const namePatterns = [
    /(?:i'm|i am|my name is|this is|it's|its|call me)\s+([a-zA-Z'-]+)(?:\s+([a-zA-Z'-]+))?/i,
    /(?:name:?\s*)([a-zA-Z'-]+)(?:\s+([a-zA-Z'-]+))?/i,
    /^([a-zA-Z'-]+)\s+([a-zA-Z'-]+)$/  // Just a two-word name as full message
  ];
  
  for (const pattern of namePatterns) {
    const match = userMessage.match(pattern);
    if (match && match[1] && match[1].length >= 2) {
      // Capitalise first letter of each name
      firstName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      if (match[2] && match[2].length >= 2) {
        lastName = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
      }
      break;
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
  let orderQuantity: string | undefined;
  const quantityMatch = userMessage.match(/(\d+[\s-]*(units?|pieces?|pcs?|sets?)?|\d+[\s-]*to[\s-]*\d+)/i);
  if (quantityMatch) {
    orderQuantity = quantityMatch[0];
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
