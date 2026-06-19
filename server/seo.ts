import { storage } from "./storage";
import { MARKETS, AREA_SERVED_COUNTRIES, type MarketCountry } from "@shared/markets";

const SITE_URL = "https://viaglobalhealth.com";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface PageMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: string;
  ogImage: string;
  jsonLd?: object;
}

function buildMetaTags(meta: PageMeta): string {
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`,
    `<meta property="og:site_name" content="VIA Global Health" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.ogType)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}" />`,
  ];
  return tags.join("\n    ");
}

function injectMetaIntoHtml(html: string, meta: PageMeta, extraHeadHtml?: string): string {
  const titleTag = `<title>${escapeHtml(meta.title)}</title>`;
  const metaTags = buildMetaTags(meta);
  const jsonLdTag = meta.jsonLd
    ? `<script id="product-jsonld" type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
    : "";

  let result = html;

  // Always set lang="en" on the html element so crawlers see the correct
  // language regardless of any client-side language switching.
  result = result.replace(/<html([^>]*)>/i, (_match, attrs) => {
    const cleaned = (attrs || "").replace(/\slang="[^"]*"/gi, "").replace(/\slang='[^']*'/gi, "");
    return `<html${cleaned} lang="en">`;
  });

  result = result.replace(/<title>[^<]*<\/title>/i, titleTag);
  if (!/<title>/i.test(result)) {
    result = result.replace("</head>", `  ${titleTag}\n  </head>`);
  }

  result = result.replace(/<meta\s+name="description"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+property="og:site_name"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+property="og:locale"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+property="og:title"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+property="og:description"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+property="og:type"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+property="og:url"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+property="og:image"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+name="twitter:card"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+name="twitter:site"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+name="twitter:title"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+name="twitter:description"[^>]*\/?>/i, "");
  result = result.replace(/<meta\s+name="twitter:image"[^>]*\/?>/i, "");

  const extra = extraHeadHtml ? `\n    ${extraHeadHtml}` : "";
  result = result.replace(
    "</head>",
    `    ${metaTags}\n    ${jsonLdTag}${extra}\n  </head>`
  );

  return result;
}

function injectBodyContent(html: string, bodyHtml: string): string {
  return html.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${bodyHtml}</div>`
  );
}

