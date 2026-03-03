const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.join(__dirname, 'site');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);

    // Sécurité: rester dans ROOT
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 – Fichier non trouvé: ' + req.url);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': mime,
            'Content-Length': stat.size,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
        });

        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  ✅  Serveur local démarré !');
    console.log('');
    console.log('  🌐  http://localhost:' + PORT);
    console.log('');
    console.log('  📱  Écrans disponibles :');
    console.log('       → http://localhost:' + PORT + '/index.html       (Accueil)');
    console.log('       → http://localhost:' + PORT + '/dashboard.html    (Dashboard Sombre)');
    console.log('       → http://localhost:' + PORT + '/budgets.html      (Budgets Sombres)');
    console.log('       → http://localhost:' + PORT + '/analyse.html      (Analyse Sombre)');
    console.log('       → http://localhost:' + PORT + '/transactions.html (Transactions Sombres)');
    console.log('');
    console.log('  ⏹   Ctrl+C pour arrêter');
    console.log('');
});
