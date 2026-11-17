// Классическая версия сайта Александра Горчакова: a-nas.ru/sasha2
// Запуск из корня репозитория: node _src/sasha2/build.js
// Содержание не хранится здесь: оно читается из _src/sasha/ (CONTENT в index.html, SERVICE_PAGES в build.js, статьи blog/*.md),
// чтобы две версии сайта не разошлись. Здесь только облик, раскладка по страницам и всё для поиска.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const SRC = __dirname, MAIN = path.join(SRC, '..', 'sasha'), ROOT = path.join(SRC, '..', '..', 'a-nas.ru');
// Адрес сайта можно задать при запуске, ничего не меняя в коде (нужно при переезде на другой хостинг):
//   SITE_URL=https://example.ru SITE_PATH= OUT_DIR=/путь/к/папке node _src/sasha2/build.js
// SITE_URL — домен с https://, SITE_PATH — папка на домене ('' для корня, '/sasha2' для подпапки), OUT_DIR — куда положить готовый сайт.
const env = process.env;
// FORM_SERVICE=formsubmit: форма отправляется через сервис formsubmit.co, а не через send.php (для черновика на GitHub Pages, где нет PHP).
// При первой отправке formsubmit.co пришлёт на почту из CONTACTS письмо для подтверждения: по ссылке в нём нужно один раз нажать «Activate».
const FORM_SERVICE = env.FORM_SERVICE || '';
const OUT = env.OUT_DIR ? path.resolve(env.OUT_DIR) : path.join(ROOT, 'sasha2');

// ================= НАСТРОЙКИ =================
// LIVE = true: сайт открыт для поиска, canonical на себя (так решил владелец 15.11.2026: сайт позже переедет на свой адрес).
// LIVE = false: страницы закрыты от поиска (noindex) и указывают canonical на /sasha/.
// При переезде на другой адрес поменять SITE и P ниже, IndexNow-ключ и строку Sitemap в robots.txt.
const LIVE = true;
// Контакты дал владелец 15.11.2026. telegram: имя пользователя без @; если пусто, кнопка Telegram открывает чат по номеру телефона. Telegram @Alexander_Gorchakov — 17.11.2026.
// На почту email приходят и письма из формы обратной связи (send.php).
const CONTACTS = { email: 'ale.gorchakov@gmail.com', phone: '', telegram: 'Alexander_Gorchakov' };
// Коды подтверждения Яндекс Вебмастера и Google Search Console (работают при LIVE = true).
// bing — код из Bing Webmaster Tools (мета-тег msvalidate.01).
const VERIFY = { yandex: '', google: '', bing: '' };
// Номер счётчика Яндекс Метрики (пусто — счётчика нет).
const METRIKA = '';
const PER_PAGE = 12;      // статей на странице списка блога
const TOPIC_MIN = 3;      // страница темы создаётся, когда по теме набралось столько статей
// =============================================

const SITE = (env.SITE_URL || 'https://a-nas.ru').replace(/\/$/, ''), P = env.SITE_PATH !== undefined ? env.SITE_PATH.replace(/\/$/, '') : '/sasha2', BASE = SITE + P, OLD = 'https://a-nas.ru/sasha';
const HOST = SITE.replace(/^https?:\/\//, '');
const IMG = P + '/img';                          // своя копия картинок (сборщик берёт их из a-nas.ru/sasha/img)
const CABINET = P + '/kabinet/', GAME = P + '/neurogame/';

// ---------- сайт самостоятельный: 3D-кабинет, «Нейрогонка» и картинки копируются внутрь /sasha2/ ----------
// Источник — опубликованные файлы действующего сайта (a-nas.ru/sasha). При переезде папка sasha2 переносится целиком.
const OLD_OUT = path.join(ROOT, 'sasha');
function syncDir(from, to) { let n = 0; if (!fs.existsSync(from)) return n; fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) n += syncDir(a, b);
    else if (!fs.existsSync(b) || fs.statSync(b).size !== fs.statSync(a).size || !fs.readFileSync(a).equals(fs.readFileSync(b))) { fs.copyFileSync(a, b); n++; } }
  return n; }
syncDir(path.join(SRC, 'g'), path.join(OUT, 'assets', 'g')); // графика из Higgsfield: сжатые копии лежат в исходниках
const copied = syncDir(path.join(OLD_OUT, 'img'), path.join(OUT, 'img')) + syncDir(env.GAME_DIR ? path.resolve(env.GAME_DIR) : path.join(OLD_OUT, 'neurogame'), path.join(OUT, 'neurogame')); // GAME_DIR: взять готовую игру из другой папки

// ---------- содержание из действующего сайта ----------
const mainHtml = fs.readFileSync(path.join(MAIN, 'index.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(MAIN, 'build.js'), 'utf8');
const grab = (src, re, what) => { const m = src.match(re); if (!m) throw new Error('Не найдено в исходниках действующего сайта: ' + what); return new Function('return ' + m[1])(); };
const CONTENT = grab(mainHtml, /const CONTENT = (\{[\s\S]*?\n\});/, 'CONTENT');
const ROLE = grab(mainJs, /const BASE = [^\n]*?AUTHOR = [^\n]*?;\nconst ROLE = ('[^']*');/, 'ROLE');
const TOPICS = grab(mainJs, /const TOPICS = (\[[^\n]*\]);/, 'TOPICS');
const SERVICE_RAW = grab(mainJs, /const SERVICE_PAGES = (\[[\s\S]*?\n\])\.map\(/, 'SERVICE_PAGES');
const POST_SERVICE = grab(mainJs, /const POST_SERVICE = (\{[^\n]*\});/, 'POST_SERVICE');
if (SERVICE_RAW.length !== CONTENT.services.length) throw new Error('Число услуг в CONTENT и SERVICE_PAGES не совпадает');
const AUTHOR = CONTENT.name;
const OCCUPATION = 'ИТ-директор и архитектор цифровой трансформации';

// ---------- помощники ----------
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const dateText = d => { const [y, m, dd] = d.split('-').map(Number); return dd + ' ' + MONTHS[m - 1] + ' ' + y; };
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slugify = s => s.toLowerCase().split('').map(ch => TR[ch] !== undefined ? TR[ch] : ch).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hid = t => slugify(t).slice(0, 60);
// ссылки из статей на действующий сайт ведём на те же страницы этой версии
const localize = u => u.replace(/^https:\/\/a-nas\.ru\/sasha2?\/(expert|uslugi|keisy|blog)\b/, P + '/$1');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:[^)\s]+|\/[^)\s]*)\)/g, (m, t, u) => `<a href="${localize(u)}">${t}</a>`);
function md(text) {
  return text.trim().split(/\n\s*\n/).map(b => {
    const L = b.split('\n');
    if (b.startsWith('### ')) return '<h3>' + inline(b.slice(4)) + '</h3>';
    if (b.startsWith('## ')) return '<h2 id="' + hid(b.slice(3)) + '">' + inline(b.slice(3)) + '</h2>';
    if (L.every(l => /^- /.test(l))) return '<ul>' + L.map(l => '<li>' + inline(l.slice(2)) + '</li>').join('') + '</ul>';
    if (L.every(l => /^\d+\. /.test(l))) return '<ol>' + L.map(l => '<li>' + inline(l.replace(/^\d+\. /, '')) + '</li>').join('') + '</ol>';
    if (L.every(l => /^> /.test(l))) return '<blockquote>' + inline(L.map(l => l.slice(2)).join(' ')) + '</blockquote>';
    return '<p>' + inline(L.join(' ')) + '</p>';
  }).join('\n');
}
const IMG_DIR = path.join(OUT, 'img', 'blog');
// сжатые картинки статей делает автоматика действующего сайта; пока файла нет, берём временную ссылку
const pic = (p, w, fmt = 'webp') => { const f = p.slug + '-' + w + '.' + fmt; return fs.existsSync(path.join(IMG_DIR, f)) ? IMG + '/blog/' + f : 'https://wsrv.nl/?url=' + encodeURIComponent(p.image) + '&w=' + w + '&output=' + fmt + '&q=78'; };
const abs = u => u.startsWith('/') ? SITE + u : u;
const fitTitle = t => (t + ' — ' + AUTHOR).length <= 70 ? t + ' — ' + AUTHOR : t;
const arrow = '<svg class="arr" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ---------- статьи ----------
const posts = fs.readdirSync(path.join(MAIN, 'blog')).filter(f => f.endsWith('.md')).map(f => {
  const raw = fs.readFileSync(path.join(MAIN, 'blog', f), 'utf8'), m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('Нет шапки в ' + f);
  const meta = {}; m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  for (const k of ['title', 'description', 'date', 'slug']) if (!meta[k]) throw new Error('В ' + f + ' нет поля ' + k);
  if (!/^[a-z0-9-]+$/.test(meta.slug)) throw new Error('slug только из латиницы, цифр и дефиса: ' + f);
  const words = m[2].split(/\s+/).length;
  return { ...meta, raw: m[2].trim(), imageAlt: meta.image_alt || meta.title, tags: (meta.tags || '').split(',').map(s => s.trim()).filter(Boolean), html: md(m[2]), dateText: dateText(meta.date), words, minutes: Math.max(1, Math.round(words / 180)), url: P + '/blog/' + meta.slug + '/' };
}).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
{ const seen = {}; posts.forEach(p => { if (seen[p.slug]) throw new Error('Два файла статей с одним slug: ' + p.slug); seen[p.slug] = 1; }); }

