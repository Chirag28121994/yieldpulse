/**
 * Mutual Fund API Service
 * Fetches free, public, real-time and historical NAV data for Indian Mutual Funds from api.mfapi.in
 * Includes local storage caching to minimize network usage and provide instant loading.
 */

export interface MfSearchItem {
  schemeCode: number;
  schemeName: string;
}

export interface MfNavDataPoint {
  date: string; // DD-MM-YYYY
  nav: string;
}

export interface MfSchemeMeta {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
  isin_growth?: string | null;
  isin_div_reinvestment?: string | null;
}

export interface MfSchemeDetails {
  meta: MfSchemeMeta;
  data: MfNavDataPoint[];
  status: string;
}

export interface SchemeInfo {
  schemeCode: string;
  schemeName: string;
  fundHouse: string;
  category: string;
  currentNav: number;
  navDate: string; // DD-MM-YYYY
  previousNav: number;
  previousNavDate: string;
  rawDetails: MfSchemeDetails;
}

const CACHE_PREFIX = 'yieldpulse_mf_';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-memory cache for fast search results
const searchCache = new Map<string, MfSearchItem[]>();

/**
 * Parse DD-MM-YYYY string to UTC timestamp at midnight
 */
export function parseDdMmYyyy(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  return Date.UTC(year, month, day);
}

/**
 * Parse YYYY-MM-DD string to UTC timestamp at midnight
 */
export function parseYyyyMmDd(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return Date.UTC(year, month, day);
}

/**
 * Search mutual fund schemes by name or keywords
 */
export async function searchMutualFunds(query: string): Promise<MfSearchItem[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const lowerQuery = cleanQuery.toLowerCase();
  if (searchCache.has(lowerQuery)) {
    return searchCache.get(lowerQuery)!;
  }

  try {
    const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(cleanQuery)}`);
    if (!res.ok) throw new Error(`Search failed with status ${res.status}`);
    const results: MfSearchItem[] = await res.json();
    
    // Sort Direct Plan - Growth options towards the top if matching
    const sorted = results.sort((a, b) => {
      const aDirect = a.schemeName.toLowerCase().includes('direct') ? 1 : 0;
      const bDirect = b.schemeName.toLowerCase().includes('direct') ? 1 : 0;
      if (bDirect !== aDirect) return bDirect - aDirect;
      const aGrowth = a.schemeName.toLowerCase().includes('growth') ? 1 : 0;
      const bGrowth = b.schemeName.toLowerCase().includes('growth') ? 1 : 0;
      return bGrowth - aGrowth;
    });

    searchCache.set(lowerQuery, sorted.slice(0, 40));
    return sorted.slice(0, 40);
  } catch (err) {
    console.error('MF Search Error:', err);
    return [];
  }
}

/**
 * Fetch full scheme details with NAV history
 * Uses localStorage cache to avoid refetching large payloads
 */
export async function getSchemeDetails(
  schemeCode: string | number,
  forceRefresh = false
): Promise<MfSchemeDetails | null> {
  const codeStr = String(schemeCode).trim();
  if (!codeStr) return null;

  const cacheKey = `${CACHE_PREFIX}${codeStr}`;

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.details) {
          return parsed.details as MfSchemeDetails;
        }
      }
    } catch (e) {
      // Ignore cache read errors
    }
  }

  try {
    const res = await fetch(`https://api.mfapi.in/mf/${codeStr}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: MfSchemeDetails = await res.json();

    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return null;
    }

    // Save to cache
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          details: data,
        })
      );
    } catch (e) {
      // Quota exceeded or private browsing, ignore
    }

    return data;
  } catch (err) {
    console.error(`Failed to fetch MF details for ${codeStr}:`, err);
    return null;
  }
}

/**
 * Get processed SchemeInfo including current and previous NAV
 */
export async function getSchemeInfo(
  schemeCode: string | number,
  forceRefresh = false
): Promise<SchemeInfo | null> {
  const details = await getSchemeDetails(schemeCode, forceRefresh);
  if (!details || !details.data || details.data.length === 0) return null;

  const currentItem = details.data[0];
  const prevItem = details.data.length > 1 ? details.data[1] : currentItem;

  return {
    schemeCode: String(details.meta.scheme_code),
    schemeName: details.meta.scheme_name,
    fundHouse: details.meta.fund_house || 'Mutual Fund',
    category: details.meta.scheme_category || details.meta.scheme_type || 'Equity',
    currentNav: parseFloat(currentItem.nav) || 0,
    navDate: currentItem.date,
    previousNav: parseFloat(prevItem.nav) || parseFloat(currentItem.nav) || 0,
    previousNavDate: prevItem.date,
    rawDetails: details,
  };
}

/**
 * Look up NAV on or immediately before a given purchase date (YYYY-MM-DD)
 */
export function findNavForDate(
  details: MfSchemeDetails,
  targetDateYyyyMmDd: string
): { nav: number; date: string } | null {
  if (!details.data || details.data.length === 0) return null;

  const targetUtc = parseYyyyMmDd(targetDateYyyyMmDd);
  if (!targetUtc) return null;

  // details.data is ordered newest to oldest
  for (let i = 0; i < details.data.length; i++) {
    const item = details.data[i];
    const itemUtc = parseDdMmYyyy(item.date);
    // As soon as item date <= target date, this was the prevailing NAV on that date
    if (itemUtc <= targetUtc) {
      const navVal = parseFloat(item.nav);
      if (!isNaN(navVal) && navVal > 0) {
        return { nav: navVal, date: item.date };
      }
    }
  }

  // If purchase date was before the fund inception, use oldest available NAV
  const oldest = details.data[details.data.length - 1];
  return {
    nav: parseFloat(oldest.nav) || 0,
    date: oldest.date,
  };
}
