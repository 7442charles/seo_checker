// index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import seoAnalyzer from './analysis/seoAnalyzer.js'; // This is now the enhanced analyzer

// Convert __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Express
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // Keep if you have other JSON APIs, though not strictly needed for this flow
app.use(express.static(path.join(__dirname, 'public')));

// This GET endpoint will be called by results.html
app.get('/analyze', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const data = await seoAnalyzer(url); // This now returns combined Cheerio and Lighthouse data
    res.json({ success: true, data }); // Send the comprehensive data object
  } catch (err) {
    console.error('Analysis error:', err.message, err.stack); // Log full error stack for debugging
    res.status(500).json({ success: false, message: `Failed to analyze URL: ${err.message}. Please try again with a valid and accessible URL.` });
  }
});

// Serve results.html when accessed directly or redirected
app.get('/results.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});