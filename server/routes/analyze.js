// server/routes/analyze.js
import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const router = express.Router();

function check($, selector, title, testFn) {
  const el = $(selector);
  const pass = testFn(el);
  return {
    title,
    description: pass ? `Passed: ${title}` : `Failed: ${title}`,
    pass,
  };
}

router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'URL required' });

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    // Semantic HTML structure checks
    results.push({ title: 'Semantic HTML Structure', description: 'Checking semantic tags...' });

    const semanticTags = ["header", "nav", "main", "section", "footer"];
    semanticTags.forEach(tag => {
      results.push(check($, tag, `Has <${tag}> tag`, el => el.length > 0));
    });

    results.push(check($, "h1", "Only one <h1> tag", () => $("h1").length === 1));

    results.push(check($, "h2,h3,h4,h5,h6", "Logical heading hierarchy present", () => {
      const hTags = ["h2", "h3", "h4", "h5", "h6"];
      // Returns true if at least one heading tag h2-h6 exists (simple logic)
      return hTags.some(tag => $(tag).length > 0);
    }));

    // Check for title tag
    const title = $('title').text().trim();
    let titlePass = false;
    let titleDesc = '';

    if (!title) {
      titleDesc = 'No title tag found.';
    } else if (title.length < 50) {
      titleDesc = `Title too short (${title.length} chars). Recommended length: 50-60 characters.`;
    } else if (title.length > 60) {
      titleDesc = `Title too long (${title.length} chars). Recommended length: 50-60 characters.`;
    } else {
      titlePass = true;
      titleDesc = `Title length is good (${title.length} characters).`;
    }

    results.push({
      title: 'Title Tag',
      description: titleDesc,
      pass: titlePass,
    });


    // Check for meta description
   const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
    let descPass = false;
    let descDesc = '';

    if (!metaDesc) {
      descDesc = 'No meta description found.';
    } else if (metaDesc.length < 120) {
      descDesc = `Meta description too short (${metaDesc.length} chars). Recommended length: 120-158 characters.`;
    } else if (metaDesc.length > 158) {
      descDesc = `Meta description too long (${metaDesc.length} chars). Recommended length: 120-158 characters.`;
    } else {
      descPass = true;
      descDesc = `Meta description length is good (${metaDesc.length} characters).`;
    }

    results.push({
      title: 'Meta Description',
      description: descDesc,
      pass: descPass,
    });

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching URL' });
  }
});

export default router;
