const fs = require("node:fs");
const path = require("node:path");

const origin = "http://127.0.0.1:3000";
const maxPages = 500;
const timeout = 15000;

const seeds = [
  "/", "/affiliate", "/akomodasi", "/atraksi",
  "/bantuan", "/cara-pesan", "/daftar",
  "/daftar-travel", "/daftar-vendor",
  "/daftar-vendor/registrasi", "/destinasi",
  "/inspirasi", "/karier", "/kebijakan-privasi",
  "/masuk", "/mitra", "/notifikasi",
  "/partner/travel", "/partner/travel/corporate",
  "/partner/travel/daftar", "/partner/travel/enterprise",
  "/partner/travel/loyalty",
  "/partner/travel/partner-network",
  "/partner/travel/perjalanan",
  "/partner/travel/voucher-promo",
  "/pesanan", "/pusat-bantuan", "/search",
  "/segadeals", "/syarat-ketentuan",
  "/tentang-kami"
];

const queue = seeds.map(p => new URL(p, origin).href);
const seen = new Set();
const results = [];
const assets = new Set();

function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalize(value, base) {
  try {
    const url = new URL(decode(value), base);

    if (url.origin !== origin) return null;
    if (!["http:", "https:"].includes(url.protocol)) return null;

    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function extract(html, base) {
  const linkPattern = /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi;
  const assetPattern = /<(?:img|script|source)\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;

  let match;

  while ((match = linkPattern.exec(html))) {
    const url = normalize(match[1], base);
    if (url && !seen.has(url)) queue.push(url);
  }

  while ((match = assetPattern.exec(html))) {
    const url = normalize(match[1], base);
    if (url) assets.add(url);
  }
}

async function inspect(url, type) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeout),
      headers: { accept: type === "PAGE" ? "text/html" : "*/*" }
    });

    const contentType = response.headers.get("content-type") || "";
    const html = type === "PAGE" && contentType.includes("text/html")
      ? await response.text()
      : "";

    let issue = "OK";

    if (!response.ok) issue = "HTTP_ERROR";
    else if (type === "PAGE" && !contentType.includes("text/html")) {
      issue = "NOT_HTML";
    }
    else if (type === "PAGE" && !html.trim()) {
      issue = "EMPTY_HTML";
    }
    else if (type === "PAGE" &&
      /Application error|Internal Server Error|NEXT_HTTP_ERROR_FALLBACK;404/i.test(html)) {
      issue = "POSSIBLE_RENDER_ERROR";
    }

    return {
      type,
      url,
      finalUrl: response.url,
      status: response.status,
      issue,
      html
    };
  } catch (error) {
    return {
      type,
      url,
      finalUrl: "",
      status: 0,
      issue: error.message,
      html: ""
    };
  }
}

(async () => {
  while (queue.length && seen.size < maxPages) {
    const url = queue.shift();

    if (seen.has(url)) continue;
    seen.add(url);

    const result = await inspect(url, "PAGE");

    results.push({
      type: result.type,
      url: result.url,
      finalUrl: result.finalUrl,
      status: result.status,
      issue: result.issue
    });

    if (result.html && result.issue === "OK") {
      extract(result.html, result.finalUrl || url);
    }
  }

  for (const url of assets) {
    const result = await inspect(url, "ASSET");

    results.push({
      type: result.type,
      url: result.url,
      finalUrl: result.finalUrl,
      status: result.status,
      issue: result.issue
    });
  }

  const failed = results.filter(r => r.issue !== "OK");
  const redirects = results.filter(r =>
    r.finalUrl && r.finalUrl !== r.url
  );

  const report = {
    total: results.length,
    pages: seen.size,
    assets: assets.size,
    failed: failed.length,
    redirects: redirects.length,
    queueRemaining: queue.length,
    results
  };

  const output = path.join(process.cwd(), "website-full-audit.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2));

  console.log("\n=== SEGALOKA WEBSITE AUDIT ===");
  console.log("Pages checked :", seen.size);
  console.log("Assets checked:", assets.size);
  console.log("Failed        :", failed.length);
  console.log("Redirected    :", redirects.length);
  console.log("Unvisited     :", queue.length);

  console.log("\n=== ERRORS ===");
  console.table(failed.slice(0, 100));

  console.log("\n=== REDIRECTS ===");
  console.table(redirects.slice(0, 30));

  console.log("\nReport: website-full-audit.json");
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});