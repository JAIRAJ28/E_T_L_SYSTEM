const axios = require("axios");
const config = require("../config");

async function fetchXml(url){
  try {
    const res=await axios.get(url,{
        timeout:config.http.timeoutMs,
        responseType:"text",
        headers: {
        "User-Agent": "JobImporter/1.0 (+https://example.com)",
        Accept: "application/xml,text/xml,application/rss+xml,application/atom+xml,application/json,text/plain,*/*",
      },
        validateStatus: (status) => status >= 200 && status < 300,
    })
    if (!res.data || typeof res.data !== "string") {
      const err = new Error("Empty or invalid XML response");
      err.statusCode = 502;
      throw err;
    }

    return res.data
  } catch (e) {
    const err = new Error(
      `Failed to fetch XML from ${url}: ${e?.message || String(e)}`
    );
    err.reasonCode = "HTTP_ERROR";
    err.statusCode = 502;
    throw err;
  }
}
module.exports = { fetchXml };
