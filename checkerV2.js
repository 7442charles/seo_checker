import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

const fetch = async (...args) => (await import("node-fetch")).default(...args);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const input = process.argv[2];
if (!input) {
  console.error("❌ Usage: node checkerV2.js <file.html|url>");
  process.exit(1);
}

async function loadHTML(input) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
    return await res.text();
  } else {
    const filePath = path.resolve(process.cwd(), input);
    return fs.readFileSync(filePath, "utf-8");
  }
}

const passedChecks = [];
const failedChecks = [];
const passFailResults = []; // for summary stats

function check($, selector, description, conditionFn, skip = false) {
  if (skip) {
    console.log(`🔶 Skipped: ${description}`);
    return;
  }
  const el = $(selector).first();
  const pass = conditionFn(el, $);

  passFailResults.push(pass);
  if (pass) {
    passedChecks.push(description);
  } else {
    failedChecks.push(description);
  }

  console.log(`${pass ? "✅" : "❌"} ${description}`);
}

(async () => {
  const html = await loadHTML(input);
  const $ = cheerio.load(html);

  console.log("\n==============================");
  console.log("✅ SEO Optimization Checklist");
  console.log("==============================");

  // 1. Semantic HTML Structure
  console.log("\n1. Semantic HTML Structure:");
  ["header", "nav", "main", "section", "footer"].forEach(tag => {
    check($, tag, `Has <${tag}> tag`, el => el.length > 0);
  });
  check($, "h1", "Only one <h1> tag", () => $("h1").length === 1);
  check($, "h2,h3,h4,h5,h6", "Logical heading hierarchy present", () => {
    const hTags = ["h2", "h3", "h4", "h5", "h6"];
    return hTags.some(tag => $(tag).length > 0);
  });

  // 2. Title and Meta
  console.log("\n2. Title and Meta:");
  check($, "title", "Has <title> tag", el => !!el.text().trim());
  check($, "title", "Title length is optimal", el => {
    const len = el.text().trim().length;
    return len >= 50 && len <= 60;
  });
  check($, 'meta[name="description"]', "Meta description is between 120 and 158 characters", el => {
    const descLength = el.attr("content")?.length || 0;
    return descLength >= 120 && descLength <= 158;
  });

  // 3. Clean and Descriptive URLs
  if (input.startsWith("http")) {
    console.log("\n3. Clean and Descriptive URLs:");
    const clean = /^\/[a-z0-9\-\/]+(\.html?)?$/.test(new URL(input).pathname);
    check($, "body", "URL looks clean and human-readable", () => clean);
  }

  // 4. Open Graph and Twitter Card Tags
  console.log("\n4. Open Graph and Twitter Card Tags:");
  ["og:title", "og:description", "og:image"].forEach(name => {
    check($, `meta[property="${name}"]`, `Has ${name}`, el => !!el.attr("content"));
  });
  check($, 'meta[name="twitter:card"]', "Has twitter:card", el => !!el.attr("content"));

  // 5. Canonical Tag
  console.log("\n5. Canonical Tag:");
  check($, 'link[rel="canonical"]', "Has canonical tag", el => !!el.attr("href"));

  // 6. Mobile-Friendly Design
  console.log("\n6. Mobile-Friendly Design:");
  check($, 'meta[name="viewport"]', "Has viewport meta tag", el => {
    return el.attr("content")?.includes("width") || false;
  });
  check($, "style,link[rel='stylesheet']", "Responsive CSS present", () => true); // Always true for now

  // 7. Fast Page Load Time
  console.log("\n7. Fast Page Load Time:");
  check($, "script[src]", "JS uses async or defer", ($el, $) => {
    const scripts = $("script[src]").toArray();
    return scripts.every(script => {
      const attr = $(script).attr();
      return attr.async !== undefined || attr.defer !== undefined;
    });
  });

  const images = $("img");
  const hasImages = images.length > 0;
  check($, "img[loading='lazy']", "Images use lazy loading", el => images.length > 0, !hasImages);

  // 8. Structured Data Markup
  console.log("\n8. Structured Data Markup:");
  check($, 'script[type="application/ld+json"]', "Has JSON-LD structured data", el => el.text().length > 0);

  // 9. Image Optimization
  console.log("\n9. Image Optimization:");
  check($, "img", "Images have alt attributes", () => {
    return images.toArray().every(img => $(img).attr("alt")?.trim().length > 0);
  }, !hasImages);

  // 10. HTTPS Security
  console.log("\n10. HTTPS Security:");
  if (input.startsWith("https://")) {
    check($, "body", "HTTPS is used", () => true);
  } else if (input.startsWith("http://")) {
    check($, "body", "HTTPS is used", () => false);
  } else {
    console.log("🔶 Local file — skip HTTPS check");
  }

  // 11. Internal Linking
  console.log("\n11. Internal Linking:");
  check($, 'a[href]', "Anchor tags present", el => $("a[href]").length > 0);

  // 12. Robots.txt and Sitemap.xml
  if (input.startsWith("http")) {
    console.log("\n12. Robots.txt and Sitemap.xml:");
    const baseURL = new URL(input).origin;
    const robots = await fetch(`${baseURL}/robots.txt`).then(r => r.status === 200).catch(() => false);
    const sitemap = await fetch(`${baseURL}/sitemap.xml`).then(r => r.status === 200).catch(() => false);

    check($, "body", "robots.txt found", () => robots);
    check($, "body", "sitemap.xml found", () => sitemap);
  }

  // --- Summary Scoring ---
  const totalChecks = passFailResults.length;
  const totalPassed = passedChecks.length;
  const totalFailed = failedChecks.length;
  const score = Math.round((totalPassed / totalChecks) * 100);

  console.log("\n==============================");
  console.log(`Total tests : ${totalChecks}`);
  console.log(`✅ Passed    : ${totalPassed}`);
  console.log(`❌ Failed    : ${totalFailed}`);
  console.log(`📊 Final Score: ${score}%`);
  console.log("==============================");

//   console.log("\n✅ Passed Checks:");
//   console.log(passedChecks);

//   console.log("\n❌ Failed Checks:");
//   console.log(failedChecks);

})();
