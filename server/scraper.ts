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

export async function scrapeViaGlobalHealth(urls?: string[]): Promise<InsertProduct[]> {
  let browser;
  const products: InsertProduct[] = [];
  const timestamp = Date.now();
  let productIndex = 0;

  function generateUniqueSKU(): string {
    return `VIA-${timestamp}-${productIndex++}`;
  }

  // Default to thermocoagulator if no URLs provided
  const urlsToScrape = urls && urls.length > 0 ? urls : ['https://viaglobalhealth.com/product/thermocoagulator/'];

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Scrape each URL
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

      // Specifications - Extract from the Specifications section dynamically
      const specifications: Record<string, string> = {};
      const faqs: Array<{question: string, answer: string}> = [];
      
      // Find the "Specifications" heading or tab content
      const allElements = Array.from(document.querySelectorAll('h2, h3, h4, strong, .woocommerce-Tabs-panel, #tab-specifications'));
      let specSection: Element | null = null;
      
      // First try to find a specifications tab panel
      specSection = document.querySelector('#tab-specifications, .woocommerce-Tabs-panel--specifications, [id*="specifications"]');
      
      // If no tab panel, find the Specifications heading
      if (!specSection) {
        const specHeader = allElements.find((h) => {
          const text = h.textContent?.trim().toLowerCase() || '';
          return text === 'specifications';
        });
        if (specHeader) {
          // Get the parent container or use the header's parent
          specSection = specHeader.closest('.wpb_text_column, .vc_column_text, .elementor-widget-container, .entry-content, article') || specHeader.parentElement;
        }
      }
      
      // Find FAQs header
      const faqHeader = allElements.find((h) => {
        const text = h.textContent?.trim().toLowerCase() || '';
        return text === 'faqs' || text === 'faq' || text.includes('frequently asked');
      });
      
      // Extract specifications by finding all bold headings followed by lists
      if (specSection) {
        // Get all strong/bold elements within the spec section
        const boldElements = specSection.querySelectorAll('strong, b, h3, h4, h5');
        
        Array.from(boldElements).forEach((boldEl) => {
          const headingText = boldEl.textContent?.trim() || '';
          if (headingText.length < 3 || headingText.length > 100) return;
          
          // Skip if it's the main "Specifications" heading
          if (headingText.toLowerCase() === 'specifications') return;
          
          // Skip FAQ-like questions
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
            // This is an FAQ - extract it with answer
            let answerEl = boldEl.parentElement?.nextElementSibling;
            if (!answerEl) {
              // Try getting next sibling of the bold element's grandparent
              answerEl = boldEl.closest('p')?.nextElementSibling || null;
            }
            let answerText = '';
            if (answerEl && (answerEl.tagName === 'P' || answerEl.tagName === 'DIV' || 
                            answerEl.tagName === 'UL' || answerEl.tagName === 'OL')) {
              answerText = answerEl.textContent?.trim() || '';
            }
            if (headingText.length > 5 && answerText.length > 10) {
              faqs.push({ question: headingText, answer: answerText });
            }
            return;
          }
          
          // Look for the UL/OL that follows this bold element
          // The list might be a sibling of the bold element's parent (typically a <p>)
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
            // If we hit another bold heading, stop
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
              specifications[headingText] = allItems.map(item => '• ' + item).join('\n');
            }
          }
        });
      }
      
      // Fallback: If no specs found, try walking through all elements after "Specifications" text
      if (Object.keys(specifications).length === 0) {
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
          
          // Start capturing after we find "Specifications"
          if (!foundSpecsHeader && (node.tagName === 'H2' || node.tagName === 'H3' || node.tagName === 'STRONG') && text === 'specifications') {
            foundSpecsHeader = true;
            continue;
          }
          
          if (!foundSpecsHeader) continue;
          
          // Stop at FAQs or Related Products
          if (text === 'faqs' || text === 'faq' || text === 'related products' || text === 'reviews') {
            if (currentHeading && currentItems.length > 0) {
              specifications[currentHeading] = currentItems.map(item => '• ' + item).join('\n');
            }
            break;
          }
          
          // Check if this is a bold heading
          if ((node.tagName === 'STRONG' || node.tagName === 'B') && node.textContent) {
            const headingText = node.textContent.trim();
            if (headingText.length > 3 && headingText.length < 100 && !headingText.includes('?')) {
              // Save previous heading if we had items
              if (currentHeading && currentItems.length > 0) {
                specifications[currentHeading] = currentItems.map(item => '• ' + item).join('\n');
              }
              currentHeading = headingText;
              currentItems = [];
            }
          }
          
          // Capture list items under current heading
          if (node.tagName === 'LI' && currentHeading) {
            const itemText = node.textContent?.trim() || '';
            if (itemText.length > 3) {
              currentItems.push(itemText);
            }
          }
        }
        
        // Don't forget the last heading
        if (currentHeading && currentItems.length > 0) {
          specifications[currentHeading] = currentItems.map(item => '• ' + item).join('\n');
        }
      }
      
      // Extract FAQs - first from dedicated FAQ section, then from question-style headings anywhere
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
              faqs.push({ question: questionText, answer: answerText });
            }
          }
          
          currentEl = currentEl.nextElementSibling;
          depth++;
        }
      }
      
      // Also extract FAQs from within/after Specifications (questions mixed with specs)
      if (specSection && faqs.length === 0) {
        const boldElements = specSection.querySelectorAll('strong, b');
        Array.from(boldElements).forEach((boldEl) => {
          const headingText = boldEl.textContent?.trim() || '';
          const hLower = headingText.toLowerCase();
          
          // Check if this is a question (FAQ)
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
            // Get the answer from the next element
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
              faqs.push({ question: headingText, answer: answerText });
            }
          }
        });
      }
      
      // Fallback: If no specs found via section method, try table extraction
      if (Object.keys(specifications).length === 0) {
        const specRows = document.querySelectorAll('.specifications tr, .product-attributes tr, .woocommerce-product-attributes tr');
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
        faqs,
        documents,
        videoUrl,
        sku
      };
    });

      if (productDetails) {
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
          faqs: productDetails.faqs,
          status: 'active'
        });
      }
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
