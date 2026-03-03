import puppeteer from 'puppeteer';
import type { InsertProduct } from '@shared/schema';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

const MAX_PRICE_CENTS = 99999900;
const DEFAULT_PRICE_CENTS = 50000;
const IMAGES_DIR = join(process.cwd(), 'client', 'public', 'images', 'products');
const THUMBNAILS_DIR = join(process.cwd(), 'client', 'public', 'images', 'products', 'thumbnails');
const DOCUMENTS_DIR = join(process.cwd(), 'client', 'public', 'documents', 'products');

async function downloadImage(url: string, productSlug: string, index: number): Promise<string> {
  try {
    if (!url || !url.startsWith('http')) return url;

    mkdirSync(IMAGES_DIR, { recursive: true });

    const ext = extname(new URL(url).pathname).toLowerCase() || '.jpg';
    const filename = `${productSlug}-${index}${ext}`;
    const filepath = join(IMAGES_DIR, filename);

    if (existsSync(filepath)) {
      console.log(`[Scraper] Image already exists: ${filename}`);
      return `/images/products/${filename}`;
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!response.ok) {
      console.log(`[Scraper] Failed to download image: ${url} (${response.status})`);
      return url;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    const header = buffer.slice(0, 20).toString('utf-8').toLowerCase();
    if (header.includes('<!doctype') || header.includes('<html')) {
      console.log(`[Scraper] Skipping invalid image (got HTML): ${url}`);
      return url;
    }

    writeFileSync(filepath, buffer);
    console.log(`[Scraper] Downloaded image: ${filename} (${buffer.length} bytes)`);
    return `/images/products/${filename}`;
  } catch (err) {
    console.log(`[Scraper] Error downloading image ${url}: ${err}`);
    return url;
  }
}

async function downloadFile(url: string, destDir: string, filename: string): Promise<string> {
  try {
    if (!url || !url.startsWith('http')) return url;

    mkdirSync(destDir, { recursive: true });

    const filepath = join(destDir, filename);

    if (existsSync(filepath)) {
      console.log(`[Scraper] File already exists: ${filename}`);
      return filepath;
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!response.ok) {
      console.log(`[Scraper] Failed to download file: ${url} (${response.status})`);
      return url;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    const header = buffer.slice(0, 20).toString('utf-8').toLowerCase();
    if (header.includes('<!doctype') || header.includes('<html')) {
      console.log(`[Scraper] Skipping invalid file (got HTML): ${url}`);
      return url;
    }

    writeFileSync(filepath, buffer);
    console.log(`[Scraper] Downloaded file: ${filename} (${buffer.length} bytes)`);
    return filepath;
  } catch (err) {
    console.log(`[Scraper] Error downloading file ${url}: ${err}`);
    return url;
  }
}

async function downloadDocument(url: string, sku: string, filename: string): Promise<string> {
  const skuDir = join(DOCUMENTS_DIR, sku);
  const result = await downloadFile(url, skuDir, filename);
  if (result.startsWith('/') && !result.startsWith('/documents')) {
    const relPath = result.replace(join(process.cwd(), 'client', 'public'), '');
    return relPath;
  }
  if (result === url) return url;
  return `/documents/products/${sku}/${filename}`;
}

async function downloadThumbnail(url: string, filename: string): Promise<string> {
  const result = await downloadFile(url, THUMBNAILS_DIR, filename);
  if (result.startsWith('/') && !result.startsWith('/images')) {
    return `/images/products/thumbnails/${filename}`;
  }
  if (result === url) return url;
  return `/images/products/thumbnails/${filename}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function sanitizePrice(price: number): number {
  if (isNaN(price) || price <= 0 || price > 1000000) {
    return DEFAULT_PRICE_CENTS;
  }
  const cents = Math.round(price * 100);
  return Math.min(cents, MAX_PRICE_CENTS);
}

interface ScrapedRawData {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  images: string[];
  keyFeatures: string[];
  specifications: Record<string, string>;
  faqs: Array<{question: string, answer: string}>;
  documents: Array<{name: string, url: string, thumbnailUrl?: string}>;
  regulatoryCertificates: Array<{name: string, url: string, thumbnailUrl?: string}>;
  videos: Array<{title: string, url: string}>;
  videoUrl: string;
  sku: string;
  sellerName: string;
  sellerLocation: string;
  warrantyTerm: string;
  regulatoryApproval: string;
  minimumOrderQuantity: number | null;
  shippingWeightKg: number | null;
  shippingLengthCm: number | null;
  shippingWidthCm: number | null;
  shippingDepthCm: number | null;
  is404: boolean;
}

export async function scrapeViaGlobalHealth(urls?: string[]): Promise<InsertProduct[]> {
  let browser;
  const products: InsertProduct[] = [];
  const timestamp = Date.now();
  let productIndex = 0;

  function generateUniqueSKU(): string {
    return `VIA-${timestamp}-${productIndex++}`;
  }

  const urlsToScrape = urls && urls.length > 0 ? urls : ['https://viaglobalhealth.com/product/thermocoagulator/'];

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    for (const productUrl of urlsToScrape) {
    
      console.log(`[Scraper] Navigating to ${productUrl}...`);
      try {
        await page.goto(productUrl, {
          waitUntil: 'networkidle2',
          timeout: 60000
        });
      } catch (err) {
        console.log(`[Scraper] Warning: Could not navigate to ${productUrl}, skipping...`);
        continue;
      }

      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

      console.log('[Scraper] Scrolling to load all content...');
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 500;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
          setTimeout(() => {
            clearInterval(timer);
            resolve();
          }, 3000);
        });
      });

      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[Scraper] Extracting detailed product data...');

      const productDetails: ScrapedRawData | null = await page.evaluate(() => {
        const result: any = {
          name: '',
          description: '',
          price: 0,
          category: '',
          imageUrl: '',
          images: [] as string[],
          keyFeatures: [] as string[],
          specifications: {} as Record<string, string>,
          faqs: [] as Array<{question: string, answer: string}>,
          documents: [] as Array<{name: string, url: string, thumbnailUrl?: string}>,
          regulatoryCertificates: [] as Array<{name: string, url: string, thumbnailUrl?: string}>,
          videos: [] as Array<{title: string, url: string}>,
          videoUrl: '',
          sku: '',
          sellerName: '',
          sellerLocation: '',
          warrantyTerm: '',
          regulatoryApproval: '',
          minimumOrderQuantity: null,
          shippingWeightKg: null,
          shippingLengthCm: null,
          shippingWidthCm: null,
          shippingDepthCm: null,
          is404: false
        };

        const h1El = document.querySelector('h1.product_title, .et_pb_wc_title h1, h1');
        const h1Text = h1El?.textContent?.trim() || '';
        const titleTag = document.title || '';
        if (
          h1Text.toLowerCase().includes('not found') ||
          h1Text.toLowerCase().includes('404') ||
          titleTag.toLowerCase().includes('not found') ||
          titleTag.toLowerCase().includes('404') ||
          document.querySelector('.error-404, .not-found')
        ) {
          result.is404 = true;
          return result;
        }

        let jsonLd: any = null;
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of Array.from(jsonLdScripts)) {
          try {
            const data = JSON.parse(script.textContent || '');
            if (data['@graph']) {
              const productNode = data['@graph'].find((n: any) => n['@type'] === 'Product');
              if (productNode) {
                jsonLd = productNode;
                break;
              }
            }
            if (data['@type'] === 'Product') {
              jsonLd = data;
              break;
            }
          } catch {}
        }

        if (jsonLd) {
          const rawName = jsonLd.name || '';
          result.name = rawName.replace(/\s*[-–|].*VIA Global Health.*/i, '').replace(/^Buy\s+(the\s+)?/i, '').trim();
          result.description = jsonLd.description || '';
          result.sku = jsonLd.sku || '';
          
          if (jsonLd.category) {
            const cat = jsonLd.category.replace(/&gt;/g, '>');
            const parts = cat.split('>').map((s: string) => s.trim());
            result.category = parts[parts.length - 1] || parts[0] || '';
          }

          if (jsonLd.offers) {
            const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
            const p = parseFloat(offer?.price);
            if (!isNaN(p) && p > 0) result.price = p;
          }

          if (jsonLd.image) {
            const imgs = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
            for (const img of imgs) {
              const url = typeof img === 'string' ? img : img?.url;
              if (url) result.images.push(url);
            }
            if (result.images.length > 0) result.imageUrl = result.images[0];
          }

          if (jsonLd.weight?.value) {
            result.shippingWeightKg = parseFloat(jsonLd.weight.value) || null;
          }
          if (jsonLd.height?.value) {
            result.shippingDepthCm = parseFloat(jsonLd.height.value) || null;
          }
          if (jsonLd.width?.value) {
            result.shippingWidthCm = parseFloat(jsonLd.width.value) || null;
          }
          if (jsonLd.depth?.value) {
            result.shippingLengthCm = parseFloat(jsonLd.depth.value) || null;
          }

          if (jsonLd.brand?.name) {
            result.sellerName = jsonLd.brand.name;
          }
        }

        if (!result.name) {
          result.name = h1Text || '';
        }
        if (!result.name) return null;

        const shortDescEl = document.querySelector(
          '.productShortDescription .et_pb_module_inner, ' +
          '.et_pb_wc_description_0_tb_body .et_pb_module_inner, ' +
          '.woocommerce-product-details__short-description, ' +
          '.product-description'
        );
        const shortDesc = shortDescEl?.textContent?.trim() || '';

        if (shortDesc && shortDesc.length > 10) {
          const moqMatch = shortDesc.match(/Minimum Order Quantity[^:]*:\s*(.+)/i);
          const sellerMatch = shortDesc.match(/Seller Name[^:]*:\s*(.+)/i);
          const locationMatch = shortDesc.match(/Seller Location[^:]*:\s*(.+)/i);
          const warrantyMatch = shortDesc.match(/Warranty Term[^:]*:\s*(.+)/i);
          const regulatoryMatch = shortDesc.match(/Regulatory Approval[^:]*:\s*(.+)/i);

          if (moqMatch) {
            const moqVal = parseInt(moqMatch[1].split('\n')[0].split('•')[0].trim().replace(/\D/g, ''));
            if (!isNaN(moqVal) && moqVal > 0) result.minimumOrderQuantity = moqVal;
          }
          if (sellerMatch && !result.sellerName) result.sellerName = sellerMatch[1].split('\n')[0].split('•')[0].trim();
          if (locationMatch) result.sellerLocation = locationMatch[1].split('\n')[0].split('•')[0].trim();
          if (warrantyMatch) result.warrantyTerm = warrantyMatch[1].split('\n')[0].split('•')[0].trim();
          if (regulatoryMatch) result.regulatoryApproval = regulatoryMatch[1].split('\n')[0].split('•')[0].trim();

          const cleanDesc = shortDesc
            .replace(/•\s*Minimum Order Quantity.*/gi, '')
            .replace(/•\s*Seller Name.*/gi, '')
            .replace(/•\s*Seller Location.*/gi, '')
            .replace(/•\s*Warranty Term.*/gi, '')
            .replace(/•\s*Regulatory Approval.*/gi, '')
            .trim();
          if (cleanDesc.length > 10 && (!result.description || result.description.length < cleanDesc.length)) {
            result.description = cleanDesc;
          }
        }

        const longDescEl = document.querySelector(
          '.et_pb_wc_description_1_tb_body .et_pb_module_inner, ' +
          '.et_pb_wc_description:not(.productShortDescription) .et_pb_module_inner, ' +
          '.woocommerce-Tabs-panel--description, ' +
          '#tab-description'
        );
        const longDesc = longDescEl?.textContent?.trim() || '';
        if (longDesc && longDesc.length > result.description.length) {
          result.description = longDesc;
        }

        if (!result.description) {
          const contentEl = document.querySelector('.entry-content, .product-content, article, .et_pb_post_content');
          if (contentEl) {
            result.description = contentEl.textContent?.trim().substring(0, 1000) || '';
          }
        }

        if (!result.price) {
          const priceEl = document.querySelector(
            '.price .woocommerce-Price-amount, ' +
            '.et_pb_wc_price .woocommerce-Price-amount, ' +
            '.price, [class*="price"]'
          );
          if (priceEl) {
            const priceText = priceEl.textContent || '';
            const priceMatch = priceText.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
              result.price = parseFloat(priceMatch[0].replace(/,/g, ''));
            }
          }
        }

        if (!result.price) {
          const priceMeta = document.querySelector('meta[property="product:price:amount"]');
          if (priceMeta) {
            const p = parseFloat(priceMeta.getAttribute('content') || '');
            if (!isNaN(p) && p > 0) result.price = p;
          }
        }

        if (!result.category) {
          const categoryEl = document.querySelector(
            '.posted_in a, ' +
            '.product_meta .posted_in a, ' +
            '.et_pb_wc_meta .posted_in a, ' +
            '.product_cat, [class*="category"]'
          );
          result.category = categoryEl?.textContent?.trim() || '';
        }

        if (result.images.length === 0) {
          const galleryImgs = document.querySelectorAll(
            '.woocommerce-product-gallery__image img, ' +
            '.et_pb_wc_images img, ' +
            '.flex-viewport img, ' +
            '.product-images img, ' +
            '.product-gallery img, ' +
            'img.wp-post-image'
          );
          galleryImgs.forEach(img => {
            const src = img.getAttribute('data-large_image') || img.getAttribute('src') || img.getAttribute('data-src') || '';
            if (src && src.startsWith('http') && !result.images.includes(src) && !src.includes('-150x150') && !src.includes('-100x100')) {
              result.images.push(src);
            }
          });
          if (result.images.length > 0 && !result.imageUrl) {
            result.imageUrl = result.images[0];
          }
        }

        if (!result.imageUrl) {
          const mainImg = document.querySelector(
            '.woocommerce-product-gallery__image img, ' +
            '.et_pb_wc_images img, ' +
            '.product-image img, ' +
            'img.wp-post-image'
          );
          result.imageUrl = mainImg?.getAttribute('data-large_image') || mainImg?.getAttribute('src') || mainImg?.getAttribute('data-src') || '';
        }

        if (!result.sku) {
          const skuEl = document.querySelector('.sku, .et_pb_wc_meta .sku, [class*="sku"]');
          result.sku = skuEl?.textContent?.trim() || '';
        }

        const allParagraphs = document.querySelectorAll('p, div.wpb_text_column, .vc_column_text, .et_pb_text_inner');
        
        Array.from(allParagraphs).forEach((para) => {
          const isInNav = para.closest('nav, header, footer, .menu, .navigation, #menu, .mega-menu, .et_pb_wc_related_products');
          if (isInNav) return;
          
          const boldEls = para.querySelectorAll('strong, b');
          
          Array.from(boldEls).forEach((bold) => {
            const boldText = bold.textContent?.trim() || '';
            
            if (boldText.length < 4 || boldText.length > 50) return;
            
            const skipWords = ['shop', 'product', 'resource', 'menu', 'cart', 'buy', 'login', 'contact', 'about', 'click here', 'apply', 'we accept', 'payment', 'pricing'];
            if (skipWords.some(word => boldText.toLowerCase().includes(word))) return;
            
            let descText = '';
            
            const parentText = para.textContent?.trim() || '';
            const boldIndex = parentText.indexOf(boldText);
            if (boldIndex >= 0) {
              descText = parentText.substring(boldIndex + boldText.length).trim();
              if (descText.startsWith(':')) descText = descText.substring(1).trim();
              if (descText.startsWith('-')) descText = descText.substring(1).trim();
            }
            
            if (descText.length > 30 && result.keyFeatures.length < 10) {
              if (descText.length > 350) {
                descText = descText.substring(0, 350).trim() + '...';
              }
              result.keyFeatures.push(`${boldText} - ${descText}`);
            }
          });
        });

        if (result.keyFeatures.length === 0) {
          const headings = document.querySelectorAll('h3, h4, h5');
          Array.from(headings).forEach((heading) => {
            const isInNav = heading.closest('nav, header, footer, .menu, .navigation, .et_pb_wc_related_products');
            if (isInNav) return;
            
            const headingText = heading.textContent?.trim() || '';
            if (headingText.length < 4 || headingText.length > 50) return;
            
            const nextEl = heading.nextElementSibling;
            if (nextEl && (nextEl.tagName === 'P' || nextEl.tagName === 'DIV')) {
              const descText = nextEl.textContent?.trim() || '';
              if (descText.length > 30 && result.keyFeatures.length < 10) {
                result.keyFeatures.push(`${headingText} - ${descText.substring(0, 350)}`);
              }
            }
          });
        }

        const allElements = Array.from(document.querySelectorAll('h2, h3, h4, strong, .woocommerce-Tabs-panel, #tab-specifications'));
        let specSection: Element | null = null;
        
        specSection = document.querySelector('#tab-specifications, .woocommerce-Tabs-panel--specifications, [id*="specifications"]');
        
        if (!specSection) {
          const specHeader = allElements.find((h) => {
            const text = h.textContent?.trim().toLowerCase() || '';
            return text === 'specifications';
          });
          if (specHeader) {
            specSection = specHeader.closest('.wpb_text_column, .vc_column_text, .elementor-widget-container, .entry-content, article, .et_pb_section, .et_pb_post_content') || specHeader.parentElement;
          }
        }
        
        const faqHeader = allElements.find((h) => {
          const text = h.textContent?.trim().toLowerCase() || '';
          return text === 'faqs' || text === 'faq' || text.includes('frequently asked');
        });
        
        if (specSection) {
          const boldElements = specSection.querySelectorAll('strong, b, h3, h4, h5');
          
          Array.from(boldElements).forEach((boldEl) => {
            const headingText = boldEl.textContent?.trim() || '';
            if (headingText.length < 3 || headingText.length > 100) return;
            
            if (headingText.toLowerCase() === 'specifications') return;
            
            const headingLower = headingText.toLowerCase();
            const isFaqLike = headingText.includes('?') ||
                             headingLower.startsWith('how do') ||
                             headingLower.startsWith('how to') ||
                             headingLower.startsWith('what is') ||
                             headingLower.startsWith('what\'s') ||
                             headingLower.startsWith('what if') ||
                             headingLower.startsWith('can i') ||
                             headingLower.startsWith('is there') ||
                             headingLower.startsWith('how does') ||
                             headingLower.startsWith('how many') ||
                             headingLower.startsWith('why ') ||
                             headingLower.startsWith('when ') ||
                             headingLower.startsWith('where ');
            
            if (isFaqLike) {
              let answerEl = boldEl.parentElement?.nextElementSibling;
              if (!answerEl) {
                answerEl = boldEl.closest('p')?.nextElementSibling || null;
              }
              let answerText = '';
              if (answerEl && (answerEl.tagName === 'P' || answerEl.tagName === 'DIV' || 
                              answerEl.tagName === 'UL' || answerEl.tagName === 'OL')) {
                answerText = answerEl.textContent?.trim() || '';
              }
              if (headingText.length > 5 && answerText.length > 10) {
                result.faqs.push({ question: headingText, answer: answerText });
              }
              return;
            }
            
            let searchEl: Element | null = boldEl.parentElement;
            if (searchEl && searchEl.tagName !== 'P' && searchEl.tagName !== 'DIV') {
              searchEl = boldEl.closest('p, div');
            }
            
            let foundList: Element | null = null;
            let searchCount = 0;
            
            while (searchEl && searchCount < 5) {
              const nextSibling = searchEl.nextElementSibling;
              if (!nextSibling) break;
              
              if (nextSibling.tagName === 'UL' || nextSibling.tagName === 'OL') {
                foundList = nextSibling;
                break;
              }
              if (nextSibling.querySelector('strong, b') || nextSibling.tagName === 'STRONG' || nextSibling.tagName === 'B') {
                break;
              }
              searchEl = nextSibling;
              searchCount++;
            }
            
            if (foundList) {
              const items = foundList.querySelectorAll('li');
              const allItems: string[] = [];
              
              Array.from(items).forEach((item) => {
                const text = item.textContent?.trim() || '';
                if (text.length > 3) {
                  allItems.push(text);
                }
              });
              
              if (allItems.length > 0) {
                result.specifications[headingText] = allItems.map((item: string) => '• ' + item).join('\n');
              }
            }
          });
        }
        
        if (Object.keys(result.specifications).length === 0) {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            null
          );
          
          let foundSpecsHeader = false;
          let currentHeading = '';
          let currentItems: string[] = [];
          
          while (walker.nextNode()) {
            const node = walker.currentNode as Element;
            const text = node.textContent?.trim().toLowerCase() || '';
            
            if (!foundSpecsHeader && (node.tagName === 'H2' || node.tagName === 'H3' || node.tagName === 'STRONG') && text === 'specifications') {
              foundSpecsHeader = true;
              continue;
            }
            
            if (!foundSpecsHeader) continue;
            
            if (text === 'faqs' || text === 'faq' || text === 'related products' || text === 'reviews') {
              if (currentHeading && currentItems.length > 0) {
                result.specifications[currentHeading] = currentItems.map((item: string) => '• ' + item).join('\n');
              }
              break;
            }
            
            if ((node.tagName === 'STRONG' || node.tagName === 'B') && node.textContent) {
              const headingText = node.textContent.trim();
              if (headingText.length > 3 && headingText.length < 100 && !headingText.includes('?')) {
                if (currentHeading && currentItems.length > 0) {
                  result.specifications[currentHeading] = currentItems.map((item: string) => '• ' + item).join('\n');
                }
                currentHeading = headingText;
                currentItems = [];
              }
            }
            
            if (node.tagName === 'LI' && currentHeading) {
              const itemText = node.textContent?.trim() || '';
              if (itemText.length > 3) {
                currentItems.push(itemText);
              }
            }
          }
          
          if (currentHeading && currentItems.length > 0) {
            result.specifications[currentHeading] = currentItems.map((item: string) => '• ' + item).join('\n');
          }
        }
        
        if (faqHeader) {
          let currentEl: Element | null = faqHeader.nextElementSibling;
          let depth = 0;
          
          while (currentEl && depth < 30) {
            const elText = currentEl.textContent?.trim().toLowerCase() || '';
            if (elText === 'related products' || elText === 'reviews' || elText === 'specifications') {
              break;
            }
            
            const elTag = currentEl.tagName;
            const isQuestion = elTag === 'STRONG' || elTag === 'H3' || elTag === 'H4' || elTag === 'H5' ||
                              currentEl.querySelector('strong, b');
            
            if (isQuestion) {
              const questionText = currentEl.textContent?.trim() || '';
              
              let answerEl = currentEl.nextElementSibling;
              let answerText = '';
              
              if (answerEl && (answerEl.tagName === 'P' || answerEl.tagName === 'DIV' || 
                              answerEl.tagName === 'UL' || answerEl.tagName === 'OL')) {
                answerText = answerEl.textContent?.trim() || '';
              }
              
              if (questionText.length > 5 && answerText.length > 10) {
                result.faqs.push({ question: questionText, answer: answerText });
              }
            }
            
            currentEl = currentEl.nextElementSibling;
            depth++;
          }
        }
        
        if (specSection && result.faqs.length === 0) {
          const boldElements = specSection.querySelectorAll('strong, b');
          Array.from(boldElements).forEach((boldEl) => {
            const headingText = boldEl.textContent?.trim() || '';
            const hLower = headingText.toLowerCase();
            
            const isQuestion = headingText.includes('?') ||
                              hLower.startsWith('how do') ||
                              hLower.startsWith('how to') ||
                              hLower.startsWith('what is') ||
                              hLower.startsWith('what\'s') ||
                              hLower.startsWith('what if') ||
                              hLower.startsWith('can i') ||
                              hLower.startsWith('is there') ||
                              hLower.startsWith('how does') ||
                              hLower.startsWith('how many') ||
                              hLower.startsWith('why ') ||
                              hLower.startsWith('when ') ||
                              hLower.startsWith('where ');
            
            if (isQuestion && headingText.length > 5) {
              let answerEl = boldEl.parentElement?.nextElementSibling;
              if (!answerEl) {
                answerEl = boldEl.closest('p')?.nextElementSibling || null;
              }
              let answerText = '';
              
              if (answerEl && (answerEl.tagName === 'P' || answerEl.tagName === 'DIV' || 
                              answerEl.tagName === 'UL' || answerEl.tagName === 'OL')) {
                answerText = answerEl.textContent?.trim() || '';
              }
              
              if (answerText.length > 10) {
                result.faqs.push({ question: headingText, answer: answerText });
              }
            }
          });
        }
        
        if (Object.keys(result.specifications).length === 0) {
          const specRows = document.querySelectorAll('.specifications tr, .product-attributes tr, .woocommerce-product-attributes tr');
          specRows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
              const key = cells[0].textContent?.trim() || '';
              const value = cells[1].textContent?.trim() || '';
              if (key && value && key.length < 100 && value.length < 200) {
                result.specifications[key] = value;
              }
            }
          });
        }

        const blurbLinkMap: Record<string, string> = {};
        const scripts = document.querySelectorAll('script');
        for (const script of Array.from(scripts)) {
          const text = script.textContent || '';
          const match = text.match(/var\s+et_link_options_data\s*=\s*(\[[\s\S]*?\]);/);
          if (match) {
            try {
              const linkData = JSON.parse(match[1]);
              for (const item of linkData) {
                if (item.class && item.url) {
                  blurbLinkMap[item.class] = item.url;
                }
              }
            } catch {}
            break;
          }
        }

        let inDocSection = false;
        let inCertSection = false;
        const allH2s = document.querySelectorAll('h2');
        
        const sectionMap: Map<Element, string> = new Map();
        for (const h2 of Array.from(allH2s)) {
          const text = h2.textContent?.trim().toLowerCase() || '';
          if (text.includes('product documents') || text.includes('manuals') || text.includes('brochures')) {
            const section = h2.closest('.et_pb_section, .et_pb_row') || h2.parentElement;
            if (section) sectionMap.set(section, 'documents');
          }
          if (text.includes('regulatory') || text.includes('certificates')) {
            const section = h2.closest('.et_pb_section, .et_pb_row') || h2.parentElement;
            if (section) sectionMap.set(section, 'certificates');
          }
        }

        const blurbs = document.querySelectorAll('.et_pb_blurb');
        for (const blurb of Array.from(blurbs)) {
          const blurbClasses = blurb.className || '';
          const nameEl = blurb.querySelector('.et_pb_module_header span, .et_pb_module_header, h4');
          const name = nameEl?.textContent?.trim() || '';
          if (!name) continue;

          const thumbImg = blurb.querySelector('.et_pb_main_blurb_image img');
          const thumbnailUrl = thumbImg?.getAttribute('src') || '';

          let pdfUrl = '';
          const classMatch = blurbClasses.match(/et_pb_blurb_\d+/);
          if (classMatch && blurbLinkMap[classMatch[0]]) {
            pdfUrl = blurbLinkMap[classMatch[0]];
            if (pdfUrl.startsWith('/')) {
              pdfUrl = 'https://viaglobalhealth.com' + pdfUrl;
            }
          }

          const aTag = blurb.querySelector('a[href*=".pdf"]');
          if (!pdfUrl && aTag) {
            pdfUrl = aTag.getAttribute('href') || '';
          }

          let isDocSection = false;
          let isCertSection = false;

          let parent: Element | null = blurb;
          while (parent) {
            if (sectionMap.has(parent)) {
              const sType = sectionMap.get(parent);
              if (sType === 'documents') isDocSection = true;
              if (sType === 'certificates') isCertSection = true;
              break;
            }
            parent = parent.parentElement;
          }

          if (!isDocSection && !isCertSection) {
            const nameLower = name.toLowerCase();
            if (nameLower.includes('iso') || nameLower.includes('fda') || nameLower.includes('ce ') || 
                nameLower.includes('certificate') || nameLower.includes('regulatory')) {
              isCertSection = true;
            } else if (pdfUrl) {
              isDocSection = true;
            }
          }

          if (isCertSection) {
            result.regulatoryCertificates.push({
              name,
              url: pdfUrl || '#',
              thumbnailUrl: thumbnailUrl || undefined
            });
          } else if (isDocSection || pdfUrl) {
            result.documents.push({
              name,
              url: pdfUrl || '#',
              thumbnailUrl: thumbnailUrl || undefined
            });
          }
        }

        if (result.documents.length === 0) {
          const pdfLinks = document.querySelectorAll('a[href*=".pdf"], a[href*="document"], a[href*="brochure"], a[href*="manual"]');
          pdfLinks.forEach(link => {
            const isInNav = link.closest('nav, header, footer, .menu, .et_pb_wc_related_products');
            if (isInNav) return;
            const href = link.getAttribute('href') || '';
            const linkName = link.textContent?.trim() || 'Document';
            if (href && linkName && href !== '#') {
              result.documents.push({ name: linkName, url: href });
            }
          });
        }

        if (result.documents.length === 0) {
          result.documents.push({ name: 'Product Brochure', url: '#' });
          result.documents.push({ name: 'User Manual', url: '#' });
          result.documents.push({ name: 'Technical Specifications', url: '#' });
        }

        const videoIframes = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]');
        for (const iframe of Array.from(videoIframes)) {
          const src = iframe.getAttribute('src') || '';
          const title = iframe.getAttribute('title') || `Video ${result.videos.length + 1}`;
          if (src) {
            result.videos.push({ title, url: src });
          }
        }

        const videoSources = document.querySelectorAll('video source');
        for (const source of Array.from(videoSources)) {
          const src = source.getAttribute('src') || '';
          if (src) {
            result.videos.push({ title: `Video ${result.videos.length + 1}`, url: src });
          }
        }

        if (result.videos.length > 0) {
          result.videoUrl = result.videos[0].url;
        }

        return result;
      });

      if (!productDetails || productDetails.is404) {
        console.log(`[Scraper] Skipping ${productUrl} - page not found or invalid`);
        continue;
      }

      if (!productDetails.name) {
        console.log(`[Scraper] Skipping ${productUrl} - could not extract product name`);
        continue;
      }

      const sku = productDetails.sku || generateUniqueSKU();
      console.log(`[Scraper] Extracted product: ${productDetails.name}`);
      console.log(`[Scraper] Found ${productDetails.keyFeatures.length} key features, ${productDetails.documents.length} documents, ${productDetails.regulatoryCertificates.length} certificates, ${productDetails.videos.length} videos`);
      console.log(`[Scraper] Downloading ${productDetails.images.length} image(s) locally...`);

      const slug = slugify(productDetails.name);

      const localMainImage = productDetails.imageUrl ? await downloadImage(productDetails.imageUrl, slug, 0) : '';

      const localImages: string[] = [];
      for (let i = 0; i < productDetails.images.length; i++) {
        const localPath = await downloadImage(productDetails.images[i], slug, i + 1);
        localImages.push(localPath);
      }

      console.log(`[Scraper] Saved ${localImages.filter(p => p.startsWith('/')).length} image(s) locally`);

      console.log(`[Scraper] Downloading ${productDetails.documents.length} document(s) and ${productDetails.regulatoryCertificates.length} certificate(s)...`);

      const localDocuments: Array<{name: string, url: string, thumbnailUrl?: string}> = [];
      for (let i = 0; i < productDetails.documents.length; i++) {
        const doc = productDetails.documents[i];
        let localUrl = doc.url;
        let localThumb = doc.thumbnailUrl;
        
        if (doc.url && doc.url.startsWith('http') && doc.url.includes('.pdf')) {
          const pdfFilename = slugify(doc.name) + '.pdf';
          localUrl = await downloadDocument(doc.url, sku, pdfFilename);
        }
        
        if (doc.thumbnailUrl && doc.thumbnailUrl.startsWith('http')) {
          const thumbFilename = `${sku}-doc-thumb-${i}${extname(new URL(doc.thumbnailUrl).pathname).toLowerCase() || '.png'}`;
          localThumb = await downloadThumbnail(doc.thumbnailUrl, thumbFilename);
        }
        
        localDocuments.push({ name: doc.name, url: localUrl, thumbnailUrl: localThumb });
      }

      const localCertificates: Array<{name: string, url: string, thumbnailUrl?: string}> = [];
      for (let i = 0; i < productDetails.regulatoryCertificates.length; i++) {
        const cert = productDetails.regulatoryCertificates[i];
        let localUrl = cert.url;
        let localThumb = cert.thumbnailUrl;
        
        if (cert.url && cert.url.startsWith('http') && cert.url.includes('.pdf')) {
          const certFilename = 'cert-' + slugify(cert.name) + '.pdf';
          localUrl = await downloadDocument(cert.url, sku, certFilename);
        }
        
        if (cert.thumbnailUrl && cert.thumbnailUrl.startsWith('http')) {
          const thumbFilename = `${sku}-cert-thumb-${i}${extname(new URL(cert.thumbnailUrl).pathname).toLowerCase() || '.png'}`;
          localThumb = await downloadThumbnail(cert.thumbnailUrl, thumbFilename);
        }
        
        localCertificates.push({ name: cert.name, url: localUrl, thumbnailUrl: localThumb });
      }

      console.log(`[Scraper] Downloaded ${localDocuments.filter(d => d.url.startsWith('/')).length} document(s) and ${localCertificates.filter(c => c.url.startsWith('/')).length} certificate(s) locally`);

      products.push({
        name: productDetails.name,
        description: productDetails.description,
        price: sanitizePrice(productDetails.price),
        currency: 'USD',
        category: productDetails.category,
        sku: sku,
        imageUrl: localMainImage,
        images: localImages,
        videoUrl: productDetails.videoUrl || null,
        keyFeatures: productDetails.keyFeatures,
        documents: localDocuments,
        specifications: productDetails.specifications,
        faqs: productDetails.faqs,
        regulatoryCertificates: localCertificates,
        videos: productDetails.videos,
        status: 'active',
        sellerName: productDetails.sellerName || null,
        sellerLocation: productDetails.sellerLocation || null,
        warrantyTerm: productDetails.warrantyTerm || null,
        regulatoryApproval: productDetails.regulatoryApproval || null,
        minimumOrderQuantity: productDetails.minimumOrderQuantity,
        shippingWeightKg: productDetails.shippingWeightKg,
        shippingLengthCm: productDetails.shippingLengthCm,
        shippingWidthCm: productDetails.shippingWidthCm,
        shippingDepthCm: productDetails.shippingDepthCm,
      });
    }

    console.log(`[Scraper] Successfully scraped ${products.length} product(s) with detailed information`);
    return products;

  } catch (error) {
    console.error('[Scraper] Error during scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
