export interface MarketCountry {
  slug: string;
  name: string;
  isoCode: string;
  geoRegion: string;
  subregion: "East Africa" | "West Africa" | "Southern Africa" | "Central Africa" | "Latin America & Caribbean";
  flag: string;
  healthContext: string;
  importNote: string;
  relevantCategories: string[];
}

export const MARKETS: MarketCountry[] = [
  // East Africa
  {
    slug: "kenya",
    name: "Kenya",
    isoCode: "KE",
    geoRegion: "AF-KE",
    subregion: "East Africa",
    flag: "🇰🇪",
    healthContext: "Kenya has a robust healthcare distribution network spanning both public county health departments and a growing private sector. The Universal Health Coverage rollout has driven significant demand for primary care and maternal health equipment. VIA Global Health has supplied thermocoagulators, CPAP devices, and diagnostic tools to Kenyan facilities and NGO programmes across Nairobi, Mombasa, and rural county hospitals.",
    importNote: "Medical devices may require Kenya Bureau of Standards (KEBS) compliance. Air freight enters via Jomo Kenyatta International Airport (NBO); sea freight via Mombasa Port. Kenya Revenue Authority exemptions apply for qualifying medical equipment imports.",
    relevantCategories: [],
  },
  {
    slug: "ethiopia",
    name: "Ethiopia",
    isoCode: "ET",
    geoRegion: "AF-ET",
    subregion: "East Africa",
    flag: "🇪🇹",
    healthContext: "Ethiopia has Africa's second-largest population and an ambitious Health Extension Programme that has rapidly expanded primary care infrastructure. The Ministry of Health and regional health bureaus are major buyers of maternal health, neonatal care, and diagnostic equipment. VIA serves both government procurement channels and international NGOs operating in Ethiopia.",
    importNote: "Ethiopian Food and Drug Authority (EFDA) registration may be required for medical devices. Air freight via Addis Ababa Bole International (ADD) is the primary route. Customs clearance typically takes 1–2 weeks for medical equipment shipments.",
    relevantCategories: ["Maternal, Newborn, and Child Health", "Cervical Precancer Treatment", "Anesthesia & Respiratory"],
  },
  {
    slug: "tanzania",
    name: "Tanzania",
    isoCode: "TZ",
    geoRegion: "AF-TZ",
    subregion: "East Africa",
    flag: "🇹🇿",
    healthContext: "Tanzania's Ministry of Health and regional councils procure through the Medical Stores Department (MSD), which manages national pharmaceutical and equipment distribution. Strong NGO presence—including Partners in Health and Clinton Health Access Initiative—drives additional demand for quality maternal health and neonatal equipment.",
    importNote: "Tanzania Medicines and Medical Devices Authority (TMDA) regulates medical device imports. Sea freight enters via Dar es Salaam Port; air freight via Julius Nyerere International Airport (DAR). DDP and DAP incoterms available.",
    relevantCategories: ["Maternal, Newborn, and Child Health", "Cervical Precancer Treatment"],
  },
  {
    slug: "uganda",
    name: "Uganda",
    isoCode: "UG",
    geoRegion: "AF-UG",
    subregion: "East Africa",
    flag: "🇺🇬",
    healthContext: "Uganda's district health system and a strong international NGO sector—including MSF, IRC, and USAID-funded programmes—generate consistent demand for maternal health and diagnostic equipment. National Medical Stores (NMS) handles government procurement, while private hospitals and mission health facilities purchase independently.",
    importNote: "National Drug Authority (NDA) Uganda oversees medical device regulation. Air freight via Entebbe International Airport (EBB); sea freight via Mombasa Port with inland trucking. VAT exemptions available for qualifying medical equipment.",
    relevantCategories: ["Maternal, Newborn, and Child Health", "Anesthesia & Respiratory", "Hospital & Clinic"],
  },
  {
    slug: "rwanda",
    name: "Rwanda",
    isoCode: "RW",
    geoRegion: "AF-RW",
    subregion: "East Africa",
    flag: "🇷🇼",
    healthContext: "Rwanda has built one of Africa's most efficient healthcare systems, with near-universal health insurance coverage under the Community-Based Health Insurance scheme. The Rwanda Biomedical Centre (RBC) coordinates procurement for public health facilities. VIA serves both RBC tenders and direct NGO procurement in Rwanda.",
    importNote: "Rwanda Food and Drugs Authority (FDA) regulates medical devices. Air freight via Kigali International Airport (KGL) is fastest; sea freight via Mombasa with inland transport. Rwanda's efficient customs processes typically allow clearance within days.",
    relevantCategories: [],
  },
  {
    slug: "mozambique",
    name: "Mozambique",
    isoCode: "MZ",
    geoRegion: "AF-MZ",
    subregion: "East Africa",
    flag: "🇲🇿",
    healthContext: "Mozambique has a donor-funded health sector with strong government and NGO procurement, particularly for maternal and child health equipment. Portuguese-speaking buyers are well served by VIA's multilingual team. Major NGOs operating in Mozambique include MSF, Save the Children, and World Vision.",
    importNote: "MISAU (Ministry of Health) oversees medical device regulation. Air freight via Maputo International Airport (MPM); sea freight via Port of Maputo. VIA provides Portuguese-language documentation and communication.",
    relevantCategories: ["Maternal, Newborn, and Child Health", "Cervical Precancer Treatment"],
  },
  // West Africa
  {
    slug: "nigeria",
    name: "Nigeria",
    isoCode: "NG",
    geoRegion: "AF-NG",
    subregion: "West Africa",
    flag: "🇳🇬",
    healthContext: "Nigeria is Africa's most populous country and has the continent's largest healthcare market. Demand for maternal health, surgical, and diagnostic equipment is high across federal, state, and private facilities. VIA serves distributors in Lagos and Abuja, state health ministries, and international NGO programmes including those addressing cervical cancer prevention.",
    importNote: "NAFDAC (National Agency for Food and Drug Administration and Control) registration is required for medical devices in Nigeria. Air freight via Murtala Muhammed International Airport (LOS) or Abuja (ABV); sea freight via Apapa Port, Lagos. Import duty exemptions available for qualifying medical devices.",
    relevantCategories: [],
  },
  {
    slug: "ghana",
    name: "Ghana",
    isoCode: "GH",
    geoRegion: "AF-GH",
    subregion: "West Africa",
    flag: "🇬🇭",
    healthContext: "Ghana's National Health Insurance Scheme supports medical equipment procurement at public facilities nationwide. The Ghana Health Service coordinates national procurement while district health offices and private hospitals buy independently. Strong NGO presence—including IRC, MSF, and PIH—drives demand for diagnostic and maternal health equipment.",
    importNote: "Food and Drugs Authority (FDA) Ghana regulates medical device imports. Air freight via Kotoka International Airport (ACC) in Accra; sea freight via Tema Port. Import duty exemptions are available for registered medical equipment.",
    relevantCategories: ["Maternal, Newborn, and Child Health", "Cervical Precancer Treatment", "Hospital & Clinic"],
  },
  {
    slug: "senegal",
    name: "Senegal",
    isoCode: "SN",
    geoRegion: "AF-SN",
    subregion: "West Africa",
    flag: "🇸🇳",
    healthContext: "Senegal has made significant investments in women's health infrastructure, with NGO programmes targeting cervical cancer prevention and safe motherhood. French-speaking buyers across West Africa often route procurement through Dakar. VIA's French-language team provides full support for Senegalese and regional francophone procurement.",
    importNote: "Direction de la Pharmacie et du Médicament (DPM) regulates medical equipment imports. Air freight via Dakar-Blaise Diagne International Airport (DSS); sea freight via Port of Dakar. French-language documentation provided.",
    relevantCategories: ["Cervical Precancer Treatment", "Maternal, Newborn, and Child Health"],
  },
  // Southern Africa
  {
    slug: "south-africa",
    name: "South Africa",
    isoCode: "ZA",
    geoRegion: "AF-ZA",
    subregion: "Southern Africa",
    flag: "🇿🇦",
    healthContext: "South Africa has Africa's most developed healthcare infrastructure, with a large private hospital sector and significant NGO activity in rural areas. The National Department of Health runs substantial equipment tenders, and provincial health departments procure independently. VIA supplies both private distributors and NGO health programmes.",
    importNote: "SAHPRA (South African Health Products Regulatory Authority) regulates medical device imports. Sea freight via Durban or Cape Town ports; air freight via O.R. Tambo International (JNB). South Africa serves as a regional distribution hub for southern Africa.",
    relevantCategories: [],
  },
  {
    slug: "zambia",
    name: "Zambia",
    isoCode: "ZM",
    geoRegion: "AF-ZM",
    subregion: "Southern Africa",
    flag: "🇿🇲",
    healthContext: "Zambia's healthcare system is supported by government procurement through the Zambia Medicines and Medical Supplies Agency (ZAMMSA) and a strong donor-funded NGO sector. Maternal and child health equipment is particularly in demand across Zambia's provinces.",
    importNote: "Zambia Medicines Regulatory Authority (ZAMRA) oversees medical devices. Air freight via Kenneth Kaunda International (LUN); sea freight via Durban with inland transport. COMESA trade preferences may apply.",
    relevantCategories: ["Maternal, Newborn, and Child Health", "Anesthesia & Respiratory"],
  },
  // Central Africa
  {
    slug: "drc",
    name: "Democratic Republic of Congo",
    isoCode: "CD",
    geoRegion: "AF-CD",
    subregion: "Central Africa",
    flag: "🇨🇩",
    healthContext: "The DRC has vast healthcare needs across its provinces, served by major international NGOs including MSF, IRC, Save the Children, and UNICEF. Kinshasa and eastern provinces are key procurement hubs. VIA's French-language team provides full support for Congolese procurement, including for emergency health programmes.",
    importNote: "Agence Congolaise de Réglementation Pharmaceutique (ACOREP) regulates medical devices. Air freight preferred for security and reliability via Kinshasa N'djili (FIH); cargo transit is complex for eastern DRC. French-language documentation provided.",
    relevantCategories: ["Maternal, Newborn, and Child Health", "Hospital & Clinic", "Cervical Precancer Treatment"],
  },
  // Latin America & Caribbean
  {
    slug: "haiti",
    name: "Haiti",
    isoCode: "HT",
    geoRegion: "NA-HT",
    subregion: "Latin America & Caribbean",
    flag: "🇭🇹",
    healthContext: "Haiti has significant healthcare infrastructure needs supported by a large international NGO presence, including MSF, Partners in Health (PIH), and Catholic Relief Services. VIA Global Health has shipped thermocoagulators and other equipment to Haitian facilities and NGO programmes. French and Haitian Creole communications supported.",
    importNote: "MSPP (Ministère de la Santé Publique et de la Population) oversees medical devices. Air freight via Toussaint Louverture International Airport (PAP). NGO import exemptions commonly available. VIA has established logistics experience for Haiti shipments.",
    relevantCategories: ["Maternal, Newborn, and Child Health", "Cervical Precancer Treatment", "Anesthesia & Respiratory"],
  },
];

