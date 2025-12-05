import { Product } from "./types";

export const REAL_PRODUCTS = [
  {
    name: "Lolip - Atorvastatin 10mg Tablet Pack",
    image: "https://viaglobalhealth.com/wp-content/uploads/2021/07/ATORVASTATIN-10MG-TABS-30s-300x300.jpg",
    category: "Pharmaceuticals",
    price: 15
  },
  {
    name: "Infant Radiant Warmer NWS 101 with Attached Bed",
    image: "https://viaglobalhealth.com/wp-content/uploads/2020/05/Infant-Radiant-Warmer-with-attached-bed-NWS-10107223123-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 2450
  },
  {
    name: "Q-View Imager LS - Chemiluminescent Imager",
    image: "https://viaglobalhealth.com/wp-content/uploads/2022/10/Imager-LS-facing-right-1-Header-300x300.png",
    category: "Diagnostics",
    price: 5600
  },
  {
    name: "O2 Cube",
    image: "https://viaglobalhealth.com/wp-content/uploads/2023/04/O2-Cube-LeanMed-Front-1-Header-240x300.jpeg",
    category: "Respiratory & Intensive Care",
    price: 1200
  },
  {
    name: "Upacof - Peadiatric Syrup 100ml Bottle",
    image: "https://viaglobalhealth.com/wp-content/uploads/2021/07/CDI-UPACOF-PEADIATRIC-100ML-300x300.jpg",
    category: "Pharmaceuticals",
    price: 8
  },
  {
    name: "CPR Torso – Practi-Man Advanced",
    image: "https://viaglobalhealth.com/wp-content/uploads/2022/09/PractiMan-Advanced-Dual-Mode-1-Header-300x300.jpg",
    category: "Training & Education",
    price: 450
  },
  {
    name: "Univir - Acyclovir 200mg Tablet Pack",
    image: "https://viaglobalhealth.com/wp-content/uploads/2021/07/ACYCLOVIR-Univir-200MG-TABS-30s-300x300.jpg",
    category: "Pharmaceuticals",
    price: 22
  },
  {
    name: "REVITAL Surgical Face Masks",
    image: "https://viaglobalhealth.com/wp-content/uploads/2020/12/Revital-Surgical-Face-Mask-1-header-1-300x300.jpg",
    category: "Infection Prevention & Control",
    price: 15
  },
  {
    name: "Cady Blood Collection Tube - Lithium Heparin",
    image: "https://viaglobalhealth.com/wp-content/uploads/2021/04/Revital-Cady-Blood-Collection-Tube-GREEN-1-1-300x300.jpg",
    category: "Diagnostics",
    price: 45
  },
  {
    name: "Gabler Single Oxygen Flowmeter - BS Probe",
    image: "https://viaglobalhealth.com/wp-content/uploads/2024/01/Single-Oxygen-Flowmeter-BS-Probe-Gabler-Medical-300x300.jpg",
    category: "Respiratory & Intensive Care",
    price: 180
  },
  {
    name: "REVITAL Premium Surgical Face Masks",
    image: "https://viaglobalhealth.com/wp-content/uploads/2020/12/Revital-Premium-Surgical-Face-Mask-1-header-1-300x300.jpg",
    category: "Infection Prevention & Control",
    price: 25
  },
  {
    name: "REVITAL Surgical Gown",
    image: "https://viaglobalhealth.com/wp-content/uploads/2020/12/Revital-Surgical-Gown-1-header-scaled-1-300x300.jpg",
    category: "Infection Prevention & Control",
    price: 12
  },
  {
    name: "Sulfran - Co-Trimoxazole 960mg Tablet Pack",
    image: "https://viaglobalhealth.com/wp-content/uploads/2021/07/CDI-COTRIMOXAZOLE-Sulfran-960MG-TABS-100s-300x300.jpg",
    category: "Pharmaceuticals",
    price: 18
  },
  {
    name: "Neonatal Warmer Care Centre NWC 100",
    image: "https://viaglobalhealth.com/wp-content/uploads/2020/02/Neonatal-Care-Resuscitation-Centre-NRC-100-2-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 3200
  },
  {
    name: "Infrared Thermometer IR 988",
    image: "https://viaglobalhealth.com/wp-content/uploads/2020/05/Wanto-Technologies-IR-988-header-300x300.jpg",
    category: "COVID-19 Essentials",
    price: 45
  },
  {
    name: "Keyar DT Pro",
    image: "https://viaglobalhealth.com/wp-content/uploads/2024/03/Keyar-DT-Pro-Janitri-8-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 850
  },
  {
    name: "LifeWrap Non-Pneumatic Anti-Shock Garment (NASG)",
    image: "https://viaglobalhealth.com/wp-content/uploads/2020/02/DSC_0369-300x300.jpg",
    category: "Maternal, Newborn and Child Health",
    price: 120
  },
  {
    name: "Pumani bubbleCPAP",
    image: "https://viaglobalhealth.com/wp-content/uploads/2020/02/Pumani-HHT-Header-1-scaled-300x300.jpg",
    category: "Respiratory & Intensive Care",
    price: 950
  },
  {
    name: "Thermocoagulator",
    image: "https://viaglobalhealth.com/wp-content/uploads/2022/06/MicrosoftTeams-image-1-300x300.png",
    category: "Reproductive Health",
    price: 1400
  },
  {
    name: "MiraCradle – Neonate Cooler",
    image: "https://viaglobalhealth.com/wp-content/uploads/2021/07/Pluss-MiraCradle-Full-Configuration-300x300.jpg",
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
      "https://viaglobalhealth.com/wp-content/uploads/2021/03/covid-essentials.jpg",
      "https://viaglobalhealth.com/wp-content/uploads/2021/03/imaging-and-monitoring.jpg"
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