const SERVICES = SERVICE_RAW.map((s, i) => ({ ...s, name: CONTENT.services[i][0], short: CONTENT.services[i][1], url: P + '/uslugi/' + s.slug + '/' }));
const CASES = CONTENT.projects.map(c => ({ ...c, id: slugify(c.title), url: P + '/keisy/#' + slugify(c.title) }));
// темы блога: страница темы появляется сама, когда по ней набирается TOPIC_MIN статей
const tagMap = {}; posts.forEach(p => p.tags.forEach(t => (tagMap[t] = tagMap[t] || []).push(p)));
const TOPIC_PAGES = Object.keys(tagMap).filter(t => tagMap[t].length >= TOPIC_MIN).map(t => ({ tag: t, slug: slugify(t), url: P + '/blog/tema/' + slugify(t) + '/', posts: tagMap[t] }));
const topicOf = t => TOPIC_PAGES.find(x => x.tag === t);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- стили и скрипт ----------
const css = fs.readFileSync(path.join(SRC, 'site.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}');
const cssName = 'site.' + crypto.createHash('sha1').update(css).digest('hex').slice(0, 8) + '.css';
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'assets', cssName), css);
for (const f of fs.readdirSync(path.join(SRC, 'static'))) fs.copyFileSync(path.join(SRC, 'static', f), path.join(OUT, 'assets', f));
fs.writeFileSync(path.join(OUT, '.htaccess'), fs.readFileSync(path.join(SRC, 'htaccess.txt'), 'utf8').split('{{P}}').join(P));
// форма обратной связи убрана по просьбе владельца 17.11.2026, send.php больше не создаётся
// сайт в корне домена: свой robots.txt (в подпапке он не нужен, поисковики читают его только из корня)
// Поисковые и ИИ-боты перечислены явно: так им проще понять, что доступ открыт. Тот же список — в seo/robots-dlya-kornya.txt.
const BOTS = ['Yandex', 'Googlebot', 'Bingbot', 'Google-Extended', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Applebot', 'Applebot-Extended', 'DuckDuckBot', 'YandexAdditional', 'YandexAdditionalBot'];
const robotsTxt = (prefix) => 'User-agent: *\nAllow: /\nDisallow: ' + prefix + '/_data/\n\n# Поисковые и ИИ-боты: доступ открыт\n' + BOTS.map(b => 'User-agent: ' + b + '\nAllow: /\nDisallow: ' + prefix + '/_data/\n').join('\n') + '\nSitemap: ' + BASE + '/sitemap.xml\n';
if (P === '') fs.writeFileSync(path.join(OUT, 'robots.txt'), robotsTxt(''));
// сайт в подпапке: готовый robots.txt для корня домена кладётся в seo/ репозитория (его нужно положить в корень вручную)
else { const seoDir = path.join(SRC, '..', '..', '..', 'seo'); if (fs.existsSync(seoDir)) fs.writeFileSync(path.join(seoDir, 'robots-dlya-kornya.txt'), robotsTxt(P)); }
fs.mkdirSync(path.join(OUT, '_data'), { recursive: true });
fs.writeFileSync(path.join(OUT, '_data', '.htaccess'), 'Require all denied\n');
const INDEXNOW = fs.readFileSync(path.join(SRC, 'indexnow-key.txt'), 'utf8').trim();
fs.writeFileSync(path.join(OUT, INDEXNOW + '.txt'), INDEXNOW);

// ---------- разметка для поиска ----------
const PHOTO = P + '/assets/expert-';   // исходное фото эксперта (не стилизованное, как в кабинете)
const personId = BASE + '/#person', siteId = BASE + '/#website';
const sameAs = CONTACTS.telegram ? ['https://t.me/' + CONTACTS.telegram] : []; // сюда же добавлять профили: LinkedIn, VC.ru, Хабр, Telegram-канал
const TEL = CONTACTS.phone.replace(/[^+\d]/g, ''), TG = CONTACTS.telegram ? 'https://t.me/' + CONTACTS.telegram : (TEL ? 'https://t.me/' + TEL : '');
const person = { '@type': 'Person', '@id': personId, name: AUTHOR, givenName: AUTHOR.split(' ')[0], familyName: AUTHOR.split(' ')[1], jobTitle: OCCUPATION, description: ROLE + '. ' + CONTENT.about.join(' '), url: BASE + '/', image: SITE + PHOTO + '640.jpg', knowsAbout: TOPICS, knowsLanguage: 'ru', nationality: { '@type': 'Country', name: 'Россия' },
  ...(sameAs.length ? { sameAs } : {}), ...(CONTACTS.email ? { email: 'mailto:' + CONTACTS.email } : {}), ...(CONTACTS.phone ? { telephone: TEL, contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: TEL, email: CONTACTS.email || undefined, availableLanguage: 'Russian', areaServed: 'RU' } } : {}) };
const website = { '@type': 'WebSite', '@id': siteId, name: AUTHOR + ' — цифровая трансформация госсектора и финансов', alternateName: AUTHOR, url: BASE + '/', inLanguage: 'ru', publisher: { '@id': personId }, about: { '@id': personId } };
// Частная практика эксперта как организация-услуга: помогает Яндексу, Google и ИИ-ассистентам понять, что здесь можно заказать консультацию.
const proService = { '@type': 'ProfessionalService', '@id': BASE + '/#service', name: AUTHOR + ' — консалтинг по ИТ-стратегии и цифровой трансформации', url: BASE + '/', image: SITE + PHOTO + '640.jpg', description: ROLE + '. ' + CONTENT.about[0], founder: { '@id': personId }, employee: { '@id': personId }, areaServed: { '@type': 'Country', name: 'Россия' }, availableLanguage: 'Russian', knowsAbout: TOPICS, ...(CONTACTS.email ? { email: CONTACTS.email } : {}), ...(sameAs.length ? { sameAs } : {}) };
const crumbsLd = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: abs(it[1]) })) });
const crumbNav = items => `<nav class="crumbs" aria-label="Хлебные крошки"><ol>${items.map((it, i) => i < items.length - 1 ? `<li><a href="${it[1]}">${esc(it[0])}</a></li>` : `<li aria-current="page">${esc(it[0])}</li>`).join('')}</ol></nav>`;
const HOME = ['Главная', P + '/'];

