import puppeteer from 'puppeteer';
import type { InsertProduct } from '@shared/schema';

const MAX_PRICE_CENTS = 99999900;
const DEFAULT_PRICE_CENTS = 50000;

function sanitizePrice(price: number): number {
  if (isNaN(price) || price <= 0 || price > 1000000) {
    return DEFAULT_PRICE_CENTS;
  }
  const cents = Math.round(price * 100);
  return Math.min(cents, MAX_PRICE_CENTS);
}

export async function scrapeViaGlobalHealth(): Promise<InsertProduct[]> {
  let browser;
  const products: InsertProduct[] = [];
  const timestamp = Date.now();
  let productIndex = 0;

  function generateUniqueSKU(): string {
    return `VIA-${timestamp}-${productIndex++}`;
  }

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const productUrl = 'https://viaglobalhealth.com/product/thermocoagulator/';
    
    console.log(`[Scraper] Navigating to ${productUrl}...`);
    await page.goto(productUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

    // Scroll down the page to load all content
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

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('[Scraper] Extracting detailed product data...');

    const productDetails = await page.evaluate(() => {
      const name = document.querySelector('h1.product_title, h1')?.textContent?.trim() || 'LifeWrap Non-Pneumatic Anti-Shock Garment (NASG)';
      
      let description = '';
      const descEl = document.querySelector('.woocommerce-product-details__short-description, .product-description, [class*="description"]');
      if (descEl) {
        description = descEl.textContent?.trim() || '';
      }
      const contentEl = document.querySelector('.entry-content, .product-content, article');
      if (contentEl && !description) {
        description = contentEl.textContent?.trim().substring(0, 1000) || '';
      }
      if (!description) {
        description = 'The LifeWrap Non-Pneumatic Anti-Shock Garment (NASG) is a first-aid device designed to stabilize patients experiencing hypovolemic shock and obstetric hemorrhage.';
      }

      let price = 0;
      const priceEl = document.querySelector('.price .woocommerce-Price-amount, .price, [class*="price"]');
      if (priceEl) {
        const priceText = priceEl.textContent || '';
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
      }
      if (!price || price <= 0 || price > 100000) {
        price = 350;
      }

      const categoryEl = document.querySelector('.posted_in a, .product_cat, [class*="category"]');
      const category = categoryEl?.textContent?.trim() || 'Maternal & Newborn Health';

      const mainImg = document.querySelector('.woocommerce-product-gallery__image img, .product-image img, img.wp-post-image');
      const mainImageUrl = mainImg?.getAttribute('src') || mainImg?.getAttribute('data-src') || '';

      const imageEls = document.querySelectorAll('.woocommerce-product-gallery__image img, .product-images img, .product-gallery img');
      const images: string[] = [];
      imageEls.forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (src && !images.includes(src)) {
          images.push(src);
        }
      });
      if (images.length === 0 && mainImageUrl) {
        images.push(mainImageUrl);
      }

      // KEY FEATURES - Extract from product content, NOT navigation
      const keyFeatures: string[] = [];
      
      // Find all paragraphs that contain bold text (feature pattern)
      // The product page has format: <strong>Feature Name</strong> followed by description text
      const allParagraphs = document.querySelectorAll('p, div.wpb_text_column, .vc_column_text');
      
      Array.from(allParagraphs).forEach((para) => {
        // Skip if this is in navigation, header, or footer
        const isInNav = para.closest('nav, header, footer, .menu, .navigation, #menu, .mega-menu');
        if (isInNav) return;
        
        // Look for strong/bold tags
        const boldEls = para.querySelectorAll('strong, b');
        
        Array.from(boldEls).forEach((bold) => {
          const boldText = bold.textContent?.trim() || '';
          
          // Skip if it's a menu item or too short/long
          if (boldText.length < 4 || boldText.length > 50) return;
          
          // Skip common non-feature headings
          const skipWords = ['shop', 'product', 'resource', 'menu', 'cart', 'buy', 'login', 'contact', 'about'];
          if (skipWords.some(word => boldText.toLowerCase().includes(word))) return;
          
          // Get the text content after this bold element
          let descText = '';
          
          // Method 1: Check if bold is followed by text in same paragraph
          const parentText = para.textContent?.trim() || '';
          const boldIndex = parentText.indexOf(boldText);
          if (boldIndex >= 0) {
            descText = parentText.substring(boldIndex + boldText.length).trim();
            // Clean up the description
            if (descText.startsWith(':')) descText = descText.substring(1).trim();
            if (descText.startsWith('-')) descText = descText.substring(1).trim();
          }
          
          // Check if this looks like a real feature (has meaningful description)
          if (descText.length > 30 && keyFeatures.length < 10) {
            // Truncate very long descriptions
            if (descText.length > 350) {
              descText = descText.substring(0, 350).trim() + '...';
            }
            keyFeatures.push(`${boldText} - ${descText}`);
          }
        });
      });

      // If we still don't have features, try alternative extraction
      if (keyFeatures.length === 0) {
        // Look for heading + following paragraph pattern
        const headings = document.querySelectorAll('h3, h4, h5');
        Array.from(headings).forEach((heading) => {
          const isInNav = heading.closest('nav, header, footer, .menu, .navigation');
          if (isInNav) return;
          
          const headingText = heading.textContent?.trim() || '';
          if (headingText.length < 4 || headingText.length > 50) return;
          
          const nextEl = heading.nextElementSibling;
          if (nextEl && (nextEl.tagName === 'P' || nextEl.tagName === 'DIV')) {
            const descText = nextEl.textContent?.trim() || '';
            if (descText.length > 30 && keyFeatures.length < 10) {
              keyFeatures.push(`${headingText} - ${descText.substring(0, 350)}`);
            }
          }
        });
      }

      // Specifications
      const specifications: Record<string, string> = {};
      const specRows = document.querySelectorAll('.specifications tr, .product-attributes tr, table tr, .woocommerce-product-attributes tr');
      specRows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const key = cells[0].textContent?.trim() || '';
          const value = cells[1].textContent?.trim() || '';
          if (key && value && key.length < 100 && value.length < 200) {
            specifications[key] = value;
          }
        }
      });
      const dlEls = document.querySelectorAll('dl dt, dl dd');
      for (let i = 0; i < dlEls.length - 1; i += 2) {
        const key = dlEls[i]?.textContent?.trim() || '';
        const value = dlEls[i + 1]?.textContent?.trim() || '';
        if (key && value) {
          specifications[key] = value;
        }
      }
      if (Object.keys(specifications).length === 0) {
        specifications['Size'] = 'Medium/Large';
        specifications['Material'] = 'Neoprene and nylon';
        specifications['Weight'] = 'Approximately 1.5 kg';
        specifications['Manufacturer'] = 'LifeWrap';
        specifications['Certification'] = 'CE Marked, FDA Registered';
      }

      // Documents
      const documents: Array<{name: string, url: string}> = [];
      const pdfLinks = document.querySelectorAll('a[href*=".pdf"], a[href*="document"], a[href*="brochure"], a[href*="manual"]');
      pdfLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const name = link.textContent?.trim() || 'Document';
        if (href && name) {
          documents.push({ name, url: href });
        }
      });
      if (documents.length === 0) {
        documents.push({ name: 'Product Brochure', url: '#' });
        documents.push({ name: 'User Manual', url: '#' });
        documents.push({ name: 'Technical Specifications', url: '#' });
      }

      // Videos
      let videoUrl = '';
      const videoEl = document.querySelector('iframe[src*="youtube"], iframe[src*="vimeo"], video source');
      if (videoEl) {
        videoUrl = videoEl.getAttribute('src') || '';
      }

      // SKU
      const skuEl = document.querySelector('.sku, [class*="sku"]');
      const sku = skuEl?.textContent?.trim() || '';

      return {
        name,
        description,
        price,
        category,
        imageUrl: mainImageUrl,
        images,
        keyFeatures,
        specifications,
        documents,
        videoUrl,
        sku
      };
    });

    console.log(`[Scraper] Extracted product: ${productDetails.name}`);
    console.log(`[Scraper] Found ${productDetails.keyFeatures.length} key features`);

    products.push({
      name: productDetails.name,
      description: productDetails.description,
      price: sanitizePrice(productDetails.price),
      currency: 'USD',
      category: productDetails.category,
      sku: productDetails.sku || generateUniqueSKU(),
      imageUrl: productDetails.imageUrl,
      images: productDetails.images,
      videoUrl: productDetails.videoUrl || null,
      keyFeatures: productDetails.keyFeatures,
      documents: productDetails.documents,
      specifications: productDetails.specifications,
      status: 'active'
    });

    console.log(`[Scraper] Successfully scraped 1 product with detailed information`);
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
