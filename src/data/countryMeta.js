/** Display names + flag emojis for ISO 3166-1 alpha-3 (student list only). */
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
    name: COUNTRY_NAMES[code] || code,
    count: tallies.get(code),
    flag: COUNTRY_FLAGS[code] || "",
  }));
}