const STATIC_BODY: Record<string, string> = {
  "/": `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
        <nav style="margin-top:0.75rem">
          <a href="/catalog" style="margin-right:1.5rem;color:#2563eb">Medical Products Catalog</a>
          <a href="/about" style="margin-right:1.5rem;color:#2563eb">About</a>
          <a href="/contact" style="color:#2563eb">Contact</a>
        </nav>
      </header>
      <main>
        <h1 style="font-size:2rem;margin:2rem 0 1rem">The Medical Equipment Partner That Responds</h1>
        <p style="font-size:1.125rem;color:#374151;margin-bottom:1.5rem">From a single unit to a national tender, every inquiry gets the same attention. Quality medical equipment for Africa, Asia, and Latin America. Quote response within 24 hours.</p>
        <p style="color:#374151;margin-bottom:1rem">VIA Global Health supplies distributors, healthcare providers, and NGOs with reliable medical equipment built for low-resource settings. Our catalog includes thermocoagulators, colposcopes, CPAP devices, autoclaves, pulse oximeters, and more.</p>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">Who We Serve</h2>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          <li><strong>Distributors</strong> — Competitive pricing, volume discounts, reliable supply chains across Africa and Latin America.</li>
          <li><strong>Healthcare Providers</strong> — Hospital-grade equipment with full documentation, warranties, and regulatory compliance support.</li>
          <li><strong>NGOs &amp; Ministries</strong> — Subsidised rates, grant-compatible invoicing, and experience with international procurement rules.</li>
        </ul>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">Why VIA Global Health</h2>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          <li>Every inquiry answered within 24 hours</li>
          <li>Transparent pricing with no hidden fees</li>
          <li>Air and sea freight options with door-to-port delivery</li>
          <li>Support in English, French, Portuguese, Swahili, and Spanish</li>
        </ul>
        <p><a href="/catalog" style="color:#2563eb;font-weight:600">Browse our full product catalog &rarr;</a></p>
      </main>
    </div>
  `,
  "/catalog": `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; Medical Products Catalog
        </nav>
        <h1 style="font-size:2rem;margin:0 0 1rem">Medical Products Catalog</h1>
        <p style="font-size:1.125rem;color:#374151;margin-bottom:1.5rem">Quality medical equipment for low-resource healthcare settings. Browse thermocoagulators, colposcopes, CPAP devices, autoclaves, pulse oximeters, diagnostic equipment, and more.</p>
        <p style="color:#374151;margin-bottom:1rem">All products include full documentation, CE marking where applicable, and warranty support. VIA Global Health ships to healthcare providers, distributors, and NGOs across Africa, Asia, and Latin America.</p>
        <h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">Product Categories</h2>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          <li>Gynecology &amp; Women&apos;s Health</li>
          <li>Respiratory &amp; Critical Care</li>
          <li>Sterilization &amp; Infection Control</li>
          <li>Diagnostics &amp; Monitoring</li>
          <li>Surgical &amp; Procedure Equipment</li>
          <li>Pharmaceuticals &amp; Consumables</li>
        </ul>
        <p>Request a quote for any product — we respond within 24 hours. <a href="/contact" style="color:#2563eb">Contact us</a> for volume pricing and NGO discount rates.</p>
      </main>
    </div>
  `,
  "/about": `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; About
        </nav>
        <h1 style="font-size:2rem;margin:0 0 1rem">About VIA Global Health</h1>
        <p style="font-size:1.125rem;color:#374151;margin-bottom:1.5rem">VIA Global Health is a medical equipment and pharmaceutical supplier dedicated to improving healthcare access in low-resource settings across Africa, Asia, and Latin America.</p>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">Our Mission</h2>
        <p style="color:#374151;margin-bottom:1rem">We connect healthcare providers, distributors, and NGOs with quality medical equipment at fair prices. Every inquiry receives a personalised response within 24 hours — from single units to national tenders.</p>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">What We Do</h2>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          <li>Source and supply medical equipment from vetted manufacturers in China, India, the USA, and Europe</li>
          <li>Provide transparent, tiered pricing for distributors, healthcare providers, and NGOs</li>
          <li>Manage air and sea freight logistics to ports and facilities across Africa and Latin America</li>
          <li>Support procurement compliance for grant-funded and government healthcare programmes</li>
        </ul>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">Languages We Support</h2>
        <p style="color:#374151;margin-bottom:1rem">English, French, Portuguese, Swahili, and Spanish.</p>
        <p><a href="/contact" style="color:#2563eb;font-weight:600">Get in touch &rarr;</a></p>
      </main>
    </div>
  `,
  "/contact": `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; Contact
        </nav>
        <h1 style="font-size:2rem;margin:0 0 1rem">Contact VIA Global Health</h1>
        <p style="font-size:1.125rem;color:#374151;margin-bottom:1.5rem">Get in touch for product inquiries, quotes, shipping questions, or partnership opportunities. We respond to every message within 24 hours.</p>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">How to Reach Us</h2>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          <li>Use our online quote request system on any product page</li>
          <li>Email us directly for general inquiries</li>
          <li>Chat with Amara, our AI sales assistant, for immediate answers</li>
        </ul>
        <p style="color:#374151;margin-bottom:1rem">VIA Global Health serves customers in Africa, Asia, and Latin America. We offer support in English, French, Portuguese, Swahili, and Spanish.</p>
        <p><a href="/catalog" style="color:#2563eb;font-weight:600">Browse our product catalog &rarr;</a></p>
      </main>
    </div>
  `,
  "/privacy-policy": `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; Privacy Policy
        </nav>
        <h1 style="font-size:2rem;margin:0 0 1rem">Privacy Policy</h1>
        <p style="color:#374151;margin-bottom:1rem">This Privacy Policy describes how VIA Global Health collects, uses, and protects information provided when using our medical equipment catalog and quote request system.</p>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">Information We Collect</h2>
        <p style="color:#374151;margin-bottom:1rem">We collect information you provide when requesting quotes, including your name, email address, organisation name, and shipping country. We use this information solely to process your quote request and respond to your inquiry.</p>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">How We Use Your Information</h2>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          <li>To respond to product and pricing inquiries</li>
          <li>To generate quotes and proforma invoices</li>
          <li>To improve our catalog and service offerings</li>
        </ul>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">Contact</h2>
        <p style="color:#374151;margin-bottom:1rem">For privacy-related questions, please <a href="/contact" style="color:#2563eb">contact us</a>.</p>
      </main>
    </div>
  `,
  "/return-policy": `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; Return Policy
        </nav>
        <h1 style="font-size:2rem;margin:0 0 1rem">Return Policy</h1>
        <p style="color:#374151;margin-bottom:1rem">VIA Global Health is committed to customer satisfaction. This policy describes the conditions under which returns and refunds are accepted for medical equipment purchases.</p>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">Return Eligibility</h2>
        <p style="color:#374151;margin-bottom:1rem">Returns are considered for items that arrive damaged, defective, or significantly different from the product description. Please contact us within 14 days of delivery to initiate a return.</p>
        <h2 style="font-size:1.25rem;margin:1.5rem 0 0.75rem">Return Process</h2>
        <ol style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          <li>Contact VIA Global Health to report the issue and receive a return authorisation</li>
          <li>Repackage the item securely in its original packaging</li>
          <li>Ship the item back using a tracked courier service</li>
          <li>Refund or replacement will be processed within 30 days of receipt</li>
        </ol>
        <p><a href="/contact" style="color:#2563eb;font-weight:600">Contact us to start a return &rarr;</a></p>
      </main>
    </div>
  `,
};

