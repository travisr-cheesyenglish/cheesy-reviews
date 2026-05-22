import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { deriveStudentCountriesFromReviews, COUNTRY_NAMES } from "./data/countryMeta";
import "./edit.css";

const AUTH_KEY = "cheesySiteEditPassword";

const COUNTRY_OPTIONS = Object.entries(COUNTRY_NAMES).sort((a, b) =>
  a[1].localeCompare(b[1]),
);

function CountryField({ value, onChange }) {
  const code = String(value || "")
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const isKnown = code.length === 3 && COUNTRY_NAMES[code];
  const selectValue = isKnown ? code : code ? "__other__" : "";

  return (
    <div className="edit-country-field">
      <select
        className="edit-input"
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "__other__") onChange(code && !isKnown ? code : "");
          else onChange(next);
        }}
      >
        <option value="">— Select country —</option>
        {COUNTRY_OPTIONS.map(([c, name]) => (
          <option key={c} value={c}>
            {name} ({c})
          </option>
        ))}
        <option value="__other__">Other — type 3-letter code</option>
      </select>
      {selectValue === "__other__" ? (
        <input
          className="edit-input edit-input-code"
          value={code}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          maxLength={3}
          placeholder="e.g. FRA"
        />
      ) : null}
    </div>
  );
}

