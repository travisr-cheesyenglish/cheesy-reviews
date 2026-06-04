/** Every student review shows 5 stars on the public map (not stored in JSON). */
export function FiveStars({ className = "", variant = "light" }) {
  return (
    <div
      className={`five-stars five-stars--${variant}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label="5 out of 5 stars"
    >
      <span className="five-stars__glyph" aria-hidden>
        ★★★★★
      </span>
    </div>
  );
}
