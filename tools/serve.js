// Простой локальный сервер для просмотра собранного сайта (без зависимостей).
//   node tools/serve.js [папка] [порт]   — по умолчанию: dev/ и 8080
// Отдаёт index.html для адресов папок и 404.html для несуществующих адресов.
// PHP (форма обратной связи) здесь не работает: её проверяют на хостинге.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dev'));
const PORT = +(process.argv[3] || 8080);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.ktx2': 'image/ktx2' };
if (!fs.existsSync(ROOT)) { console.error('Нет папки ' + ROOT + '. Сначала соберите сайт: npm run build:local'); process.exit(1); }
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
    f = path.join(f, 'index.html');
  }
  let code = 200;
  if (!fs.existsSync(f)) { f = path.join(ROOT, '404.html'); code = 404; }
  res.writeHead(code, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('Сайт: http://localhost:' + PORT + '/  (папка ' + ROOT + ')'));
