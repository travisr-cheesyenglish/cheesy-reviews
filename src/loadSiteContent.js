import { distributeReviews } from "./data/distributeReviews";
import { deriveStudentCountriesFromReviews } from "./data/countryMeta";

/**
 * Loads reviews from /reviews-site.json.
 * Countries on the globe and in the marquee come only from review `countryCode`s
 * (the `studentCountries` array in the file is ignored so stray entries never appear).
 */
export async function loadSiteContent(signal) {
  const res = await fetch("/reviews-site.json", {
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Could not load reviews-site.json (HTTP ${res.status})`);
  }
  const data = await res.json();
  const reviews = data.reviews;
  if (!Array.isArray(reviews)) {
    throw new Error("reviews-site.json must include a reviews array");
  }
  const studentCountries = deriveStudentCountriesFromReviews(reviews);
  if (studentCountries.length === 0) {
    throw new Error("No valid country codes on reviews (need 3-letter ISO codes like JPN, BRA).");
  }
  const years =
    data.headerStats && typeof data.headerStats.years === "string"
      ? data.headerStats.years
      : "11";
  return {
    studentCountries,
    reviewsByCountry: distributeReviews(studentCountries, reviews),
    headerStats: {
      countries: String(studentCountries.length),
      years: String(years),
    },
  };
}
