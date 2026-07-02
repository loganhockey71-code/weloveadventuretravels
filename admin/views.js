// Server-authored HTML shells for the admin panel. Not user content, so plain
// template literals are fine here — only embedded JSON needs escaping (done below).
function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function layout({ title, body, activeNav }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${title} · Site Admin</title>
<link rel="stylesheet" href="/admin-assets/admin.css">
</head>
<body>
${body}
</body>
</html>`;
}

function loginPage({ error }) {
  const body = `
<div class="login-wrap">
  <form class="login-card" method="POST" action="/admin/login">
    <h1>We Love Adventure Travels</h1>
    <p class="login-sub">Site Admin</p>
    ${error ? `<div class="alert alert-error">${error}</div>` : ''}
    <label>Username
      <input type="text" name="username" autocomplete="username" required autofocus>
    </label>
    <label>Password
      <span class="password-field">
        <input type="password" name="password" id="password-input" autocomplete="current-password" required>
        <button type="button" id="toggle-password" class="password-toggle" aria-label="Show password">Show</button>
      </span>
    </label>
    <button type="submit" class="btn">Log In</button>
  </form>
</div>
<script>
document.getElementById('toggle-password').addEventListener('click', function () {
  const input = document.getElementById('password-input');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  this.textContent = showing ? 'Show' : 'Hide';
  this.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
});
</script>`;
  return layout({ title: 'Log In', body });
}

function topNav(active) {
  return `
<header class="admin-header">
  <div class="admin-header-inner">
    <a href="/admin" class="admin-brand">We Love Adventure Travels <span>Admin</span></a>
    <nav class="admin-nav">
      <a href="/admin" class="${active === 'dashboard' ? 'active' : ''}">Pages</a>
      <form method="POST" action="/admin/logout" class="logout-form"><button type="submit" class="link-btn">Log Out</button></form>
    </nav>
  </div>
</header>`;
}

function dashboardPage({ pages, netlifyConfigured, flash }) {
  const rows = pages.map((p) => `
    <div class="page-row">
      <div>
        <h3>${p.label}</h3>
        <span class="muted">${p.outputFile}</span>
      </div>
      <div class="page-row-actions">
        <a href="/admin/edit/${p.key}" class="btn btn-small">Edit</a>
        <a href="/admin/history/${p.key}" class="btn btn-small btn-outline">History</a>
      </div>
    </div>`).join('');

  const body = `
${topNav('dashboard')}
<main class="admin-main">
  ${flash ? `<div class="alert alert-success">${flash}</div>` : ''}
  <div class="admin-toolbar">
    <h2>Pages</h2>
    <div>
      <button id="publish-btn" class="btn">Publish to Live Site</button>
    </div>
  </div>
  ${!netlifyConfigured ? `<div class="alert alert-info">Netlify isn't connected yet, so "Publish" won't go live until it is. See the setup notes in NETLIFY_SETUP.md.</div>` : ''}
  <div id="publish-status"></div>
  <div class="page-list">${rows}</div>
</main>
<script>
document.getElementById('publish-btn').addEventListener('click', async () => {
  const btn = document.getElementById('publish-btn');
  const status = document.getElementById('publish-status');
  btn.disabled = true; btn.textContent = 'Publishing…';
  status.innerHTML = '';
  try {
    const res = await fetch('/admin/deploy', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Deploy failed');
    status.innerHTML = '<div class="alert alert-success">Published! It may take a minute to go live.</div>';
  } catch (err) {
    status.innerHTML = '<div class="alert alert-error">' + err.message + '</div>';
  } finally {
    btn.disabled = false; btn.textContent = 'Publish to Live Site';
  }
});
</script>`;
  return layout({ title: 'Pages', body });
}

function editorPage({ page, content }) {
  const body = `
${topNav('editor')}
<main class="admin-main">
  <div class="admin-toolbar">
    <h2>Editing: ${page.label}</h2>
    <div>
      <a href="/admin" class="btn btn-outline btn-small">Back to Pages</a>
      <button id="save-btn" class="btn">Save Changes</button>
    </div>
  </div>
  <div id="save-status"></div>
  <div id="editor-root" class="editor-root"></div>
</main>
<script id="page-content" type="application/json">${safeJson(content)}</script>
<script>window.PAGE_KEY = ${safeJson(page.key)};</script>
<script src="/admin-assets/editor.js"></script>`;
  return layout({ title: `Edit ${page.label}`, body });
}

function historyPage({ page, commits }) {
  const rows = commits.map((c) => `
    <div class="history-row">
      <div>
        <strong>${c.message}</strong>
        <div class="muted">${new Date(c.date).toLocaleString()} · ${c.hash.slice(0, 7)}</div>
      </div>
      <form method="POST" action="/admin/history/${page.key}/revert" class="revert-form">
        <input type="hidden" name="hash" value="${c.hash}">
        <button type="submit" class="btn btn-small btn-outline revert-btn">Revert to This</button>
      </form>
    </div>`).join('') || '<p class="muted">No saved versions yet.</p>';

  const body = `
${topNav('history')}
<main class="admin-main">
  <div class="admin-toolbar">
    <h2>History: ${page.label}</h2>
    <a href="/admin/edit/${page.key}" class="btn btn-outline btn-small">Back to Editor</a>
  </div>
  <div class="history-list">${rows}</div>
</main>
<script>
document.querySelectorAll('.revert-btn').forEach((btn) => {
  let armed = false;
  btn.addEventListener('click', (e) => {
    if (!armed) {
      e.preventDefault();
      armed = true;
      const original = btn.textContent;
      btn.textContent = 'Click again to confirm';
      setTimeout(() => { armed = false; btn.textContent = original; }, 3000);
    }
  });
});
</script>`;
  return layout({ title: `History · ${page.label}`, body });
}

module.exports = { loginPage, dashboardPage, editorPage, historyPage };
