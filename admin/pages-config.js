const path = require('path');

const ROOT = path.join(__dirname, '..');

// Where saved content, uploads, the login account, and version history live.
// Defaults to the project folder itself (fine for local use). On a host with
// a persistent disk (e.g. Render), set DATA_DIR to that disk's mount path so
// this data survives redeploys/restarts instead of living in the ephemeral
// source checkout.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : ROOT;

const PAGES = [
  { key: 'home', label: 'Home', contentFile: 'index.json', templateFile: 'index.hbs', outputFile: 'index.html' },
  { key: 'cruises', label: 'Cruises', contentFile: 'cruises.json', templateFile: 'cruises.hbs', outputFile: 'cruises.html' },
  { key: 'theme-parks', label: 'Theme Parks', contentFile: 'theme-parks.json', templateFile: 'theme-parks.hbs', outputFile: 'theme-parks.html' },
  { key: 'all-inclusive', label: 'All-Inclusive', contentFile: 'all-inclusive.json', templateFile: 'all-inclusive.hbs', outputFile: 'all-inclusive.html' },
  { key: 'special-offers', label: 'Special Offers', contentFile: 'special-offers.json', templateFile: 'special-offers.hbs', outputFile: 'special-offers.html' },
  { key: 'contact', label: 'Contact', contentFile: 'contact.json', templateFile: 'contact.hbs', outputFile: 'contact.html' },
  // No template/output of its own — this is the footer & site-wide info (phone,
  // email, Instagram, copyright) that every page's template pulls in via the
  // `shared` partial data. Saving it re-renders every page, not just one.
  { key: 'shared', label: 'Footer & Site-Wide Info', contentFile: 'shared.json', templateFile: null, outputFile: null, note: 'Used in the footer of every page' },
];

function getPage(key) {
  return PAGES.find((p) => p.key === key);
}

module.exports = {
  ROOT,
  DATA_DIR,
  PAGES,
  getPage,
  CONTENT_DIR: path.join(DATA_DIR, 'content'),
  TEMPLATES_DIR: path.join(ROOT, 'templates'),
  UPLOADS_DIR: path.join(DATA_DIR, 'uploads'),
  AUTH_FILE: path.join(DATA_DIR, '.auth.json'),
};
