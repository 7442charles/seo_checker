// analysis/headChecks.js

// Correct way to import cheerio in an ES module context
import * as cheerioModule from 'cheerio'; 
const cheerio = cheerioModule.load; // Assign the load function directly

/**
 * Performs SEO checks specifically on the <head> section of an HTML document.
 * @param {string} htmlContent The full HTML content of the webpage.
 * @returns {Array<Object>} An array of check results, each with title, description, and pass status.
 */
function performHeadChecks(htmlContent) {
    const $ = cheerio(htmlContent); // Use cheerio directly as the load function
    const results = [];

    // 1. Title Tag
    const titleTag = $('head title');
    const pageTitle = titleTag.text().trim();
    const isTitlePresent = pageTitle.length > 0;
    const isTitleOptimalLength = pageTitle.length >= 10 && pageTitle.length <= 60; // Common SEO best practice range
    results.push({
        title: 'Title Tag',
        description: isTitlePresent && isTitleOptimalLength
            ? `Title tag found and is optimal length (${pageTitle.length} chars): "${pageTitle}"`
            : isTitlePresent
                ? `Title tag found but length is not optimal (${pageTitle.length} chars). Recommended: 10-60 chars.`
                : 'Title tag is missing.',
        pass: isTitlePresent && isTitleOptimalLength,
        category: 'Head Section SEO'
    });

    // 2. Meta Description
    const metaDescriptionTag = $('head meta[name="description"]');
    const metaDescription = metaDescriptionTag.attr('content') ? metaDescriptionTag.attr('content').trim() : '';
    const isMetaDescriptionPresent = metaDescription.length > 0;
    const isMetaDescriptionOptimalLength = metaDescription.length >= 50 && metaDescription.length <= 160; // Common SEO best practice range
    results.push({
        title: 'Meta Description',
        description: isMetaDescriptionPresent && isMetaDescriptionOptimalLength
            ? `Meta description found and is optimal length (${metaDescription.length} chars): "${metaDescription.substring(0, 100)}..."`
            : isMetaDescriptionPresent
                ? `Meta description found but length is not optimal (${metaDescription.length} chars). Recommended: 50-160 chars.`
                : 'Meta description is missing.',
        pass: isMetaDescriptionPresent && isMetaDescriptionOptimalLength,
        category: 'Head Section SEO'
    });

    // 3. Meta Keywords (Presence Check)
    const metaKeywordsTag = $('head meta[name="keywords"]');
    const metaKeywordsContent = metaKeywordsTag.attr('content') ? metaKeywordsTag.attr('content').trim() : '';
    const isMetaKeywordsPresent = metaKeywordsContent.length > 0;
    results.push({
        title: 'Meta Keywords Tag',
        description: isMetaKeywordsPresent
            ? `Meta keywords tag found: "${metaKeywordsContent}" (Note: Less important for modern SEO).`
            : 'Meta keywords tag is missing.',
        pass: true, // Always 'pass' for presence, as it's not a critical issue if missing. User requested check.
        category: 'Head Section SEO'
    });

    // 4. Viewport Meta Tag
    const viewportTag = $('head meta[name="viewport"]');
    const hasViewportTag = viewportTag.length > 0;
    const isViewportConfigured = hasViewportTag && viewportTag.attr('content') && viewportTag.attr('content').includes('width=device-width');
    results.push({
        title: 'Viewport Meta Tag',
        description: isViewportConfigured
            ? 'Viewport meta tag found and correctly configured for responsive design.'
            : 'Viewport meta tag is missing or not configured for responsive design (e.g., missing "width=device-width").',
        pass: isViewportConfigured,
        category: 'Head Section SEO'
    });

    // 5. Canonical Tag
    const canonicalTag = $('head link[rel="canonical"]');
    const canonicalHref = canonicalTag.attr('href');
    const hasCanonicalTag = canonicalTag.length > 0;
    const isCanonicalValid = hasCanonicalTag && canonicalHref && (canonicalHref.startsWith('http://') || canonicalHref.startsWith('https://'));
    results.push({
        title: 'Canonical Tag',
        description: isCanonicalValid
            ? `Canonical tag found: "${canonicalHref}"`
            : hasCanonicalTag
                ? `Canonical tag found but 'href' is missing or invalid.`
                : 'Canonical tag is missing.',
        pass: isCanonicalValid,
        category: 'Head Section SEO'
    });

    // 6. Charset (UTF-8)
    const charsetTag = $('head meta[charset]');
    const charsetValue = charsetTag.attr('charset') ? charsetTag.attr('charset').toLowerCase() : '';
    const isUtf8 = charsetValue === 'utf-8';
    results.push({
        title: 'Character Set (UTF-8)',
        description: isUtf8
            ? `Character set declared as UTF-8.`
            : `Character set is missing or not UTF-8 (found: "${charsetValue || 'none'}").`,
        pass: isUtf8,
        category: 'Head Section SEO'
    });

    // 7. Robots Meta Tag
    const robotsTag = $('head meta[name="robots"]');
    const robotsContent = robotsTag.attr('content') ? robotsTag.attr('content').toLowerCase() : '';
    const hasRobotsTag = robotsTag.length > 0;
    const allowsIndexing = !robotsContent.includes('noindex');
    const allowsFollowing = !robotsContent.includes('nofollow');
    results.push({
        title: 'Robots Meta Tag',
        description: hasRobotsTag
            ? `Robots meta tag found: "${robotsContent}". Indexing: ${allowsIndexing ? 'Allowed' : 'Disallowed'}. Following: ${allowsFollowing ? 'Allowed' : 'Disallowed'}.`
            : 'Robots meta tag is missing (defaults to index, follow).',
        pass: true, // Presence of robots tag itself isn't a pass/fail, the content determines behavior.
        category: 'Head Section SEO'
    });

    // 8. Favicon (Icon)
    const faviconTag = $('head link[rel="icon"], head link[rel="shortcut icon"]');
    const hasFavicon = faviconTag.length > 0;
    results.push({
        title: 'Favicon',
        description: hasFavicon
            ? 'Favicon found.'
            : 'Favicon is missing (recommended for branding and user experience).',
        pass: hasFavicon,
        category: 'Head Section SEO'
    });

    // 9. Open Graph (OG) Metatags
    const ogTags = $('head meta[property^="og:"]');
    const hasOgTags = ogTags.length > 0;
    const requiredOgTags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
    const missingOgTags = requiredOgTags.filter(tag => $(`head meta[property="${tag}"]`).length === 0);
    const ogPass = hasOgTags && missingOgTags.length === 0;

    results.push({
        title: 'Open Graph (OG) Metatags',
        description: ogPass
            ? `All essential Open Graph tags found.`
            : hasOgTags
                ? `Missing essential Open Graph tags: ${missingOgTags.join(', ')}.`
                : 'No Open Graph tags found.',
        pass: ogPass,
        category: 'Social Media SEO'
    });

    // 10. Twitter Card Metatags
    const twitterTags = $('head meta[name^="twitter:"]');
    const hasTwitterTags = twitterTags.length > 0;
    const requiredTwitterTags = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
    const missingTwitterTags = requiredTwitterTags.filter(tag => $(`head meta[name="${tag}"]`).length === 0);
    const twitterPass = hasTwitterTags && missingTwitterTags.length === 0;

    results.push({
        title: 'Twitter Card Metatags',
        description: twitterPass
            ? `All essential Twitter Card tags found.`
            : hasTwitterTags
                ? `Missing essential Twitter Card tags: ${missingTwitterTags.join(', ')}.`
                : 'No Twitter Card tags found.',
        pass: twitterPass,
        category: 'Social Media SEO'
    });

    // 11. JSON-LD Structured Data
    const jsonLdScripts = $('head script[type="application/ld+json"]');
    const hasJsonLd = jsonLdScripts.length > 0;
    results.push({
        title: 'JSON-LD Structured Data',
        description: hasJsonLd
            ? `JSON-LD structured data found (${jsonLdScripts.length} block(s)).`
            : 'JSON-LD structured data is missing.',
        pass: hasJsonLd,
        category: 'Structured Data'
    });

    // 12. HTML Lang Attribute
    const htmlLang = $('html').attr('lang');
    const isLangEn = htmlLang && htmlLang.toLowerCase() === 'en'; // Specifically checking for 'en'
    results.push({
        title: 'HTML Lang Attribute (en)',
        description: isLangEn
            ? `HTML lang attribute is set to "en".`
            : `HTML lang attribute is missing or not set to "en" (found: "${htmlLang || 'none'}").`,
        pass: isLangEn,
        category: 'Head Section SEO'
    });

    // 13. X-UA-Compatible Meta Tag
    const xUaCompatibleTag = $('head meta[http-equiv="X-UA-Compatible"]');
    const hasXUaCompatible = xUaCompatibleTag.length > 0 && (xUaCompatibleTag.attr('content') || '').toLowerCase() === 'ie=edge';
    results.push({
        title: 'X-UA-Compatible Meta Tag',
        description: hasXUaCompatible
            ? 'X-UA-Compatible meta tag set to "IE=edge".'
            : 'X-UA-Compatible meta tag is missing or not set to "IE=edge" (less critical for modern browsers, but good for older IE support).',
        pass: hasXUaCompatible,
        category: 'Head Section SEO'
    });

    return results;
}

export default performHeadChecks;