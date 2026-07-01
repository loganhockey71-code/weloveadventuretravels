(function () {
  'use strict';

  const raw = document.getElementById('page-content').textContent;
  const state = JSON.parse(raw);
  const pageKey = window.PAGE_KEY;
  const root = document.getElementById('editor-root');

  const HIDDEN_KEYS = new Set(['icon', 'link']);
  const COLOR_KEYS = new Set(['color', 'tagColor', 'buttonColor', 'ctaColor', 'eyebrowColor']);
  const PALETTE = ['orange', 'blue', 'green', 'purple'];
  const TEXTAREA_KEYS = new Set(['description', 'paragraph', 'paragraph1', 'paragraph2', 'sub', 'text', 'noteBar']);
  const DEFAULT_ICON = '<circle cx="12" cy="12" r="9"/>'; // simple generic dot icon for newly-added cards

  // Two-stage confirm instead of window.confirm(): first click arms it, second
  // click within 3s actually removes. No blocking native dialog.
  function armDelete(btn, onConfirm) {
    let armed = false;
    let timer = null;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.classList.add('icon-btn-armed');
        btn.textContent = 'Sure?';
        timer = setTimeout(() => {
          armed = false;
          btn.classList.remove('icon-btn-armed');
          btn.textContent = '✕';
        }, 3000);
        return;
      }
      clearTimeout(timer);
      onConfirm();
    });
  }

  function isImageKey(key) {
    return key === 'image' || key === 'backgroundImage' || key === 'sideImage' || /Image$/.test(key);
  }
  function isTextareaKey(key) {
    if (TEXTAREA_KEYS.has(key)) return true;
    return /paragraph|description|text|note/i.test(key);
  }
  function labelize(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
  }

  function getAt(obj, path) {
    return path.reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  }
  function setAt(obj, path, value) {
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
    cur[path[path.length - 1]] = value;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  // ---- Scalar fields ----

  function buildTextField(key, path) {
    const wrap = el('div', { class: 'field-row' });
    wrap.appendChild(el('label', { class: 'field-label', text: labelize(key) }));
    const useTextarea = isTextareaKey(key);
    const input = el(useTextarea ? 'textarea' : 'input', useTextarea ? {} : { type: 'text' });
    input.value = getAt(state, path) || '';
    input.addEventListener('input', () => setAt(state, path, input.value));
    wrap.appendChild(input);
    return wrap;
  }

  function buildSelectField(key, path) {
    const wrap = el('div', { class: 'field-row' });
    wrap.appendChild(el('label', { class: 'field-label', text: labelize(key) }));
    const select = el('select', {});
    const current = getAt(state, path);
    PALETTE.forEach((opt) => {
      const o = el('option', { value: opt, text: opt });
      if (opt === current) o.setAttribute('selected', 'selected');
      select.appendChild(o);
    });
    select.addEventListener('change', () => setAt(state, path, select.value));
    wrap.appendChild(select);
    return wrap;
  }

  function buildImageField(key, path) {
    const wrap = el('div', { class: 'field-row' });
    wrap.appendChild(el('label', { class: 'field-label', text: labelize(key) }));
    const dz = el('div', { class: 'dropzone' });
    const img = el('img', { src: getAt(state, path) || '', style: getAt(state, path) ? '' : 'display:none' });
    const hint = el('div', { class: 'dz-hint', text: 'Drag an image here, or click to choose one' });
    const fileInput = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif' });
    dz.appendChild(img);
    dz.appendChild(hint);
    dz.appendChild(fileInput);

    async function handleFile(file) {
      if (!file) return;
      hint.textContent = 'Uploading…';
      const fd = new FormData();
      fd.append('image', file);
      try {
        const res = await fetch('/admin/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setAt(state, path, data.url);
        img.src = data.url;
        img.style.display = '';
        hint.textContent = 'Drag an image here, or click to choose another';
      } catch (err) {
        hint.textContent = 'Upload failed: ' + err.message;
      }
    }

    dz.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
      handleFile(e.dataTransfer.files[0]);
    });

    wrap.appendChild(dz);
    return wrap;
  }

  // ---- Repeatable lists ----

  function blankLike(value) {
    if (Array.isArray(value)) return value.map(blankLike);
    if (value && typeof value === 'object') {
      const out = {};
      for (const k in value) {
        if (HIDDEN_KEYS.has(k)) out[k] = k === 'icon' ? DEFAULT_ICON : 'contact.html';
        else if (COLOR_KEYS.has(k)) out[k] = value[k];
        else out[k] = typeof value[k] === 'string' ? '' : blankLike(value[k]);
      }
      return out;
    }
    return typeof value === 'string' ? '' : value;
  }

  function buildRepeatableObjectList(key, path) {
    const wrap = el('div', { class: 'field-group' });
    wrap.appendChild(el('span', { class: 'group-label', text: labelize(key) }));
    const listEl = el('div', { class: 'repeat-list' });
    wrap.appendChild(listEl);

    function renderList() {
      listEl.innerHTML = '';
      const arr = getAt(state, path);
      arr.forEach((item, idx) => {
        const itemPath = path.concat(idx);
        const card = el('div', { class: 'repeat-item' });
        const controls = el('div', { class: 'repeat-item-controls' });
        const upBtn = el('button', { type: 'button', class: 'icon-btn', title: 'Move up', text: '↑' });
        const downBtn = el('button', { type: 'button', class: 'icon-btn', title: 'Move down', text: '↓' });
        const delBtn = el('button', { type: 'button', class: 'icon-btn', title: 'Remove', text: '✕' });
        upBtn.disabled = idx === 0;
        downBtn.disabled = idx === arr.length - 1;
        upBtn.addEventListener('click', () => {
          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
          renderList();
        });
        downBtn.addEventListener('click', () => {
          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
          renderList();
        });
        armDelete(delBtn, () => { arr.splice(idx, 1); renderList(); });
        controls.appendChild(upBtn);
        controls.appendChild(downBtn);
        controls.appendChild(delBtn);
        card.appendChild(controls);

        for (const subKey in item) {
          if (HIDDEN_KEYS.has(subKey)) continue;
          card.appendChild(buildField(subKey, itemPath.concat(subKey)));
        }
        listEl.appendChild(card);
      });
    }
    renderList();

    const addBtn = el('button', { type: 'button', class: 'btn btn-small btn-outline add-btn', text: '+ Add ' + labelize(key).replace(/s$/, '') });
    addBtn.addEventListener('click', () => {
      const arr = getAt(state, path);
      const template = arr.length ? blankLike(arr[arr.length - 1]) : {};
      arr.push(template);
      renderList();
    });
    wrap.appendChild(addBtn);
    return wrap;
  }

  function buildRepeatableStringList(key, path) {
    const wrap = el('div', { class: 'field-group' });
    wrap.appendChild(el('span', { class: 'group-label', text: labelize(key) }));
    const listEl = el('div', { class: 'repeat-list' });
    wrap.appendChild(listEl);

    function renderList() {
      listEl.innerHTML = '';
      const arr = getAt(state, path);
      arr.forEach((val, idx) => {
        const row = el('div', { class: 'string-list-item' });
        const input = el('input', { type: 'text' });
        input.value = val;
        input.addEventListener('input', () => { arr[idx] = input.value; });
        const delBtn = el('button', { type: 'button', class: 'icon-btn', title: 'Remove', text: '✕' });
        delBtn.addEventListener('click', () => { arr.splice(idx, 1); renderList(); });
        row.appendChild(input);
        row.appendChild(delBtn);
        listEl.appendChild(row);
      });
    }
    renderList();

    const addBtn = el('button', { type: 'button', class: 'btn btn-small btn-outline add-btn', text: '+ Add' });
    addBtn.addEventListener('click', () => {
      const arr = getAt(state, path);
      arr.push('');
      renderList();
    });
    wrap.appendChild(addBtn);
    return wrap;
  }

  // ---- Dispatcher ----

  function buildField(key, path) {
    if (HIDDEN_KEYS.has(key)) return null;
    const value = getAt(state, path);

    if (Array.isArray(value)) {
      if (value.length === 0) return buildRepeatableStringList(key, path);
      return typeof value[0] === 'object' ? buildRepeatableObjectList(key, path) : buildRepeatableStringList(key, path);
    }
    if (value && typeof value === 'object') {
      return buildGroup(key, path);
    }
    if (COLOR_KEYS.has(key)) return buildSelectField(key, path);
    if (isImageKey(key)) return buildImageField(key, path);
    return buildTextField(key, path);
  }

  function buildGroup(key, path) {
    const value = getAt(state, path);
    const wrap = el('div', { class: 'field-group' });
    wrap.appendChild(el('span', { class: 'group-label', text: labelize(key) }));
    for (const subKey in value) {
      const field = buildField(subKey, path.concat(subKey));
      if (field) wrap.appendChild(field);
    }
    return wrap;
  }

  // ---- Build page ----

  for (const key in state) {
    const field = buildField(key, [key]);
    if (field) root.appendChild(field);
  }

  // ---- Save ----

  document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn');
    const status = document.getElementById('save-status');
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Saving…';
    status.innerHTML = '';
    try {
      const res = await fetch('/admin/edit/' + pageKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      status.innerHTML = '<div class="alert alert-success">Saved. Your changes are live on this local preview — use Publish on the Pages screen to push them to the real site.</div>';
    } catch (err) {
      status.innerHTML = '<div class="alert alert-error">' + err.message + '</div>';
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
})();
