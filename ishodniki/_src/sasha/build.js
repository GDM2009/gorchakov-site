// Сборка a-nas.ru/sasha: блог (открытые страницы для поиска) + зашифрованный 3D-кабинет.
// Запуск из корня репозитория: node _src/sasha/build.js
// Кабинет открыт без пароля. Первый аргумент (раньше в нём передавали пароль) больше не используется.
const fs = require('fs'), path = require('path'), c = require('crypto');
const SRC = __dirname, OUT = path.join(SRC, '..', '..', 'a-nas.ru', 'sasha');
const BASE = 'https://a-nas.ru/sasha', AUTHOR = 'Александр Горчаков';
const ROLE = 'Эксперт по цифровой трансформации госсектора и финансов';
const TOPICS = ['ИТ-стратегия', 'цифровая трансформация', 'интеграция с государственными системами', 'ГИС ГМП', 'digital banking', 'дистанционное банковское обслуживание', 'корпоративный ИИ', 'RAG', 'LLM', 'информационная безопасность', 'импортозамещение', 'Fractional CIO'];
// Картинки статей: исходник (Higgsfield, 4–5 МБ) указан в шапке статьи. Автоматика GitHub (.github/workflows/sasha-blog.yml)
// скачивает его, сжимает и кладёт в a-nas.ru/sasha/img/blog/<slug>-<ширина>.webp|jpg. Страницы берут картинки оттуда.
// Пока сжатого файла ещё нет (статью только что добавили), подставляется временная ссылка через wsrv.nl.
const IMG_DIR = path.join(OUT, 'img', 'blog');
const pic = (p, w, fmt = 'webp') => { const f = p.slug + '-' + w + '.' + fmt; return fs.existsSync(path.join(IMG_DIR, f)) ? BASE + '/img/blog/' + f : 'https://wsrv.nl/?url=' + encodeURIComponent(p.image) + '&w=' + w + '&output=' + fmt + '&q=78'; };
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const dateText = d => { const [y, m, dd] = d.split('-').map(Number); return dd + ' ' + MONTHS[m - 1] + ' ' + y; };
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const hid = t => t.toLowerCase().split('').map(ch => TR[ch] !== undefined ? TR[ch] : ch).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
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
// ---- статьи
const posts = fs.readdirSync(path.join(SRC, 'blog')).filter(f => f.endsWith('.md')).map(f => {
  const raw = fs.readFileSync(path.join(SRC, 'blog', f), 'utf8'), m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('Нет шапки в ' + f);
  const meta = {}; m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  for (const k of ['title', 'description', 'date', 'slug']) if (!meta[k]) throw new Error('В ' + f + ' нет поля ' + k);
  if (!/^[a-z0-9-]+$/.test(meta.slug)) throw new Error('slug только из латиницы, цифр и дефиса: ' + f);
  return { ...meta, imageAlt: meta.image_alt || meta.title, tags: (meta.tags || '').split(',').map(s => s.trim()).filter(Boolean), html: md(m[2]), dateText: dateText(meta.date), words: m[2].split(/\s+/).length };
}).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