// ---------- общий каркас страницы ----------
const NAV = [['home', 'Главная', P + '/'], ['expert', 'Об эксперте', P + '/expert/'], ['uslugi', 'Услуги', P + '/uslugi/'], ['keisy', 'Кейсы', P + '/keisy/'], ['blog', 'Блог', P + '/blog/'], ['kontakty', 'Контакты', P + '/kontakty/']];
const warn = [], pages = [];
function page({ file, title, description, canonOld, body, ld, type = 'website', image, imageAlt, extraHead = '', nav = '', index = true, lastmod, smImage }) {
  const url = BASE + '/' + file.replace(/index\.html$/, '');
  if (title.length > 70) warn.push('Заголовок длиннее 70 знаков (' + title.length + '): ' + url);
  if (description.length > 170) warn.push('Описание длиннее 170 знаков (' + description.length + '): ' + url);
  const open = LIVE && index;
  const canonical = LIVE ? (index ? url : '') : (canonOld || OLD + '/expert/');
  const ogImg = image ? abs(image) : BASE + '/assets/og.jpg';
  const html = `<!DOCTYPE html>
<html lang="ru" prefix="og: https://ogp.me/ns#"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(AUTHOR)}">
<meta name="robots" content="${open ? 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1' : 'noindex,follow'}">${LIVE && VERIFY.yandex ? `\n<meta name="yandex-verification" content="${esc(VERIFY.yandex)}">` : ''}${LIVE && VERIFY.google ? `\n<meta name="google-site-verification" content="${esc(VERIFY.google)}">` : ''}${LIVE && VERIFY.bing ? `\n<meta name="msvalidate.01" content="${esc(VERIFY.bing)}">` : ''}
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<link rel="icon" href="${P}/assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="${P}/assets/favicon-120.png" sizes="120x120" type="image/png"><link rel="apple-touch-icon" href="${P}/assets/favicon-180.png">
<meta name="theme-color" content="#16233f">
<meta property="og:type" content="${type}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}"><meta property="og:site_name" content="${esc(AUTHOR)}"><meta property="og:locale" content="ru_RU">
<meta property="og:image" content="${esc(ogImg)}">${image ? '' : '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'}<meta property="og:image:alt" content="${esc(imageAlt || AUTHOR + ', ' + OCCUPATION)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(ogImg)}">${extraHead}
<link rel="preload" href="${P}/assets/Geologica-cyrillic-189ca8.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="${P}/assets/Onest-cyrillic-8faa2f.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${P}/assets/${cssName}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
<header class="site-head"><div class="wrap head-in">
<a class="brand" href="${P}/" aria-label="${esc(AUTHOR)}: на главную"><span class="mono" aria-hidden="true">АГ</span><span class="brand-name">${esc(AUTHOR)}</span></a>
<button class="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Меню"><span></span><span></span><span></span></button>
<nav id="nav" class="nav" aria-label="Основная">${NAV.map(n => `<a href="${n[2]}"${n[0] === nav ? ' aria-current="page"' : ''}>${n[1]}</a>`).join('')}${TEL ? `<a class="nav-tel" href="tel:${TEL}">${esc(CONTACTS.phone)}</a>` : ''}<a class="btn btn-sm nav-cta" href="${P}/kontakty/#form">Связаться</a></nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="site-foot"><div class="wrap foot-in">
<div class="foot-who"><span class="mono" aria-hidden="true">АГ</span><p><b>${esc(AUTHOR)}</b><br>${esc(ROLE)}${TEL ? `<br><a class="foot-c" href="tel:${TEL}">${esc(CONTACTS.phone)}</a>` : ''}${CONTACTS.email ? `<br><a class="foot-c" href="mailto:${esc(CONTACTS.email)}">${esc(CONTACTS.email)}</a>` : ''}</p></div>
<nav class="foot-nav" aria-label="Разделы сайта"><a href="${P}/expert/">Об эксперте</a><a href="${P}/uslugi/">Услуги</a><a href="${P}/keisy/">Кейсы</a><a href="${P}/blog/">Блог</a><a href="${P}/kontakty/">Контакты</a></nav>
<nav class="foot-nav" aria-label="Дополнительно"><a target="_blank" rel="noopener" href="${CABINET}">3D-кабинет</a><a target="_blank" rel="noopener" href="${GAME}">Игра «Нейрогонка»</a></nav>
</div><div class="wrap foot-copy">© ${new Date().getFullYear()} ${esc(AUTHOR)}</div></footer>
<script>(function(){var b=document.querySelector('.burger'),n=document.getElementById('nav');if(b)b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)});
})()</script>${LIVE && METRIKA ? `\n<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${METRIKA},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});</script>` : ''}
</body></html>
`;
  const target = path.join(OUT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  if (index && file !== '404.html') pages.push({ url, lastmod, image: smImage });
}

