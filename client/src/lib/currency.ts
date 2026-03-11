const COUNTRY_CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  "Mexico": { code: "MXN", symbol: "MX$" },
  "Colombia": { code: "COP", symbol: "COL$" },
  "Peru": { code: "PEN", symbol: "S/" },
  "Guatemala": { code: "GTQ", symbol: "Q" },
  "Honduras": { code: "HNL", symbol: "L" },
  "Ecuador": { code: "USD", symbol: "$" },
  "Bolivia": { code: "BOB", symbol: "Bs" },
  "Dominican Republic": { code: "DOP", symbol: "RD$" },
  "Paraguay": { code: "PYG", symbol: "₲" },
  "Chile": { code: "CLP", symbol: "CL$" },
  "Brazil": { code: "BRL", symbol: "R$" },
  "Argentina": { code: "ARS", symbol: "AR$" },
  "El Salvador": { code: "USD", symbol: "$" },
  "Costa Rica": { code: "CRC", symbol: "₡" },
  "Panama": { code: "USD", symbol: "$" },
  "Haiti": { code: "HTG", symbol: "G" },
  "Jamaica": { code: "JMD", symbol: "J$" },
  "Trinidad and Tobago": { code: "TTD", symbol: "TT$" },
  "Nicaragua": { code: "NIO", symbol: "C$" },
  "Kenya": { code: "KES", symbol: "KSh" },
  "Nigeria": { code: "NGN", symbol: "₦" },
  "Ghana": { code: "GHS", symbol: "GH₵" },
  "Tanzania": { code: "TZS", symbol: "TSh" },
  "Uganda": { code: "UGX", symbol: "USh" },
  "Ethiopia": { code: "ETB", symbol: "Br" },
  "Rwanda": { code: "RWF", symbol: "FRw" },
  "Mozambique": { code: "MZN", symbol: "MT" },
  "South Africa": { code: "ZAR", symbol: "R" },
  "Senegal": { code: "XOF", symbol: "CFA" },
  "Cameroon": { code: "XAF", symbol: "FCFA" },
  "Zambia": { code: "ZMW", symbol: "ZK" },
  "Zimbabwe": { code: "ZWL", symbol: "Z$" },
  "Malawi": { code: "MWK", symbol: "MK" },
  "Madagascar": { code: "MGA", symbol: "Ar" },
  "Congo (DRC)": { code: "CDF", symbol: "FC" },
  "India": { code: "INR", symbol: "₹" },
  "Bangladesh": { code: "BDT", symbol: "৳" },
  "Nepal": { code: "NPR", symbol: "रू" },
};

export function getCurrencyForCountry(country: string): { code: string; symbol: string } | null {
  return COUNTRY_CURRENCY_MAP[country] || null;
}

export function formatLocalCurrency(usdAmount: number, rate: number, currency: { code: string; symbol: string }): string {
  const localAmount = usdAmount * rate;
  if (localAmount >= 1000000) {
    return `≈ ${currency.symbol} ${(localAmount / 1000000).toFixed(1)}M`;
  }
  if (localAmount >= 1000) {
    return `≈ ${currency.symbol} ${Math.round(localAmount).toLocaleString()}`;
  }
  return `≈ ${currency.symbol} ${localAmount.toFixed(2)}`;
}
