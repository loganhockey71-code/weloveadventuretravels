const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { ROOT, CONTENT_DIR, getPage } = require('./pages-config');
const { renderPage } = require('./render');

const git = simpleGit(ROOT);

function contentPath(page) {
  return path.join(CONTENT_DIR, page.contentFile);
}

function readContent(pageKey) {
  const page = getPage(pageKey);
  if (!page) throw new Error(`Unknown page: ${pageKey}`);
  return JSON.parse(fs.readFileSync(contentPath(page), 'utf8'));
}

// Writes new content for a page, re-renders its HTML, and commits both to local git
// so every save is backed up and can be rolled back.
async function saveContent(pageKey, newContent, actor) {
  const page = getPage(pageKey);
  if (!page) throw new Error(`Unknown page: ${pageKey}`);

  fs.writeFileSync(contentPath(page), JSON.stringify(newContent, null, 2));
  renderPage(pageKey);

  const relContent = path.relative(ROOT, contentPath(page));
  const relOutput = page.outputFile;
  await git.add([relContent, relOutput]);
  const who = actor || 'admin';
  await git.commit(`Edit ${page.label} — by ${who}`);
}

async function listHistory(pageKey, limit = 20) {
  const page = getPage(pageKey);
  if (!page) throw new Error(`Unknown page: ${pageKey}`);
  const relContent = path.relative(ROOT, contentPath(page));
  const log = await git.log({ file: relContent, maxCount: limit });
  return log.all.map((c) => ({ hash: c.hash, date: c.date, message: c.message }));
}

async function revertTo(pageKey, hash) {
  const page = getPage(pageKey);
  if (!page) throw new Error(`Unknown page: ${pageKey}`);
  const relContent = path.relative(ROOT, contentPath(page));

  // Restore the content JSON from the chosen commit, then re-render and commit the revert as a new commit (never rewrites history).
  await git.raw(['checkout', hash, '--', relContent]);
  renderPage(pageKey);
  await git.add([relContent, page.outputFile]);
  await git.commit(`Revert ${page.label} to ${hash.slice(0, 7)}`);
}

module.exports = { readContent, saveContent, listHistory, revertTo };