export const MARKET_SUBREGIONS = [
  "East Africa",
  "West Africa",
  "Southern Africa",
  "Central Africa",
  "Latin America & Caribbean",
] as const;

export type MarketSubregion = typeof MARKET_SUBREGIONS[number];

export const MARKETS_BY_SUBREGION: Record<MarketSubregion, MarketCountry[]> = MARKET_SUBREGIONS.reduce(
  (acc, region) => {
    acc[region] = MARKETS.filter(m => m.subregion === region);
    return acc;
  },
  {} as Record<MarketSubregion, MarketCountry[]>
);

export interface AreaServedCountry {
  name: string;
  isoCode: string;
}

export const AREA_SERVED_COUNTRIES: AreaServedCountry[] = [
  { name: "Nigeria", isoCode: "NG" },
  { name: "Kenya", isoCode: "KE" },
  { name: "Ethiopia", isoCode: "ET" },
  { name: "Ghana", isoCode: "GH" },
  { name: "Tanzania", isoCode: "TZ" },
  { name: "South Africa", isoCode: "ZA" },
  { name: "Uganda", isoCode: "UG" },
  { name: "Senegal", isoCode: "SN" },
  { name: "Democratic Republic of the Congo", isoCode: "CD" },
  { name: "Mozambique", isoCode: "MZ" },
  { name: "Rwanda", isoCode: "RW" },
  { name: "Zambia", isoCode: "ZM" },
  { name: "Zimbabwe", isoCode: "ZW" },
  { name: "Cameroon", isoCode: "CM" },
  { name: "Côte d'Ivoire", isoCode: "CI" },
  { name: "Mali", isoCode: "ML" },
  { name: "Malawi", isoCode: "MW" },
  { name: "Burkina Faso", isoCode: "BF" },
  { name: "Niger", isoCode: "NE" },
  { name: "Guinea", isoCode: "GN" },
  { name: "Benin", isoCode: "BJ" },
  { name: "Togo", isoCode: "TG" },
  { name: "Sierra Leone", isoCode: "SL" },
  { name: "Liberia", isoCode: "LR" },
  { name: "Gambia", isoCode: "GM" },
  { name: "Botswana", isoCode: "BW" },
  { name: "Namibia", isoCode: "NA" },
  { name: "Angola", isoCode: "AO" },
  { name: "South Sudan", isoCode: "SS" },
  { name: "Sudan", isoCode: "SD" },
  { name: "Chad", isoCode: "TD" },
  { name: "Madagascar", isoCode: "MG" },
  { name: "Somalia", isoCode: "SO" },
  { name: "Haiti", isoCode: "HT" },
  { name: "Bolivia", isoCode: "BO" },
  { name: "Honduras", isoCode: "HN" },
  { name: "Bangladesh", isoCode: "BD" },
  { name: "Cambodia", isoCode: "KH" },
  { name: "Myanmar", isoCode: "MM" },
  { name: "Nepal", isoCode: "NP" },
];
