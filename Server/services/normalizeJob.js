const { sha1 } = require("./hash");

function toText(v) {
  if (v == null) return null;
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

function ensureArray(arr) {
  if (!arr) return [];
  return Array.isArray(arr) ? arr : [arr];
}

function pickFirst(...vals) {
  for (const v of vals) {
    const t = toText(v);
    if (t) return t;
  }
  return null;
}
function parseDateSafe(v) {
  const s = toText(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function extractLink(rawItem) {
  console.log(rawItem);
  const link = rawItem?.link;
  if (typeof link === "string") return link.trim();
  const links = ensureArray(link);
  for (const l of links) {
    const href = l?.["@_href"] || l?.["@_HREF"];
    if (href) return String(href).trim();
  }
  return null;
}

function extractCategories(rawItem) {
  console.log(rawItem);
  const categories = [];
  const rawCat = rawItem?.category;
  for (const c of ensureArray(rawCat)) {
    if (typeof c === "string") categories.push(c.trim());
    else if (c?.["@_term"]) categories.push(String(c["@_term"]).trim());
  }
  const more = rawItem?.categories || rawItem?.categoryName;
  for (const c of ensureArray(more)) {
    const t = toText(c);
    if (t) categories.push(t);
  }
  return Array.from(new Set(categories.filter(Boolean)));
}

function extractDescription(rawItem) {
  console.log(rawItem);
  return pickFirst(
    rawItem?.["content:encoded"],
    rawItem?.content?.["#text"],
    rawItem?.content,
    rawItem?.summary?.["#text"],
    rawItem?.summary,
    rawItem?.description,
  );
}

function extractExternalId(rawItem) {
  console.log(rawItem);
  const guid = rawItem?.guid;
  if (typeof guid === "string") return guid.trim();
  if (guid?.["#text"]) return String(guid["#text"]).trim();
  return pickFirst(rawItem?.id, rawItem?.["atom:id"]);
}
function normalizeJob({ sourceUrl, sourceName, rawItem }) {
  const title = pickFirst(rawItem?.title?.["#text"], rawItem?.title);
  const jobUrl = extractLink(rawItem);
  const externalId = extractExternalId(rawItem);
  const publishedAt = parseDateSafe(
    pickFirst(rawItem?.pubDate, rawItem?.published, rawItem?.updated)
  );
  const company = pickFirst(
    rawItem?.["dc:creator"],
    rawItem?.author?.name,
    rawItem?.author
  );

  const description = extractDescription(rawItem);
  const categories = extractCategories(rawItem);
  const stableKeyPart = externalId || jobUrl || title || "";
  const dedupeKey = stableKeyPart
    ? sha1(`${sourceUrl}|${stableKeyPart}`)
    : null;

  return {
    sourceUrl,
    sourceName,
    externalId: externalId || null,
    jobUrl: jobUrl || null,
    dedupeKey: dedupeKey || null,
    title: title || null,
    company: company || null,
    location: pickFirst(rawItem?.location, rawItem?.["job:location"]) || null,
    description: description || null,
    categories,
    jobType: pickFirst(rawItem?.jobType, rawItem?.["job:type"]) || null,
    region: pickFirst(rawItem?.region, rawItem?.["job:region"]) || null,
    publishedAt,
    raw: process.env.NODE_ENV === "development" ? rawItem : null 
  };
}

function validateNormalizedJob(job) {
  const errors = [];
  if (!job.sourceUrl) errors.push("sourceUrl missing");
  if (!job.sourceName) errors.push("sourceName missing");
  if (!job.title) errors.push("title missing");
  if (!job.jobUrl) errors.push("jobUrl missing");
  if (!job.dedupeKey) errors.push("dedupeKey missing");
  return { ok: errors.length === 0, errors };
}

module.exports = { normalizeJob, validateNormalizedJob };