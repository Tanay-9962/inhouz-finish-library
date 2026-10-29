(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const Q = new URLSearchParams(location.search);
  let F = [];
  let i = 0;
  let view = 'view';

  const likes = new Set(JSON.parse(localStorage.getItem('ihz_likes') || '[]'));
  const notes = JSON.parse(localStorage.getItem('ihz_notes') || '{}');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const saveLikes = () => {
    localStorage.setItem('ihz_likes', JSON.stringify([...likes]));
    const cnt = $('#cnt');
    if (cnt) cnt.textContent = String(likes.size);
  };

  const toast = (m) => {
    const t = $('#toast');
    if (!t) return;
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1600);
  };

  const setModeClass = () => {
    document.body.classList.toggle('mode-view', view === 'view');
  };

  if (Q.get('for')) {
    const p = $('#prepared');
    if (p) p.textContent = 'Prepared for ' + Q.get('for');
  }

  saveLikes();

  document.querySelectorAll('.tabs button').forEach((b) => {
    b.addEventListener('click', () => setView(b.dataset.v));
  });

  function setView(v) {
    view = v === 'grid' || v === 'short' ? v : 'view';
    document.querySelectorAll('.tabs button').forEach((b) => {
      b.classList.toggle('on', b.dataset.v === view);
    });
    render();
    window.scrollTo(0, 0);
  }

  function like(id) {
    if (likes.has(id)) likes.delete(id);
    else likes.add(id);
    saveLikes();
  }

  function heart(id) {
    return `<button type="button" class="heart ${likes.has(id) ? 'on' : ''}" data-like="${id}" aria-label="Shortlist">${likes.has(id) ? '♥' : '♡'}</button>`;
  }

  function go(d) {
    if (!F.length) return;
    i = (i + d + F.length) % F.length;
    history.replaceState(null, '', location.pathname + location.search + '#' + (i + 1));
    render();
  }

  function stripHtml() {
    const win = 8;
    const start = Math.max(0, i - win);
    const end = Math.min(F.length, i + win + 1);
    let html = '';
    for (let k = start; k < end; k++) {
      const x = F[k];
      html += `<img ${k === i ? '' : 'loading="lazy"'} src="${esc(x.thumb)}" data-k="${k}" class="${k === i ? 'cur' : ''}" alt="">`;
    }
    return html;
  }

  function rView() {
    if (!F.length) {
      app.innerHTML = '<p class="empty">No finishes loaded.</p>';
      return;
    }
    i = Math.max(0, Math.min(i, F.length - 1));
    const f = F[i];
    history.replaceState(null, '', location.pathname + location.search + '#' + (i + 1));
    app.innerHTML = `
      <div class="viewer">
        <div class="frame">
          <div class="stage" id="st">
            <img src="${esc(f.image)}" alt="${esc(f.title)}" width="1024" height="1024" decoding="async">
            <button type="button" class="nav l" id="pv" aria-label="Previous">‹</button>
            <button type="button" class="nav r" id="nx" aria-label="Next">›</button>
          </div>
          <div class="strip" id="strip">${stripHtml()}</div>
        </div>
        <div class="side" id="side">
          <div class="meta">
            <div class="count">${String(i + 1).padStart(2, '0')} / ${F.length}</div>
            <h1>${esc(f.title)}</h1>
            <div class="cat">${esc(f.category || '')}</div>
          </div>
          <button type="button" class="btn ${likes.has(f.id) ? 'liked' : ''}" id="lk">${likes.has(f.id) ? '♥ Shortlisted' : '♡ Shortlist'}</button>
          <button type="button" class="note-toggle" id="nto">Note</button>
          <textarea id="nt" placeholder="Private note — stays on this device">${esc(notes[f.id] || '')}</textarea>
          <div class="hint">Swipe or ← → · notes stay on this device</div>
        </div>
      </div>`;

    [-1, 1].forEach((d) => {
      const n = F[(i + d + F.length) % F.length];
      const im = new Image();
      im.decoding = 'async';
      im.src = n.image;
    });

    $('#pv').onclick = () => go(-1);
    $('#nx').onclick = () => go(1);
    $('#lk').onclick = () => { like(f.id); rView(); };
    $('#nto').onclick = () => $('#side').classList.toggle('notes-open');
    $('#nt').oninput = (e) => {
      notes[f.id] = e.target.value;
      localStorage.setItem('ihz_notes', JSON.stringify(notes));
    };
    $('#strip').querySelectorAll('img').forEach((m) => {
      m.onclick = () => { i = +m.dataset.k; render(); };
    });
    requestAnimationFrame(() => {
      $('#strip .cur')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    });

    let x0 = null;
    const st = $('#st');
    st.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
    st.ontouchend = (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      x0 = null;
    };
  }

  function rGrid(list, title, extra = '') {
    app.innerHTML = `<div class="head"><h2>${esc(title)}</h2><div>${extra}</div></div>` +
      (list.length
        ? `<div class="grid">${list.map((f) =>
            `<div class="card" data-id="${esc(f.id)}"><img loading="lazy" decoding="async" src="${esc(f.thumb)}" alt="${esc(f.title)}"><div class="t"><span>${esc(f.title)}</span>${heart(f.id)}</div></div>`
          ).join('')}</div>`
        : '<p class="empty">Tap ♡ on any finish to build a shortlist.</p>');

    app.querySelectorAll('.card').forEach((c) => {
      c.onclick = (e) => {
        const h = e.target.closest('[data-like]');
        if (h) {
          e.stopPropagation();
          like(h.dataset.like);
          render();
          return;
        }
        const idx = F.findIndex((f) => f.id === c.dataset.id);
        if (idx >= 0) { i = idx; setView('view'); }
      };
    });

    const sh = $('#sh');
    if (sh) {
      sh.onclick = async () => {
        const u = new URL(location.href);
        u.hash = '';
        u.searchParams.set('s', [...likes].join(','));
        const s = u.toString();
        try {
          if (navigator.share && matchMedia('(pointer:coarse)').matches) {
            await navigator.share({ title: 'INHOUZ shortlist', url: s });
          } else {
            await navigator.clipboard.writeText(s);
            toast('Link copied');
          }
        } catch {
          prompt('Copy this link', s);
        }
      };
    }
    const cl = $('#cl');
    if (cl) {
      cl.onclick = () => {
        if (confirm('Clear shortlist?')) {
          likes.clear();
          saveLikes();
          render();
        }
      };
    }
  }

  function rShort() {
    const l = F.filter((f) => likes.has(f.id));
    rGrid(
      l,
      `Shortlist · ${l.length}`,
      l.length
        ? '<button type="button" class="btn" id="sh">Share shortlist</button><button type="button" class="btn" id="cl">Clear</button>'
        : ''
    );
  }

  function render() {
    setModeClass();
    document.querySelectorAll('.tabs button').forEach((b) => {
      b.classList.toggle('on', b.dataset.v === view);
    });
    if (view === 'grid') rGrid(F, 'The collection');
    else if (view === 'short') rShort();
    else rView();
  }

  addEventListener('keydown', (e) => {
    if (view !== 'view' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
    if (e.key.toLowerCase() === 's' && F[i]) {
      like(F[i].id);
      rView();
    }
  });

  fetch('finishes.json', { cache: 'no-cache' })
    .then((r) => {
      if (!r.ok) throw new Error('Could not load finishes');
      return r.json();
    })
    .then((d) => {
      F = Array.isArray(d) ? d : (d.finishes || []);
      if (!F.length) throw new Error('Finish list is empty');

      const s = Q.get('s');
      if (s) {
        s.split(',').forEach((id) => {
          if (F.some((f) => f.id === id)) likes.add(id);
        });
        saveLikes();
        const firstLiked = F.findIndex((f) => likes.has(f.id));
        if (firstLiked >= 0) i = firstLiked;
        toast('Shortlist ready · ' + likes.size);
      }

      const h = parseInt(location.hash.replace(/^#/, ''), 10);
      if (h >= 1 && h <= F.length) i = h - 1;
      else i = 0;

      view = 'view';
      render();
    })
    .catch((err) => {
      app.innerHTML = `<p class="empty">${esc(err.message || 'Failed to open library')}. Refresh and try again.</p>`;
    });
})();
