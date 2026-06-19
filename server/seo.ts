import { storage } from "./storage";

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

function injectMetaIntoHtml(html: string, meta: PageMeta): string {
  const titleTag = `<title>${escapeHtml(meta.title)}</title>`;
  const metaTags = buildMetaTags(meta);
  const jsonLdTag = meta.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
    : "";

  let result = html;

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

  result = result.replace(
    "</head>",
    `    ${metaTags}\n    ${jsonLdTag}\n  </head>`
  );

  return result;
}

async function getProductMeta(slug: string): Promise<PageMeta | null> {
  try {
    const allProducts = await storage.getAllProducts();
    const product = allProducts.find(p => slugify(p.name) === slug);
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
      return injectMetaIntoHtml(html, metaFn());
    }
  } catch (err) {
    console.error("Error injecting SEO meta:", err);
  }

  return html;
}
