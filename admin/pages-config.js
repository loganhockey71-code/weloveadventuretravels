const path = require('path');

const ROOT = path.join(__dirname, '..');

const PAGES = [
  { key: 'home', label: 'Home', contentFile: 'index.json', templateFile: 'index.hbs', outputFile: 'index.html' },
  { key: 'cruises', label: 'Cruises', contentFile: 'cruises.json', templateFile: 'cruises.hbs', outputFile: 'cruises.html' },
  { key: 'theme-parks', label: 'Theme Parks', contentFile: 'theme-parks.json', templateFile: 'theme-parks.hbs', outputFile: 'theme-parks.html' },
  { key: 'all-inclusive', label: 'All-Inclusive', contentFile: 'all-inclusive.json', templateFile: 'all-inclusive.hbs', outputFile: 'all-inclusive.html' },
  { key: 'special-offers', label: 'Special Offers', contentFile: 'special-offers.json', templateFile: 'special-offers.hbs', outputFile: 'special-offers.html' },
  { key: 'contact', label: 'Contact', contentFile: 'contact.json', templateFile: 'contact.hbs', outputFile: 'contact.html' },
];

function getPage(key) {
  return PAGES.find((p) => p.key === key);
}

module.exports = {
  ROOT,
  PAGES,
  getPage,
  CONTENT_DIR: path.join(ROOT, 'content'),
  TEMPLATES_DIR: path.join(ROOT, 'templates'),
  UPLOADS_DIR: path.join(ROOT, 'uploads'),
};
