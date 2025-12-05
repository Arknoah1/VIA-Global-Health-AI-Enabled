export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  sku: string;
  imageUrl: string;
  scrapedAt: string;
  status: 'active' | 'out_of_stock' | 'discontinued';
  specifications: Record<string, string>;
}

export type ScrapeStatus = 'idle' | 'scanning' | 'extracting' | 'completed' | 'error';
