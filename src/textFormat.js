/** Capitalize the first letter of each word (student full name). */
export function capitalizePersonName(value) {
  return String(value || "")
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      return part.charAt(0).toLocaleUpperCase("en") + part.slice(1);
    })
    .join("");
}

/** Single last-name initial: no spaces, one character, capitalized. */
export function capitalizeInitial(value) {
  const s = String(value || "").replace(/\s/g, "").slice(0, 1);
  if (!s) return "";
  return s.charAt(0).toLocaleUpperCase("en");
}
