const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { ROOT, DATA_DIR, CONTENT_DIR, UPLOADS_DIR, getPage, PAGES } = require('./pages-config');
const { renderPage, renderAll } = require('./render');

const git = simpleGit(DATA_DIR);

function contentPath(page) {
  return path.join(CONTENT_DIR, page.contentFile);
}

// Recursively copies any key present in `seed` but missing from `existing`
// (already-saved content on the persistent disk), without touching values
// Victoria has already edited. Lets new fields we add to a page's shipped
// content JSON reach a disk that was already seeded by an earlier deploy.
function mergeMissingKeys(existing, seed) {
  let changed = false;
  for (const key in seed) {
    if (!(key in existing)) {
      existing[key] = seed[key];
      changed = true;
    } else if (
      seed[key] && typeof seed[key] === 'object' && !Array.isArray(seed[key]) &&
      existing[key] && typeof existing[key] === 'object' && !Array.isArray(existing[key])
    ) {
      if (mergeMissingKeys(existing[key], seed[key])) changed = true;
    }
  }
  return changed;
}

// First boot on a fresh persistent disk: DATA_DIR won't have content/uploads/a
// git repo of its own yet. Seed it from the source checkout's shipped defaults
// and start a dedicated history repo scoped to just the saved data.
async function ensureDataDir() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // On hosts like Render, the persistent disk is owned by a different uid than
  // the app process, so git refuses to touch it ("detected dubious ownership")
  // until it's explicitly marked safe. Must happen before any other git call.
  await git.raw(['config', '--global', '--add', 'safe.directory', DATA_DIR]).catch(() => {});

  const seedContentDir = path.join(ROOT, 'content');
  for (const page of PAGES) {
    const dest = path.join(CONTENT_DIR, page.contentFile);
    const src = path.join(seedContentDir, page.contentFile);
    if (!fs.existsSync(src)) continue;
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      continue;
    }
    // Dest already exists from an earlier deploy — backfill any fields that
    // were added to the shipped content since then, leaving edited ones alone.
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'));
    const seed = JSON.parse(fs.readFileSync(src, 'utf8'));
    if (mergeMissingKeys(existing, seed)) {
      fs.writeFileSync(dest, JSON.stringify(existing, null, 2));
    }
  }

  const isRepo = await git.checkIsRepo().catch(() => false);
  if (!isRepo) {
    await git.init();
    // On a just-attached persistent disk (e.g. Render), the .git folder we
    // just wrote can briefly be invisible to a fresh git process while the
    // mount finishes settling — retry instead of crashing server startup.
    const gitDir = path.join(DATA_DIR, '.git');
    for (let attempt = 0; !fs.existsSync(gitDir) && attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
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
  // shared.json has no template/output of its own — it's mixed into every
  // page's render, so a change to it has to re-render everything, not just
  // "itself" (renderPage would fail: there's no shared.hbs / shared.html).
  if (pageKey === 'shared') {
    renderAll();
  } else {
    renderPage(pageKey);
  }

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
  if (pageKey === 'shared') {
    renderAll();
  } else {
    renderPage(pageKey);
  }
  await git.add([relContent]);
  await git.commit(`Revert ${page.label} to ${hash.slice(0, 7)}`);
}

module.exports = { readContent, saveContent, listHistory, revertTo, ensureDataDir };
