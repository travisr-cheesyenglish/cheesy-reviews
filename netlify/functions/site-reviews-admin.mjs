/**
 * Owner-only: verify password, or save reviews-site.json to the connected GitHub repo.
 *
 * Netlify → Site settings → Environment variables:
 *   SITE_EDIT_PASSWORD   (pick a strong password — only you know it)
 *   GITHUB_TOKEN         (fine-grained: Contents read/write on this repo, or classic repo scope)
 *   GITHUB_OWNER         (GitHub username or org)
 *   GITHUB_REPO          (repo name only, no slashes)
 *   GITHUB_BRANCH        (optional, default main)
 *
 * After a successful save, Netlify rebuilds from Git and the live site updates.
 */

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

function checkEnv() {
  const password = process.env.SITE_EDIT_PASSWORD;
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!password || !token || !owner || !repo) {
    return null;
  }
  return { password, token, owner, repo, branch };
}

function validatePayload(data) {
  if (!data || typeof data !== "object") return "Invalid payload";
  if (!Array.isArray(data.studentCountries) || !Array.isArray(data.reviews)) {
    return "Payload must include studentCountries and reviews arrays";
  }
  for (const c of data.studentCountries) {
    if (!c || typeof c.code !== "string" || typeof c.name !== "string") {
      return "Each country needs code (string) and name (string)";
    }
    if (typeof c.count !== "number" && typeof c.count !== "string") {
      return "Each country needs count (number)";
    }
    if (String(c.code).trim().length !== 3) {
      return "Each country code must be exactly 3 letters (ISO alpha-3)";
    }
  }
  for (const r of data.reviews) {
    if (!r || typeof r.name !== "string" || typeof r.review !== "string") {
      return "Each review needs name and review strings";
    }
    if (r.reply != null && typeof r.reply !== "string") {
      return "Review reply must be a string when provided";
    }
    if (r.countryCode != null && String(r.countryCode).trim().length > 0 && String(r.countryCode).trim().length !== 3) {
      return "Review countryCode must be a 3-letter ISO code when set";
    }
  }
  return null;
}

function normalizeForSave(data) {
  return {
    headerStats: {
      years:
        data.headerStats && typeof data.headerStats.years === "string"
          ? data.headerStats.years.trim() || "11"
          : "11",
    },
    studentCountries: data.studentCountries.map((c) => {
      const row = {
        code: String(c.code || "")
          .trim()
          .toUpperCase()
          .slice(0, 3),
        name: String(c.name || "").trim(),
        count: Math.max(0, Math.floor(Number(c.count)) || 0),
      };
      if (c.flag != null && String(c.flag).trim() !== "") {
        row.flag = String(c.flag).trim();
      }
      return row;
    }),
    reviews: data.reviews.map((r) => {
      const row = {
        name: String(r.name || "").trim(),
        initial: String(r.initial || (r.name && r.name[0]) || "?").trim(),
        color: String(r.color || "#FFD23F").trim(),
        review: String(r.review || "").trim(),
        reply: String(r.reply || "").trim(),
      };
      const cc = String(r.countryCode || "")
        .trim()
        .toUpperCase()
        .slice(0, 3);
      if (cc.length === 3) row.countryCode = cc;
      return row;
    }),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const env = checkEnv();
  if (!env) {
    return json(503, {
      error:
        "Server is not configured for editing. Add SITE_EDIT_PASSWORD, GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in Netlify environment variables.",
    });
  }

  if (body.password !== env.password) {
    return json(401, { error: "Wrong password" });
  }

  if (body.action === "verify") {
    return json(200, { ok: true });
  }

  if (body.action !== "save") {
    return json(400, { error: "Unknown action. Use verify or save." });
  }

  const err = validatePayload(body.data);
  if (err) return json(400, { error: err });

  const normalized = normalizeForSave(body.data);
  const err2 = validatePayload(normalized);
  if (err2) return json(400, { error: err2 });

  const filePath = "public/reviews-site.json";
  const auth = `Bearer ${env.token}`;
  const pathParam = filePath.replace(/\//g, "%2F");
  const base = `https://api.github.com/repos/${env.owner}/${env.repo}/contents/${pathParam}`;

  const getUrl = `${base}?ref=${encodeURIComponent(env.branch)}`;
  const getRes = await fetch(getUrl, { headers: { Authorization: auth, Accept: "application/vnd.github+json" } });
  let sha = undefined;
  if (getRes.status === 200) {
    const meta = await getRes.json();
    sha = meta.sha;
  } else if (getRes.status !== 404) {
    const t = await getRes.text();
    return json(502, { error: `GitHub read failed (${getRes.status}): ${t.slice(0, 200)}` });
  }

  const content = Buffer.from(JSON.stringify(normalized, null, 2) + "\n", "utf8").toString("base64");

  const putBody = {
    message: "Update reviews map (via site editor)",
    content,
    branch: env.branch,
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(base, {
    method: "PUT",
    headers: {
      Authorization: auth,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const t = await putRes.text();
    return json(502, { error: `GitHub save failed (${putRes.status}): ${t.slice(0, 300)}` });
  }

  return json(200, { ok: true, message: "Saved. Netlify will rebuild in a minute or less." });
}