// ---- данные эксперта: берём из кабинета (блок const CONTENT в index.html), чтобы не вести их в двух местах
const CONTENT = (() => { const m = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').match(/const CONTENT = (\{[\s\S]*?\n\});/); if (!m) throw new Error('В index.html нет блока const CONTENT'); return new Function('return ' + m[1])(); })();
const slugify = s => { const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' }; return s.toLowerCase().split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
// Коды подтверждения сайта в Яндекс Вебмастере и Google Search Console: вписать сюда, когда появятся.
const VERIFY = { yandex: '', google: '' };

const CSS = `:root{color-scheme:dark;--bg:#0a0c11;--panel:#111821;--holo:#a6f5e3;--dawn:#ff9a66;--ink:#e8f0f2;--dim:#93a1ad;--line:rgba(166,245,227,.22)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 "Golos Text","Segoe UI",system-ui,sans-serif}
a{color:var(--holo)}:focus-visible{outline:2px solid var(--dawn);outline-offset:2px}
header.top{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;padding:16px 20px;border-bottom:1px solid var(--line)}
header.top .who{font-weight:600;text-decoration:none;color:var(--ink)}header.top nav{display:flex;flex-wrap:wrap;gap:8px 16px;margin-left:auto}
main{max-width:760px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:clamp(26px,5vw,38px);line-height:1.2;margin:0 0 12px;text-wrap:balance}h2{font-size:22px;margin:34px 0 10px;color:var(--holo);text-wrap:balance}h3{font-size:18px;margin:24px 0 8px}
.crumbs{font-size:14px;color:var(--dim);margin:0 0 18px}.crumbs a{color:var(--dim)}
.meta{color:var(--dim);font-size:14px;margin:0 0 26px}.lead{color:var(--dim);margin:0 0 28px}
.list{display:grid;gap:12px;padding:0;margin:0;list-style:none}.list li{border:1px solid var(--line);border-radius:14px;padding:16px 18px;background:var(--panel)}
.list li.pic{display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:start}.list img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:10px;background:#0c1118}@media(max-width:560px){.list li.pic{grid-template-columns:1fr}}
img.hero{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:16px;margin:0 0 26px;background:#0c1118}
.list a{font-size:19px;font-weight:600;text-decoration:none}.list a:hover{text-decoration:underline}.list p{margin:6px 0 0;color:var(--dim);font-size:15px}.list time{font-size:13px;color:var(--dim)}
blockquote{margin:0 0 16px;padding-left:14px;border-left:3px solid var(--dawn);color:var(--dim)}
.author,.cta{margin-top:34px;padding:18px;border:1px solid var(--line);border-radius:14px;background:var(--panel);font-size:15px}.author b,.cta b{display:block;font-size:17px}
.cta{border-color:rgba(255,154,102,.5)}
.toc{border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin:0 0 26px;background:var(--panel);font-size:15px}.toc ol{margin:8px 0 0;padding-left:20px}.toc li{margin:3px 0}
.cards h2.h3{margin:0 0 6px;font-size:18px;color:var(--ink)}.cards a{text-decoration:none}.cards a:hover{text-decoration:underline}.tags a{color:var(--dim);text-decoration:none}.tags a:hover{color:var(--holo)}
main>section>ul:not(.list):not(.tags),main>section>ol{padding-left:22px}main li{margin:4px 0}h2[id],section[id]{scroll-margin-top:16px}
.author{display:flex;gap:14px;align-items:flex-start}.author img{flex:none;width:64px;height:80px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}
.hero-x{display:grid;grid-template-columns:1fr 240px;gap:28px;align-items:start}.portrait{width:100%;height:auto;border-radius:18px;border:1px solid var(--line);box-shadow:0 0 40px rgba(166,245,227,.16)}@media(max-width:640px){.hero-x{grid-template-columns:1fr}.portrait{order:-1;width:160px}}
.go{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin:0 0 6px}.go span{color:var(--dim);font-size:14px}
.btn{display:inline-block;padding:14px 24px;border-radius:12px;background:var(--dawn);color:#1b0e06;font-weight:600;font-size:18px;text-decoration:none;box-shadow:0 0 0 1px rgba(255,154,102,.4),0 8px 30px rgba(255,154,102,.35)}.btn:hover{filter:brightness(1.08);transform:translateY(-1px)}.btn span{color:inherit;font-size:inherit}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:0;margin:20px 0;list-style:none}.facts li{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--panel)}.facts b{display:block;font-size:24px;color:var(--dawn)}.facts span{color:var(--dim);font-size:14px}
.tags{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0;list-style:none}.tags li{border:1px solid var(--line);border-radius:20px;padding:3px 12px;font-size:14px;color:var(--dim)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.cards>*{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--panel)}.cards h3{margin:0 0 6px;font-size:17px}.cards p{margin:0;color:var(--dim);font-size:15px}
footer{max-width:720px;margin:0 auto;padding:0 20px 40px;color:var(--dim);font-size:14px}`;
const EXPERT_URL = BASE + '/expert/', CABINET_URL = BASE + '/', PHOTO = fs.existsSync(path.join(OUT, 'img', 'expert-640.jpg')) ? BASE + '/img/expert-' : '';
const person = { '@type': 'Person', '@id': EXPERT_URL + '#person', name: AUTHOR, jobTitle: ROLE, description: CONTENT.about.join(' '), url: EXPERT_URL, knowsAbout: TOPICS, knowsLanguage: 'ru', ...(PHOTO ? { image: PHOTO + '640.jpg' } : {}) };
const website = { '@type': 'WebSite', '@id': BASE + '/#website', name: 'Александр Горчаков — цифровая трансформация госсектора и финансов', url: CABINET_URL, inLanguage: 'ru', publisher: { '@id': person['@id'] } };
const warn = [];
const page = ({ title, description, url, body, ld, type, image, extraHead = '' }) => {
  if (title.length > 70) warn.push('Заголовок длиннее 70 знаков (' + title.length + '), в поиске обрежется: ' + url);
  if (description.length > 170) warn.push('Описание длиннее 170 знаков (' + description.length + '): ' + url);
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta name="author" content="${AUTHOR}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">${VERIFY.yandex ? `\n<meta name="yandex-verification" content="${esc(VERIFY.yandex)}">` : ''}${VERIFY.google ? `\n<meta name="google-site-verification" content="${esc(VERIFY.google)}">` : ''}
<script>if(location.protocol==="http:"&&location.hostname==="a-nas.ru")location.replace("https://a-nas.ru"+location.pathname+location.search+location.hash)</script>
<link rel="canonical" href="${url}"><link rel="icon" href="${BASE}/img/favicon.svg" type="image/svg+xml"><link rel="icon" href="${BASE}/img/favicon-120.png" sizes="120x120" type="image/png"><link rel="apple-touch-icon" href="${BASE}/img/favicon-180.png"><link rel="alternate" type="application/rss+xml" title="Блог Александра Горчакова" href="${BASE}/blog/rss.xml">
<meta property="og:type" content="${type}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}"><meta property="og:site_name" content="Александр Горчаков"><meta property="og:locale" content="ru_RU">
<meta property="og:image" content="${image ? esc(image) : BASE + '/blog/og.png'}"><meta name="twitter:card" content="summary_large_image">${extraHead}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script></head>
<body><header class="top"><a class="who" href="${EXPERT_URL}">${AUTHOR}</a><nav aria-label="Основная"><a href="${EXPERT_URL}">Об эксперте</a><a href="${BASE}/uslugi/">Услуги</a><a href="${BASE}/keisy/">Кейсы</a><a href="${BASE}/blog/">Блог</a><a href="${CABINET_URL}">Кабинет</a></nav></header>
${body}
<footer>© ${AUTHOR}. ${ROLE}. <a href="${EXPERT_URL}">Об эксперте</a> · <a href="${BASE}/uslugi/">Услуги</a> · <a href="${BASE}/keisy/">Кейсы</a> · <a href="${BASE}/blog/">Блог</a> · <a href="${BASE}/blog/rss.xml">RSS</a></footer></body></html>`; };
const postCard = p => `<li${p.image ? ' class="pic"' : ''}>${p.image ? `<img src="${esc(pic(p, 440))}" alt="" width="440" height="249" loading="lazy">` : ''}<div><time datetime="${p.date}">${p.dateText}</time><br><a href="${BASE}/blog/${p.slug}/">${esc(p.title)}</a><p>${esc(p.description)}</p></div></li>`;
const shared = (a, b) => a.tags.filter(t => b.tags.includes(t)).length;
// ---- отдельные страницы услуг и страница кейсов: каждая услуга получает свой адрес под свои запросы
// Тексты «когда нужно» и «что получите» — черновик на основе резюме и статей; их стоит выверить с Александром.
const SERVICE_PAGES = [
  { slug: 'ekspress-diagnostika-it', seo: 'Экспресс-диагностика ИТ: аудит за 2–3 недели', h1: 'Экспресс-диагностика ИТ',
    lead: 'Независимый взгляд на ИТ компании за 2–3 недели: где теряются деньги и сроки, какие риски уже созрели и с чего начинать.',
    when: ['ИТ-бюджет растёт, а бизнес не видит результата', 'Крупный проект буксует, и непонятно, кто в этом виноват', 'Компания зависит от одного подрядчика или от нескольких ключевых людей', 'Нужно быстро понять состояние ИТ перед сменой руководителя или стратегии'],
    get: ['Карту рисков с приоритетами: что чинить сейчас, а что может подождать', 'Оценку архитектуры, команды, процессов и отношений с подрядчиками', 'Список первых шагов на ближайший квартал'],
    cases: [0, 4], posts: ['proekty-lomayutsya-na-stykah', 'svoya-razrabotka-ili-podryadchik'] },
  { slug: 'it-strategiya', seo: 'ИТ-стратегия и дорожная карта цифровой трансформации', h1: 'ИТ-стратегия и дорожная карта',
    lead: 'Целевая архитектура, бюджет и план перехода: документ, по которому ИТ и бизнес движутся в одну сторону.',
    when: ['ИТ развивается от запроса к запросу, без общего плана', 'Нужно обосновать ИТ-бюджет перед собственником или советом директоров', 'Требования регуляторов заставляют менять инфраструктуру и программное обеспечение', 'Компания готовится к росту, слиянию или выходу в новый сегмент'],
    get: ['Целевую архитектуру и модель данных', 'Дорожную карту по этапам с оценкой бюджета', 'План импортозамещения, встроенный в общую стратегию, а не идущий отдельно'],
    cases: [0, 2], posts: ['importozameshchenie-i-ib-ukazy-166-250', 'proekty-lomayutsya-na-stykah'] },
  { slug: 'fractional-cio', seo: 'Fractional CIO: ИТ-директор на часть времени', h1: 'Fractional и Interim CIO: ИТ-директор на часть времени',
    lead: 'Опытный ИТ-директор в команде без найма в штат: на часть недели или на период перемен.',
    when: ['Компании нужен уровень ИТ-директора, но полной загрузки для него нет', 'ИТ-директор ушёл, а замену ещё ищут', 'Собственнику нужен человек, который говорит с подрядчиками и разработчиками на одном языке', 'Идёт трансформация, и ей нужен руководитель на время проекта'],
    get: ['Управление ИТ-функцией, бюджетом и подрядчиками', 'Выстроенные процессы и понятную отчётность для руководства', 'Подготовку или подбор постоянного руководителя, если это цель'],
    cases: [0, 4], posts: ['svoya-razrabotka-ili-podryadchik', 'proekty-lomayutsya-na-stykah'] },
  { slug: 'sobstvennaya-razrabotka', seo: 'Собственная разработка с нуля: команда и процессы', h1: 'Собственная разработка с нуля',
    lead: 'Команда, процессы, DevOps и DevSecOps: как построить ИТ-производство внутри компании и не утонуть на старте.',
    when: ['Цифровой продукт стал ядром бизнеса, а знание о нём остаётся у подрядчика', 'Требования меняются каждую неделю, и внешняя команда не успевает', 'Много интеграций с ведомствами, банками и партнёрами', 'Регулятор требует контроля над кодом, доступами и поставкой программного обеспечения'],
    get: ['Расчёт: окупится ли своя команда и в каком составе', 'План перехода от подрядчика к собственной разработке без остановки работы', 'Платформу сборки и развёртывания, метрики производства с первого месяца'],
    cases: [0], posts: ['svoya-razrabotka-ili-podryadchik'] },
  { slug: 'korporativnyi-ii', seo: 'Корпоративный ИИ в закрытом контуре: внедрение LLM и RAG', h1: 'Корпоративный ИИ в закрытом контуре',
    lead: 'Языковые модели и поиск по внутренним документам на собственных серверах, с учётом безопасности и требований регуляторов.',
    when: ['Сотрудники уже вставляют рабочие документы в публичные чат-боты', 'Данные нельзя выносить наружу: персональные данные, тайна, объекты КИИ', 'Ключевых экспертов завалили одними и теми же вопросами', 'Руководство ждёт ИИ, а служба безопасности против'],
    get: ['Выбор первого процесса, на котором польза будет видна', 'Архитектуру: хранилище документов, поиск, модель и интерфейс внутри контура', 'Наследование прав доступа, ответы со ссылками на источники и набор контрольных вопросов'],
    cases: [1], posts: ['korporativnyi-ii-v-zakrytom-konture'] },
  { slug: 'integraciya-s-gossistemami', seo: 'Интеграция с госсистемами: Госуслуги, ГИС ГМП, ведомства', h1: 'Интеграция с государственными системами',
    lead: 'Госуслуги, ГИС ГМП, обмен с ведомствами и банками: проектирование и запуск интеграций, которые выдерживают изменения правил.',
    when: ['Продукт или услуга должны работать через Госуслуги или обмениваться данными с ведомствами', 'Нужно принимать и сверять платежи через ГИС ГМП', 'Интеграция сделана, но ломается при каждом изменении форматов', 'Проект идёт с несколькими подрядчиками, и за стыки никто не отвечает'],
    get: ['Архитектуру интеграций и контракты обмена', 'План, в котором самые рискованные интеграции делаются первыми', 'Правила сопровождения: кто и как реагирует на изменения на стороне государства'],
    cases: [3, 2, 0], posts: ['integraciya-s-gossistemami', 'proekty-lomayutsya-na-stykah'] },
  { slug: 'tech-due-diligence', seo: 'Tech due diligence: оценка ИТ и команды перед сделкой', h1: 'Tech due diligence',
    lead: 'Оценка ИТ-актива и команды перед сделкой, инвестицией или запуском: что на самом деле покупается и сколько стоит довести это до ума.',
    when: ['Инвестор или покупатель хочет понять реальное состояние продукта', 'Нужно оценить зависимость от подрядчиков, лицензий и отдельных людей', 'Перед запуском крупного проекта требуется независимая экспертиза'],
    get: ['Оценку архитектуры, кода, инфраструктуры и процессов', 'Список рисков с оценкой стоимости их устранения', 'Вывод, понятный людям без технического образования'],
    cases: [5, 4], posts: ['proekty-lomayutsya-na-stykah', 'importozameshchenie-i-ib-ukazy-166-250'] },
  { slug: 'sovetnik', seo: 'Советник по ИТ и цифровой трансформации', h1: 'Советник по ИТ и цифровой трансформации',
    lead: 'Сопровождение руководителя или совета директоров: второе мнение по ИТ-решениям от человека, который был заказчиком, вендором и интегратором.',
    when: ['Руководителю нужен независимый взгляд на предложения ИТ-директора и подрядчиков', 'Совет директоров принимает решения о цифровых проектах и хочет понимать риски', 'Вендор выходит в госсектор и ищет экспертизу изнутри'],
    get: ['Разбор ключевых решений до того, как на них потрачены деньги', 'Участие в переговорах с подрядчиками и вендорами', 'Наставничество для ИТ-руководителя'],
    cases: [0, 5], posts: ['proekty-lomayutsya-na-stykah', 'svoya-razrabotka-ili-podryadchik'] }
].map((s, i) => ({ ...s, name: CONTENT.services[i][0], short: CONTENT.services[i][1], url: BASE + '/uslugi/' + s.slug + '/' }));
if (SERVICE_PAGES.length !== CONTENT.services.length) throw new Error('Число услуг в CONTENT и в SERVICE_PAGES не совпадает');
const CASES = CONTENT.projects.map(c => ({ ...c, id: slugify(c.title), url: BASE + '/keisy/#' + slugify(c.title) }));
const POST_SERVICE = { 'proekty-lomayutsya-na-stykah': 0, 'importozameshchenie-i-ib-ukazy-166-250': 1, 'svoya-razrabotka-ili-podryadchik': 3, 'korporativnyi-ii-v-zakrytom-konture': 4, 'integraciya-s-gossistemami': 5 };
const crumbs = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: it[1] })) });
const crumbNav = items => `<nav class="crumbs" aria-label="Хлебные крошки">${items.map((it, i) => i < items.length - 1 ? `<a href="${it[1]}">${esc(it[0])}</a>` : esc(it[0])).join(' → ')}</nav>`;
const goBtn = `<p class="go"><a class="btn" href="${CABINET_URL}">Войти в интерактивный кабинет <span aria-hidden="true">→</span></a><span>Кейсы, услуги и контакты в виде рабочего стола.</span></p>`;
// страницы услуг
for (const s of SERVICE_PAGES) {
  const rel = s.posts.map(sl => posts.find(p => p.slug === sl)).filter(Boolean), path3 = [[AUTHOR, EXPERT_URL], ['Услуги', BASE + '/uslugi/'], [s.h1, s.url]];
  const description = s.lead.length > 165 ? s.lead.slice(0, 162) + '…' : s.lead;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Service', '@id': s.url + '#service', name: s.h1, serviceType: s.name, description: s.lead, url: s.url, areaServed: { '@type': 'Country', name: 'Россия' }, provider: { '@id': person['@id'] }, audience: { '@type': 'BusinessAudience', name: 'Руководители ИТ, собственники и советы директоров' } },
    person, website, crumbs(path3)] };
  const body = `<main>${crumbNav(path3)}<h1>${esc(s.h1)}</h1><p class="lead">${esc(s.lead)}</p>
<section aria-labelledby="kogda"><h2 id="kogda">Когда это нужно</h2><ul>${s.when.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
<section aria-labelledby="chto"><h2 id="chto">Что вы получите</h2><ul>${s.get.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
<section aria-labelledby="opyt"><h2 id="opyt">Опыт по теме</h2><div class="cards">${s.cases.map(i => CASES[i]).map(c => `<article><h3><a href="${c.url}">${esc(c.title)}</a></h3><p>${esc(c.text)}</p></article>`).join('')}</div></section>
${rel.length ? `<section aria-labelledby="stati"><h2 id="stati">Статьи по теме</h2><ul class="list">${rel.map(postCard).join('\n')}</ul></section>` : ''}
<aside class="author">${PHOTO ? `<img src="${PHOTO}160.webp" alt="${AUTHOR}" width="64" height="80" loading="lazy">` : ''}<div><b>Услугу оказывает ${AUTHOR}</b>${ROLE}. ${esc(CONTENT.about[0])} <a href="${EXPERT_URL}">Об эксперте</a></div></aside>
<section aria-labelledby="eshe"><h2 id="eshe">Другие услуги</h2><ul class="tags">${SERVICE_PAGES.filter(o => o !== s).map(o => `<li><a href="${o.url}">${esc(o.name)}</a></li>`).join('')}</ul></section>
${goBtn}</main>`;
  fs.mkdirSync(path.join(OUT, 'uslugi', s.slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'uslugi', s.slug, 'index.html'), page({ title: ((t) => (t + ' — ' + AUTHOR).length <= 70 ? t + ' — ' + AUTHOR : t)(s.seo), description, url: s.url, body, ld, type: 'website', image: PHOTO ? PHOTO + '640.jpg' : '' }));
}
// список услуг
{ const url = BASE + '/uslugi/', path2 = [[AUTHOR, EXPERT_URL], ['Услуги', url]];
  const description = 'Услуги Александра Горчакова: диагностика ИТ, ИТ-стратегия, fractional CIO, своя разработка, корпоративный ИИ, интеграция с госсистемами, due diligence.';
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ItemList', '@id': url + '#list', name: 'Услуги', itemListElement: SERVICE_PAGES.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.h1, url: s.url })) }, person, website, crumbs(path2)] };
  const body = `<main>${crumbNav(path2)}<h1>Услуги: ИТ-стратегия, цифровая трансформация, корпоративный ИИ</h1><p class="lead">Восемь форматов работы: от двухнедельной диагностики до сопровождения руководителя. Все опираются на 20+ лет проектов для государства и финансов.</p>
<div class="cards">${SERVICE_PAGES.map(s => `<article><h2 class="h3"><a href="${s.url}">${esc(s.h1)}</a></h2><p>${esc(s.lead)}</p></article>`).join('')}</div>
${goBtn}</main>`;
  fs.writeFileSync(path.join(OUT, 'uslugi', 'index.html'), page({ title: 'Услуги ИТ-директора и архитектора трансформации — ' + AUTHOR, description, url, body, ld, type: 'website' })); }
// кейсы: одна страница, у каждого кейса свой якорь
{ const url = BASE + '/keisy/', path2 = [[AUTHOR, EXPERT_URL], ['Кейсы', url]];
  const description = 'Кейсы Александра Горчакова: цифровая экосистема нотариата, корпоративный ИИ, исполнение бюджета, ГИС ГМП, интернет-банк для юрлиц, CORREQTS.';
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ItemList', '@id': url + '#list', name: 'Кейсы', itemListElement: CASES.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: c.url })) }, person, website, crumbs(path2)] };
  const body = `<main>${crumbNav(path2)}<h1>Кейсы: цифровые системы для государства и финансов</h1><p class="lead">Проекты, в которых ${AUTHOR} участвовал как заказчик, вендор или интегратор.</p>
${CASES.map((c, i) => { const sv = SERVICE_PAGES.filter(s => s.cases.includes(i)); const ps = posts.filter(p => sv.some(s => s.posts.includes(p.slug))).slice(0, 2);
  return `<section id="${c.id}" aria-labelledby="h-${c.id}"><h2 id="h-${c.id}">${esc(c.title)}</h2><p>${esc(c.text)}</p><p class="meta">Направление: ${esc(c.cat)}${sv.length ? '. Услуги по теме: ' + sv.map(s => `<a href="${s.url}">${esc(s.name)}</a>`).join(', ') : ''}${ps.length ? '. Статьи: ' + ps.map(p => `<a href="${BASE}/blog/${p.slug}/">${esc(p.seo_title || p.title)}</a>`).join(', ') : ''}.</p></section>`; }).join('\n')}
${goBtn}</main>`;
  fs.mkdirSync(path.join(OUT, 'keisy'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'keisy', 'index.html'), page({ title: 'Кейсы: госсектор, финансы, корпоративный ИИ — ' + AUTHOR, description, url, body, ld, type: 'website' })); }
// страница «не найдено»
fs.writeFileSync(path.join(OUT, '404.html'), page({ title: 'Страница не найдена — ' + AUTHOR, description: 'Такой страницы нет. Перейдите к профилю эксперта, услугам или блогу.', url: EXPERT_URL, type: 'website', ld: { '@context': 'https://schema.org', '@graph': [website] },
  body: `<main><h1>Такой страницы нет</h1><p class="lead">Возможно, адрес набран с ошибкой или страница переехала.</p><ul><li><a href="${EXPERT_URL}">Об эксперте</a></li><li><a href="${BASE}/uslugi/">Услуги</a></li><li><a href="${BASE}/keisy/">Кейсы</a></li><li><a href="${BASE}/blog/">Блог</a></li></ul></main>` }).replace('content="index,follow,max-snippet:-1,max-image-preview:large"', 'content="noindex,follow"').replace(/<link rel="canonical"[^>]*>/, ''));

fs.rmSync(path.join(OUT, 'blog'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
if (fs.existsSync(path.join(SRC, 'og.png'))) fs.copyFileSync(path.join(SRC, 'og.png'), path.join(OUT, 'blog', 'og.png'));
// ---- статьи
for (const p of posts) {
  const url = `${BASE}/blog/${p.slug}/`, minutes = Math.max(1, Math.round(p.words / 180));
  const toc = [...p.html.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map(m => [m[1], m[2].replace(/<[^>]+>/g, '')]);
  const svc = SERVICE_PAGES[POST_SERVICE[p.slug]];
  const related = posts.filter(o => o !== p).sort((a, b) => shared(b, p) - shared(a, p) || b.date.localeCompare(a.date)).slice(0, 3);
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', '@id': url + '#article', headline: p.title, description: p.description, datePublished: p.date + 'T09:00:00+03:00', dateModified: (p.updated || p.date) + 'T09:00:00+03:00', inLanguage: 'ru', url, mainEntityOfPage: url, keywords: p.tags.join(', '), articleSection: p.tags[0] || 'ИТ', wordCount: p.words, timeRequired: 'PT' + minutes + 'M', image: p.image ? [pic(p, 1200, 'jpg')] : [BASE + '/blog/og.png'], author: { '@id': person['@id'] }, publisher: { '@id': person['@id'] }, isPartOf: { '@id': BASE + '/blog/#blog' } },
    person, website,
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: AUTHOR, item: EXPERT_URL }, { '@type': 'ListItem', position: 2, name: 'Блог', item: BASE + '/blog/' }, { '@type': 'ListItem', position: 3, name: p.title, item: url }] }] };
  const body = `<main><nav class="crumbs" aria-label="Хлебные крошки"><a href="${EXPERT_URL}">${AUTHOR}</a> → <a href="${BASE}/blog/">Блог</a></nav>
<article>${p.image ? `<img class="hero" src="${esc(pic(p, 1200))}" srcset="${esc(pic(p, 720))} 720w, ${esc(pic(p, 1200))} 1200w" sizes="(max-width: 760px) 100vw, 680px" alt="${esc(p.imageAlt)}" width="1200" height="679" fetchpriority="high">` : ''}<h1>${esc(p.title)}</h1><p class="meta"><time datetime="${p.date}">${p.dateText}</time> · <a href="${EXPERT_URL}">${AUTHOR}</a> · ${minutes} мин чтения${p.tags.length ? ' · ' + p.tags.map(esc).join(', ') : ''}</p>
${toc.length >= 3 ? `<nav class="toc" aria-label="Содержание"><b>Содержание</b><ol>${toc.map(t => `<li><a href="#${t[0]}">${t[1]}</a></li>`).join('')}</ol></nav>` : ''}
${p.html}
<aside class="cta"><b>Нужна помощь с похожей задачей?</b>${svc ? `Услуга по теме статьи: <a href="${svc.url}">${esc(svc.h1)}</a>. ` : ''}<a href="${BASE}/uslugi/">Все услуги Александра Горчакова</a></aside>
<aside class="author">${PHOTO ? `<img src="${PHOTO}160.webp" alt="${AUTHOR}" width="64" height="80" loading="lazy">` : ''}<div><b>${AUTHOR}</b>${ROLE}. ${esc(CONTENT.about[0])} <a href="${EXPERT_URL}">Подробнее об эксперте</a></div></aside></article>
${related.length ? `<section aria-labelledby="rel"><h2 id="rel">Читайте также</h2><ul class="list">${related.map(postCard).join('\n')}</ul></section>` : ''}</main>`;
  fs.mkdirSync(path.join(OUT, 'blog', p.slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'blog', p.slug, 'index.html'), page({ title: ((t) => (t + ' — ' + AUTHOR).length <= 70 ? t + ' — ' + AUTHOR : t)(p.seo_title || p.title), description: p.description, url, body, ld, type: 'article', image: p.image ? pic(p, 1200, 'jpg') : '', extraHead: `<meta property="article:published_time" content="${p.date}T09:00:00+03:00"><meta property="article:author" content="${AUTHOR}">${p.tags.map(t => `<meta property="article:tag" content="${esc(t)}">`).join('')}` }));
}
// ---- список блога
{ const url = BASE + '/blog/', description = 'Блог Александра Горчакова: ИТ-стратегия, цифровая трансформация госсектора и финансов, интеграция с госсистемами, корпоративный ИИ.';
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Blog', '@id': url + '#blog', name: 'Блог Александра Горчакова', description, url, inLanguage: 'ru', author: { '@id': person['@id'] }, blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${BASE}/blog/${p.slug}/`, datePublished: p.date })) },
    person, website,
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: AUTHOR, item: EXPERT_URL }, { '@type': 'ListItem', position: 2, name: 'Блог', item: url }] }] };
  const body = `<main><nav class="crumbs" aria-label="Хлебные крошки"><a href="${EXPERT_URL}">${AUTHOR}</a> → Блог</nav><h1>Блог Александра Горчакова</h1><p class="lead">${ROLE}. Практика ИТ-стратегии, госсистем, финтеха и корпоративного ИИ: задачи, решения и результаты.</p>
<ul class="list">${posts.map(postCard).join('\n')}</ul></main>`;
  fs.writeFileSync(path.join(OUT, 'blog', 'index.html'), page({ title: 'Блог Александра Горчакова: ИТ-стратегия, госИТ, финтех, ИИ', description, url, body, ld, type: 'website' })); }