// ---------- повторяющиеся блоки ----------
const h2 = (id, text, lead) => `<div class="sec-head"><h2 id="${id}">${text}</h2>${lead ? `<p>${lead}</p>` : ''}</div>`;
const serviceCard = (s, tag = 'h3') => `<a class="card" href="${s.url}"><${tag}>${esc(s.name)}</${tag}><p>${esc(s.short)}</p>${arrow}</a>`;
const caseCard = (c, tag = 'h3') => `<a class="card case" href="${c.url}"><span class="chip">${esc(c.cat)}</span><${tag}>${esc(c.title)}</${tag}><p>${esc(c.text)}</p>${arrow}</a>`;
const postCard = (p, tag = 'h3', big) => `<article class="post${big ? ' post-big' : ''}">${p.image ? `<a class="post-pic" href="${p.url}" tabindex="-1" aria-hidden="true"><img src="${esc(pic(p, big ? 1200 : 720))}" srcset="${esc(pic(p, 440))} 440w, ${esc(pic(p, 720))} 720w${big ? ', ' + esc(pic(p, 1200)) + ' 1200w' : ''}" sizes="${big ? '(max-width: 900px) 100vw, 620px' : '(max-width: 700px) 100vw, 370px'}" alt="" width="720" height="407" ${big ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}></a>` : ''}<div class="post-txt"><p class="post-meta"><time datetime="${p.date}">${p.dateText}</time><span>${p.minutes} мин чтения</span></p><${tag}><a href="${p.url}">${esc(p.title)}</a></${tag}><p>${esc(p.description)}</p></div></article>`;
const contactLine = () => {
  const out = [];
  if (CONTACTS.email) out.push(`<a href="mailto:${esc(CONTACTS.email)}">${esc(CONTACTS.email)}</a>`);
  if (CONTACTS.phone) out.push(`<a href="tel:${esc(CONTACTS.phone.replace(/[^+\d]/g, ''))}">${esc(CONTACTS.phone)}</a>`);
  if (CONTACTS.telegram) out.push(`<a href="https://t.me/${esc(CONTACTS.telegram)}" rel="me">Telegram: @${esc(CONTACTS.telegram)}</a>`);
  return out;
};
const icons = { tel: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>', tg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m21 4-3 16-6-4-3 3v-5l8-7-10 6-4-1.5L21 4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>', mail: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 6h18v12H3zm0 0 9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' };
const contactBtns = cls => `<div class="cbtns${cls ? ' ' + cls : ''}">${TEL ? `<a class="cbtn" href="tel:${TEL}">${icons.tel}<span><small>Позвонить</small>${esc(CONTACTS.phone)}</span></a>` : ''}${TG ? `<a class="cbtn" href="${TG}" target="_blank" rel="noopener me">${icons.tg}<span><small>Написать</small>Telegram</span></a>` : ''}${CONTACTS.email ? `<a class="cbtn" href="mailto:${esc(CONTACTS.email)}">${icons.mail}<span><small>Почта</small>${esc(CONTACTS.email)}</span></a>` : ''}</div>`;
let formN = 0;
const contactForm = topic => { const n = ++formN; return `<form class="cform" id="form" action="${FORM_SERVICE === 'formsubmit' ? 'https://formsubmit.co/ajax/' + CONTACTS.email : P + '/send.php'}" method="post">${FORM_SERVICE === 'formsubmit' ? `<input type="hidden" name="_subject" value="Обращение с сайта ${esc(HOST + P)}"><input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false">` : ''}<input type="hidden" name="topic" value="${esc(topic || '')}"><input type="hidden" name="page" value="">
<p class="hp" aria-hidden="true"><label>Не заполняйте это поле <input type="text" name="website" tabindex="-1" autocomplete="off"></label></p>
<div class="cform-row"><label>Имя<input type="text" name="name" required maxlength="120" autocomplete="name"></label><label>Телефон или почта<input type="text" name="contact" required maxlength="160" autocomplete="email"></label></div>
<label>Задача<textarea name="message" rows="4" maxlength="4000" placeholder="${topic ? esc('Тема: ' + topic + '. ') : ''}Коротко опишите ситуацию"></textarea></label>
<div class="cform-foot"><button class="btn" type="submit">Отправить ${arrow}</button><p class="cform-note">Нажимая «Отправить», вы соглашаетесь на обработку указанных данных для ответа на обращение.</p></div>
<p class="cform-st" role="status" aria-live="polite"></p></form>`; };
// большой блок связи: форма и кнопки. topic попадает в тему письма
const contactSection = (topic, title) => `<section class="band navy contact-sec" id="form" aria-labelledby="cta-h"><div class="wrap contact-in"><div class="contact-txt"><h2 id="cta-h">${title || 'Обсудим вашу задачу?'}</h2><p>${esc(CONTENT.about[1].split('. ').slice(1).join('. '))}</p>${contactBtns('on-navy')}</div></div></section>`;
// короткий блок связи для страниц блога
const ctaBand = `<section class="band cta" aria-labelledby="cta-h"><div class="wrap cta-in"><h2 id="cta-h">Обсудим вашу задачу?</h2>${contactBtns('')}<a class="btn" href="${P}/kontakty/#form">Написать ${arrow}</a></div></section>`;
const authorBox = lead => `<aside class="author"><img src="${PHOTO}160.webp" alt="${esc(AUTHOR)}" width="72" height="90" loading="lazy" decoding="async"><div><b>${lead}</b><p>${esc(OCCUPATION)}. ${esc(CONTENT.about[0])}</p><a href="${P}/expert/">Об эксперте</a></div></aside>`;
const portrait = (sizes, prio, ph = PHOTO) => `<img src="${ph}640.webp" srcset="${ph}320.webp 320w, ${ph}640.webp 640w" sizes="${sizes}" alt="${esc(AUTHOR)}, ${esc(OCCUPATION.charAt(0).toLowerCase() + OCCUPATION.slice(1))}" width="640" height="800"${prio ? ' fetchpriority="high"' : ' loading="lazy"'}>`;
const factsList = `<ul class="facts">${CONTENT.facts.map(f => `<li><b>${esc(f[0])}</b><span>${esc(f[1])}</span></li>`).join('')}</ul>`;
// теги экспертизы: две строки по нижнему краю картиночной части баннера
const heroSkills = `<ul class="hero-skills" aria-label="Ключевая экспертиза">${CONTENT.skills.map((s, i) => `${i === Math.ceil(CONTENT.skills.length / 2) ? '<li class="br" aria-hidden="true"></li>' : ''}<li>${esc(s)}</li>`).join('')}</ul>`;
// варианты баннера первого экрана (перелистываются стрелками): записи с полем variant в images.json
const SLIDES = JSON.parse(fs.readFileSync(path.join(SRC, 'images.json'), 'utf8')).filter(x => x.variant);
const skillsList = `<ul class="skills">${CONTENT.skills.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
const careerList = (tag = 'h3') => `<ul class="career">${CONTENT.experience.map(x => `<li><${tag}>${esc(x.where)}</${tag}><p>${esc(x.what)}</p></li>`).join('')}</ul>`;
const offers = SERVICES.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', '@id': abs(s.url) + '#service', name: s.h1, description: s.lead, url: abs(s.url), areaServed: 'RU', provider: { '@id': personId } } }));
const lastmod = posts[0] ? posts[0].date : '';

// ---------- главная ----------
page({ file: 'index.html', nav: 'home', type: 'profile', lastmod, canonOld: OLD + '/expert/', image: PHOTO + '640.jpg',
  title: AUTHOR + ' — ИТ-директор, цифровая трансформация',
  description: AUTHOR + ' — ' + OCCUPATION.charAt(0).toLowerCase() + OCCUPATION.slice(1) + '. 20+ лет: Минфин и Казначейство, ГИС ГМП, банки, нотариат. Услуги, кейсы, блог.',
  extraHead: `<meta property="profile:first_name" content="${AUTHOR.split(' ')[0]}"><meta property="profile:last_name" content="${AUTHOR.split(' ')[1]}"><link rel="preload" as="image" href="${P}/assets/g/${SLIDES[0].name}-1600.webp" media="(min-width: 901px)"><link rel="preload" as="image" href="${P}/assets/g/${SLIDES[0].name}-900.webp" media="(max-width: 900px)">`,
  ld: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ProfilePage', '@id': BASE + '/', url: BASE + '/', name: AUTHOR, inLanguage: 'ru', mainEntity: { '@id': personId }, isPartOf: { '@id': siteId }, dateModified: lastmod },
    { ...person, hasOccupation: { '@type': 'Occupation', name: OCCUPATION, skills: CONTENT.skills.join(', ') }, makesOffer: offers, worksFor: { '@id': BASE + '/#service' } }, { ...proService, hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Услуги', itemListElement: offers } }, website] },
  body: `<section class="hero hero-full hero-slider${SLIDES[0].dark ? ' hero-dark' : ''}" id="hero" aria-roledescription="карусель" aria-label="Первый экран">
<div class="hero-bgs" aria-hidden="true">${SLIDES.map((v, i) => `<div class="hero-bg${i ? '' : ' on'}${v.dark ? ' dk' : ''}" ${i ? 'data-pic' : 'style'}="--pic:url(${P}/assets/g/${v.name}-1600.webp);--pic-m:url(${P}/assets/g/${v.name}-900.webp)"></div>`).join('')}</div>
<div class="wrap hero-in"><div class="hero-txt"><p class="eyebrow">${esc(CONTENT.role)}</p>
<h1>${esc(AUTHOR.split(' ')[0])}<br>${esc(AUTHOR.split(' ')[1])}</h1>
<p class="hero-role">${esc(OCCUPATION)}</p>
<p class="hero-lead">${esc(CONTENT.about[0])}</p></div>
<div class="hero-foot"><div class="btns"><a class="btn" href="#form">Связаться ${arrow}</a></div></div></div>
${heroSkills}
${SLIDES.length > 1 ? `<div class="hero-nav"><button type="button" class="hero-arr prev" aria-label="Предыдущий вариант баннера">${arrow}</button><span class="hero-count" aria-live="polite">1 / ${SLIDES.length}</span><button type="button" class="hero-arr next" aria-label="Следующий вариант баннера">${arrow}</button></div>
<script>(function(){var h=document.getElementById('hero'),b=h.querySelectorAll('.hero-bg'),c=h.querySelector('.hero-count'),i=0;function go(d){[].forEach.call(b,function(x){if(x.dataset.pic){x.setAttribute('style',x.dataset.pic);delete x.dataset.pic}});b[i].classList.remove('on');i=(i+d+b.length)%b.length;b[i].classList.add('on');h.classList.toggle('hero-dark',b[i].classList.contains('dk'));c.textContent=(i+1)+' / '+b.length}
h.querySelector('.prev').onclick=function(){go(-1)};h.querySelector('.next').onclick=function(){go(1)};var x0=null;h.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});h.addEventListener('touchend',function(e){if(x0===null)return;var d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50)go(d<0?1:-1);x0=null},{passive:true})})()</script>` : ''}
</section>
<section class="facts-band" aria-label="Опыт в цифрах"><div class="wrap facts-row">${factsList}</div></section>
<section class="sec tint" aria-labelledby="h-usl"><div class="wrap">${h2('h-usl', 'Услуги')}<div class="grid g4">${SERVICES.map(s => serviceCard(s)).join('')}</div><p class="more"><a href="${P}/uslugi/">Все услуги подробно ${arrow}</a></p></div></section>
<section class="sec sec-line" aria-labelledby="h-kei"><div class="wrap">${h2('h-kei', 'Кейсы')}<div class="grid g3">${CASES.map(c => caseCard(c)).join('')}</div></div></section>
<section class="band navy" aria-labelledby="h-kar"><div class="wrap split">${h2('h-kar', 'Карьера')}${careerList()}</div></section>
<section class="sec" aria-labelledby="h-blog"><div class="wrap"><div class="sec-head sec-row"><h2 id="h-blog">Блог</h2><div class="car-nav"><button type="button" class="car-arr prev" aria-label="Предыдущие статьи" disabled>${arrow}</button><button type="button" class="car-arr next" aria-label="Следующие статьи">${arrow}</button></div></div>
<div class="car posts" id="blog-car" tabindex="0" aria-label="Статьи блога">${posts.slice(0, 12).map(p => postCard(p)).join('')}</div><p class="more"><a href="${P}/blog/">Все статьи ${arrow}</a></p></div>
<script>(function(){var c=document.getElementById('blog-car'),n=c.parentNode.querySelector('.car-nav'),p=n.querySelector('.prev'),x=n.querySelector('.next');function st(){p.disabled=c.scrollLeft<4;x.disabled=c.scrollLeft+c.clientWidth>c.scrollWidth-4}function go(d){c.scrollBy({left:d*(c.clientWidth+28),behavior:'smooth'})}p.onclick=function(){go(-1)};x.onclick=function(){go(1)};c.addEventListener('scroll',st,{passive:true});window.addEventListener('resize',st);st()})()</script></section>
<section class="sec sec-line" aria-labelledby="h-int"><div class="wrap">${h2('h-int', 'Интерактивные версии')}<div class="grid g2"><a class="card" target="_blank" rel="noopener" href="${CABINET}"><h3>3D-кабинет</h3><p>Рабочий стол с кейсами, услугами и статьями.</p>${arrow}</a><a class="card" target="_blank" rel="noopener" href="${GAME}"><h3>Игра «Нейрогонка»</h3><p>3D-остров, по которому можно проехать на машине.</p>${arrow}</a></div></div></section>
${contactSection('')}` });

// ---------- об эксперте ----------
{ const trail = [HOME, ['Об эксперте', P + '/expert/']];
  page({ file: 'expert/index.html', nav: 'expert', type: 'profile', lastmod, canonOld: OLD + '/expert/', image: PHOTO + '640.jpg',
    title: 'Об эксперте: ' + AUTHOR + ', ИТ-директор',
    description: AUTHOR + ': больше 20 лет в ИТ для государства и финансов. ФНП, ПСБ, BSS, проекты для Минфина и Казначейства. Компетенции, карьера, услуги и кейсы.',
    ld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'AboutPage', '@id': BASE + '/expert/', url: BASE + '/expert/', name: 'Об эксперте: ' + AUTHOR, inLanguage: 'ru', mainEntity: { '@id': personId }, isPartOf: { '@id': siteId } },
      { ...person, hasOccupation: { '@type': 'Occupation', name: OCCUPATION, skills: CONTENT.skills.join(', ') }, makesOffer: offers }, website, crumbsLd(trail)] },
    body: `<div class="wrap page-top">${crumbNav(trail)}</div>
<section class="wrap about"><div class="about-txt"><h1>${esc(AUTHOR)}</h1><p class="hero-role">${esc(OCCUPATION)}</p>${CONTENT.about.map(a => `<p class="lead">${esc(a)}</p>`).join('')}<div class="btns"><a class="btn" href="#form">Связаться ${arrow}</a><a class="btn btn-ghost" target="_blank" rel="noopener" href="${CABINET}">3D-кабинет</a></div></div>
<figure class="about-pic">${portrait('(max-width: 900px) 50vw, 300px', true, PHOTO + 'about-')}</figure></section>
<section class="wrap facts-row" aria-label="Опыт в цифрах">${factsList}</section>
<section class="band mist" aria-labelledby="h-komp"><div class="wrap split">${h2('h-komp', 'Компетенции')}${skillsList}</div></section>
<section class="band navy" aria-labelledby="h-kar"><div class="wrap split">${h2('h-kar', 'Карьера')}${careerList()}</div></section>
<section class="sec" aria-labelledby="h-usl"><div class="wrap">${h2('h-usl', 'Услуги')}<div class="grid g4">${SERVICES.map(s => serviceCard(s)).join('')}</div></div></section>
<section class="sec sec-line" aria-labelledby="h-kei"><div class="wrap">${h2('h-kei', 'Кейсы')}<div class="grid g3">${CASES.map(c => caseCard(c)).join('')}</div></div></section>
<section class="sec sec-line" aria-labelledby="h-blog"><div class="wrap">${h2('h-blog', 'Свежие статьи')}<div class="grid g3 posts">${posts.slice(0, 3).map(p => postCard(p)).join('')}</div><p class="more"><a href="${P}/blog/">Все статьи ${arrow}</a></p></div></section>
${contactSection('')}` }); }

