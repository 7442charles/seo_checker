// index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch'; // Make sure to install node-fetch: npm install node-fetch

// Import your custom check modules
import performHeadChecks from './analysis/headChecks.js'; // Ensure this path is correct
import performBodyChecks from './analysis/bodyChecks.js'; // Ensure this path is correct

// Convert __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Express
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients for SSE
const clients = new Set();

// SSE endpoint for analysis results
app.get('/analyze', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'Missing URL' });
    }

    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    // Function to send data as an SSE event
    const sendEvent = (eventName, data) => {
        res.write(`event: ${eventName}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Add this client to the set of connected clients
    clients.add(res);

    req.on('close', () => {
        console.log('Client disconnected from SSE.');
        clients.delete(res);
    });

    try {
        // 1. Fetch the HTML content once
        const response = await fetch(url, { timeout: 30000 }); // 30-second timeout
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        const htmlContent = await response.text();

        // 2. Run checks simultaneously
        const checkPromises = [];

        // Head checks
        checkPromises.push(
            (async () => {
                const headResults = performHeadChecks(htmlContent);
                sendEvent('head_checks_complete', { results: headResults });
                return headResults;
            })()
        );

        // Body checks
        checkPromises.push(
            (async () => {
                const bodyResults = performBodyChecks(htmlContent);
                sendEvent('body_checks_complete', { results: bodyResults });
                return bodyResults;
            })()
        );

        // Wait for all checks to complete
        const allResults = await Promise.all(checkPromises);

        // Flatten all results into a single array
        const combinedResults = allResults.flat();

        // Send a final event indicating completion and overall data (optional, but good for frontend)
        sendEvent('analysis_complete', { message: 'All analysis complete!', totalResults: combinedResults.length });

    } catch (err) {
        console.error('Analysis error:', err.message, err.stack);
        sendEvent('analysis_error', { message: `Failed to analyze URL: ${err.message}. Please try again with a valid and accessible URL.` });
    } finally {
        // End the SSE connection after all data is sent or an error occurs
        res.end();
        clients.delete(res); // Ensure client is removed even if res.end() is called
    }
});

// Serve results.html when accessed directly or redirected
app.get('/results.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});