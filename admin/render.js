const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { ROOT, CONTENT_DIR, TEMPLATES_DIR, PAGES, getPage } = require('./pages-config');

Handlebars.registerHelper('eq', (a, b) => a === b);

let partialsRegistered = false;
function registerPartials() {
  if (partialsRegistered) return;
  const partialsDir = path.join(TEMPLATES_DIR, 'partials');
  for (const file of fs.readdirSync(partialsDir)) {
    if (!file.endsWith('.hbs')) continue;
    const name = file.replace(/\.hbs$/, '');
    const src = fs.readFileSync(path.join(partialsDir, file), 'utf8');
    Handlebars.registerPartial(name, src);
  }
  partialsRegistered = true;
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function renderPage(key) {
  registerPartials();
  const page = getPage(key);
  if (!page) throw new Error(`Unknown page: ${key}`);
  if (!page.templateFile) throw new Error(`Page "${key}" has no template of its own — did you mean renderAll()?`);

  const shared = readJSON(path.join(CONTENT_DIR, 'shared.json'));
  const content = readJSON(path.join(CONTENT_DIR, page.contentFile));
  const templateSrc = fs.readFileSync(path.join(TEMPLATES_DIR, page.templateFile), 'utf8');
  const template = Handlebars.compile(templateSrc, { noEscape: false });

  const context = Object.assign({}, content, {
    shared,
    activePage: page.key,
  });

  const html = template(context);
  const outputPath = path.join(ROOT, page.outputFile);
  fs.writeFileSync(outputPath, html, 'utf8');
  return outputPath;
}

function renderAll() {
  return PAGES.filter((p) => p.templateFile).map((p) => renderPage(p.key));
}

if (require.main === module) {
  const written = renderAll();
  written.forEach((p) => console.log('Rendered', p));
}

module.exports = { renderPage, renderAll };
