import { Product } from "./types";

export const REAL_PRODUCTS = [
  {
    name: "Lolip - Atorvastatin 10mg Tablet Pack",
    image: "/images/products/atorvastatin-10mg-tabs-30s-300x300.jpg",
    category: "Pharmaceuticals",
    price: 15
  },
  {
    name: "Infant Radiant Warmer NWS 101 with Attached Bed",
    image: "/images/products/infant-radiant-warmer-with-attached-bed-nws-10107223123-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 2450
  },
  {
    name: "Q-View Imager LS - Chemiluminescent Imager",
    image: "/images/products/imager-ls-facing-right-1-header-300x300.png",
    category: "Diagnostics",
    price: 5600
  },
  {
    name: "O2 Cube",
    image: "/images/products/o2-cube-leanmed-front-1-header-240x300.jpeg",
    category: "Respiratory & Intensive Care",
    price: 1200
  },
  {
    name: "Upacof - Peadiatric Syrup 100ml Bottle",
    image: "/images/products/cdi-upacof-peadiatric-100ml-300x300.jpg",
    category: "Pharmaceuticals",
    price: 8
  },
  {
    name: "CPR Torso – Practi-Man Advanced",
    image: "/images/products/practiman-advanced-dual-mode-1-header-300x300.jpg",
    category: "Training & Education",
    price: 450
  },
  {
    name: "Univir - Acyclovir 200mg Tablet Pack",
    image: "/images/products/acyclovir-univir-200mg-tabs-30s-300x300.jpg",
    category: "Pharmaceuticals",
    price: 22
  },
  {
    name: "REVITAL Surgical Face Masks",
    image: "/images/products/revital-surgical-face-mask-1-header-1-300x300.jpg",
    category: "Infection Prevention & Control",
    price: 15
  },
  {
    name: "Cady Blood Collection Tube - Lithium Heparin",
    image: "/images/products/revital-cady-blood-collection-tube-green-1-1-300x300.jpg",
    category: "Diagnostics",
    price: 45
  },
  {
    name: "Gabler Single Oxygen Flowmeter - BS Probe",
    image: "/images/products/single-oxygen-flowmeter-bs-probe-gabler-medical-300x300.jpg",
    category: "Respiratory & Intensive Care",
    price: 180
  },
  {
    name: "REVITAL Premium Surgical Face Masks",
    image: "/images/products/revital-premium-surgical-face-mask-1-header-1-300x300.jpg",
    category: "Infection Prevention & Control",
    price: 25
  },
  {
    name: "REVITAL Surgical Gown",
    image: "/images/products/revital-surgical-gown-1-header-scaled-1-300x300.jpg",
    category: "Infection Prevention & Control",
    price: 12
  },
  {
    name: "Sulfran - Co-Trimoxazole 960mg Tablet Pack",
    image: "/images/products/cdi-cotrimoxazole-sulfran-960mg-tabs-100s-300x300.jpg",
    category: "Pharmaceuticals",
    price: 18
  },
  {
    name: "Neonatal Warmer Care Centre NWC 100",
    image: "/images/products/neonatal-care-resuscitation-centre-nrc-100-2-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 3200
  },
  {
    name: "Infrared Thermometer IR 988",
    image: "/images/products/wanto-technologies-ir-988-header-300x300.jpg",
    category: "COVID-19 Essentials",
    price: 45
  },
  {
    name: "Keyar DT Pro",
    image: "/images/products/keyar-dt-pro-janitri-8-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 850
  },
  {
    name: "LifeWrap Non-Pneumatic Anti-Shock Garment (NASG)",
    image: "/images/products/dsc_0369-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 120
  },
  {
    name: "Pumani bubbleCPAP",
    image: "/images/products/pumani-hht-header-1-scaled-300x300.jpg",
    category: "Respiratory & Intensive Care",
    price: 950
  },
  {
    name: "Thermocoagulator",
    image: "/images/products/microsoftteams-image-1-300x300.png",
    category: "Reproductive Health",
    price: 1400
  },
  {
    name: "MiraCradle – Neonate Cooler",
    image: "/images/products/pluss-miracradle-full-configuration-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 1800
  }
];

export function generateMockProduct(id: string, index?: number): Product {
  // Use real data if available based on index, otherwise random
  const realProduct = index !== undefined && index < REAL_PRODUCTS.length 
    ? REAL_PRODUCTS[index] 
    : REAL_PRODUCTS[Math.floor(Math.random() * REAL_PRODUCTS.length)];
    
  return {
    id,
    name: realProduct.name,
    description: "High-precision medical equipment designed for professional healthcare settings. This device features advanced monitoring capabilities, durable construction suitable for demanding environments, and an intuitive user interface.",
    price: realProduct.price,
    currency: "USD",
    category: realProduct.category,
    sku: `VIA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    imageUrl: realProduct.image,
    // Add additional gallery images (simulated by using same image or others)
    images: [
      realProduct.image,
      "/images/products/covid-essentials.jpg",
      "/images/products/imaging-and-monitoring.jpg"
    ],
    videoUrl: Math.random() > 0.7 ? "https://www.youtube.com/embed/dQw4w9WgXcQ" : undefined,
    keyFeatures: [
      "ISO 13485 Certified",
      "User-friendly interface with digital display",
      "Low power consumption (15W)",
      "Portable and lightweight design",
      "Includes 2-year manufacturer warranty"
    ],
    documents: [
      { name: "User Manual.pdf", url: "#" },
      { name: "Technical Specifications.pdf", url: "#" },
      { name: "CE Certificate.pdf", url: "#" }
    ],
    scrapedAt: new Date().toISOString(),
    status: Math.random() > 0.8 ? 'out_of_stock' : 'active',
    specifications: {
      "Weight": `${Math.floor(Math.random() * 20)}kg`,
      "Dimensions": "40x30x20cm",
      "Power Input": "110-240V AC, 50/60Hz",
      "Operating Temp": "10°C to 40°C",
      "Warranty": "2 Years",
      "Manufacturer": "Global Health Tech Ltd"
    }
  };
}

export const INITIAL_PRODUCTS: Product[] = [];