const KNOWN_STATIC_ROUTES = new Set(Object.keys(STATIC_BODY));

function buildSpecsHtml(specifications: any): string {
  if (!specifications) return "";
  let entries: Array<[string, string]> = [];
  if (Array.isArray(specifications) && specifications.length > 0) {
    entries = specifications.slice(0, 12).map((s: any) => [String(s.name || ""), String(s.value || "")]);
  } else if (typeof specifications === "object") {
    const objEntries = Object.entries(specifications as Record<string, unknown>);
    if (objEntries.length > 0) {
      entries = objEntries.slice(0, 12).map(([k, v]) => [k, String(v ?? "")]);
    }
  }
  if (entries.length === 0) return "";
  return `<h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">Specifications</h2><ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">${
    entries.map(([name, value]) => `<li><strong>${escapeHtml(name)}</strong>: ${escapeHtml(value)}</li>`).join("")
  }</ul>`;
}

function buildProductBodyHtml(product: any, slug: string): string {
  const price = product.price ? `$${(product.price / 100).toFixed(2)}` : null;
  const priceHtml = price
    ? `<p style="font-size:1.125rem;font-weight:600;color:#1a1a2e;margin-bottom:0.75rem">From ${escapeHtml(price)} USD</p>`
    : "";
  const desc = product.description
    ? `<p style="color:#374151;margin-bottom:1rem">${escapeHtml(product.description.slice(0, 600))}${product.description.length > 600 ? "…" : ""}</p>`
    : "";
  const category = product.category
    ? `<p style="font-size:0.875rem;color:#6b7280;margin-bottom:0.5rem">Category: ${escapeHtml(product.category)}</p>`
    : "";
  const sku = product.sku
    ? `<p style="font-size:0.875rem;color:#6b7280;margin-bottom:0.5rem">SKU: ${escapeHtml(product.sku)}</p>`
    : "";

  const specsHtml = buildSpecsHtml(product.specifications);

  const faqs: any[] = Array.isArray(product.faqs) ? product.faqs : [];
  const faqsHtml = faqs.length > 0
    ? `<h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">Frequently Asked Questions</h2>${
        faqs.slice(0, 6).map((f: any) =>
          `<div style="margin-bottom:0.75rem"><strong style="color:#1a1a2e">${escapeHtml(f.question || "")}</strong><p style="color:#374151;margin:0.25rem 0 0">${escapeHtml(f.answer || "")}</p></div>`
        ).join("")
      }`
    : "";

  const docs: any[] = Array.isArray(product.documents) ? product.documents : [];
  const certs: any[] = Array.isArray(product.regulatoryCertificates) ? product.regulatoryCertificates : [];
  const allDocs = [...docs, ...certs];
  const docsHtml = allDocs.length > 0
    ? `<h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">Documents &amp; Certificates</h2><ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">${
        allDocs.map((d: any) => `<li><a href="${escapeHtml(d.url || "#")}" style="color:#2563eb">${escapeHtml(d.name || "Document")}</a></li>`).join("")
      }</ul>`
    : "";

  const productCategory = product.category || "";
  const relevantMarkets = MARKETS.filter(m =>
    m.relevantCategories.length === 0 || m.relevantCategories.includes(productCategory)
  );
  const marketsHtml = relevantMarkets.length > 0
    ? `<h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">Available in these markets</h2>