// ---------- услуги ----------
{ const trail = [HOME, ['Услуги', P + '/uslugi/']];
  page({ file: 'uslugi/index.html', nav: 'uslugi', lastmod, canonOld: OLD + '/uslugi/',
    title: 'Услуги ИТ-директора и архитектора трансформации — ' + AUTHOR,
    description: 'Услуги Александра Горчакова: диагностика ИТ, ИТ-стратегия, fractional CIO, своя разработка, корпоративный ИИ, интеграция с госсистемами, due diligence.',
    ld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', '@id': BASE + '/uslugi/', url: BASE + '/uslugi/', name: 'Услуги', inLanguage: 'ru', isPartOf: { '@id': siteId }, mainEntity: { '@type': 'ItemList', itemListElement: SERVICES.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.h1, url: abs(s.url) })) } },
      { ...person, makesOffer: offers }, { ...proService, hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Услуги', itemListElement: offers } }, website, crumbsLd(trail)] },
    // вводная фраза та же, что на странице услуг действующего сайта
    body: `<div class="wrap page-top">${crumbNav(trail)}<h1>Услуги: ИТ-стратегия, цифровая трансформация, корпоративный ИИ</h1><p class="lead">Восемь форматов работы: от двухнедельной диагностики до сопровождения руководителя. Все опираются на 20+ лет проектов для государства и финансов.</p></div>
<section class="sec sec-tight"><div class="wrap"><div class="grid g2 svc-list">${SERVICES.map(s => `<a class="card card-lg" href="${s.url}"><h2>${esc(s.h1)}</h2><p>${esc(s.lead)}</p>${arrow}</a>`).join('')}</div></div></section>
${contactSection('Услуги')}` });
  for (const s of SERVICES) {
    const rel = s.posts.map(sl => posts.find(p => p.slug === sl)).filter(Boolean), t3 = [...trail, [s.h1, s.url]];
    page({ file: 'uslugi/' + s.slug + '/index.html', nav: 'uslugi', lastmod, canonOld: OLD + '/uslugi/' + s.slug + '/', image: PHOTO + '640.jpg',
      title: fitTitle(s.seo), description: s.lead.length > 165 ? s.lead.slice(0, 162) + '…' : s.lead,
      ld: { '@context': 'https://schema.org', '@graph': [
        { '@type': 'Service', '@id': abs(s.url) + '#service', name: s.h1, serviceType: s.name, description: s.lead, url: abs(s.url), areaServed: { '@type': 'Country', name: 'Россия' }, provider: { '@id': personId }, audience: { '@type': 'BusinessAudience', name: 'Руководители ИТ, собственники и советы директоров' } },
        { '@type': 'WebPage', '@id': abs(s.url), url: abs(s.url), name: s.h1, description: s.lead, inLanguage: 'ru', isPartOf: { '@id': siteId }, about: { '@id': abs(s.url) + '#service' } },
        person, website, crumbsLd(t3)] },
      body: `<div class="wrap page-top">${crumbNav(t3)}<h1>${esc(s.h1)}</h1><p class="lead">${esc(s.lead)}</p><div class="btns"><a class="btn" href="#form">Связаться ${arrow}</a>${TEL ? `<a class="btn btn-ghost" href="tel:${TEL}">Позвонить: ${esc(CONTACTS.phone)}</a>` : ''}</div></div>
<section class="band mist"><div class="wrap two">
<div aria-labelledby="kogda"><h2 id="kogda">Когда это нужно</h2><ul class="ticks">${s.when.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div aria-labelledby="chto"><h2 id="chto">Что вы получите</h2><ul class="ticks ticks-get">${s.get.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
</div></section>
<section class="sec" aria-labelledby="opyt"><div class="wrap">${h2('opyt', 'Опыт по теме')}<div class="grid g3">${s.cases.map(i => caseCard(CASES[i])).join('')}</div></div></section>
${rel.length ? `<section class="sec sec-line" aria-labelledby="stati"><div class="wrap">${h2('stati', 'Статьи по теме')}<div class="grid g3 posts">${rel.map(p => postCard(p)).join('')}</div></div></section>` : ''}
<section class="sec sec-line"><div class="wrap">${authorBox('Услугу оказывает ' + esc(AUTHOR))}</div></section>
<section class="sec sec-line" aria-labelledby="eshe"><div class="wrap">${h2('eshe', 'Другие услуги')}<ul class="links">${SERVICES.filter(o => o !== s).map(o => `<li><a href="${o.url}">${esc(o.name)}</a></li>`).join('')}</ul></div></section>
${contactSection(s.name)}` });
  } }

// ---------- кейсы ----------
{ const trail = [HOME, ['Кейсы', P + '/keisy/']];
  page({ file: 'keisy/index.html', nav: 'keisy', lastmod, canonOld: OLD + '/keisy/',
    title: 'Кейсы: госсектор, финансы, корпоративный ИИ — ' + AUTHOR,
    description: 'Кейсы Александра Горчакова: цифровая экосистема нотариата, корпоративный ИИ, исполнение бюджета, ГИС ГМП, интернет-банк для юрлиц, CORREQTS.',
    ld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', '@id': BASE + '/keisy/', url: BASE + '/keisy/', name: 'Кейсы', inLanguage: 'ru', isPartOf: { '@id': siteId }, mainEntity: { '@type': 'ItemList', itemListElement: CASES.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: abs(c.url) })) } },
      person, website, crumbsLd(trail)] },
    // вводная фраза та же, что на странице кейсов действующего сайта
    body: `<div class="wrap page-top">${crumbNav(trail)}<h1>Кейсы: цифровые системы для государства и финансов</h1><p class="lead">Проекты, в которых ${esc(AUTHOR)} участвовал как заказчик, вендор или интегратор.</p></div>
<section class="sec sec-tight"><div class="wrap cases">${CASES.map((c, i) => { const sv = SERVICES.filter(s => s.cases.includes(i)); const ps = posts.filter(p => sv.some(s => s.posts.includes(p.slug))).slice(0, 2);
      return `<article class="case-row" id="${c.id}" aria-labelledby="h-${c.id}"><div><span class="chip">${esc(c.cat)}</span><h2 id="h-${c.id}">${esc(c.title)}</h2><p>${esc(c.text)}</p></div><dl>${sv.length ? `<dt>Услуги по теме</dt><dd>${sv.map(s => `<a href="${s.url}">${esc(s.name)}</a>`).join('')}</dd>` : ''}${ps.length ? `<dt>Статьи</dt><dd>${ps.map(p => `<a href="${p.url}">${esc(p.seo_title || p.title)}</a>`).join('')}</dd>` : ''}</dl></article>`; }).join('')}</div></section>
${contactSection('Кейсы')}` }); }

