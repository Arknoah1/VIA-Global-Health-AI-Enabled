
import puppeteer from 'puppeteer';
import type { Product } from '../client/src/lib/types';

export async function scrapeViaGlobalHealth(): Promise<Product[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://www.viaglobalhealth.com/products', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Extract product data from the page
    const products = await page.evaluate(() => {
      const productElements = document.querySelectorAll('.product-item, .product-card, [data-product]');
      const results: any[] = [];

      productElements.forEach((element, index) => {
        const name = element.querySelector('h2, h3, .product-name, .product-title')?.textContent?.trim() || `Product ${index + 1}`;
        const description = element.querySelector('.description, .product-description, p')?.textContent?.trim() || 'No description available';
        const priceText = element.querySelector('.price, .product-price, [data-price]')?.textContent?.trim() || '0';
        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
        const imageUrl = element.querySelector('img')?.getAttribute('src') || '';
        const category = element.querySelector('.category, .product-category')?.textContent?.trim() || 'Uncategorized';

        results.push({
          id: `scraped-${Date.now()}-${index}`,
          name,
          description,
          price,
          currency: 'USD',
          category,
          sku: `VIA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://www.viaglobalhealth.com${imageUrl}`,
          scrapedAt: new Date().toISOString(),
          status: 'active' as const,
          specifications: {}
        });
      });

      return results;
    });

    return products;
  } finally {
    await browser.close();
  }
}
