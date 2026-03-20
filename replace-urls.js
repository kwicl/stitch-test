const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, 'site');

function processHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.html')) {
            const filepath = path.join(dir, file);
            let content = fs.readFileSync(filepath, 'utf8');

            // Replace Tailwind
            content = content.replace(/<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>/g, '<script src="assets/tailwind.js"></script>');

            // Replace Chart.js
            content = content.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js@[^"]*\/dist\/chart\.umd\.min\.js"><\/script>/g, '<script src="assets/chart.umd.min.js"></script>');

            // Replace Inter
            content = content.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter:[^"]*" rel="stylesheet" \/>/g, '<link href="assets/inter.css" rel="stylesheet" />');

            // Replace Material Symbols
            content = content.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined:[^"]*"(\s*)rel="stylesheet" \/>/g, '<link href="assets/material.css"$1rel="stylesheet" />');
            content = content.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined:[^"]*"\s*\/>\s*<link rel="stylesheet".*?>/g, '<link href="assets/material.css" rel="stylesheet" />'); // fallback for different formats

            fs.writeFileSync(filepath, content);
            console.log(`Updated ${file}`);
        }
    }
}

processHtmlFiles(SITE_DIR);
