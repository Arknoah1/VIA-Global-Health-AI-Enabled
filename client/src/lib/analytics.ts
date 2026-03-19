declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

function gtag(...args: any[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  gtag("event", eventName, params);
}

// ─── Session state helpers ────────────────────────────────────────────────────

const SESSION_CTA_KEY = "via-cta-clicked";
const SESSION_SUBMITTED_KEY = "via-quote-submitted";
const SESSION_UTM_KEY = "via-utm-campaign";

function setSessionFlag(key: string) {
  try { sessionStorage.setItem(key, "1"); } catch {}
}

function clearSessionFlag(key: string) {
  try { sessionStorage.removeItem(key); } catch {}
}

function getSessionFlag(key: string): boolean {
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}

function getSessionValue(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

/**
 * Call once at app init. Reads utm_campaign from the URL and persists it
 * for the session so quote_request_submitted can attribute it.
 */
export function captureUtmParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const campaign = params.get("utm_campaign");
    if (campaign) {
      sessionStorage.setItem(SESSION_UTM_KEY, campaign);
    }
  } catch {}
}

/**
 * Push the remarketing audience signal to dataLayer. Called when a user
 * clicked the CTA but did not complete a quote submission.
 * Google Ads / GTM can use this event to build the "CTA Abandoned - No Submission"
 * audience by including sessions that fired this event.
 */
function pushRemarketingAudience() {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "remarketing",
      remarketing_audience: "CTA Abandoned - No Submission",
    });
  } catch {}
}

/**
 * Attach a beforeunload listener. When the user leaves the page after clicking
 * the CTA but without submitting a quote, the remarketing dataLayer event fires.
 * Call this once from a top-level component (e.g. ProductContent on mount).
 */
export function initRemarketingTracking() {
  const handler = () => {
    if (getSessionFlag(SESSION_CTA_KEY) && !getSessionFlag(SESSION_SUBMITTED_KEY)) {
      pushRemarketingAudience();
    }
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}

// ─── Core events ─────────────────────────────────────────────────────────────

export function trackProductView(product: { name: string; category: string; sku: string; slug: string }) {
  trackEvent("product_view", {
    product_name: product.name,
    product_category: product.category,
    product_sku: product.sku,
    product_slug: product.slug,
  });
}

export function trackCtaClick(location: string, productName?: string) {
  setSessionFlag(SESSION_CTA_KEY);
  trackEvent("cta_click", {
    cta_location: location,
    product_name: productName || undefined,
  });
}

export function trackQuoteStarted(productName?: string) {
  trackEvent("quote_request_started", {
    product_name: productName || undefined,
  });
}

export function trackQuoteSubmitted(quoteId: string, productCount?: number) {
  const utmCampaign = getSessionValue(SESSION_UTM_KEY);
  setSessionFlag(SESSION_SUBMITTED_KEY);
  trackEvent("quote_request_submitted", {
    quote_id: quoteId,
    product_count: productCount || undefined,
    utm_campaign: utmCampaign || undefined,
  });
}

export function trackChatMessage(messageIndex: number) {
  trackEvent("chat_message_sent", {
    message_index: messageIndex,
  });
}

export function trackCatalogView(searchTerm?: string, category?: string) {
  trackEvent("catalog_view", {
    search_term: searchTerm || undefined,
    category: category || undefined,
  });
}

// ─── Quote form funnel events ─────────────────────────────────────────────────

export function trackQuoteFormStep1View(productName: string, productSku?: string, priceShown?: string) {
  trackEvent("quote_form_step1_view", {
    product_name: productName,
    product_sku: productSku || undefined,
    price_shown: priceShown || undefined,
  });
}

export function trackQuoteFormStep2View(productName: string) {
  trackEvent("quote_form_step2_view", {
    product_name: productName,
  });
}

export function trackQuoteFormStep2Complete(productName: string, orgTypeSelected: string) {
  trackEvent("quote_form_step2_complete", {
    product_name: productName,
    org_type_selected: orgTypeSelected,
  });
}

export function trackQuoteFormStep3View(productName: string, orgType: string) {
  trackEvent("quote_form_step3_view", {
    product_name: productName,
    org_type: orgType,
  });
}

export function trackQuoteFormStep3FieldStart(fieldName: string, productName: string) {
  trackEvent("quote_form_step3_field_start", {
    field_name: fieldName,
    product_name: productName,
  });
}

export function trackQuoteFormAbandoned(productName: string, abandonedAtStep: 1 | 2 | 3, orgType?: string) {
  trackEvent("quote_form_abandoned", {
    product_name: productName,
    abandoned_at_step: abandonedAtStep,
    org_type: orgType || undefined,
  });
  // Also push remarketing audience immediately (more reliable than beforeunload on mobile)
  if (getSessionFlag(SESSION_CTA_KEY) && !getSessionFlag(SESSION_SUBMITTED_KEY)) {
    pushRemarketingAudience();
  }
}
