const STORAGE_KEY = "via_customer_profile";

export interface CustomerProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  organizationType?: string;
  organizationName?: string;
  shippingCountry?: string;
  importCapability?: string;
  lastUpdated?: number;
}

export function getCustomerProfile(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as CustomerProfile;
    if (!profile.firstName && !profile.email) return null;
    return profile;
  } catch {
    return null;
  }
}

export function saveCustomerProfile(updates: Partial<CustomerProfile>): void {
  try {
    const existing = getCustomerProfile() || {};
    const merged: CustomerProfile = {
      ...existing,
      ...updates,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
  }
}

export function clearCustomerProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export function profileToContextString(profile: CustomerProfile): string {
  const parts: string[] = [];
  if (profile.firstName) {
    parts.push(`Name: ${profile.firstName}${profile.lastName ? " " + profile.lastName : ""}`);
  }
  if (profile.email) {
    parts.push(`Email: ${profile.email}`);
  }
  if (profile.organizationType) {
    parts.push(`Organisation Type: ${profile.organizationType}`);
  }
  if (profile.organizationName) {
    parts.push(`Organisation Name: ${profile.organizationName}`);
  }
  if (profile.shippingCountry) {
    parts.push(`Previous Shipping Country: ${profile.shippingCountry}`);
  }
  if (profile.importCapability) {
    parts.push(`Import Capability: ${profile.importCapability}`);
  }
  return parts.join("\n");
}