<p style="font-size:0.875rem;color:#6b7280;margin-bottom:0.75rem">VIA Global Health ships ${escapeHtml(product.name)} to healthcare providers, distributors, and NGOs across the following countries:</p>
<ul style="list-style:none;padding:0;margin:0 0 1rem;display:flex;flex-wrap:wrap;gap:0.5rem">${
  relevantMarkets.map(m =>
    `<li><a href="/markets/${m.slug}" style="display:inline-flex;align-items:center;gap:0.375rem;color:#2563eb;text-decoration:none;background:#f0f4ff;border:1px solid #c7d7f9;border-radius:0.5rem;padding:0.375rem 0.75rem;font-size:0.875rem;white-space:nowrap">${m.flag} ${escapeHtml(m.name)}</a></li>`
  ).join("")
}</ul>`
    : "";

  return `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; <a href="/catalog" style="color:#2563eb">Catalog</a> &rsaquo; ${escapeHtml(product.name)}
        </nav>
        <h1 style="font-size:1.75rem;margin:0 0 0.75rem">${escapeHtml(product.name)}</h1>
        ${category}${sku}${priceHtml}${desc}${specsHtml}${faqsHtml}${docsHtml}${marketsHtml}
        <p style="margin-top:1.5rem"><a href="/catalog" style="color:#2563eb">&larr; Back to catalog</a></p>
      </main>
    </div>
  `;
}

function buildMarketBodyHtml(market: MarketCountry): string {
  return `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; <a href="/markets" style="color:#2563eb">Markets</a> &rsaquo; ${escapeHtml(market.name)}
        </nav>
        <h1 style="font-size:1.75rem;margin:0 0 0.75rem">${market.flag} Medical Equipment for ${escapeHtml(market.name)}</h1>
        <p style="color:#374151;margin-bottom:1.5rem">${escapeHtml(market.healthContext)}</p>
        <h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">Procurement &amp; Import Information</h2>
        <p style="color:#374151;margin-bottom:1rem">${escapeHtml(market.importNote)}</p>
        <h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">Equipment Available for ${escapeHtml(market.name)}</h2>
        <p style="color:#374151;margin-bottom:1rem">VIA Global Health supplies thermocoagulators, colposcopes, CPAP devices, autoclaves, pulse oximeters, diagnostic equipment, and more to healthcare facilities in ${escapeHtml(market.name)}. All products include full documentation and warranty support.</p>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          <li>Quote response within 24 hours for all ${escapeHtml(market.name)} orders</li>
          <li>Air and sea freight options to ${escapeHtml(market.name)}</li>
          <li>Competitive pricing for distributors, healthcare providers, and NGOs</li>
          <li>Support in English, French, Portuguese, Swahili, and Spanish</li>
        </ul>
        <p><a href="/catalog" style="color:#2563eb;font-weight:600">Browse our full medical equipment catalog &rarr;</a></p>
        <p><a href="/contact" style="color:#2563eb">Contact us about ${escapeHtml(market.name)} procurement &rarr;</a></p>
        <p style="margin-top:1.5rem"><a href="/markets" style="color:#2563eb">&larr; View all market guides</a></p>
      </main>
    </div>
  `;
}

function buildMarketsIndexBodyHtml(): string {
  const countryLinks = MARKETS.map(m =>
    `<li><a href="/markets/${m.slug}" style="color:#2563eb">${m.flag} ${escapeHtml(m.name)}</a> &mdash; ${escapeHtml(m.subregion)}</li>`
  ).join("\n          ");

  return `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; Markets
        </nav>
        <h1 style="font-size:1.75rem;margin:0 0 0.75rem">Medical Equipment for Africa &amp; LMIC</h1>
        <p style="font-size:1rem;color:#374151;margin-bottom:1.5rem">VIA Global Health supplies quality medical equipment to healthcare providers, distributors, and NGOs across Africa and low- and middle-income countries. Browse country-specific procurement guides below.</p>
        <p style="color:#374151;margin-bottom:1rem">We ship thermocoagulators, CPAP devices, autoclaves, pulse oximeters, diagnostic tools, and more to healthcare facilities in over 30 countries. Each guide below provides local procurement context, import guidance, and links to request a quote.</p>
        <h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">Country Market Guides</h2>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          ${countryLinks}
        </ul>
        <p><a href="/catalog" style="color:#2563eb;font-weight:600">Browse our full medical equipment catalog &rarr;</a></p>
        <p><a href="/contact" style="color:#2563eb">Contact us for procurement in any market &rarr;</a></p>
      </main>
    </div>
  `;
}

async function buildCatalogBodyHtml(): Promise<string> {
  let productLinksHtml = "";
  try {
    const allProducts = await storage.getAllProducts();
    const active = allProducts.filter((p: any) => p.status !== "inactive");
    if (active.length > 0) {
      const byCategory: Record<string, any[]> = {};
      for (const p of active) {
        const cat = p.category || "Other";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(p);
      }
      productLinksHtml = Object.entries(byCategory).map(([cat, products]) => `
        <h2 style="font-size:1.125rem;margin:1.5rem 0 0.5rem">${escapeHtml(cat)}</h2>
        <ul style="color:#374151;padding-left:1.5rem;margin-bottom:1rem">
          ${products.map((p: any) => {
            const slug = slugify(p.name);
            const priceStr = p.price ? ` — From $${(p.price / 100).toFixed(2)} USD` : "";
            return `<li><a href="/products/${escapeHtml(slug)}" style="color:#2563eb">${escapeHtml(p.name)}</a>${escapeHtml(priceStr)}</li>`;
          }).join("")}
        </ul>`).join("");
    }
  } catch {
    productLinksHtml = "";
  }

  return `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;color:#6b7280;margin-bottom:1rem">
          <a href="/" style="color:#2563eb">Home</a> &rsaquo; Medical Products Catalog
        </nav>
        <h1 style="font-size:2rem;margin:0 0 1rem">Medical Products Catalog</h1>
        <p style="font-size:1.125rem;color:#374151;margin-bottom:1.5rem">Quality medical equipment for low-resource healthcare settings. Browse thermocoagulators, colposcopes, CPAP devices, autoclaves, pulse oximeters, diagnostic equipment, and more.</p>
        <p style="color:#374151;margin-bottom:1rem">All products include full documentation, CE marking where applicable, and warranty support. VIA Global Health ships to healthcare providers, distributors, and NGOs across Africa, Asia, and Latin America.</p>
        ${productLinksHtml}
        <p style="margin-top:1.5rem">Request a quote for any product — we respond within 24 hours. <a href="/contact" style="color:#2563eb">Contact us</a> for volume pricing and NGO discount rates.</p>
      </main>
    </div>
  `;
}

async function getProductForSlug(slug: string): Promise<any | null> {
  try {
    const allProducts = await storage.getAllProducts();
    return allProducts.find(p => slugify(p.name) === slug) || null;
  } catch {
    return null;
  }
}

async function getProductMeta(slug: string): Promise<PageMeta | null> {
  try {
    const product = await getProductForSlug(slug);
    if (!product) return null;

    const desc = product.description.length > 155
      ? product.description.slice(0, 155) + "..."
      : product.description;
    const canonicalUrl = `${SITE_URL}/products/${slug}`;
    const ogImage = product.imageUrl?.startsWith("http")
      ? product.imageUrl
      : `${SITE_URL}${product.imageUrl}`;

    const jsonLd: any = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      sku: product.sku,
      image: ogImage,
      url: canonicalUrl,
      category: product.category,
      brand: {
        "@type": "Brand",
        name: "VIA Global Health",
      },
      offers: {
        "@type": "Offer",
        availability: product.status === "active"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        priceCurrency: product.currency || "USD",
        price: (product.price / 100).toFixed(2),
        seller: {
          "@type": "Organization",
          name: "VIA Global Health",
        },
        areaServed: AREA_SERVED_COUNTRIES.map(c => ({ "@type": "Country", "name": c.name, "identifier": c.isoCode })),
      },
    };

    if (product.sellerName) {
      jsonLd.manufacturer = {
        "@type": "Organization",
        name: product.sellerName,
      };
    }

    if (product.shippingWeightKg) {
      jsonLd.weight = {
        "@type": "QuantitativeValue",
        value: product.shippingWeightKg,
        unitCode: "KGM",
      };
    }

    return {
      title: `${product.name} | VIA Global Health`,
      description: desc,
      canonicalUrl,
      ogType: "product",
      ogImage,
      jsonLd,
    };
  } catch {
    return null;
  }
}

const PAGE_META: Record<string, () => PageMeta> = {
  "/": () => ({
    title: "VIA Global Health - The Medical Equipment Partner That Responds",
    description: "From a single unit to a national tender, every inquiry gets the same attention. Quality medical equipment for Africa, Asia, and Latin America. Quote response within 24 hours.",
    canonicalUrl: SITE_URL,
    ogType: "website",
    ogImage: `${SITE_URL}/opengraph.jpg`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "VIA Global Health",
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
      description: "Quality medical equipment for low-resource settings. Serving distributors, NGOs, and healthcare providers across Africa, Asia, and Latin America.",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        availableLanguage: ["English", "French", "Portuguese", "Swahili", "Spanish"],
      },
      areaServed: AREA_SERVED_COUNTRIES.map(c => ({ "@type": "Country", "name": c.name, "identifier": c.isoCode })),
    },
  }),
  "/catalog": () => ({
    title: "Medical Products Catalog | VIA Global Health",
    description: "Browse our catalog of quality medical equipment: thermocoagulators, colposcopes, CPAP devices, autoclaves, and more. Designed for low-resource healthcare settings.",
    canonicalUrl: `${SITE_URL}/catalog`,
    ogType: "website",
    ogImage: `${SITE_URL}/opengraph.jpg`,
  }),
  "/about": () => ({
    title: "About VIA Global Health | Medical Equipment for Global Health",
    description: "VIA Global Health connects healthcare providers in low-resource settings with quality medical equipment. Learn about our mission, team, and impact.",
    canonicalUrl: `${SITE_URL}/about`,
    ogType: "website",
    ogImage: `${SITE_URL}/opengraph.jpg`,
  }),
  "/contact": () => ({
    title: "Contact Us | VIA Global Health",
    description: "Get in touch with VIA Global Health for medical equipment inquiries, quotes, and support. We respond to every inquiry within 24 hours.",
    canonicalUrl: `${SITE_URL}/contact`,
    ogType: "website",
    ogImage: `${SITE_URL}/opengraph.jpg`,
  }),
  "/privacy-policy": () => ({
    title: "Privacy Policy | VIA Global Health",
    description: "Read VIA Global Health's privacy policy to understand how we collect, use, and protect your personal information when you interact with our medical equipment catalog and quote system.",
    canonicalUrl: `${SITE_URL}/privacy-policy`,
    ogType: "website",
    ogImage: `${SITE_URL}/opengraph.jpg`,
  }),
  "/return-policy": () => ({
    title: "Return Policy | VIA Global Health",
    description: "Learn about VIA Global Health's return and refund policy for medical equipment purchases, including eligibility, timelines, and the process for returns.",
    canonicalUrl: `${SITE_URL}/return-policy`,
    ogType: "website",
    ogImage: `${SITE_URL}/opengraph.jpg`,
  }),
};

function firstSentence(text: string, maxLen = 155): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  const sentence = match ? match[0].trim() : text.slice(0, maxLen);
  return sentence.length > maxLen ? sentence.slice(0, maxLen - 1) + "…" : sentence;
}

function isAdminRoute(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

export interface RouteResolution {
  status: 200 | 404;
  html: string;
}

export async function resolvePublicRoute(html: string, url: string): Promise<RouteResolution> {
  const reqPath = url.split("?")[0] || "/";
  const normalizedPath = reqPath === "" ? "/" : reqPath;

  if (isAdminRoute(normalizedPath)) {
    return { status: 200, html };
  }

  if (normalizedPath === "/track-quote") {
    let result = html;
    result = result.replace("</head>", `  <meta name="robots" content="noindex, nofollow" />\n  </head>`);
    return { status: 200, html: result };
  }

  try {
    const productMatch = normalizedPath.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      const slug = productMatch[1];
      const product = await getProductForSlug(slug);
      if (!product) {
        const notFoundHtml = build404Html(html);
        return { status: 404, html: notFoundHtml };
      }
      const meta = await getProductMeta(slug);
      let result = html;
      if (meta) {
        result = injectMetaIntoHtml(result, meta);
      }
      result = injectBodyContent(result, buildProductBodyHtml(product, slug));
      return { status: 200, html: result };
    }

    if (normalizedPath === "/markets") {
      const meta: PageMeta = {
        title: "Medical Equipment for Africa & LMIC | VIA Global Health",
        description: "VIA Global Health supplies quality medical equipment to healthcare providers, distributors, and NGOs across Africa and low- and middle-income countries. Browse procurement guides by country.",
        canonicalUrl: `${SITE_URL}/markets`,
        ogType: "website",
        ogImage: `${SITE_URL}/opengraph.jpg`,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Medical Equipment for Africa & LMIC",
          url: `${SITE_URL}/markets`,
          description: "VIA Global Health supplies quality medical equipment to healthcare providers, distributors, and NGOs across Africa and low- and middle-income countries.",
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, item: { "@type": "WebPage", "@id": SITE_URL, name: "Home" } },
              { "@type": "ListItem", position: 2, item: { "@type": "WebPage", "@id": `${SITE_URL}/markets`, name: "Markets" } },
            ],
          },
        },
      };
      let result = injectMetaIntoHtml(html, meta);
      result = injectBodyContent(result, buildMarketsIndexBodyHtml());
      return { status: 200, html: result };
    }

    const marketMatch = normalizedPath.match(/^\/markets\/([^/]+)$/);
    if (marketMatch) {
      const slug = marketMatch[1];
      const market = MARKETS.find(m => m.slug === slug);
      if (!market) {
        return { status: 404, html: build404Html(html) };
      }
      const meta: PageMeta = {
        title: `Medical Equipment for ${market.name} | VIA Global Health`,
        description: firstSentence(market.healthContext),
        canonicalUrl: `${SITE_URL}/markets/${market.slug}`,
        ogType: "website",
        ogImage: `${SITE_URL}/opengraph.jpg`,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Medical Equipment for ${market.name}`,
          url: `${SITE_URL}/markets/${market.slug}`,
          description: market.healthContext.slice(0, 200),
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, item: { "@type": "WebPage", "@id": SITE_URL, name: "Home" } },
              { "@type": "ListItem", position: 2, item: { "@type": "WebPage", "@id": `${SITE_URL}/markets`, name: "Markets" } },
              { "@type": "ListItem", position: 3, item: { "@type": "WebPage", "@id": `${SITE_URL}/markets/${market.slug}`, name: `Medical Equipment for ${market.name}` } },
            ],
          },
        },
      };
      const geoTags = `<meta name="geo.region" content="${escapeHtml(market.geoRegion)}" />\n    <meta name="geo.placename" content="${escapeHtml(market.name)}" />`;
      let result = injectMetaIntoHtml(html, meta, geoTags);
      result = injectBodyContent(result, buildMarketBodyHtml(market));
      return { status: 200, html: result };
    }

    if (normalizedPath === "/catalog") {
      const metaFn = PAGE_META["/catalog"];
      let result = html;
      if (metaFn) {
        result = injectMetaIntoHtml(result, metaFn());
      }
      const catalogBody = await buildCatalogBodyHtml();
      result = injectBodyContent(result, catalogBody);
      return { status: 200, html: result };
    }

    if (KNOWN_STATIC_ROUTES.has(normalizedPath)) {
      const metaFn = PAGE_META[normalizedPath];
      let result = html;
      if (metaFn) {
        const heroPreload = normalizedPath === "/"
          ? `<link rel="preload" as="image" href="/images/hero/african-healthcare-hero.jpg" fetchpriority="high" />`
          : undefined;
        result = injectMetaIntoHtml(result, metaFn(), heroPreload);
      }
      result = injectBodyContent(result, STATIC_BODY[normalizedPath]);
      return { status: 200, html: result };
    }

    const notFoundHtml = build404Html(html);
    return { status: 404, html: notFoundHtml };
  } catch (err) {
    console.error("Error resolving public route:", err);
    return { status: 200, html };
  }
}

