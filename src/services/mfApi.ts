/**
 * Mutual Fund API Service
 * Fetches free, public, real-time and historical NAV data for Indian Mutual Funds.
 * Combines an integrated supplemental index for newly launched AMCs (e.g. JioBlackRock,
 * Zerodha, Groww) with live AMFI data and mfapi endpoints.
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

// Lazy-loaded supplemental scheme index for funds >= 149000 (JioBlackRock, Zerodha, Groww, etc.)
let supplementalCache: MfSearchItem[] | null = null;

async function getSupplementalSchemes(): Promise<MfSearchItem[]> {
  if (!supplementalCache) {
    try {
      const mod = await import('../data/recentSchemes.json');
      supplementalCache = (mod.default || mod) as MfSearchItem[];
    } catch (e) {
      console.warn('Could not load supplemental schemes:', e);
      supplementalCache = [];
    }
  }
  return supplementalCache;
}

async function searchSupplemental(query: string): Promise<MfSearchItem[]> {
  const cleanQ = query.trim();
  const lowerQ = cleanQ.toLowerCase();

  // Expand common compound terms like JioBlackRock -> Jio BlackRock
  const expandedQuery = lowerQ
    .replace(/jioblackrock/g, 'jio blackrock')
    .replace(/paragparikh/g, 'parag parikh');

  const tokens = expandedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const schemes = await getSupplementalSchemes();
  const matched: MfSearchItem[] = [];

  for (let i = 0; i < schemes.length; i++) {
    const item = schemes[i];
    const normName = item.schemeName.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const codeMatch = String(item.schemeCode) === cleanQ;

    if (codeMatch || tokens.every((t) => normName.includes(t))) {
      matched.push(item);
      if (matched.length >= 50) break;
    }
  }
  return matched;
}

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
 * Search mutual fund schemes by name, keywords, or numeric scheme code.
 * Searches both the supplemental index (JioBlackRock, Zerodha, etc.) and remote AMFI index.
 */
export async function searchMutualFunds(query: string): Promise<MfSearchItem[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const lowerQuery = cleanQuery.toLowerCase();
  if (searchCache.has(lowerQuery)) {
    return searchCache.get(lowerQuery)!;
  }

  // 1. Search supplemental recent schemes index (covers JioBlackRock, Groww, Zerodha, etc.)
  const localMatches = await searchSupplemental(cleanQuery);

  // 2. Query remote mfapi search (covers older legacy schemes)
  let remoteResults: MfSearchItem[] = [];
  try {
    const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(cleanQuery)}`);
    if (res.ok) {
      remoteResults = await res.json();
    }
  } catch (err) {
    console.warn('Remote search request failed, relying on local index:', err);
  }

  // 3. If query is a numeric AMFI code and not yet in results, fetch it directly
  if (/^\d{5,7}$/.test(cleanQuery) && !localMatches.some((m) => String(m.schemeCode) === cleanQuery)) {
    try {
      const direct = await getSchemeInfo(cleanQuery);
      if (direct) {
        localMatches.unshift({
          schemeCode: Number(direct.schemeCode),
          schemeName: direct.schemeName,
        });
      }
    } catch {
      // ignore
    }
  }

  // 4. Merge and deduplicate by schemeCode
  const seenCodes = new Set<number>();
  const combined: MfSearchItem[] = [];

  for (const item of [...localMatches, ...remoteResults]) {
    if (!seenCodes.has(item.schemeCode)) {
      seenCodes.add(item.schemeCode);
      combined.push(item);
    }
  }

  // 5. Sort Direct Plan - Growth options towards the top
  const sorted = combined.sort((a, b) => {
    const aDirect = a.schemeName.toLowerCase().includes('direct') ? 1 : 0;
    const bDirect = b.schemeName.toLowerCase().includes('direct') ? 1 : 0;
    if (bDirect !== aDirect) return bDirect - aDirect;
    const aGrowth = a.schemeName.toLowerCase().includes('growth') ? 1 : 0;
    const bGrowth = b.schemeName.toLowerCase().includes('growth') ? 1 : 0;
    return bGrowth - aGrowth;
  });

  const finalResults = sorted.slice(0, 40);
  searchCache.set(lowerQuery, finalResults);
  return finalResults;
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
