import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { db } from '../db';
import { products } from '@shared/schema';
import { eq } from 'drizzle-orm';

const DOCS_BASE_DIR = join(process.cwd(), 'client', 'public', 'documents', 'products');
const THUMBS_DIR = join(process.cwd(), 'client', 'public', 'images', 'products', 'thumbnails');

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').toLowerCase();
}

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  try {
    if (!url || !url.startsWith('http')) return false;
    if (existsSync(destPath)) {
      console.log(`  [skip] Already exists: ${destPath.split('/').pop()}`);
      return true;
    }
    const dir = join(destPath, '..');
    mkdirSync(dir, { recursive: true });
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': 'ab-test-variant=standard',
      }
    });
    if (!response.ok) {
      console.log(`  [fail] HTTP ${response.status}: ${url}`);
      return false;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const header = buffer.slice(0, 50).toString('utf-8').toLowerCase();
    if (header.includes('<!doctype') || header.includes('<html')) {
      console.log(`  [fail] Got HTML instead of file: ${url}`);
      return false;
    }
    writeFileSync(destPath, buffer);
    console.log(`  [ok] Downloaded: ${destPath.split('/').pop()} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.log(`  [error] ${url}: ${err}`);
    return false;
  }
}

async function downloadPdf(url: string, skuDir: string, filename: string): Promise<string | null> {
  const dir = join(DOCS_BASE_DIR, skuDir);
  mkdirSync(dir, { recursive: true });
  let ext: string;
  try {
    ext = extname(new URL(url).pathname).toLowerCase() || '.pdf';
  } catch {
    ext = '.pdf';
  }
  const safeName = sanitizeFilename(filename) + ext;
  const destPath = join(dir, safeName);
  const ok = await downloadFile(url, destPath);
  return ok ? `/documents/products/${skuDir}/${safeName}` : null;
}

async function downloadThumbnail(url: string, prefix: string, index: number): Promise<string | null> {
  mkdirSync(THUMBS_DIR, { recursive: true });
  let ext: string;
  try {
    ext = extname(new URL(url).pathname).toLowerCase() || '.jpg';
  } catch {
    ext = '.jpg';
  }
  const safeName = `${sanitizeFilename(prefix)}-thumb-${index}${ext}`;
  const destPath = join(THUMBS_DIR, safeName);
  const ok = await downloadFile(url, destPath);
  return ok ? `/images/products/thumbnails/${safeName}` : null;
}

interface EnrichmentData {
  sellerName?: string;
  sellerLocation?: string;
  warrantyTerm?: string;
  warrantyText?: string;
  regulatoryApproval?: string;
  minimumOrderQuantity?: number;
  estimatedLifespan?: string;
  salesRestrictions?: { cantShipTo: string[]; cantSellTo: string[] };
  leadTimeDays?: number;
  standardAccessories?: string[];
  optionalAccessories?: { name: string; productUrl?: string }[];
  boxContents?: string[];
  testimonials?: { quote: string; author: string; organization: string }[];
  videos?: { title: string; url: string }[];
  tags?: string[];
  buyersGuideUrl?: string;
  faqs?: { question: string; answer: string }[];
  description?: string;
  keyFeatures?: string[];
  specifications?: Record<string, string>;
  rawDocuments?: { name: string; url: string; thumbUrl?: string }[];
  rawCertificates?: { name: string; url: string; thumbUrl?: string }[];
  rawStudies?: { title: string; url: string }[];
}

function extractDataFromHtml(html: string, sourceUrl: string): EnrichmentData {
  const $ = cheerio.load(html);
  const result: EnrichmentData = {};
  const baseUrl = 'https://viaglobalhealth.com';

  // --- Extract seller info from meta description or short-desc area ---
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const bulletItems = metaDesc.split('•').map(s => s.trim()).filter(s => s.length > 0);
  const metaMap: Record<string, string> = {};
  bulletItems.forEach(item => {
    const colonIdx = item.indexOf(':');
    if (colonIdx > 0) {
      const key = item.substring(0, colonIdx).trim();
      const val = item.substring(colonIdx + 1).trim();
      metaMap[key] = val;
    }
  });

  if (metaMap['Minimum Order Quantity (MOQ)']) {
    const parsed = parseInt(metaMap['Minimum Order Quantity (MOQ)'].replace(/\D/g, ''));
    if (parsed) result.minimumOrderQuantity = parsed;
  }
  result.estimatedLifespan = metaMap['Estimated Lifespan'] || undefined;
  result.sellerName = metaMap['Seller Name'] || undefined;
  result.sellerLocation = metaMap['Seller Location'] || undefined;
  result.warrantyTerm = metaMap['Warranty Term'] || undefined;
  result.regulatoryApproval = metaMap['Regulatory Approval'] || undefined;

  // --- Helper: Find content following a Divi H2 heading ---
  // In Divi, H2 is inside: <div class="et_pb_text_inner"><h2>Title</h2></div>
  // The content is in the NEXT .et_pb_module sibling of the H2's parent module
  function findDiviSection(headingText: string): { headingModule: cheerio.Cheerio<cheerio.AnyNode>, contentModules: cheerio.Cheerio<cheerio.AnyNode>[] } | null {
    let found: { headingModule: cheerio.Cheerio<cheerio.AnyNode>, contentModules: cheerio.Cheerio<cheerio.AnyNode>[] } | null = null;
    $('h2').each((_, el) => {
      if (found) return;
      const t = $(el).text().trim().toLowerCase();
      if (t.includes(headingText.toLowerCase())) {
        const headingModule = $(el).closest('.et_pb_module');
        if (!headingModule.length) return;
        const contentModules: cheerio.Cheerio<cheerio.AnyNode>[] = [];
        let sibling = headingModule.next();
        while (sibling.length) {
          if (sibling.find('h2').length > 0 && sibling.hasClass('et_pb_text')) break;
          contentModules.push(sibling);
          sibling = sibling.next();
        }
        found = { headingModule, contentModules };
      }
    });
    return found;
  }

  function findDiviSectionRow(headingText: string): cheerio.Cheerio<cheerio.AnyNode> | null {
    let found: cheerio.Cheerio<cheerio.AnyNode> | null = null;
    $('h2').each((_, el) => {
      if (found) return;
      const t = $(el).text().trim().toLowerCase();
      if (t.includes(headingText.toLowerCase())) {
        const row = $(el).closest('.et_pb_row');
        if (row.length) {
          found = row;
        }
      }
    });
    return found;
  }

  // --- Description ---
  const descSection = findDiviSection('description');
  if (descSection && descSection.contentModules.length > 0) {
    const descTexts: string[] = [];
    descSection.contentModules.forEach(mod => {
      mod.find('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20 && !text.includes('Minimum Order Quantity') && !text.includes('Seller Name')) {
          descTexts.push(text);
        }
      });
    });
    if (descTexts.length > 0) result.description = descTexts.join('\n\n');

    descSection.contentModules.forEach(mod => {
      const buyersGuide = mod.find('a[href*="buyers-guide"], a[href*="buyers_guide"]');
      if (buyersGuide.length) {
        let href = buyersGuide.attr('href') || '';
        if (href.startsWith('/')) href = baseUrl + href;
        result.buyersGuideUrl = href;
      }
    });
  }

  // --- Important Purchasing Info (sales restrictions, lead time, shipping dims) ---
  const purchInfoSection = findDiviSection('important purchasing');
  if (purchInfoSection) {
    const cantShipTo: string[] = [];
    const cantSellTo: string[] = [];
    purchInfoSection.contentModules.forEach(mod => {
      const tabContents = mod.find('.et_pb_tab_content');
      tabContents.each((_, el) => {
        const text = $(el).text().trim();
        const shipMatch = text.match(/Unable to ship to:\s*(.+)/i);
        if (shipMatch) {
          cantShipTo.push(...shipMatch[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(s => s.length > 1));
        }
        const sellMatch = text.match(/Unable to (?:sell|Sell) to:\s*(.+)/i);
        if (sellMatch) {
          cantSellTo.push(...sellMatch[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(s => s.length > 1));
        }
        const leadMatch = text.match(/^(\d+)\s*days?/i);
        if (leadMatch) {
          result.leadTimeDays = parseInt(leadMatch[1]);
        }
      });

      const tabText = mod.text();
      if (!result.leadTimeDays) {
        const match = tabText.match(/(\d+)\s*days?/i);
        if (match) result.leadTimeDays = parseInt(match[1]);
      }
    });
    result.salesRestrictions = { cantShipTo, cantSellTo };
  }

  // Also check no_ship_country divs (sometimes outside the tabs)
  const noShipDivs = $('.no_ship_country');
  if (noShipDivs.length > 0) {
    if (!result.salesRestrictions) result.salesRestrictions = { cantShipTo: [], cantSellTo: [] };
    noShipDivs.each((_, el) => {
      const country = $(el).text().trim();
      if (country && !result.salesRestrictions!.cantShipTo.includes(country)) {
        result.salesRestrictions!.cantShipTo.push(country);
      }
    });
  }

  // --- Key Features ---
  const featSection = findDiviSection('key features');
  if (featSection && featSection.contentModules.length > 0) {
    const features: string[] = [];
    featSection.contentModules.forEach(mod => {
      mod.find('p').each((_, el) => {
        const strong = $(el).find('strong');
        if (strong.length) {
          const title = strong.first().text().trim();
          const fullText = $(el).text().trim();
          const desc = fullText.replace(title, '').trim();
          if (title) features.push(desc ? `${title} - ${desc}` : title);
        }
      });
    });
    if (features.length > 0) result.keyFeatures = features;
  }

  // --- Specifications ---
  const specSection = findDiviSection('specifications');
  if (specSection && specSection.contentModules.length > 0) {
    const specs: Record<string, string> = {};
    specSection.contentModules.forEach(mod => {
      const inner = mod.find('.et_pb_text_inner');
      if (!inner.length) return;
      const strongEls = inner.find('strong, p > strong');
      strongEls.each((_, el) => {
        const category = $(el).text().trim();
        if (!category || category.length < 2) return;
        const parentP = $(el).closest('p');
        let nextEl = parentP.length ? parentP.next() : $(el).parent().next();
        const items: string[] = [];
        while (nextEl.length) {
          if (nextEl.find('strong').length > 0 && nextEl.prop('tagName')?.toLowerCase() === 'p') break;
          if (nextEl.prop('tagName')?.toLowerCase() === 'ul') {
            nextEl.find('li').each((_, li) => {
              const text = $(li).text().trim();
              if (text) items.push(text);
            });
            break;
          }
          const text = nextEl.text().trim();
          if (text) items.push(text);
          nextEl = nextEl.next();
        }
        if (items.length > 0) {
          specs[category] = items.map(i => `• ${i.replace(/^[•\-]\s*/, '')}`).join('\n');
        }
      });
    });
    if (Object.keys(specs).length > 0) result.specifications = specs;
  }

  // --- Standard Accessories ---
  const stdAccSection = findDiviSection('standard accessories');
  if (stdAccSection && stdAccSection.contentModules.length > 0) {
    const items: string[] = [];
    stdAccSection.contentModules.forEach(mod => {
      mod.find('li').each((_, el) => {
        const text = $(el).text().trim();
        if (text) items.push(text);
      });
      if (items.length === 0) {
        const text = mod.find('.et_pb_text_inner').text().trim();
        text.split('\n').forEach(line => {
          const t = line.trim();
          if (t.length > 0) items.push(t);
        });
      }
    });
    if (items.length > 0) result.standardAccessories = items;
  }

  // --- Optional Accessories ---
  const optAccSection = findDiviSection('optional accessories');
  if (optAccSection && optAccSection.contentModules.length > 0) {
    const items: { name: string; productUrl?: string }[] = [];
    optAccSection.contentModules.forEach(mod => {
      mod.find('li').each((_, el) => {
        const link = $(el).find('a');
        if (link.length) {
          const name = link.text().trim();
          let url = link.attr('href') || '';
          if (url.startsWith('/')) url = baseUrl + url;
          if (name) items.push({ name, productUrl: url || undefined });
        } else {
          const text = $(el).text().trim();
          if (text) items.push({ name: text });
        }
      });
    });
    if (items.length > 0) result.optionalAccessories = items;
  }

  // --- Documents, Certificates (Divi blurb modules with et_link_options_data) ---
  const linkOptionsMatch = html.match(/var\s+et_link_options_data\s*=\s*(\[[\s\S]*?\]);/);
  const linkOptionsMap: Record<string, { url: string; target: string }> = {};
  if (linkOptionsMatch) {
    try {
      const linkOptions = JSON.parse(linkOptionsMatch[1]) as { class: string; url: string; target: string }[];
      linkOptions.forEach(opt => {
        linkOptionsMap[opt.class] = { url: opt.url, target: opt.target };
      });
    } catch {}
  }

  function extractBlurbs(headingText: string): { name: string; url: string; thumbUrl?: string }[] {
    const items: { name: string; url: string; thumbUrl?: string }[] = [];
    const headingRow = findDiviSectionRow(headingText);
    if (!headingRow) return items;

    let nextRow = headingRow.next('.et_pb_row');
    if (!nextRow.length) return items;

    nextRow.find('.et_pb_blurb').each((_, el) => {
      const blurbEl = $(el);
      const classes = blurbEl.attr('class') || '';
      const blurbClass = classes.split(/\s+/).find(c => /^et_pb_blurb_\d+$/.test(c));
      const title = blurbEl.find('.et_pb_module_header span, .et_pb_module_header, h4').first().text().trim();
      const thumb = blurbEl.find('img').first().attr('src');
      let pdfUrl = '#';
      if (blurbClass && linkOptionsMap[blurbClass]) {
        pdfUrl = baseUrl + linkOptionsMap[blurbClass].url;
      }
      if (title) {
        items.push({ name: title, url: pdfUrl, thumbUrl: thumb });
      }
    });
    return items;
  }

  const rawDocs = extractBlurbs('product documents');
  if (rawDocs.length > 0) result.rawDocuments = rawDocs;

  const rawCerts = extractBlurbs('regulatory certificates');
  if (rawCerts.length > 0) result.rawCertificates = rawCerts;

  // --- Videos ---
  const allIframes: { title: string; url: string }[] = [];
  $('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"]').each((i, el) => {
    const src = $(el).attr('src');
    if (src) {
      allIframes.push({ title: `Video ${i + 1}`, url: src });
    }
  });
  if (allIframes.length > 0) result.videos = allIframes;

  // --- Testimonials ---
  // Testimonials are in a row after the heading row — need to check next row(s)
  const testimRow = findDiviSectionRow('testimonials');
  if (testimRow) {
    const testis: { quote: string; author: string; organization: string }[] = [];
    let nextRow = testimRow.next('.et_pb_row');
    while (nextRow.length && testis.length < 20) {
      if (nextRow.find('h2').length > 0) break;
      nextRow.find('.et_pb_text_inner').each((_, el) => {
        const textInner = $(el);
        const fullText = textInner.text().trim();
        if (!fullText || fullText.length < 20) return;

        const quoteMatch = fullText.match(/[\u201c""\u201e](.+?)[\u201d""\u201f]/s);
        if (quoteMatch) {
          const quote = quoteMatch[1].trim();
          const afterQuote = fullText.substring(fullText.indexOf(quoteMatch[0]) + quoteMatch[0].length).trim();
          if (afterQuote && quote.length > 10) {
            const parts = afterQuote.split(',');
            const author = parts[0]?.trim().replace(/^[-–—\s]+/, '') || 'Anonymous';
            const org = parts.slice(1).join(',').trim();
            testis.push({ quote, author, organization: org });
          }
        }
      });
      nextRow = nextRow.next('.et_pb_row');
    }
    if (testis.length > 0) result.testimonials = testis;
  }

  // --- FAQs ---
  const faqItems: { question: string; answer: string }[] = [];
  $('.et_pb_accordion .et_pb_toggle, .et_pb_accordion .et_pb_accordion_item').each((_, el) => {
    const question = $(el).find('.et_pb_toggle_title').text().trim();
    const answer = $(el).find('.et_pb_toggle_content').text().trim();
    if (question && answer && !answer.toLowerCase().includes('not available at this time')) {
      faqItems.push({ question, answer });
    }
  });
  if (faqItems.length > 0) result.faqs = faqItems;

  // --- Studies & Trials ---
  const studiesSection = findDiviSection('studies');
  if (studiesSection && studiesSection.contentModules.length > 0) {
    const studies: { title: string; url: string }[] = [];
    studiesSection.contentModules.forEach(mod => {
      mod.find('a').each((_, el) => {
        const title = $(el).text().trim();
        let url = $(el).attr('href') || '';
        if (url.startsWith('/')) url = baseUrl + url;
        if (title && url && title.length > 3) studies.push({ title, url });
      });
    });

    // Also check the next row for study links
    const studyRow = findDiviSectionRow('studies');
    if (studyRow) {
      let nextRow = studyRow.next('.et_pb_row');
      while (nextRow.length && studies.length < 20) {
        if (nextRow.find('h2').length > 0) break;
        nextRow.find('a[href*=".pdf"], a[href*="pubmed"], a[href*="ncbi"], a[href*="doi.org"]').each((_, el) => {
          const title = $(el).text().trim();
          let url = $(el).attr('href') || '';
          if (url.startsWith('/')) url = baseUrl + url;
          if (title && url) studies.push({ title, url });
        });
        nextRow = nextRow.next('.et_pb_row');
      }
    }

    if (studies.length > 0) result.rawStudies = studies;
  }

  // --- Box Contents ---
  const boxSection = findDiviSection('box contents');
  if (!boxSection) {
    const altBox = findDiviSection('package contents');
    if (altBox && altBox.contentModules.length > 0) {
      extractBoxContents(altBox, $, result);
    }
  } else if (boxSection.contentModules.length > 0) {
    extractBoxContents(boxSection, $, result);
  }

  // --- Warranty ---
  const warrantySection = findDiviSection('warranty');
  if (warrantySection && warrantySection.contentModules.length > 0) {
    const texts: string[] = [];
    warrantySection.contentModules.forEach(mod => {
      mod.find('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10 && !text.toLowerCase().includes('not available')) {
          texts.push(text);
        }
      });
    });
    if (texts.length > 0) result.warrantyText = texts.join('\n\n');
  }

  // --- Tags ---
  const tagList: string[] = [];
  $('a[rel="tag"]').each((_, el) => {
    const tag = $(el).text().trim();
    if (tag) tagList.push(tag);
  });
  if (tagList.length > 0) result.tags = tagList;

  return result;
}

function extractBoxContents(section: { contentModules: cheerio.Cheerio<cheerio.AnyNode>[] }, $: cheerio.CheerioAPI, result: EnrichmentData) {
  const items: string[] = [];
  section.contentModules.forEach(mod => {
    mod.find('li').each((_, el) => {
      const text = $(el).text().trim();
      if (text) items.push(text);
    });
    if (items.length === 0) {
      mod.find('.et_pb_text_inner').each((_, el) => {
        $(el).text().trim().split('\n').forEach(line => {
          const t = line.trim();
          if (t.length > 0) items.push(t);
        });
      });
    }
  });
  if (items.length > 0) result.boxContents = items;
}

export async function enrichProduct(productSku: string, sourceUrl: string): Promise<void> {
  console.log(`\n=== Enriching product: ${productSku} ===`);
  console.log(`Source: ${sourceUrl}`);

  const [product] = await db.select().from(products).where(eq(products.sku, productSku));
  if (!product) {
    console.log(`Product not found with SKU: ${productSku}`);
    return;
  }

  const skuDir = sanitizeFilename(productSku.replace('SKU: ', ''));
  console.log(`Product found: ${product.name} (ID: ${product.id})`);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': 'ab-test-variant=standard',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    if (!response.ok) {
      console.log(`Failed to fetch page: HTTP ${response.status}`);
      return;
    }
    const html = await response.text();
    console.log(`  Page HTML size: ${(html.length / 1024).toFixed(1)} KB`);
    if (html.length < 10000) {
      console.log('  WARNING: Page too small, might be redirect/block. Skipping.');
      return;
    }
    const data = extractDataFromHtml(html, sourceUrl);

    console.log('\n--- Extracted data summary ---');
    console.log(`  Seller: ${data.sellerName || 'N/A'} (${data.sellerLocation || 'N/A'})`);
    console.log(`  MOQ: ${data.minimumOrderQuantity || 'N/A'}`);
    console.log(`  Warranty: ${data.warrantyTerm || 'N/A'}`);
    console.log(`  Regulatory: ${data.regulatoryApproval || 'N/A'}`);
    console.log(`  Lifespan: ${data.estimatedLifespan || 'N/A'}`);
    console.log(`  Description: ${data.description ? data.description.slice(0, 80) + '...' : 'N/A'}`);
    console.log(`  Key Features: ${data.keyFeatures?.length || 0}`);
    console.log(`  Specifications: ${data.specifications ? Object.keys(data.specifications).length : 0} categories`);
    console.log(`  Standard Accessories: ${data.standardAccessories?.length || 0}`);
    console.log(`  Optional Accessories: ${data.optionalAccessories?.length || 0}`);
    console.log(`  Box Contents: ${data.boxContents?.length || 0}`);
    console.log(`  Documents: ${data.rawDocuments?.length || 0}`);
    console.log(`  Certificates: ${data.rawCertificates?.length || 0}`);
    console.log(`  Videos: ${data.videos?.length || 0}`);
    console.log(`  Testimonials: ${data.testimonials?.length || 0}`);
    console.log(`  FAQs: ${data.faqs?.length || 0}`);
    console.log(`  Studies: ${data.rawStudies?.length || 0}`);
    console.log(`  Tags: ${data.tags?.length || 0}`);
    console.log(`  Warranty text: ${data.warrantyText ? 'yes (' + data.warrantyText.length + ' chars)' : 'no'}`);
    console.log(`  Buyers guide: ${data.buyersGuideUrl || 'none'}`);
    console.log(`  Sales restrictions: ship=${data.salesRestrictions?.cantShipTo?.length || 0}, sell=${data.salesRestrictions?.cantSellTo?.length || 0}`);
    console.log(`  Lead time: ${data.leadTimeDays || 'N/A'} days`);

    console.log('\n--- Downloading PDFs and thumbnails ---');

    const finalDocuments: { name: string; url: string }[] = [];
    if (data.rawDocuments) {
      for (let i = 0; i < data.rawDocuments.length; i++) {
        const doc = data.rawDocuments[i];
        if (doc.url && doc.url !== '#' && (doc.url.includes('.pdf') || doc.url.includes('.PDF'))) {
          const localPath = await downloadPdf(doc.url, skuDir, doc.name);
          if (localPath) {
            finalDocuments.push({ name: doc.name, url: localPath });
          }
        }
        if (doc.thumbUrl) {
          const thumbPath = await downloadThumbnail(doc.thumbUrl, `${skuDir}-doc`, i);
          if (thumbPath) {
            const existing = finalDocuments[finalDocuments.length - 1];
            if (existing) (existing as any).thumbnailUrl = thumbPath;
          }
        }
      }
    }

    const finalCertificates: { name: string; url: string; thumbnailUrl?: string }[] = [];
    if (data.rawCertificates) {
      for (let i = 0; i < data.rawCertificates.length; i++) {
        const cert = data.rawCertificates[i];
        let localUrl = cert.url;
        if (cert.url && cert.url !== '#' && (cert.url.includes('.pdf') || cert.url.includes('.PDF'))) {
          const downloaded = await downloadPdf(cert.url, skuDir, `cert-${cert.name}`);
          if (downloaded) localUrl = downloaded;
        }
        let localThumb: string | undefined;
        if (cert.thumbUrl) {
          const thumbPath = await downloadThumbnail(cert.thumbUrl, `${skuDir}-cert`, i);
          if (thumbPath) localThumb = thumbPath;
        }
        finalCertificates.push({ name: cert.name, url: localUrl, thumbnailUrl: localThumb });
      }
    }

    const finalStudies: { title: string; url: string }[] = [];
    if (data.rawStudies) {
      for (const study of data.rawStudies) {
        if (study.url && (study.url.includes('.pdf') || study.url.includes('.PDF'))) {
          const localPath = await downloadPdf(study.url, skuDir, study.title);
          finalStudies.push({ title: study.title, url: localPath || study.url });
        } else {
          finalStudies.push(study);
        }
      }
    }

    console.log('\n--- Updating database ---');
    const updateData: Record<string, any> = {};

    if (data.sellerName) updateData.sellerName = data.sellerName;
    if (data.sellerLocation) updateData.sellerLocation = data.sellerLocation;
    if (data.warrantyTerm) updateData.warrantyTerm = data.warrantyTerm;
    if (data.warrantyText) updateData.warrantyText = data.warrantyText;
    if (data.regulatoryApproval) updateData.regulatoryApproval = data.regulatoryApproval;
    if (data.minimumOrderQuantity) updateData.minimumOrderQuantity = data.minimumOrderQuantity;
    if (data.estimatedLifespan) updateData.estimatedLifespan = data.estimatedLifespan;
    if (data.salesRestrictions) updateData.salesRestrictions = data.salesRestrictions;
    if (data.leadTimeDays) updateData.leadTimeDays = data.leadTimeDays;
    if (data.standardAccessories?.length) updateData.standardAccessories = data.standardAccessories;
    if (data.optionalAccessories?.length) updateData.optionalAccessories = data.optionalAccessories;
    if (data.boxContents?.length) updateData.boxContents = data.boxContents;
    if (data.testimonials?.length) updateData.testimonials = data.testimonials;
    if (data.videos?.length) updateData.videos = data.videos;
    if (data.tags?.length) updateData.tags = data.tags;
    if (data.buyersGuideUrl) updateData.buyersGuideUrl = data.buyersGuideUrl;
    if (data.faqs?.length) updateData.faqs = data.faqs;
    if (data.description) updateData.description = data.description;
    if (data.keyFeatures?.length) updateData.keyFeatures = data.keyFeatures;
    if (data.specifications && Object.keys(data.specifications).length > 0) updateData.specifications = data.specifications;
    if (finalDocuments.length > 0) updateData.documents = finalDocuments;
    if (finalCertificates.length > 0) updateData.regulatoryCertificates = finalCertificates;
    if (finalStudies.length > 0) updateData.studiesAndTrials = finalStudies;

    if (Object.keys(updateData).length > 0) {
      await db.update(products).set(updateData).where(eq(products.id, product.id));
      console.log(`  Updated ${Object.keys(updateData).length} fields: ${Object.keys(updateData).join(', ')}`);
    } else {
      console.log('  No new data to update');
    }

    console.log(`\n=== Done enriching ${product.name} ===\n`);
  } catch (err) {
    console.error(`Error enriching product ${productSku}:`, err);
  }
}

const PRODUCT_URL_MAP: Record<string, string> = {
  'SKU: HTU-110C': 'https://viaglobalhealth.com/product/thermocoagulator/',
  'SKU: VIA_Ellavi': 'https://viaglobalhealth.com/product/ellavi-free-flow-uterine-balloon-tamponade/',
  'SKU: DP-CPAP-220V-P': 'https://viaglobalhealth.com/product/mtts-dolphin-cpap/',
  'SKU: VIA_VEN-10000-80': 'https://viaglobalhealth.com/product/mtts-impala-ventilator-with-stand/',
  'SKU: VEN-10000': 'https://viaglobalhealth.com/product/mtts-impala-ventilator/',
  'SKU: LM-800': 'https://viaglobalhealth.com/product/mtts-lightmeter/',
  'SKU: VIA_SAANS': 'https://viaglobalhealth.com/product/saans-cpap-next-gen-non-invasive-respiratory-support-for-neonatal-pediatric-patients/',
  'SKU: VIA_ESU-110': 'https://viaglobalhealth.com/product/liger-electrosurgical-generator/',
  'SKU: FF1-1000': 'https://viaglobalhealth.com/product/mtts-firefly-phototherapy/',
  'SKU: RES-10000': 'https://viaglobalhealth.com/product/mtts-beluga-resuscitator/',
  'SKU: LifeWrap_Lg': 'https://viaglobalhealth.com/product/lifewrap-non-pneumatic-anti-shock-garment-nasg/',
  'SKU: Pumani_2': 'https://viaglobalhealth.com/product/pumani-bubblecpap/',
  'SKU: VIA_Iris': 'https://viaglobalhealth.com/product/the-iris-by-liger-colposcope-coagulator-in-one/',
};

export async function enrichAllProducts(): Promise<void> {
  console.log('=== Starting enrichment for all products ===\n');
  for (const [sku, url] of Object.entries(PRODUCT_URL_MAP)) {
    await enrichProduct(sku, url);
  }
  console.log('\n=== All products enriched ===');
}

if (process.argv[1]?.includes('enrich-product')) {
  const arg = process.argv[2];
  if (arg === '--all') {
    enrichAllProducts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  } else if (arg) {
    const url = PRODUCT_URL_MAP[arg];
    if (!url) {
      console.log(`Unknown SKU: ${arg}`);
      console.log('Available SKUs:', Object.keys(PRODUCT_URL_MAP).join(', '));
      process.exit(1);
    }
    enrichProduct(arg, url).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  } else {
    console.log('Usage: npx tsx server/enrich-product.ts <SKU> | --all');
    console.log('Available SKUs:', Object.keys(PRODUCT_URL_MAP).join(', '));
    process.exit(0);
  }
}
