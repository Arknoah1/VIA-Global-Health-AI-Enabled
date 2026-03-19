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
}