function build404Html(html: string): string {
  const meta: PageMeta = {
    title: "Page Not Found | VIA Global Health",
    description: "The page you are looking for does not exist. Browse VIA Global Health's medical equipment catalog.",
    canonicalUrl: `${SITE_URL}/404`,
    ogType: "website",
    ogImage: `${SITE_URL}/opengraph.jpg`,
  };
  const bodyHtml = `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:2rem 1rem">
      <header>
        <a href="/" style="font-size:1.5rem;font-weight:700;color:#1a1a2e;text-decoration:none">VIA Global Health</a>
      </header>
      <main>
        <h1 style="font-size:2rem;margin:2rem 0 1rem">404 — Page Not Found</h1>
        <p style="color:#374151;margin-bottom:1.5rem">The page you are looking for does not exist or may have been moved.</p>
        <p><a href="/catalog" style="color:#2563eb;font-weight:600">Browse our medical equipment catalog &rarr;</a></p>
      </main>
    </div>
  `;
  let result = injectMetaIntoHtml(html, meta);
  result = injectBodyContent(result, bodyHtml);
  return result;
}

export async function injectSeoMeta(html: string, url: string): Promise<string> {
  const reqPath = url.split("?")[0];

  try {
    const productMatch = reqPath.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      const meta = await getProductMeta(productMatch[1]);
      if (meta) {
        return injectMetaIntoHtml(html, meta);
      }
    }

    const normalizedPath = reqPath === "" ? "/" : reqPath;
    const metaFn = PAGE_META[normalizedPath];
    if (metaFn) {
      const heroPreload = normalizedPath === "/"
        ? `<link rel="preload" as="image" href="/images/hero/african-healthcare-hero.jpg" fetchpriority="high" />`
        : undefined;
      return injectMetaIntoHtml(html, metaFn(), heroPreload);
    }
  } catch (err) {
    console.error("Error injecting SEO meta:", err);
  }

  return html;
}
