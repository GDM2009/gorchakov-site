// Сборка сайта одной командой на любой ОС.
//   node tools/build.js                               — локальная версия в dev/ для http://localhost:8080
//   node tools/build.js https://example.ru            — боевая версия в novyi-sait/ для корня домена
//   node tools/build.js https://example.ru /expert    — боевая версия для подпапки
// Шаг 1: ishodniki/_src/sasha/build.js — собирает 3D-кабинет (a-nas.ru/sasha/index.html) из его исходника и статей.
// Шаг 2: ishodniki/_src/sasha2/build.js — собирает сам сайт (все страницы, блог, карта сайта, форма) и копирует кабинет и игру внутрь.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const [url, sub] = process.argv.slice(2);
const local = !url;
const out = path.join(ROOT, local ? 'dev' : 'novyi-sait');
fs.rmSync(out, { recursive: true, force: true });
require(path.join(ROOT, 'ishodniki', '_src', 'sasha', 'build.js'));
process.env.SITE_URL = url || 'http://localhost:8080';
process.env.SITE_PATH = sub || '';
process.env.OUT_DIR = out;
require(path.join(ROOT, 'ishodniki', '_src', 'sasha2', 'build.js'));
console.log((local ? 'Локальная версия' : 'Готовый сайт') + ': ' + path.relative(ROOT, out) + '/');
