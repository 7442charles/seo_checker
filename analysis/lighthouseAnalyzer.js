import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher'; // CORRECTED IMPORT STATEMENT

async function runLighthouse(url) {
    let chrome;
    try {
        // Launch a headless Chrome browser instance using chrome-launcher
        chrome = await chromeLauncher.launch({ // Using chromeLauncher.launch()
            chromeFlags: ['--headless=new', '--no-sandbox', '--disable-setuid-sandbox'],
            ignoreDefaultFlags: true,
            startingUrl: url
        });

        // Run Lighthouse on the specified URL using the launched Chrome instance
        const lhr = await lighthouse(url, {
            port: chrome.port,
            output: 'json',
            onlyCategories: ['seo', 'performance', 'accessibility', 'best-practices'],
            disableStorageReset: true
        });

        const categories = lhr.lhr.categories;
        const audits = lhr.lhr.audits;

        const lighthouseResults = {
            scores: {
                performance: Math.round(categories.performance ? categories.performance.score * 100 : 0),
                accessibility: Math.round(categories.accessibility ? categories.accessibility.score * 100 : 0),
                'best-practices': Math.round(categories['best-practices'] ? categories['best-practices'].score * 100 : 0),
                seo: Math.round(categories.seo ? categories.seo.score * 100 : 0),
            },
            audits: {},
        };

        for (const categoryId in categories) {
            const category = categories[categoryId];
            lighthouseResults.audits[categoryId] = {
                title: category.title,
                audits: []
            };

            for (const auditRef of category.auditRefs) {
                const audit = audits[auditRef.id];
                if (audit && auditRef.group !== 'metrics') {
                    let displayType = 'info';
                    if (audit.score === 0) {
                        displayType = 'fail';
                    } else if (audit.score < 1 && audit.scoreDisplayMode !== 'notApplicable') {
                        displayType = 'warning';
                    } else if (audit.score === 1) {
                        displayType = 'pass';
                    } else if (audit.scoreDisplayMode === 'notApplicable') {
                        displayType = 'notApplicable';
                    }

                    lighthouseResults.audits[categoryId].audits.push({
                        id: audit.id,
                        title: audit.title,
                        description: audit.description.replace(/\[Learn more\]\(.*\)/g, '').trim(),
                        score: audit.score,
                        displayValue: audit.displayValue || '',
                        scoreDisplayMode: audit.scoreDisplayMode,
                        displayType: displayType
                    });
                }
            }
        }

        return lighthouseResults;

    } finally {
        if (chrome) {
            await chrome.kill();
        }
    }
}

export default runLighthouse;