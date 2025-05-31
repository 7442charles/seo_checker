// server/routes/analyze.js
import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'URL required' });

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    // Check for title tag
    const title = $('title').text();
    results.push({
      title: 'Title Tag',
      description: title ? `Found: "${title}"` : 'No title tag found.',
      pass: !!title,
    });

    // Check for meta description
    const metaDesc = $('meta[name="description"]').attr('content');
    results.push({
      title: 'Meta Description',
      description: metaDesc ? `Found: "${metaDesc}"` : 'No meta description found.',
      pass: !!metaDesc,
    });

    // More checks can be added...

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching URL' });
  }
});

export default router;
