export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  sku: string;
  imageUrl: string;
  images: string[];
  videoUrl?: string;
  keyFeatures: string[];
  documents: { name: string; url: string }[];
  scrapedAt: string;
  status: 'active' | 'out_of_stock' | 'discontinued';
  specifications: Record<string, string>;
  faqs: { question: string; answer: string }[];
  unitsPerPack?: number | null;
  packType?: string | null;
}

export type ScrapeStatus = 'idle' | 'scanning' | 'extracting' | 'completed' | 'error';
