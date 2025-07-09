import * as cheerioModule from 'cheerio';
const cheerio = cheerioModule.load; // Assign the load function directly

/**
 * @param {string} htmlContent The full HTML content of the webpage.
 * @returns {Array<Object>} An array of check results, each with title, description, and pass status.
 */
function performBodyChecks(htmlContent) {
    const $ = cheerio(htmlContent);
    const results = [];

    // --- Original Checks ---

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
        category: 'On-Page Content / Accessibility'
    });

    // Check for existence of content within the body (very basic)
    const bodyText = $('body').text().trim();
    const hasContent = bodyText.length > 100; // Arbitrary threshold for "sufficient" content
    results.push({
        title: 'Sufficient Body Content',
        description: hasContent ? `Body contains substantial content.` : `Body content appears to be minimal or missing (less than 100 characters).`,
        pass: hasContent,
        category: 'On-Page Content'
    });

    // Check for broken links (requires more advanced logic, placeholder for now)
    results.push({
        title: 'Broken Links',
        description: 'Checking for broken links is a complex task and requires network requests for each link. This check is a placeholder.',
        pass: true, // Assume pass for now
        category: 'Technical SEO'
    });

    // --- New Accessibility and Semantic Checks ---

    // 1. Heading Tag Hierarchy Check
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const headingCounts = {};
    const headingLevelsFound = new Set();
    const headingIssues = [];

    headings.forEach(h => {
        headingCounts[h] = $(h).length;
        if ($(h).length > 0) {
            headingLevelsFound.add(parseInt(h.substring(1)));
        }
    });

    // Check for exactly one H1
    if (headingCounts.h1 === 0) {
        headingIssues.push('Page is missing an <h1> tag.');
    } else if (headingCounts.h1 > 1) {
        headingIssues.push(`Page has multiple <h1> tags (${headingCounts.h1} found). A single <h1> is generally recommended for primary page title.`);
    }

    // Check for skipped heading levels (e.g., h1 then h3, skipping h2)
    let lastLevel = 0;
    for (let i = 1; i <= 6; i++) {
        if (headingLevelsFound.has(i)) {
            if (lastLevel !== 0 && i > lastLevel + 1) {
                headingIssues.push(`Skipped heading level from h${lastLevel} to h${i}. Headings should follow a sequential, logical order.`);
            }
            lastLevel = i;
        }
    }

    results.push({
        title: 'Heading Structure (H1-H6)',
        description: headingIssues.length === 0 ? 'Heading tags follow a logical and sequential structure, with a single <h1>.' : headingIssues.join(' '),
        pass: headingIssues.length === 0,
        category: 'On-Page Content / Accessibility'
    });

    // 2. Semantic HTML Tags Presence Check
    const semanticTags = ['main', 'nav', 'header', 'footer', 'article', 'section', 'aside'];
    const missingSemanticTags = [];

    semanticTags.forEach(tag => {
        if ($(tag).length === 0) {
            missingSemanticTags.push(`<${tag}>`);
        }
    });

    results.push({
        title: 'Semantic HTML5 Structure',
        description: missingSemanticTags.length === 0 ? 'Common semantic HTML5 tags (main, nav, header, footer, article, section, aside) are present.' : `Potentially missing semantic HTML5 tags: ${missingSemanticTags.join(', ')}. Consider using them to improve document outline and accessibility.`,
        pass: missingSemanticTags.length === 0,
        category: 'On-Page Content / Accessibility'
    });

    // 3. Basic ARIA Attributes & Tabindex Check
    const accessibilityIssues = [];

    // Check for elements with tabindex > 0 (can cause non-linear tab order)
    $('body [tabindex]').each((i, el) => {
        const tabindex = parseInt($(el).attr('tabindex'));
        if (tabindex > 0) {
            accessibilityIssues.push(`Element with tabindex="${tabindex}" found. Custom tab order (tabindex > 0) can be problematic. Ensure logical keyboard navigation.`);
            return false; // Only report one instance for this check for brevity
        }
    });

    // Check for common ARIA attributes that might be missing context if not present at all
    // This is a very basic presence check, not a validation of correct usage.
    const hasAriaLabel = $('[aria-label]').length > 0;
    const hasAriaDescribedby = $('[aria-describedby]').length > 0;
    const hasRoleMain = $('[role="main"]').length > 0;
    const hasAriaLive = $('[aria-live]').length > 0;

    if (!hasAriaLabel && !hasAriaDescribedby) {
        accessibilityIssues.push('Consider using `aria-label` or `aria-describedby` for interactive elements to provide accessible names/descriptions.');
    }
    if (!hasRoleMain) {
        accessibilityIssues.push('Consider using `<main>` tag or `role="main"` to identify the primary content area for assistive technologies.');
    }
    // Note: Checking aria-live correctness requires runtime evaluation, here just checking presence.
    if (!hasAriaLive) {
        accessibilityIssues.push('Consider `aria-live` regions for dynamic content updates that screen readers should announce.');
    }


    results.push({
        title: 'Basic ARIA & Keyboard Navigation Checks',
        description: accessibilityIssues.length === 0 ? 'Basic ARIA attributes and tabindex usage appear reasonable.' : accessibilityIssues.join(' '),
        pass: accessibilityIssues.length === 0,
        category: 'Accessibility'
    });


    return results;
}

export default performBodyChecks;