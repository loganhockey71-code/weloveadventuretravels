const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3012;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css',
  '.js'  : 'application/javascript',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon',
  '.webp': 'image/webp',
};

http.createServer((req, res) => {
  let url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(__dirname, url);
  const ext = path.extname(filePath) || '.html';
  const finalPath = path.extname(filePath) ? filePath : filePath + '.html';

  fs.readFile(finalPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('404 Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('\n  ✈  We Love Adventure Travels');
  console.log(`  →  http://localhost:${PORT}\n`);
});