function adminFetch(body) {
  return fetch("/.netlify/functions/site-reviews-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function EditSite() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [years, setYears] = useState("11");
  const [reviews, setReviews] = useState([]);
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem(AUTH_KEY));
  const [unlockError, setUnlockError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/reviews-site.json", { signal: ac.signal, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setYears(String(data.headerStats?.years ?? "11"));
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoadError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const storedPassword = useCallback(() => sessionStorage.getItem(AUTH_KEY) || "", []);

  const countriesDerived = useMemo(() => deriveStudentCountriesFromReviews(reviews), [reviews]);

  const tryUnlock = async () => {
    setUnlockError(null);
    const pw = password.trim();
    if (!pw) {
      setUnlockError("Enter your password.");
      return;
    }
    try {
      const res = await adminFetch({ action: "verify", password: pw });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUnlockError(data.error || `Request failed (${res.status})`);
        return;
      }
      sessionStorage.setItem(AUTH_KEY, pw);
      setUnlocked(true);
      setPassword("");
    } catch (e) {
      setUnlockError(
        e instanceof Error && e.message.includes("Failed to fetch")
          ? "Could not reach the editor API. Deploy on Netlify with functions enabled, or run `netlify dev` locally."
          : String(e),
      );
    }
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setUnlocked(false);
    setPassword("");
  };

  const buildPayload = () => ({
    headerStats: { years: years.trim() || "11" },
    studentCountries: deriveStudentCountriesFromReviews(reviews).map((c) => {
      const row = {
        code: c.code,
        name: c.name,
        count: c.count,
      };
      if (c.flag) row.flag = c.flag;
      return row;
    }),
    reviews: reviews.map((r) => {
      const row = {
        name: String(r.name || "").trim(),
        initial: String(r.initial || (r.name && r.name[0]) || "?").trim(),
        color: String(r.color || "#FFD23F").trim(),
        review: String(r.review || "").trim(),
        reply: String(r.reply || "").trim(),
      };
      const cc = String(r.countryCode || "").trim().toUpperCase().slice(0, 3);
      if (cc.length === 3) row.countryCode = cc;
      return row;
    }),
  });

  const save = async () => {
    setSaveMessage(null);
    setSaveError(null);
    const pw = storedPassword() || password.trim();
    if (!pw) {
      setSaveError("Unlock with your password first.");
      return;
    }
    const payload = buildPayload();
    for (const c of payload.studentCountries) {
      if (!c.code || c.code.length !== 3) {
        setSaveError(`Country "${c.name || "?"}" needs a 3-letter ISO code (e.g. USA, BRA).`);
        return;
      }
      if (!c.name) {
        setSaveError("Every country needs a name.");
        return;
      }
    }
    if (payload.studentCountries.length === 0) {
      setSaveError("Add at least one review with a valid 3-letter country code.");
      return;
    }
    for (const r of payload.reviews) {
      if (!r.name || !r.review) {
        setSaveError("Each review needs a student name and their review text.");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await adminFetch({ action: "save", password: pw, data: payload });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem(AUTH_KEY);
          setUnlocked(false);
        }
        setSaveError(data.error || `Save failed (${res.status})`);
        return;
      }
      setSaveMessage(data.message || "Saved.");
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const addReview = () => {
    setReviews((prev) => [
      ...prev,
      { countryCode: "", name: "", initial: "", color: "#FFD23F", review: "", reply: "" },
    ]);
  };

  const removeReview = (i) => {
    setReviews((prev) => prev.filter((_, j) => j !== i));
  };

  const patchReview = (i, field, value) => {
    setReviews((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  };

  if (loading) {
    return (
      <div className="edit-page">
        <p className="edit-muted">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="edit-page">
        <p className="edit-error">Could not load content: {loadError}</p>
        <Link className="edit-link" to="/">← Back to map</Link>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="edit-page">
        <h1 className="edit-title">Edit reviews map</h1>
        <p className="edit-lead">
          Only you can change this. Enter the password you set as <code>SITE_EDIT_PASSWORD</code> in Netlify (see SETUP.md in the repo).
        </p>
        <p className="edit-hint">Bookmark this page: <code>/edit</code> on your live site.</p>
        <label className="edit-label">
          Password
          <input
            type="password"
            className="edit-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            autoComplete="current-password"
          />
        </label>
        {unlockError ? <p className="edit-error">{unlockError}</p> : null}
        <div className="edit-actions">
          <button type="button" className="edit-btn edit-btn-primary" onClick={tryUnlock}>
            Unlock editor
          </button>
          <Link className="edit-link" to="/">← Back to map</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-page edit-page-wide">
      <header className="edit-header">
        <div>
          <h1 className="edit-title">Edit reviews map</h1>
          <p className="edit-lead">
            Countries on the map are built from each review’s country. Save commits to GitHub and Netlify rebuilds in about a minute.
          </p>
          <p className="edit-hint">
            Admin URL: <code>{typeof window !== "undefined" ? `${window.location.origin}/edit` : "/edit"}</code>
          </p>
        </div>
        <div className="edit-header-actions">
          <button type="button" className="edit-btn" onClick={logout}>
            Lock
          </button>
          <Link className="edit-link" to="/">View map →</Link>
        </div>
      </header>

      <section className="edit-section">
        <h2 className="edit-h2">Headline</h2>
        <label className="edit-label">
          Years shown (e.g. 11)
          <input className="edit-input edit-input-narrow" value={years} onChange={(e) => setYears(e.target.value)} />
        </label>
      </section>

      <section className="edit-section">
        <h2 className="edit-h2">Countries (from review codes)</h2>
        <p className="edit-hint">
          Set the 3-letter ISO code on each review (e.g. JPN for Japan, 🇯🇵). Only these countries appear on the globe and in the rotating list. Count = number of reviews.
        </p>
        <div className="edit-table-wrap">
          <table className="edit-table">
            <thead>
              <tr>
                <th>Flag</th>
                <th>Code</th>
                <th>Name</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {countriesDerived.map((c) => (
                <tr key={c.code}>
                  <td>{c.flag || "—"}</td>
                  <td><code>{c.code}</code></td>
                  <td>{c.name}</td>
                  <td>{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="edit-section">
        <div className="edit-section-head">
          <h2 className="edit-h2">Reviews</h2>
          <button type="button" className="edit-btn edit-btn-small" onClick={addReview}>
            Add review
          </button>
        </div>
        <div className="edit-reviews">
          {reviews.map((r, i) => (
            <div key={i} className="edit-card">
              <div className="edit-card-head">
                <span className="edit-card-title">Review {i + 1}</span>
                <button type="button" className="edit-btn edit-btn-danger edit-btn-small" onClick={() => removeReview(i)}>
                  Remove
                </button>
              </div>
              <div className="edit-grid">
                <label className="edit-label">
                  Country
                  <CountryField
                    value={r.countryCode || ""}
                    onChange={(v) => patchReview(i, "countryCode", v)}
                  />
                </label>
                <label className="edit-label">
                  Student name
                  <input className="edit-input" value={r.name} onChange={(e) => patchReview(i, "name", e.target.value)} />
                </label>
                <label className="edit-label">
                  Initial(s)
                  <input className="edit-input" value={r.initial} onChange={(e) => patchReview(i, "initial", e.target.value)} />
                </label>
                <label className="edit-label">
                  Bubble color (hex)
                  <input className="edit-input" value={r.color} onChange={(e) => patchReview(i, "color", e.target.value)} />
                </label>
              </div>
              <label className="edit-label">
                Their review
                <textarea className="edit-textarea" rows={4} value={r.review} onChange={(e) => patchReview(i, "review", e.target.value)} />
              </label>
              <label className="edit-label">
                Your reply (optional)
                <textarea className="edit-textarea" rows={4} value={r.reply} onChange={(e) => patchReview(i, "reply", e.target.value)} />
              </label>
            </div>
          ))}
        </div>
      </section>

      <footer className="edit-footer">
        {saveMessage ? <p className="edit-success">{saveMessage}</p> : null}
        {saveError ? <p className="edit-error">{saveError}</p> : null}
        <button type="button" className="edit-btn edit-btn-primary edit-btn-large" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save to site"}
        </button>
      </footer>
    </div>
  );
}
