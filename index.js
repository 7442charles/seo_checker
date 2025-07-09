// index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Import your custom check modules
import performHeadChecks from './analysis/headChecks.js';
import performBodyChecks from './analysis/bodyChecks.js';

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

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const sendEvent = (eventName, data) => {
        res.write(`event: ${eventName}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    clients.add(res);

    req.on('close', () => {
        console.log('Client disconnected from SSE.');
        clients.delete(res);
    });

    if (!url) {
        console.error('Missing URL parameter in /analyze request.');
        sendEvent('analysis_error', {
            type: 'missing_url',
            message: 'Please provide a website address to analyze.'
        });
        return res.end();
    }

    try {
        console.log(`[Server] Attempting to fetch URL: ${url}`);
        const response = await fetch(url, { timeout: 30000 });
        console.log(`[Server] Fetch response status for ${url}: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No response body available');

            const technicalErrorMessage = `Failed to fetch URL (Status: ${response.status}). The target website might be blocking the request or is unreachable. Response body preview: ${errorText.substring(0, 200)}`;
            console.error(`[Server] ${technicalErrorMessage}`);

            let userFriendlyMessageType = 'generic_fetch_error';
            let userFriendlyMessage = `We couldn't analyze the website. It might be down or blocking our tool.`;

            if (response.status === 403) {
                userFriendlyMessageType = 'blocked_error';
                userFriendlyMessage = `The website blocked our analysis. Please try another URL.`;
            } else if (response.status === 404) {
                userFriendlyMessageType = 'not_found';
                userFriendlyMessage = `The website page was not found. Please check the URL.`;
            } else if (response.status >= 500 && response.status < 600) {
                userFriendlyMessageType = 'server_error';
                userFriendlyMessage = `The website's server encountered an error. Please try again later.`;
            }

            sendEvent('analysis_error', {
                type: userFriendlyMessageType,
                message: userFriendlyMessage,
                url: url // Send the URL separately if needed for display
            });
            return res.end();
        }

        const htmlContent = await response.text();
        console.log(`[Server] Successfully fetched HTML for ${url}. Starting analysis...`);

        const checkPromises = [];

        checkPromises.push(
            (async () => {
                const headResults = performHeadChecks(htmlContent);
                sendEvent('head_checks_complete', { results: headResults });
                console.log('[Server] Head checks streamed.');
                return headResults;
            })()
        );

        checkPromises.push(
            (async () => {
                const bodyResults = performBodyChecks(htmlContent);
                sendEvent('body_checks_complete', { results: bodyResults });
                console.log('[Server] Body checks streamed.');
                return bodyResults;
            })()
        );

        const allResults = await Promise.all(checkPromises);
        const combinedResults = allResults.flat();

        sendEvent('analysis_complete', { message: 'All analysis complete!', totalResults: combinedResults.length });
        console.log(`[Server] Analysis complete and final event sent for ${url}.`);

    } catch (err) {
        console.error(`[Server] Critical analysis error for URL: ${url}`, err.message, err.stack);

        let userFriendlyMessageType = 'network_error';
        let userFriendlyMessage = `Something went wrong connecting to the website. Check your internet or the URL.`;

        if (err.name === 'AbortError' || err.message.includes('timeout')) {
            userFriendlyMessageType = 'timeout_error';
            userFriendlyMessage = `The website took too long to respond. Please try again later.`;
        } else if (err.message.includes('getaddrinfo ENOTFOUND') || err.message.includes('EAI_AGAIN')) {
            userFriendlyMessageType = 'dns_error';
            userFriendlyMessage = `Couldn't find the website's address. Check for typos in the URL.`;
        }

        sendEvent('analysis_error', {
            type: userFriendlyMessageType,
            message: userFriendlyMessage,
            url: url
        });
    } finally {
        res.end();
        clients.delete(res);
        console.log(`[Server] SSE connection closed for ${url}.`);
    }
});

app.get('/results.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});