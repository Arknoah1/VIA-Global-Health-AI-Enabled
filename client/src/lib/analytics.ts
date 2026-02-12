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

export function trackProductView(product: { name: string; category: string; sku: string; slug: string }) {
  trackEvent("product_view", {
    product_name: product.name,
    product_category: product.category,
    product_sku: product.sku,
    product_slug: product.slug,
  });
}

export function trackCtaClick(location: string, productName?: string) {
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
  trackEvent("quote_request_submitted", {
    quote_id: quoteId,
    product_count: productCount || undefined,
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
