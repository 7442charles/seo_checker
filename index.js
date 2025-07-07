// index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import seoAnalyzer from './analysis/seoAnalyzer.js';

// Convert __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Express
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json()); // Keep if you have other JSON APIs, though not strictly needed for this flow
app.use(express.static(path.join(__dirname, 'public')));

// This GET endpoint will be called by results.html
app.get('/analyze', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const data = await seoAnalyzer(url);
    // The current seoAnalyzer.js directly returns the data.
    // For a more detailed report as envisioned by index.html's original JS,
    // you would transform 'data' into an array of checks here.
    // For now, let's just return the raw data from seoAnalyzer.
    // If you want the full structured report from the original index.html JS,
    // you'd need to re-implement that logic here or in seoAnalyzer.js.
    // For simplicity, sticking to the existing seoAnalyzer output structure.

    // To mimic the 'results' array structure from the original index.html JS
    // based on seoAnalyzer's output, you would do something like this:
    const results = [
        { title: 'Title Tag', description: `Checks if the page has a title tag. Found: "${data.title}"`, pass: !!data.title },
        { title: 'Meta Description', description: `Checks if the page has a meta description. Found: "${data.description}"`, pass: !!data.description },
        { title: 'H1 Tag Presence', description: `Checks if the page has at least one H1 tag.`, pass: data.h1Count > 0 },
        { title: 'Single H1 Tag', description: `Checks if the page has exactly one H1 tag. Found ${data.h1Count}.`, pass: data.h1Count === 1 },
        { title: 'Image Alt Attributes', description: `Checks for images missing alt attributes. Found ${data.imgWithoutAlt} images without alt.`, pass: data.imgWithoutAlt === 0 },
        { title: 'Robots Meta Tag', description: `Checks for the presence of a robots meta tag.`, pass: data.hasRobots },
        // Add more checks here if your seoAnalyzer gets more sophisticated
    ];

    res.json({ success: true, data: data, results: results }); // Send both raw data and structured results
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ success: false, message: `Failed to analyze URL: ${err.message}` });
  }
});

// Serve results.html when accessed directly or redirected
app.get('/results.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});