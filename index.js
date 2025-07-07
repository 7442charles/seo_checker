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

    if (!url) {
        console.error('Missing URL parameter in /analyze request.');
        sendEvent('analysis_error', { message: 'URL parameter is missing. Please provide a URL to analyze.' });
        return res.end(); // End the connection if URL is missing
    }

    try {
        console.log(`[Server] Attempting to fetch URL: ${url}`);
        // 1. Fetch the HTML content once
        const response = await fetch(url, { timeout: 30000 }); // 30-second timeout
        console.log(`[Server] Fetch response status for ${url}: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No response body available'); // Try to get text, handle if not available
            const errorMessage = `Failed to fetch URL (Status: ${response.status}). The target website might be blocking the request or is unreachable. Response body preview: ${errorText.substring(0, 200)}`;
            console.error(`[Server] ${errorMessage}`);
            sendEvent('analysis_error', { message: errorMessage });
            return res.end(); // End the connection on fetch failure
        }

        const htmlContent = await response.text();
        console.log(`[Server] Successfully fetched HTML for ${url}. Starting analysis...`);

        // 2. Run checks simultaneously
        const checkPromises = [];

        // Head checks
        checkPromises.push(
            (async () => {
                const headResults = performHeadChecks(htmlContent);
                sendEvent('head_checks_complete', { results: headResults });
                console.log('[Server] Head checks streamed.');
                return headResults;
            })()
        );

        // Body checks
        checkPromises.push(
            (async () => {
                const bodyResults = performBodyChecks(htmlContent);
                sendEvent('body_checks_complete', { results: bodyResults });
                console.log('[Server] Body checks streamed.');
                return bodyResults;
            })()
        );

        // Wait for all checks to complete
        const allResults = await Promise.all(checkPromises);

        // Flatten all results into a single array
        const combinedResults = allResults.flat();

        // Send a final event indicating completion and overall data
        sendEvent('analysis_complete', { message: 'All analysis complete!', totalResults: combinedResults.length });
        console.log(`[Server] Analysis complete and final event sent for ${url}.`);

    } catch (err) {
        // Catch any errors that occur during fetch or analysis processing
        console.error(`[Server] Critical analysis error for URL: ${url}`, err.message, err.stack);
        sendEvent('analysis_error', { message: `Server-side error during analysis: ${err.message}. Please try again with a valid and accessible URL.` });
    } finally {
        // Ensure the SSE connection is always closed
        res.end();
        clients.delete(res); // Ensure client is removed from the set
        console.log(`[Server] SSE connection closed for ${url}.`);
    }
});
// Serve results.html when accessed directly or redirected
app.get('/results.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});