import { normalizeCountryCode } from "./countryMeta";

/**
 * Each review keeps its `countryCode` when it matches a known student country.
 * Reviews missing or invalid codes get filled from the weighted shuffle pool (legacy).
 */
export function distributeReviews(studentCountries, rawReviews) {
  const codeSet = new Set(studentCountries.map((c) => c.code));
  const reviews = rawReviews.map((r) => ({ ...r }));

  const pool = [];
  studentCountries.forEach((c) => {
    for (let i = 0; i < c.count; i++) pool.push(c.code);
  });

  let seed = 0xc0ffee;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  let poolIdx = 0;
  reviews.forEach((r) => {
    const cc = normalizeCountryCode(r.countryCode);
    if (cc && codeSet.has(cc)) {
      r.countryCode = cc;
      r.countryName = studentCountries.find((c) => c.code === cc)?.name || "";
      return;
    }
    const fallback = pool[poolIdx % pool.length];
    poolIdx += 1;
    r.countryCode = fallback;
    r.countryName = studentCountries.find((c) => c.code === fallback)?.name || "";
  });

  const byCountry = {};
  reviews.forEach((r) => {
    (byCountry[r.countryCode] ||= []).push(r);
  });
  return byCountry;
}
