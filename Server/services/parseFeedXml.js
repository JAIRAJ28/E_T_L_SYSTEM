const { XMLParser } = require("fast-xml-parser");
function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
function parseFeedXml(xmlString) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      allowBooleanAttributes: true,
      parseTagValue: true,
      trimValues: true,
    });

    const json = parser.parse(xmlString);
    const rssItems = json?.rss?.channel?.item || json?.channel?.item || null;
    if (rssItems) {
      return {
        format: "rss",
        items: ensureArray(rssItems),
        meta: {
          title: json?.rss?.channel?.title || json?.channel?.title || null,
        },
      };
    }
    const atomEntries = json?.feed?.entry || null;
    if (atomEntries) {
      return {
        format: "atom",
        items: ensureArray(atomEntries),
        meta: {
          title: json?.feed?.title || null,
        },
      };
    }
    const rdfItems = json?.["rdf:RDF"]?.item || null;
    if (rdfItems) {
      return {
        format: "rdf",
        items: ensureArray(rdfItems),
        meta: {
          title: json?.["rdf:RDF"]?.channel?.title || null,
        },
      };
    }

    const err = new Error(
      "Unknown feed format: expected RSS or Atom structure",
    );
    err.reasonCode = "PARSE_ERROR";
    err.statusCode = 400;
    throw err;
  } catch (e) {
    const err = new Error(`XML parse failed: ${e?.message || String(e)}`);
    err.reasonCode = e?.reasonCode || "PARSE_ERROR";
    err.statusCode = e?.statusCode || 400;
    throw err;
  }
}

module.exports = { parseFeedXml };
