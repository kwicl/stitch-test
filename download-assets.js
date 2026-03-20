const https = require('https');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'site', 'assets');
const FONTS_DIR = path.join(ASSETS_DIR, 'fonts');

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

function fetchUrl(targetUrl) {
    return new Promise((resolve, reject) => {
        let u = null;
        try {
            u = new URL(targetUrl);
        } catch (e) {
            reject(e);
            return;
        }
        https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = new URL(res.headers.location, targetUrl).toString();
                return fetchUrl(redirectUrl).then(resolve).catch(reject);
            }
            let data = Buffer.alloc(0);
            res.on('data', chunk => data = Buffer.concat([data, chunk]));
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function saveFile(filename, content) {
    fs.writeFileSync(path.join(ASSETS_DIR, filename), content);
    console.log(`Saved ${filename}`);
}

async function processFontCss(url, cssFilename) {
    console.log(`Downloading Web Font CSS: ${url}`);
    const cssRaw = await fetchUrl(url);
    let css = cssRaw.toString('utf-8');

    let fontCounter = 0;
    const urlRegex = /url\((https:\/\/[^)]+)\)/g;
    let match;
    const fontsToDownload = [];

    while ((match = urlRegex.exec(css)) !== null) {
        const fontUrl = match[1];
        const fontFilename = `${cssFilename.replace('.css', '')}-${fontCounter++}.woff2`;
        fontsToDownload.push({ fontUrl, fontFilename });
        // Add single quotes around url path
        css = css.replace(fontUrl, `fonts/${fontFilename}`);
    }

    for (const f of fontsToDownload) {
        console.log(`Downloading font file: ${f.fontUrl}`);
        const fontData = await fetchUrl(f.fontUrl);
        fs.writeFileSync(path.join(FONTS_DIR, f.fontFilename), fontData);
    }

    saveFile(cssFilename, css);
}

async function main() {
    try {
        console.log("Downloading Tailwind CSS CDN script...");
        const tailwind = await fetchUrl('https://cdn.tailwindcss.com?plugins=forms,container-queries');
        saveFile('tailwind.js', tailwind);

        console.log("Downloading Chart.js...");
        const chartjs = await fetchUrl('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
        saveFile('chart.umd.min.js', chartjs);

        await processFontCss('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', 'inter.css');
        await processFontCss('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap', 'material.css');

        console.log("Assets downloaded successfully.");
    } catch (e) {
        console.error(e);
    }
}
main();
