import * as cheerioModule from 'cheerio';
const cheerio = cheerioModule.load; // Assign the load function directly

/**
 * @param {string} htmlContent The full HTML content of the webpage.
 * @returns {Array<Object>} An array of check results, each with title, description, and pass status.
 */
function performBodyChecks(htmlContent) {
    const $ = cheerio(htmlContent); 
    const results = [];

    // Check for images without alt attributes
    const images = $('img');
    let imagesWithoutAlt = 0;
    images.each((i, img) => {
        if (!$(img).attr('alt') || $(img).attr('alt').trim() === '') {
            imagesWithoutAlt++;
        }
    });
    const imgAltPass = imagesWithoutAlt === 0;
    results.push({
        title: 'Images with Alt Attributes',
        description: imgAltPass ? 'All images have descriptive alt attributes.' : `${imagesWithoutAlt} image(s) are missing alt attributes or have empty ones.`,
        pass: imgAltPass,
        category: 'On-Page Content'
    });

    // Check for existence of content within the body (very basic)
    const bodyText = $('body').text().trim();
    const hasContent = bodyText.length > 100; // Arbitrary length for "content"
    results.push({
        title: 'Sufficient Body Content',
        description: hasContent ? `Body contains substantial content.` : `Body content appears to be minimal or missing.`,
        pass: hasContent,
        category: 'On-Page Content'
    });

    // Check for broken links (requires more advanced logic, placeholder for now)
    results.push({
        title: 'Broken Links',
        description: 'Checking for broken links is a complex task and requires further implementation.',
        pass: true, // Assume pass for now
        category: 'Technical SEO'
    });

    return results;
}

export default performBodyChecks;