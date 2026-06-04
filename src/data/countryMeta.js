import { ALPHA3_TO_ALPHA2 } from "./alpha3ToAlpha2.js";

/** Display names + flag emojis for ISO 3166-1 alpha-3 (overrides generated flags). */
export const COUNTRY_FLAGS = {
  BRA: "🇧🇷",
  CHN: "🇨🇳",
  COL: "🇨🇴",
  DEU: "🇩🇪",
  ECU: "🇪🇨",
  ETH: "🇪🇹",
  HKG: "🇭🇰",
  HND: "🇭🇳",
  IND: "🇮🇳",
  IRN: "🇮🇷",
  JPN: "🇯🇵",
  KOR: "🇰🇷",
  MEX: "🇲🇽",
  RUS: "🇷🇺",
  SLV: "🇸🇻",
  TUR: "🇹🇷",
  USA: "🇺🇸",
};

export const COUNTRY_NAMES = {
  BRA: "Brazil",
  CHN: "China",
  COL: "Colombia",
  DEU: "Germany",
  ECU: "Ecuador",
  ETH: "Ethiopia",
  HKG: "Hong Kong",
  HND: "Honduras",
  IND: "India",
  IRN: "Iran",
  JPN: "Japan",
  KOR: "South Korea",
  MEX: "Mexico",
  RUS: "Russia",
  SLV: "El Salvador",
  TUR: "Turkey",
  USA: "United States",
};

export function normalizeCountryCode(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim().toUpperCase();
  if (s.length !== 3) return "";
  return s;
}

function flagFromAlpha2(alpha2) {
  const a2 = String(alpha2 || "")
    .toUpperCase()
    .slice(0, 2);
  if (!/^[A-Z]{2}$/.test(a2)) return "";
  const base = 0x1f1e6;
  return String.fromCodePoint(...[...a2].map((ch) => base + ch.charCodeAt(0) - 65));
}

/** Flag emoji for any ISO alpha-3 code (editor + new reviews). */
export function getCountryFlag(code) {
  const c = normalizeCountryCode(code);
  if (!c) return "";
  if (COUNTRY_FLAGS[c]) return COUNTRY_FLAGS[c];
  const a2 = ALPHA3_TO_ALPHA2[c];
  return a2 ? flagFromAlpha2(a2) : "";
}

export function getCountryName(code) {
  const c = normalizeCountryCode(code);
  if (!c) return "";
  return COUNTRY_NAMES[c] || c;
}

export function getCountryDisplay(code) {
  const c = normalizeCountryCode(code);
  return {
    code: c,
    name: getCountryName(c),
    flag: getCountryFlag(c),
  };
}

/**
 * Build marquee + globe country list only from review country codes (no stray countries).
 * Sorted by review count descending.
 */
export function deriveStudentCountriesFromReviews(reviews) {
  const tallies = new Map();
  for (const r of reviews) {
    const c = normalizeCountryCode(r.countryCode);
    if (!c) continue;
    tallies.set(c, (tallies.get(c) || 0) + 1);
  }
  const codes = [...tallies.keys()].sort((a, b) => tallies.get(b) - tallies.get(a));
  return codes.map((code) => ({
    code,
    name: getCountryName(code),
    count: tallies.get(code),
    flag: getCountryFlag(code),
  }));
}
