const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { ROOT, DATA_DIR, CONTENT_DIR, UPLOADS_DIR, getPage, PAGES } = require('./pages-config');
const { renderPage } = require('./render');

const git = simpleGit(DATA_DIR);

function contentPath(page) {
  return path.join(CONTENT_DIR, page.contentFile);
}

// First boot on a fresh persistent disk: DATA_DIR won't have content/uploads/a
// git repo of its own yet. Seed it from the source checkout's shipped defaults
// and start a dedicated history repo scoped to just the saved data.
async function ensureDataDir() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  if (DATA_DIR !== ROOT) {
    const seedContentDir = path.join(ROOT, 'content');
    for (const page of PAGES) {
      const dest = path.join(CONTENT_DIR, page.contentFile);
      const src = path.join(seedContentDir, page.contentFile);
      if (!fs.existsSync(dest) && fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    const sharedDest = path.join(CONTENT_DIR, 'shared.json');
    const sharedSrc = path.join(seedContentDir, 'shared.json');
    if (!fs.existsSync(sharedDest) && fs.existsSync(sharedSrc)) {
      fs.copyFileSync(sharedSrc, sharedDest);
    }
  }

  const isRepo = await git.checkIsRepo().catch(() => false);
  if (!isRepo) {
    await git.init();
    await git.addConfig('user.name', 'Site Admin', false, 'local');
    await git.addConfig('user.email', 'admin@localhost', false, 'local');
    await git.add(['content']);
    await git.commit('Initial content');
  }
}

function readContent(pageKey) {
  const page = getPage(pageKey);
  if (!page) throw new Error(`Unknown page: ${pageKey}`);
  return JSON.parse(fs.readFileSync(contentPath(page), 'utf8'));
}

// Writes new content for a page, re-renders its HTML, and commits the content
// change to local git (scoped to DATA_DIR) so every save is backed up and can
// be rolled back. The rendered HTML itself isn't tracked - it's fully derived
// from the content JSON, so it's regenerated on demand instead.
async function saveContent(pageKey, newContent, actor) {
  const page = getPage(pageKey);
  if (!page) throw new Error(`Unknown page: ${pageKey}`);

  fs.writeFileSync(contentPath(page), JSON.stringify(newContent, null, 2));
  renderPage(pageKey);

  const relContent = path.relative(DATA_DIR, contentPath(page));
  await git.add([relContent]);
  const who = actor || 'admin';
  await git.commit(`Edit ${page.label} — by ${who}`);
}

async function listHistory(pageKey, limit = 20) {
  const page = getPage(pageKey);
  if (!page) throw new Error(`Unknown page: ${pageKey}`);
  const relContent = path.relative(DATA_DIR, contentPath(page));
  const log = await git.log({ file: relContent, maxCount: limit });
  return log.all.map((c) => ({ hash: c.hash, date: c.date, message: c.message }));
}

async function revertTo(pageKey, hash) {
  const page = getPage(pageKey);
  if (!page) throw new Error(`Unknown page: ${pageKey}`);
  const relContent = path.relative(DATA_DIR, contentPath(page));

  // Restore the content JSON from the chosen commit, then re-render and commit the revert as a new commit (never rewrites history).
  await git.raw(['checkout', hash, '--', relContent]);
  renderPage(pageKey);
  await git.add([relContent]);
  await git.commit(`Revert ${page.label} to ${hash.slice(0, 7)}`);
}

module.exports = { readContent, saveContent, listHistory, revertTo, ensureDataDir };
