import { Product } from "./types";

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
];

const MOCK_CATEGORIES = ["Medical Device", "Laboratory", "Diagnostics", "Consumables", "Equipment"];

export function generateMockProduct(id: string): Product {
  const category = MOCK_CATEGORIES[Math.floor(Math.random() * MOCK_CATEGORIES.length)];
  const isMedical = Math.random() > 0.5;
  
  return {
    id,
    name: isMedical 
      ? `ViaHealth ${category} Pro ${Math.floor(Math.random() * 1000)}` 
      : `GlobalMed ${category} Unit X${Math.floor(Math.random() * 100)}`,
    description: "High-precision medical equipment designed for professional healthcare settings. Features advanced monitoring capabilities and durable construction.",
    price: Math.floor(Math.random() * 5000) + 100,
    currency: "USD",
    category,
    sku: `VIA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    imageUrl: MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)],
    scrapedAt: new Date().toISOString(),
    status: Math.random() > 0.8 ? 'out_of_stock' : 'active',
    specifications: {
      "Weight": `${Math.floor(Math.random() * 20)}kg`,
      "Dimensions": "40x30x20cm",
      "Power": "110-240V",
      "Warranty": "2 Years"
    }
  };
}

export const INITIAL_PRODUCTS: Product[] = Array.from({ length: 15 }, (_, i) => 
  generateMockProduct(`prod-${i + 1}`)
);