// ---------- блог: список, страницы тем ----------
const blogDesc = 'Блог Александра Горчакова: ИТ-стратегия, цифровая трансформация госсектора и финансов, интеграция с госсистемами, корпоративный ИИ.';
const topicsNav = cur => TOPIC_PAGES.length ? `<nav class="topics" aria-label="Темы блога"><a href="${P}/blog/"${cur ? '' : ' aria-current="page"'}>Все статьи</a>${TOPIC_PAGES.map(t => `<a href="${t.url}"${cur === t ? ' aria-current="page"' : ''}>${esc(cap(t.tag))}</a>`).join('')}</nav>` : '';
{ const trail = [HOME, ['Блог', P + '/blog/']], total = Math.max(1, Math.ceil(posts.length / PER_PAGE));
  for (let n = 1; n <= total; n++) {
    const list = posts.slice((n - 1) * PER_PAGE, n * PER_PAGE), file = n === 1 ? 'blog/index.html' : 'blog/page/' + n + '/index.html';
    const pager = total > 1 ? `<nav class="pager" aria-label="Страницы блога">${Array.from({ length: total }, (_, i) => i + 1).map(i => i === n ? `<span aria-current="page">${i}</span>` : `<a href="${P}/blog/${i === 1 ? '' : 'page/' + i + '/'}">${i}</a>`).join('')}</nav>` : '';
    const head = (n > 1 ? `<link rel="prev" href="${BASE}/blog/${n === 2 ? '' : 'page/' + (n - 1) + '/'}">` : '') + (n < total ? `<link rel="next" href="${BASE}/blog/page/${n + 1}/">` : '');
    page({ file, nav: 'blog', lastmod, canonOld: OLD + '/blog/', extraHead: head,
      title: 'Блог Александра Горчакова: ИТ-стратегия, госИТ, финтех, ИИ' + (n > 1 ? ' — стр. ' + n : ''), description: blogDesc + (n > 1 ? ' Страница ' + n + '.' : ''),
      ld: { '@context': 'https://schema.org', '@graph': [
        { '@type': 'Blog', '@id': BASE + '/blog/#blog', name: 'Блог Александра Горчакова', description: blogDesc, url: BASE + '/blog/', inLanguage: 'ru', author: { '@id': personId }, publisher: { '@id': personId }, isPartOf: { '@id': siteId }, blogPost: list.map(p => ({ '@type': 'BlogPosting', '@id': abs(p.url) + '#article', headline: p.title, url: abs(p.url), datePublished: p.date + 'T09:00:00+03:00', author: { '@id': personId } })) },
        person, website, crumbsLd(trail)] },
      // вводная фраза та же, что в блоге действующего сайта
      body: `<div class="wrap page-top">${crumbNav(trail)}<h1>Блог Александра Горчакова</h1><p class="lead">${esc(ROLE)}. Практика ИТ-стратегии, госсистем, финтеха и корпоративного ИИ: задачи, решения и результаты.</p>${topicsNav(null)}</div>
<section class="sec sec-tight"><div class="wrap">${n === 1 && list[0] ? postCard(list[0], 'h2', true) : ''}<div class="grid g3 posts">${list.slice(n === 1 ? 1 : 0).map(p => postCard(p, 'h2')).join('')}</div>${pager}</div></section>
${ctaBand}` });
  }
  for (const t of TOPIC_PAGES) { const t3 = [...trail, [cap(t.tag), t.url]];
    page({ file: 'blog/tema/' + t.slug + '/index.html', nav: 'blog', lastmod: t.posts[0].date, canonOld: OLD + '/blog/',
      title: fitTitle(cap(t.tag) + ': статьи блога'), description: 'Статьи Александра Горчакова по теме «' + t.tag + '»: ' + t.posts.slice(0, 3).map(p => p.seo_title || p.title).join('; ').slice(0, 110) + '.',
      ld: { '@context': 'https://schema.org', '@graph': [
        { '@type': 'CollectionPage', '@id': abs(t.url), url: abs(t.url), name: cap(t.tag) + ': статьи блога', inLanguage: 'ru', isPartOf: { '@id': BASE + '/blog/#blog' }, about: { '@type': 'Thing', name: t.tag }, mainEntity: { '@type': 'ItemList', itemListElement: t.posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: abs(p.url) })) } },
        person, website, crumbsLd(t3)] },
      body: `<div class="wrap page-top">${crumbNav(t3)}<h1>${esc(cap(t.tag))}: статьи блога</h1>${topicsNav(t)}</div>
<section class="sec sec-tight"><div class="wrap"><div class="grid g3 posts">${t.posts.map(p => postCard(p, 'h2')).join('')}</div></div></section>
${ctaBand}` }); }
}

