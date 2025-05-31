const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { JSDOM } = require("jsdom");

const input = process.argv[2];

if (!input) {
  console.error("❗ Usage: node seochecker.js <html-file | url>");
  process.exit(1);
}

function isURL(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function fetchHTMLFromURL(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function loadHTML() {
  if (isURL(input)) {
    console.log(`🌐 Fetching ${input}...`);
    return await fetchHTMLFromURL(input);
  } else {
    const filePath = path.resolve(input);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${input}`);
      process.exit(1);
    }
    return fs.readFileSync(filePath, "utf-8");
  }
}

function check(document, selector, desc, condition = el => !!el) {
  const el = document.querySelector(selector);
  const passed = condition(el);
  console.log(`${passed ? "✅" : "❌"} ${desc}`);
  return passed;
}

async function run() {
  const html = await loadHTML();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  console.log("\n🔎 SEO CHECKLIST RESULTS:\n");

  // 1. Semantic HTML Structure
  console.log("1. Semantic HTML:");
  const semanticTags = ["header", "nav", "main", "section", "footer"];
  semanticTags.forEach(tag => check(document, tag, `Has <${tag}> tag`));
  const h1s = document.querySelectorAll("h1");
  console.log(`${h1s.length === 1 ? "✅" : "❌"} Only one <h1> tag`);
  const headingsOrder = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
    .map(h => parseInt(h.tagName[1]));
  const isLogical = headingsOrder.every((val, i, arr) => i === 0 || val <= arr[i - 1] + 1);
  console.log(`${isLogical ? "✅" : "❌"} Logical heading structure\n`);

  // 2. Title and Meta
  console.log("2. Title and Meta:");
  const title = document.querySelector('title');
  check(document, "title", "Has <title> tag", el => el && el.textContent.length <= 60);
  check(document, 'meta[name="description"]', "Meta description under 160 chars", el =>
    el && el.getAttribute("content")?.length <= 160
  );
  console.log("");

  // 3. Clean URLs (skipped - can't validate without server context)

  // 4. Open Graph / Twitter
  console.log("4. Social Tags:");
  ["og:title", "og:description", "og:image"].forEach(p =>
    check(document, `meta[property="${p}"]`, `Has ${p}`)
  );
  check(document, 'meta[name="twitter:card"]', "Has twitter:card meta tag");
  console.log("");

  // 5. Canonical
  console.log("5. Canonical:");
  check(document, 'link[rel="canonical"]', "Has canonical link");
  console.log("");

  // 6. Mobile
  console.log("6. Mobile Friendly:");
  check(document, 'meta[name="viewport"]', "Has viewport meta tag");
  const hasMediaQueries = html.includes("@media");
  console.log(`${hasMediaQueries ? "✅" : "❌"} Uses responsive media queries`);
  console.log("");

  // 7. Page Speed
  console.log("7. Performance:");
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  const usesAsyncOrDefer = scripts.every(s => s.hasAttribute("async") || s.hasAttribute("defer"));
  console.log(`${usesAsyncOrDefer ? "✅" : "❌"} JS scripts use async/defer`);
  const lazyImgs = Array.from(document.querySelectorAll("img")).every(img =>
    img.loading === "lazy"
  );
  console.log(`${lazyImgs ? "✅" : "❌"} Images use lazy loading`);
  console.log("");

  // 8. Structured Data
  console.log("8. Structured Data:");
  const jsonld = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  console.log(`${jsonld.length > 0 ? "✅" : "❌"} Has JSON-LD structured data`);
  console.log("");

  // 9. Image Optimization
  console.log("9. Images:");
  const allImgs = Array.from(document.querySelectorAll("img"));
  const altAll = allImgs.every(img => img.hasAttribute("alt"));
  console.log(`${altAll ? "✅" : "❌"} All images have alt attributes`);
  const webpUsed = allImgs.some(img => img.src.endsWith(".webp"));
  console.log(`${webpUsed ? "✅" : "❌"} Uses modern image formats (WebP)`);
  console.log("");

  // 10. HTTPS (if remote)
  if (isURL(input)) {
    console.log("10. HTTPS:");
    console.log(`${input.startsWith("https") ? "✅" : "❌"} Uses HTTPS\n`);
  }

  // 11. Internal Linking
  console.log("11. Internal Links:");
  const anchors = Array.from(document.querySelectorAll("a[href]"));
  const internalAnchors = anchors.filter(a => a.href.startsWith("/") || a.href.includes(document.location?.origin || ""));
  const descriptive = internalAnchors.every(a => {
    const text = a.textContent.trim().toLowerCase();
    return text && !["click here", "more", "read more"].includes(text);
  });
  console.log(`${descriptive ? "✅" : "❌"} Uses descriptive anchor text`);
  console.log("");

  // 12. robots.txt and sitemap.xml (check if local)
  console.log("12. Files:");
  const root = path.dirname(path.resolve(input));
  const robotsExists = fs.existsSync(path.join(root, "robots.txt"));
  const sitemapExists = fs.existsSync(path.join(root, "sitemap.xml"));
  console.log(`${robotsExists ? "✅" : "❌"} robots.txt exists`);
  console.log(`${sitemapExists ? "✅" : "❌"} sitemap.xml exists`);
  console.log("");
}

run();
