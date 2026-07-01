const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { ROOT } = require('./pages-config');

// Everything a visitor's browser needs — the rendered pages plus static assets. Excludes
// the admin app, source templates/content, and anything else that shouldn't be public.
const SITE_FILES = ['index.html', 'cruises.html', 'theme-parks.html', 'all-inclusive.html', 'special-offers.html', 'contact.html', 'logo.png'];
const SITE_DIRS = ['css', 'js', 'uploads'];

function isConfigured() {
  return Boolean(process.env.NETLIFY_AUTH_TOKEN && process.env.NETLIFY_SITE_ID);
}

function addDir(archive, dir) {
  const abs = path.join(ROOT, dir);
  if (fs.existsSync(abs)) archive.directory(abs, dir);
}

function buildZip() {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    for (const file of SITE_FILES) {
      const abs = path.join(ROOT, file);
      if (fs.existsSync(abs)) archive.file(abs, { name: file });
    }
    for (const dir of SITE_DIRS) addDir(archive, dir);

    archive.finalize();
  });
}

async function deploy() {
  if (!isConfigured()) {
    throw new Error('Netlify is not configured yet. Add NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID to the .env file.');
  }
  const zipBuffer = await buildZip();
  const siteId = process.env.NETLIFY_SITE_ID;
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}`,
      'Content-Type': 'application/zip',
    },
    body: zipBuffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Netlify deploy failed (${res.status}): ${text || res.statusText}`);
  }
  const data = await res.json();
  return { deployId: data.id, url: data.ssl_url || data.url };
}

module.exports = { isConfigured, deploy };