// ---- профиль эксперта (/sasha/expert/): открытая страница с резюме. Главная раздела (/sasha/) — 3D-кабинет
{ const services = CONTENT.services.map(s => ({ name: s[0], text: s[1], id: slugify(s[0]) }));
  const career = CONTENT.experience.map(x => ({ ...x, when: '' }));
  const description = 'Александр Горчаков — ИТ-директор и архитектор цифровой трансформации. 20+ лет: Минфин и Казначейство, ГИС ГМП, банки, нотариат. Услуги и кейсы.';
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ProfilePage', '@id': EXPERT_URL, url: EXPERT_URL, name: AUTHOR, inLanguage: 'ru', mainEntity: { '@id': person['@id'] }, isPartOf: { '@id': website['@id'] } },
    { ...person, hasOccupation: { '@type': 'Occupation', name: 'ИТ-директор, архитектор цифровой трансформации', skills: CONTENT.skills.join(', ') }, makesOffer: SERVICE_PAGES.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', '@id': s.url + '#service', name: s.h1, description: s.lead, url: s.url, areaServed: 'RU', provider: { '@id': person['@id'] } } })) },
    website,
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: AUTHOR, item: EXPERT_URL }] }] };
  const body = `<main><div class="hero-x"><div><h1>${AUTHOR}: цифровая трансформация госсектора и финансов</h1>
<p class="lead">ИТ-директор и архитектор цифровой трансформации. ${CONTENT.about.map(esc).join(' ')}</p></div>${PHOTO ? `<img class="portrait" src="${PHOTO}640.webp" srcset="${PHOTO}320.webp 320w, ${PHOTO}640.webp 640w" sizes="(max-width: 640px) 160px, 240px" alt="${AUTHOR}, ИТ-директор и архитектор цифровой трансформации" width="640" height="800" fetchpriority="high">` : ''}</div>
<p class="go"><a class="btn" href="${CABINET_URL}">Войти в интерактивный кабинет <span aria-hidden="true">→</span></a><span>Рабочий стол с кейсами, услугами и статьями.</span></p>
<ul class="facts">${CONTENT.facts.map(f => `<li><b>${esc(f[0])}</b><span>${esc(f[1])}</span></li>`).join('')}</ul>
<section aria-labelledby="komp"><h2 id="komp">Компетенции</h2><ul class="tags">${CONTENT.skills.map(s => `<li>${esc(s)}</li>`).join('')}</ul></section>
<section aria-labelledby="uslugi"><h2 id="uslugi">Услуги</h2><div class="cards">${SERVICE_PAGES.map(s => `<article><h3><a href="${s.url}">${esc(s.name)}</a></h3><p>${esc(s.short)}</p></article>`).join('')}</div><p><a href="${BASE}/uslugi/">Подробнее об услугах</a></p></section>
<section aria-labelledby="keisy"><h2 id="keisy">Кейсы</h2><div class="cards">${CASES.map(c => `<article><h3><a href="${c.url}">${esc(c.title)}</a></h3><p>${esc(c.text)}</p></article>`).join('')}</div></section>
<section aria-labelledby="karera"><h2 id="karera">Карьера</h2><div class="cards">${career.map(x => `<article><h3>${esc(x.where)}</h3><p>${x.when ? esc(x.when) + '. ' : ''}${esc(x.what)}</p></article>`).join('')}</div></section>
<section aria-labelledby="stati"><h2 id="stati">Свежие статьи</h2><ul class="list">${posts.slice(0, 3).map(postCard).join('\n')}</ul><p><a href="${BASE}/blog/">Все статьи блога</a></p></section>
<aside class="cta"><b>Интерактивный кабинет</b>Кейсы, услуги и статьи в виде рабочего стола будущего. <a href="${CABINET_URL}">Войти в кабинет</a>.</aside></main>`;
  fs.mkdirSync(path.join(OUT, 'expert'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'expert', 'index.html'), page({ title: 'Александр Горчаков — ИТ-директор, цифровая трансформация', description, url: EXPERT_URL, body, ld, type: 'profile', image: PHOTO ? PHOTO + '640.jpg' : '', extraHead: '<meta property="profile:first_name" content="Александр"><meta property="profile:last_name" content="Горчаков">' })); }