// ---------- статьи ----------
const shared = (a, b) => a.tags.filter(t => b.tags.includes(t)).length;
for (const p of posts) {
  const url = abs(p.url), iso = p.date + 'T09:00:00+03:00', isoMod = (p.updated || p.date) + 'T09:00:00+03:00';
  const toc = [...p.html.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map(m => [m[1], m[2].replace(/<[^>]+>/g, '')]);
  const svc = SERVICES[POST_SERVICE[p.slug]];
  const related = posts.filter(o => o !== p).sort((a, b) => shared(b, p) - shared(a, p) || b.date.localeCompare(a.date)).slice(0, 3);
  const i = posts.indexOf(p), newer = posts[i - 1], older = posts[i + 1];
  const trail = [HOME, ['Блог', P + '/blog/'], [p.seo_title || p.title, p.url]];
  page({ file: 'blog/' + p.slug + '/index.html', nav: 'blog', type: 'article', lastmod: p.updated || p.date, canonOld: OLD + '/blog/' + p.slug + '/',
    image: p.image ? pic(p, 1200, 'jpg') : '', imageAlt: p.imageAlt, smImage: p.image ? abs(pic(p, 1200, 'jpg')) : '',
    title: fitTitle(p.seo_title || p.title), description: p.description,
    extraHead: `<meta property="article:published_time" content="${iso}"><meta property="article:modified_time" content="${isoMod}"><meta property="article:author" content="${esc(AUTHOR)}"><meta property="article:section" content="${esc(p.tags[0] || 'ИТ')}">${p.tags.map(t => `<meta property="article:tag" content="${esc(t)}">`).join('')}${p.image ? `<link rel="preload" as="image" href="${esc(pic(p, 1200))}" imagesrcset="${esc(pic(p, 720))} 720w, ${esc(pic(p, 1200))} 1200w" imagesizes="(max-width: 860px) 100vw, 820px">` : ''}`,
    ld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'BlogPosting', '@id': url + '#article', headline: p.title, alternativeHeadline: p.seo_title || undefined, description: p.description, abstract: p.description, datePublished: iso, dateModified: isoMod, inLanguage: 'ru', url, mainEntityOfPage: { '@type': 'WebPage', '@id': url }, keywords: p.tags.join(', '), articleSection: p.tags[0] || 'ИТ', wordCount: p.words, timeRequired: 'PT' + p.minutes + 'M',
        image: p.image ? { '@type': 'ImageObject', url: abs(pic(p, 1200, 'jpg')), width: 1200, height: 679, caption: p.imageAlt } : BASE + '/assets/og.jpg',
        author: { '@id': personId }, publisher: { '@id': personId }, isPartOf: { '@id': BASE + '/blog/#blog' }, about: p.tags.map(t => ({ '@type': 'Thing', name: t })), ...(svc ? { mentions: { '@id': abs(svc.url) + '#service' } } : {}),
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.art-lead'] } },
      person, website, crumbsLd(trail)] },
    body: `<article class="art">
<header class="wrap art-head">${crumbNav([HOME, ['Блог', P + '/blog/'], [p.seo_title || p.title, p.url]])}
<h1>${esc(p.title)}</h1>
<p class="art-lead">${esc(p.description)}</p>
<p class="art-meta"><a class="by" href="${P}/expert/" rel="author"><img src="${PHOTO}160.webp" alt="" width="36" height="45">${esc(AUTHOR)}</a><time datetime="${p.date}">${p.dateText}</time><span>${p.minutes} мин чтения</span></p>
${p.image ? `<img class="art-pic" src="${esc(pic(p, 1200))}" srcset="${esc(pic(p, 720))} 720w, ${esc(pic(p, 1200))} 1200w" sizes="(max-width: 860px) 100vw, 820px" alt="${esc(p.imageAlt)}" width="1200" height="679" fetchpriority="high">` : ''}</header>
<div class="wrap art-body">
${toc.length >= 3 ? `<nav class="toc" aria-label="Содержание"><b>Содержание</b><ol>${toc.map(t => `<li><a href="#${t[0]}">${t[1]}</a></li>`).join('')}</ol></nav>` : ''}
<div class="prose">
${p.html}
</div>
${p.tags.length ? `<ul class="tags" aria-label="Темы статьи">${p.tags.map(t => { const tp = topicOf(t); return `<li>${tp ? `<a href="${tp.url}" rel="tag">${esc(t)}</a>` : esc(t)}</li>`; }).join('')}</ul>` : ''}
<aside class="svc-cta"><b>Нужна помощь с похожей задачей?</b><p>${svc ? `Услуга по теме статьи: <a href="${svc.url}">${esc(svc.h1)}</a>. ` : ''}<a href="${P}/uslugi/">Все услуги</a></p><a class="btn btn-sm" href="${P}/kontakty/#form">Связаться</a></aside>
${authorBox(esc(AUTHOR))}
${newer || older ? `<nav class="prevnext" aria-label="Соседние статьи">${older ? `<a rel="prev" href="${older.url}"><span>Предыдущая</span>${esc(older.seo_title || older.title)}</a>` : '<span></span>'}${newer ? `<a rel="next" href="${newer.url}"><span>Следующая</span>${esc(newer.seo_title || newer.title)}</a>` : ''}</nav>` : ''}
</div></article>
${related.length ? `<section class="sec sec-line" aria-labelledby="rel"><div class="wrap">${h2('rel', 'Читайте также')}<div class="grid g3 posts">${related.map(r => postCard(r)).join('')}</div></div></section>` : ''}
${ctaBand}` });
}

