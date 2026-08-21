const fs = require('fs');

const root = __dirname + '/../';
const src = fs.readFileSync(root + 'form1.html', 'utf8');

const sectionRe = /(?:<!--[^\n]*-->\n)?<section[\s\S]*?<\/section>/g;
const blocks = src.match(sectionRe);
const firstIdx = src.indexOf(blocks[0]);
const lastBlock = blocks[blocks.length - 1];
const lastEnd = src.indexOf(lastBlock) + lastBlock.length;
const prefix = src.slice(0, firstIdx);
const suffix = src.slice(lastEnd);

const keyOf = b => {
  const id = b.match(/<section[^>]*id="([^"]+)"/);
  if (id) return id[1];
  if (b.includes('class="hero')) return 'hero';
  if (b.includes('stream-band')) return 'stream';
  if (b.includes('class="final')) return 'final';
  if (b.includes('class="trust"')) return 'trust';
  return 'unknown';
};
const map = {};
blocks.forEach(b => { map[keyOf(b)] = b; });
console.log('sections found:', blocks.length, Object.keys(map).join(','));

const orders = {
  form1: ['hero','trust','pain','stream','audience','offer','program','shorts','videos','speaker','cases','report','clients','form','reviews','final'],
  form2: ['hero','trust','speaker','cases','shorts','pain','audience','offer','program','videos','report','clients','form','reviews','final'],
  form3: ['hero','trust','offer','program','audience','form','pain','speaker','cases','shorts','videos','report','clients','reviews','final']
};

const heroText = map.hero && map.hero.match(/<div class="hero-text">[\s\S]*?<\/div>\s*(?=<div class="hero-media">)/);
if (!heroText) throw new Error('hero-text extraction failed');
const heroFragment = name => fs.readFileSync(__dirname + '/hero-' + name + '.html', 'utf8').replace('{{HERO_TEXT}}', heroText[0].trim());

const navRe = /<a href="#offer">Разбор<\/a>(\s*)<a href="#program">Программа<\/a>(\s*)<a href="#speaker">Спикер<\/a>(\s*)<a href="#cases">Кейсы<\/a>(\s*)<a href="#reviews">Отзывы<\/a>/g;
const navForm2 = '<a href="#speaker">Спикер</a>$1<a href="#cases">Кейсы</a>$2<a href="#offer">Разбор</a>$3<a href="#program">Программа</a>$4<a href="#reviews">Отзывы</a>';

for (const [name, order] of Object.entries(orders)) {
  const missing = order.filter(k => !map[k]);
  if (missing.length) throw new Error(name + ': missing ' + missing.join(','));
  let page = prefix + order.map(k => map[k]).join('\n\n') + suffix;
  page = page.replace(/(qbi-site\.pages\.dev\/)(?:form[123])?(")/g, '$1' + name + '$2');
  if (name === 'form2') {
    const hits = page.match(navRe);
    if (!hits || hits.length !== 2) throw new Error('nav pattern found ' + (hits ? hits.length : 0) + ' times');
    page = page.replace(navRe, navForm2);
    page = page.replace(map.hero, heroFragment('form2'));
    page = page.replace(/<link rel="preload" href="assets\/hero-composite\.webp"[^>]*>\r?\n?/, '');
    if (!page.includes('hero hero-dark hero-flow')) throw new Error('form2 hero swap failed');
  }
  if (name === 'form3') {
    page = page.replace(map.hero, heroFragment('form3'));
    page = page.replace('<header class="nav-h nav-dark">', '<header class="nav-h">');
    page = page.replace(/<link rel="preload" href="assets\/hero-composite\.webp"[^>]*>\r?\n?/, '');
    if (!page.includes('hero hero-mini') || page.includes('nav-h nav-dark')) throw new Error('form3 hero swap failed');
  }
  fs.writeFileSync(root + name + '.html', page);
  const ids = page.match(/<section[^>]*(?:id="([^"]+)"|class="(hero|final|tone-a stream-band)[^"]*")/g).length;
  console.log(name + '.html written, sections:', ids);
}
