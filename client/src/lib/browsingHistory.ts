const STORAGE_KEY = "via_browsing_history";
const MAX_HISTORY = 50;

let historyVersion = 0;
const listeners: Set<() => void> = new Set();

export interface BrowsingEntry {
  productId: string;
  productName: string;
  category: string;
  viewedAt: number;
  viewCount: number;
}

export function onHistoryChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHistoryVersion() {
  return historyVersion;
}

export function trackProductView(product: { id: string; name: string; category: string }) {
  const history = getBrowsingHistory();
  const existing = history.find(h => h.productId === product.id);

  if (existing) {
    existing.viewedAt = Date.now();
    existing.viewCount += 1;
  } else {
    history.unshift({
      productId: product.id,
      productName: product.name,
      category: product.category,
      viewedAt: Date.now(),
      viewCount: 1,
    });
  }

  const trimmed = history
    .sort((a, b) => b.viewedAt - a.viewedAt)
    .slice(0, MAX_HISTORY);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
  }

  historyVersion++;
  listeners.forEach(fn => fn());
}

export function getBrowsingHistory(): BrowsingEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BrowsingEntry[];
  } catch {
    return [];
  }
}

export function getRecentProductIds(limit = 10): string[] {
  return getBrowsingHistory()
    .sort((a, b) => b.viewedAt - a.viewedAt)
    .slice(0, limit)
    .map(h => h.productId);
}

export function getCategoryPreferences(): Record<string, number> {
  const history = getBrowsingHistory();
  const cats: Record<string, number> = {};
  for (const entry of history) {
    cats[entry.category] = (cats[entry.category] || 0) + entry.viewCount;
  }
  return cats;
}
