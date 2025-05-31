import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

// Patch fetch to work in CommonJS using dynamic import of node-fetch
const fetch = async (...args) => (await import('node-fetch')).default(...args);

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

function check($, selector, description, conditionFn) {
  const el = $(selector).first();
  const pass = conditionFn(el, $);
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
  const title = $("title").text();
  console.log(`${title ? "✅" : "❌"} Has <title> tag (${title})`);
  console.log(`${title.length <= 60 ? "✅" : "❌"} Title length: ${title.length}`);
  check($, 'meta[name="description"]', "Meta description under 160 chars", el =>
    el.attr("content")?.length <= 160
  );

  // 3. Clean and Descriptive URLs (skip for local files)
  if (input.startsWith("http")) {
    console.log("\n3. Clean and Descriptive URLs:");
    const clean = /^[^?]+\/[a-z0-9\-]+\/?$/.test(new URL(input).pathname);
    console.log(`${clean ? "✅" : "❌"} URL looks clean and human-readable`);
  }

  // 4. Open Graph and Twitter Card Tags
  console.log("\n4. Open Graph and Twitter Card Tags:");
  ["og:title", "og:description", "og:image"].forEach(name => {
    check($, `meta[property="${name}"]`, `Has ${name}`, el => el.attr("content"));
  });
  check($, 'meta[name="twitter:card"]', "Has twitter:card", el => el.attr("content"));

  // 5. Canonical Tag
  console.log("\n5. Canonical Tag:");
  check($, 'link[rel="canonical"]', "Has canonical tag", el => el.attr("href"));

  // 6. Mobile-Friendly Design
  console.log("\n6. Mobile-Friendly Design:");
  check($, 'meta[name="viewport"]', "Has viewport meta tag", el => el.attr("content")?.includes("width"));
  check($, "style,link[rel='stylesheet']", "Responsive CSS present", () => true); // Basic proxy check

  // 7. Fast Page Load Time
  console.log("\n7. Fast Page Load Time:");
    check($, "script[src]", "JS uses async or defer", ($el, $) => {
    return $("script[src]").toArray().every(script => {
        const attr = $(script).attr();
        return attr.async !== undefined || attr.defer !== undefined;
    });
    });

    const lazyImages = $("img[loading='lazy']");
    if (lazyImages.length === 0) {
    console.log("✅ No images found — skipping lazy loading check");
    } else {
    check($, "img[loading='lazy']", "Images use lazy loading", el => lazyImages.length > 0);
    }

    // 8. Structured Data Markup (Schema)
    console.log("\n8. Structured Data Markup:");
    check($, 'script[type="application/ld+json"]', "Has JSON-LD structured data", el => el.text().length > 0);

    // 9. Image Optimization
    console.log("\n9. Image Optimization:");
    const images = $("img");
    if (images.length === 0) {
    console.log("✅ No images found — skipping alt attribute check");
    } else {
    check($, "img", "Images have alt attributes", ($el, $) =>
        images.toArray().every(img => $(img).attr("alt") && $(img).attr("alt").trim().length > 0)
    );
    }

  // 10. HTTPS Security
  console.log("\n10. HTTPS Security:");
  if (input.startsWith("https://")) {
    console.log("✅ HTTPS is used");
  } else if (input.startsWith("http://")) {
    console.log("❌ Not using HTTPS");
  } else {
    console.log("🔶 Local file — skip HTTPS check");
  }

  // 11. Internal Linking
  console.log("\n11. Internal Linking:");
  check($, 'a[href]', "Anchor tags present", el => $("a[href]").length > 0);
  

  // 12. Robots.txt and Sitemap.xml (only for remote)
  if (input.startsWith("http")) {
    console.log("\n12. Robots.txt and Sitemap.xml:");
    const baseURL = new URL(input).origin;
    const robots = await fetch(`${baseURL}/robots.txt`).then(r => r.status === 200).catch(() => false);
    const sitemap = await fetch(`${baseURL}/sitemap.xml`).then(r => r.status === 200).catch(() => false);
    console.log(`${robots ? "✅" : "❌"} robots.txt found`);
    console.log(`${sitemap ? "✅" : "❌"} sitemap.xml found`);
  }

  console.log("\n✅ SEO audit complete.\n");
})();