// ---- карты сайта, RSS, файл для ИИ
const lastmod = posts[0] ? posts[0].date : '';
const smUrl = (loc, mod, img) => `<url><loc>${loc}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}${img ? `<image:image><image:loc>${esc(img)}</image:loc></image:image>` : ''}</url>`;
const smHead = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
const smPosts = posts.map(p => smUrl(`${BASE}/blog/${p.slug}/`, p.updated || p.date, p.image ? pic(p, 1200, 'jpg') : '')).join('\n');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), smHead + smUrl(CABINET_URL, lastmod) + '\n' + smUrl(EXPERT_URL, lastmod) + '\n' + smUrl(BASE + '/uslugi/', lastmod) + '\n' + SERVICE_PAGES.map(s => smUrl(s.url, lastmod)).join('\n') + '\n' + smUrl(BASE + '/keisy/', lastmod) + '\n' + smUrl(BASE + '/blog/', lastmod) + '\n' + smPosts + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'blog', 'sitemap.xml'), smHead + smUrl(BASE + '/blog/', lastmod) + '\n' + smPosts + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'blog', 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Блог Александра Горчакова</title><link>${BASE}/blog/</link><atom:link href="${BASE}/blog/rss.xml" rel="self" type="application/rss+xml"/><description>${esc(ROLE)}</description><language>ru</language>\n${posts.map(p => `<item><title>${esc(p.title)}</title><link>${BASE}/blog/${p.slug}/</link><guid>${BASE}/blog/${p.slug}/</guid><pubDate>${new Date(p.date + 'T09:00:00+03:00').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}\n</channel></rss>\n`);
fs.writeFileSync(path.join(OUT, 'llms.txt'), `# ${AUTHOR}\n\n> ${ROLE}. ${CONTENT.about.join(' ')} Цифровая экосистема нотариата на 30 000+ пользователей, корпоративный ИИ (RAG, LLM) в закрытом контуре.\n\nТемы экспертизы: ${TOPICS.join(', ')}.\n\n## Об эксперте\n\n- [Профиль, услуги, кейсы и карьера](${EXPERT_URL})\n\n## Услуги\n\n${SERVICE_PAGES.map(s => `- [${s.h1}](${s.url}): ${s.lead}`).join('\n')}\n\n## Кейсы\n\n${CASES.map(c => `- [${c.title}](${c.url}): ${c.text}`).join('\n')}\n\n## Блог\n\n${posts.map(p => `- [${p.title}](${BASE}/blog/${p.slug}/): ${p.description}`).join('\n')}\n\n## Прочее\n\n- [Все статьи](${BASE}/blog/)\n- [RSS](${BASE}/blog/rss.xml)\n- [Карта сайта](${BASE}/sitemap.xml)\n`);
warn.forEach(w => console.warn('! ' + w));
// ---- кабинеты: подставляем список статей и шифруем. A — сцена, нарисованная кодом; B — фотосцена из Higgsfield.
const blogJson = JSON.stringify(posts.map(p => ({ slug: p.slug, title: p.title, description: p.description, dateText: p.dateText, html: p.html, image: p.image ? pic(p, 1200) : '', thumb: p.image ? pic(p, 440) : '', imageAlt: p.imageAlt }))).replace(/</g, '\\u003c');
// файлы первой загрузки «Нейроигры»: список путей записан один раз, размеры берём с диска при каждой сборке
const gameDir = path.join(OUT, 'neurogame'), gameList = path.join(SRC, 'neurogame-first-load.json');
const gameFiles = fs.existsSync(gameList) ? JSON.parse(fs.readFileSync(gameList, 'utf8')) : [];
const mainJs = (fs.existsSync(path.join(gameDir, 'index.html')) ? fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8').match(/src="\.\/(assets\/index-[^"]+\.js)"/) : null);
const gameSet = [...new Set([...(mainJs ? [mainJs[1]] : []), ...gameFiles.filter(f => !/^assets\/index-.*\.js$/.test(f) || !mainJs)])];
const gameJson = JSON.stringify(gameSet.filter(f => fs.existsSync(path.join(gameDir, f))).map(f => [f, fs.statSync(path.join(gameDir, f)).size]));
function cabinet(srcName, outDir, plainCopy) {
  let html = fs.readFileSync(path.join(SRC, srcName), 'utf8');
  if (!html.includes('const BLOG = [];')) throw new Error('В ' + srcName + ' нет строки const BLOG = [];');
  html = html.replace('const BLOG = [];', () => 'const BLOG = ' + blogJson + ';').replace('const GAME_FILES = [];', () => 'const GAME_FILES = ' + gameJson + ';');
  // кабинет — главная страница раздела (/sasha/), открыт для поиска. Его окна собирает скрипт, поэтому в <head> кладём описание и разметку,
  // а в <noscript> — обычный текст со ссылками на открытые страницы: его видят поисковики и браузеры без скриптов
  const cabTitle = 'Александр Горчаков — кабинет ИТ-директора: услуги, кейсы, блог', cabDesc = 'Интерактивный 3D-кабинет Александра Горчакова, ИТ-директора и архитектора цифровой трансформации: кейсы, услуги, карьера, блог и игра «Нейрогонка».';
  const cabLd = { '@context': 'https://schema.org', '@graph': [website, person, { '@type': 'WebPage', '@id': CABINET_URL, url: CABINET_URL, name: cabTitle, description: cabDesc, inLanguage: 'ru', isPartOf: { '@id': website['@id'] }, about: { '@id': person['@id'] } }] };
  const head = `<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(cabDesc)}"><meta name="author" content="${AUTHOR}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">${VERIFY.yandex ? `\n<meta name="yandex-verification" content="${esc(VERIFY.yandex)}">` : ''}${VERIFY.google ? `\n<meta name="google-site-verification" content="${esc(VERIFY.google)}">` : ''}
<link rel="canonical" href="${CABINET_URL}"><link rel="icon" href="${BASE}/img/favicon-120.png" sizes="120x120" type="image/png"><link rel="apple-touch-icon" href="${BASE}/img/favicon-180.png"><link rel="alternate" type="application/rss+xml" title="Блог Александра Горчакова" href="${BASE}/blog/rss.xml">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(cabTitle)}"><meta property="og:description" content="${esc(cabDesc)}"><meta property="og:url" content="${CABINET_URL}"><meta property="og:site_name" content="Александр Горчаков"><meta property="og:locale" content="ru_RU"><meta property="og:image" content="${BASE}/blog/og.png"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(cabLd).replace(/</g, '\\u003c')}</script>`;
  const vp = '<meta name="viewport" content="width=device-width, initial-scale=1">';
  if (!html.includes(vp) || !html.includes('<title>Кабинет Александра Горчакова</title>') || !html.includes('<body>')) throw new Error('В ' + srcName + ' изменилась шапка: проверьте вставку описания');
  const nos = `<noscript><div style="max-width:720px;margin:0 auto;padding:32px 20px;font:16px/1.6 system-ui,sans-serif;color:#e8f0f2;height:100vh;overflow:auto"><h1>${AUTHOR}</h1><p>${ROLE}. ${esc(CONTENT.about.join(' '))}</p><p>Кабинет работает со скриптами. Без них откройте обычные страницы:</p><ul><li><a href="${EXPERT_URL}" style="color:#a6f5e3">Об эксперте: резюме, опыт, карьера</a></li><li><a href="${BASE}/uslugi/" style="color:#a6f5e3">Услуги</a>: ${SERVICE_PAGES.map(x => `<a href="${x.url}" style="color:#a6f5e3">${esc(x.h1)}</a>`).join(', ')}</li><li><a href="${BASE}/keisy/" style="color:#a6f5e3">Кейсы</a></li><li><a href="${BASE}/blog/" style="color:#a6f5e3">Блог</a>: ${posts.map(x => `<a href="${BASE}/blog/${x.slug}/" style="color:#a6f5e3">${esc(x.title)}</a>`).join(', ')}</li></ul></div></noscript>`;
  html = html.replace(vp, () => head).replace('<title>Кабинет Александра Горчакова</title>', () => '<title>' + esc(cabTitle) + '</title>').replace('<body>', () => '<body>\n' + nos);
  if (plainCopy) fs.writeFileSync(plainCopy, html); // необязательно: копия для предпросмотра
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}
cabinet('index.html', OUT, process.argv[3]);
// старые адреса: сервер не удаляет файлы, поэтому на месте прежних страниц лежат заглушки с переходом (плюс правила в a-nas.ru/.htaccess)
for (const old of ['kabinet', 'b']) { fs.mkdirSync(path.join(OUT, old), { recursive: true });
  fs.writeFileSync(path.join(OUT, old, 'index.html'), `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Кабинет Александра Горчакова</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${CABINET_URL}"><meta http-equiv="refresh" content="0;url=${CABINET_URL}"><script>location.replace(${JSON.stringify(CABINET_URL)})</script></head><body><a href="${CABINET_URL}">Кабинет переехал на главную</a></body></html>`); }
if (fs.existsSync(path.join(SRC, 'index-b.html'))) cabinet('index-b.html', path.join(OUT, 'b'), process.argv[4]);
console.log('Готово: статей ' + posts.length);