// ---------- контакты ----------
{ const trail = [HOME, ['Контакты', P + '/kontakty/']];
  page({ file: 'kontakty/index.html', nav: 'kontakty', lastmod, canonOld: OLD + '/expert/',
    title: 'Контакты — ' + AUTHOR, description: 'Telegram и почта для связи с Александром Горчаковым: обсудить диагностику ИТ, стратегию, корпоративный ИИ, интеграцию с госсистемами или роль советника.',
    ld: { '@context': 'https://schema.org', '@graph': [{ '@type': 'ContactPage', '@id': BASE + '/kontakty/', url: BASE + '/kontakty/', name: 'Контакты', inLanguage: 'ru', isPartOf: { '@id': siteId }, mainEntity: { '@id': personId } }, person, website, crumbsLd(trail)] },
    body: `<div class="wrap page-top">${crumbNav(trail)}<h1>Контакты</h1><p class="lead">Напишите Александру в Telegram или на почту.</p></div>
${contactSection('', 'Связаться')}
<section class="sec"><div class="wrap contact"><div>${authorBox(esc(AUTHOR))}</div><div><h2>С чем можно обратиться</h2><ul class="links links-col">${SERVICES.map(o => `<li><a href="${o.url}">${esc(o.name)}</a><span>${esc(o.short)}</span></li>`).join('')}</ul></div></div></section>` }); }

// служебная страница вариантов больше не нужна: варианты перелистываются на главной. Сервер не удаляет файлы, поэтому на её месте заглушка
if (fs.existsSync(path.join(OUT, 'varianty'))) fs.writeFileSync(path.join(OUT, 'varianty', 'index.html'), `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${esc(AUTHOR)}</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${BASE}/"><meta http-equiv="refresh" content="0;url=${P}/"></head><body><a href="${P}/">Варианты баннера теперь на главной</a></body></html>`);

// ---------- 3D-кабинет: копия главной действующего сайта с адресами этой версии ----------
{ const src = path.join(OLD_OUT, 'index.html');
  if (fs.existsSync(src)) { let h = fs.readFileSync(src, 'utf8');
    const swap = [[OLD + '/img/', BASE + '/img/'], [OLD + '/blog/og.png', BASE + '/assets/og.jpg'], [OLD + '/expert/#person', BASE + '/#person'], [OLD + '/#website', BASE + '/#website'],
      [OLD + '/neurogame/', BASE + '/neurogame/'], [OLD + '/expert/', BASE + '/expert/'], [OLD + '/uslugi/', BASE + '/uslugi/'], [OLD + '/keisy/', BASE + '/keisy/'], [OLD + '/blog/', BASE + '/blog/'],
      [OLD + '/', BASE + '/kabinet/'], ['"/sasha/neurogame/"', '"' + P + '/neurogame/"']];
    for (const [a, b] of swap) h = h.split(a).join(b);
    h = h.split('a-nas.ru/sasha/').join(HOST + P + '/'); // оставшиеся упоминания в комментариях
    if (/a-nas\.ru\/sasha\/|["'`]\/sasha\/(?!2)/.test(h) && HOST + P !== 'a-nas.ru/sasha') throw new Error('В копии кабинета остались адреса /sasha/: проверьте список замен');
    fs.mkdirSync(path.join(OUT, 'kabinet'), { recursive: true }); fs.writeFileSync(path.join(OUT, 'kabinet', 'index.html'), h);
    pages.push({ url: BASE + '/kabinet/', lastmod }); } }

// ---------- страница «не найдено» ----------
page({ file: '404.html', index: false, title: 'Страница не найдена — ' + AUTHOR, description: 'Такой страницы нет. Перейдите на главную, к услугам или в блог.',
  ld: { '@context': 'https://schema.org', '@graph': [website] },
  body: `<div class="wrap page-top nf"><h1>Такой страницы нет</h1><p class="lead">Возможно, адрес набран с ошибкой или страница переехала.</p><ul class="links">${NAV.map(n => `<li><a href="${n[2]}">${n[1]}</a></li>`).join('')}</ul></div>` });

// ---------- карта сайта, RSS, файлы для ИИ ----------
const smHead = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), smHead + pages.map(u => `<url><loc>${u.url}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.image ? `<image:image><image:loc>${esc(u.image)}</image:loc></image:image>` : ''}</url>`).join('\n') + '\n</urlset>\n');
const cdata = s => '<![CDATA[' + s.replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
// RSS убран по просьбе владельца 17.11.2026
const llmsHead = `# ${AUTHOR}\n\n> ${OCCUPATION}. ${ROLE}. ${CONTENT.about.join(' ')}\n\nТемы экспертизы: ${TOPICS.join(', ')}.\n\nОпыт в цифрах: ${CONTENT.facts.map(f => f[0] + ' ' + f[1]).join('; ')}.\n`;
fs.writeFileSync(path.join(OUT, 'llms.txt'), `${llmsHead}
## Об эксперте

- [Профиль: компетенции, карьера, услуги и кейсы](${BASE}/expert/)
- [Контакты](${BASE}/kontakty/)

## Услуги

${SERVICES.map(s => `- [${s.h1}](${abs(s.url)}): ${s.lead}`).join('\n')}

## Кейсы

${CASES.map(c => `- [${c.title}](${abs(c.url)}): ${c.text}`).join('\n')}

## Блог

${posts.map(p => `- [${p.title}](${abs(p.url)}): ${p.description}`).join('\n')}

## Прочее

- [Полные тексты сайта одним файлом](${BASE}/llms-full.txt)
- [Все статьи](${BASE}/blog/)
`);
fs.writeFileSync(path.join(OUT, 'llms-full.txt'), `${llmsHead}
## Карьера

${CONTENT.experience.map(x => `- ${x.where}: ${x.what}`).join('\n')}

## Компетенции

${CONTENT.skills.map(s => '- ' + s).join('\n')}

## Услуги

${SERVICES.map(s => `### ${s.h1}\n\nАдрес: ${abs(s.url)}\n\n${s.lead}\n\nКогда это нужно:\n${s.when.map(x => '- ' + x).join('\n')}\n\nЧто вы получите:\n${s.get.map(x => '- ' + x).join('\n')}`).join('\n\n')}

## Кейсы

${CASES.map(c => `- ${c.title} (${c.cat}): ${c.text} ${abs(c.url)}`).join('\n')}

## Статьи блога

${posts.map(p => `### ${p.title}\n\nАдрес: ${abs(p.url)}\nДата: ${p.date}\nАвтор: ${AUTHOR}\nТемы: ${p.tags.join(', ')}\n\n${p.raw.replace(/^## /gm, '#### ').replace(/^### /gm, '##### ')}`).join('\n\n---\n\n')}
`);

warn.forEach(w => console.warn('! ' + w));
console.log('Скопировано файлов кабинета, игры и картинок: ' + copied);
console.log(`Готово (${LIVE ? 'открыт для поиска' : 'пробная версия, закрыта от поиска'}): страниц ${pages.length}, статей ${posts.length}, тем ${TOPIC_PAGES.length}`);
