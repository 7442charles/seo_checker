import axios from 'axios';
import * as cheerio from 'cheerio';
import runLighthouse from './lighthouseAnalyzer.js'; 

async function seoAnalyzer(url) {
    // --- Existing Cheerio Analysis ---
    let cheerioData = {};
    try {
        const response = await axios.get(url, { timeout: 15000 }); // Added a timeout for robustness
        const $ = cheerio.load(response.data);

        const title = $('title').text();
        const description = $('meta[name="description"]').attr('content') || '';
        const h1 = $('h1').first().text();
        const h1Count = $('h1').length;
        const imgWithoutAlt = $('img:not([alt])').length;
        const hasRobots = $('meta[name="robots"]').length > 0;
        const hasCanonical = $('link[rel="canonical"]').length > 0; // Added canonical check
        const hasViewport = $('meta[name="viewport"]').length > 0; // Added viewport check

        cheerioData = {
            title,
            description,
            h1,
            h1Count,
            imgWithoutAlt,
            hasRobots,
            hasCanonical,
            hasViewport
        };
    } catch (error) {
        console.warn(`Cheerio analysis failed for ${url}: ${error.message}`);
        // Provide default empty structure if cheerio fails, so Lighthouse can still run
        cheerioData = {
            error: `Cheerio analysis failed: ${error.message}`,
            title: 'N/A', description: 'N/A', h1: 'N/A', h1Count: 0, imgWithoutAlt: 0, hasRobots: false, hasCanonical: false, hasViewport: false
        };
    }

    // --- Lighthouse Analysis ---
    let lighthouseData = {};
    try {
        lighthouseData = await runLighthouse(url);
    } catch (error) {
        console.error(`Lighthouse analysis failed for ${url}: ${error.message}`);
        lighthouseData.error = `Lighthouse failed: ${error.message}`;
        // Provide default empty structure to avoid frontend errors
        lighthouseData.scores = { performance: 0, accessibility: 0, 'best-practices': 0, seo: 0 };
        lighthouseData.audits = {};
    }

    // --- Combine Results and Generate Structured Report for Frontend ---
    const combinedResults = {
        url: url,
        cheerio: cheerioData, // Raw Cheerio data
        lighthouse: lighthouseData, // Raw Lighthouse data
        // Structured 'results' array for populating collapsible sections on results.html
        results: []
    };

    // Add Cheerio-based checks to the structured report array
    combinedResults.results.push({
        title: 'Title Tag Presence',
        description: `Checks if the page has a title tag. Found: "${cheerioData.title}"`,
        pass: !!cheerioData.title,
        category: 'On-Page SEO Basics'
    });
    combinedResults.results.push({
        title: 'Meta Description Presence',
        description: `Checks if the page has a meta description. Found: "${cheerioData.description}"`,
        pass: !!cheerioData.description,
        category: 'On-Page SEO Basics'
    });
    combinedResults.results.push({
        title: 'H1 Tag Presence',
        description: `Checks if the page has at least one H1 tag.`,
        pass: cheerioData.h1Count > 0,
        category: 'On-Page SEO Basics'
    });
    combinedResults.results.push({
        title: 'Single H1 Tag',
        description: `Checks if the page has exactly one H1 tag. Found ${cheerioData.h1Count}.`,
        pass: cheerioData.h1Count === 1,
        category: 'On-Page SEO Basics'
    });
    combinedResults.results.push({
        title: 'Images with Alt Attributes',
        description: `Checks for images missing alt attributes. Found ${cheerioData.imgWithoutAlt} images without alt.`,
        pass: cheerioData.imgWithoutAlt === 0,
        category: 'On-Page SEO Basics'
    });
    combinedResults.results.push({
        title: 'Robots Meta Tag Presence',
        description: `Checks for the presence of a robots meta tag.`,
        pass: cheerioData.hasRobots,
        category: 'Technical SEO Audit'
    });
    combinedResults.results.push({
        title: 'Canonical Tag Presence',
        description: `Checks for the presence of a canonical tag.`,
        pass: cheerioData.hasCanonical,
        category: 'Technical SEO Audit'
    });
    combinedResults.results.push({
        title: 'Viewport Meta Tag Presence',
        description: `Checks for the presence of a viewport meta tag for mobile responsiveness.`,
        pass: cheerioData.hasViewport,
        category: 'Technical SEO Audit'
    });
    // Social media checks removed for now as seoAnalyzer only provides on-page/technical.
    // Lighthouse will cover some of these in "Best Practices" or "SEO" audits indirectly.

    return combinedResults;
}

export default seoAnalyzer;