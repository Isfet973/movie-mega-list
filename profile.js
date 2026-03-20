'use strict';

// ── Constants ──
const LS_USER  = 'megalist_v1';
const LS_PROF  = 'megalist_profile_v1';
const LS_EDITS = 'megalist_poster_edits_v1';
const LS_AUTO  = 'megalist_poster_auto_v1';
const LS_SYNC  = 'megalist_sync_meta_v1';
const LS_DESC  = 'megalist_desc_user_v1';
const LS_DAUTO = 'megalist_desc_auto_v1';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

// ── Global State ──
let MEDIA_DATA = [];
let POSTERS_JSON = {};
let userData = {};
let posterEdits = {};
let posterAuto = {};
let descUser = {};
let descAuto = {};

let profileData = {
  name: '',
  avatarUrl: '',
  favFilmes: [],
  favSeries: [],
  favAnimes: [],
  fav18Filmes: [],
  fav18Series: [],
  fav18Animes: [],
  rankFilmes: [],
  rankSeries: [],
  rankAnimes: [],
  show18Fav: false,
  show18Rank: false,
  pickerMedia: 'Filme',
  picker18: false,
};

let currentLibraryTab = 'filme';
let activeTab = 'favs';
let pickerMediaChoice = 'Filme';
let picker18On = false;

// ── Storage Helpers ──
function loadAll() {
  try { userData    = JSON.parse(localStorage.getItem(LS_USER)  || '{}'); } catch(e) {}
  try { profileData = {...profileData, ...JSON.parse(localStorage.getItem(LS_PROF) || '{}')}; } catch(e) {}
  try { posterEdits = JSON.parse(localStorage.getItem(LS_EDITS) || '{}'); } catch(e) {}
  try { posterAuto  = JSON.parse(localStorage.getItem(LS_AUTO)  || '{}'); } catch(e) {}
  try { descUser    = JSON.parse(localStorage.getItem(LS_DESC)  || '{}'); } catch(e) {}
  try { descAuto    = JSON.parse(localStorage.getItem(LS_DAUTO) || '{}'); } catch(e) {}
}

function saveProfileData() { localStorage.setItem(LS_PROF, JSON.stringify(profileData)); }
function saveUserData() { localStorage.setItem(LS_USER, JSON.stringify(userData)); }

// ── Utilities ──
function ratingStr(r) {
  if (!r) return '';
  const full = Math.floor(r);
  const half = r % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '');
}

function showToast(m) {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function isAdult(item) { 
  return item.nivel >= 2 || item.tipo.some(t => ['X', 'HN', 'EC'].includes(t)); 
}

function resolveUrl(id) {
  const k = String(id);
  const toF = v => !v ? null : v.startsWith('/') ? TMDB_IMG + v : v;
  if (k in posterEdits) return toF(posterEdits[k]);
  if (k in POSTERS_JSON) return toF(POSTERS_JSON[k]);
  if (k in posterAuto) return toF(posterAuto[k]);
  return null;
}

// ── Markdown Parser ──
function cell(s) { return (s || '').trim().replace(/^—$/, ''); }

function parseMarkdown(text) {
  const lines = text.split('\n'), items = [], seen = new Set();
  let nivel = 0, section = '', inTable = false, hp = false, isMedia = false;
  
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+N[IÍ]VEL\s+\d/i.test(line)) {
      const m = line.match(/N[IÍ]VEL\s+(\d)/i);
      if (m) { nivel = parseInt(m[1]) - 1; section = line.replace(/^##\s+/, '').trim(); }
      inTable = false; hp = false; isMedia = false;
      continue;
    }
    if (/^##\s+/.test(line)) { section = line.replace(/^##\s+/, '').trim(); inTable = false; hp = false; isMedia = false; continue; }
    if (line.startsWith('|')) {
      const cols = line.split('|').slice(1, -1);
      if (cols.every(c => /^[-: ]+$/.test(c.trim()))) { if (inTable) hp = true; continue; }
      if (!hp) { isMedia = cell(cols[0]) === '#' && cols.some(c => /titulo/i.test(c.trim())); inTable = true; continue; }
      if (inTable && hp && isMedia) {
        const id = parseInt(cell(cols[0])); if (!id || seen.has(id)) continue;
        const title = cell(cols[1]); if (!title || /já listado/i.test(title)) continue;
        seen.add(id);
        items.push({
          id, title, year: parseInt(cell(cols[2])) || 0,
          media: cell(cols[3]) || 'Filme',
          tipo: cell(cols[4]).split(',').map(t => t.trim()).filter(Boolean),
          nivel, section,
          erot: parseInt(cell(cols[5])) || 0, expl: parseInt(cell(cols[6])) || 0,
          prof: parseInt(cell(cols[7])) || 0, pert: parseInt(cell(cols[8])) || 0,
          tabu: parseInt(cell(cols[9])) || 0, rari: parseInt(cell(cols[10])) || 0,
          cult: parseInt(cell(cols[11])) || 0,
          rec: cell(cols[12]).split(',').map(r => r.trim()).filter(Boolean),
          notes: cell(cols[13]) || '',
        });
      }
    } else { if (inTable) { inTable = false; hp = false; isMedia = false; } }
  }
  return items;
}

// ── Profile Card ──
function renderProfileCard() {
  const av = document.getElementById('avatarDisplay');
  if (profileData.avatarUrl) {
    av.innerHTML = `<img class="avatar" src="${profileData.avatarUrl}" onclick="document.getElementById('avatarInput').click()">`;
  } else {
    av.innerHTML = `<div class="avatar-ph" onclick="document.getElementById('avatarInput').click()">👤</div>`;
  }
  document.getElementById('profileName').value = profileData.name || '';
  const meta = JSON.parse(localStorage.getItem(LS_SYNC) || '{}');
  const since = meta.firstSeen || new Date().toISOString();
  if (!meta.firstSeen) localStorage.setItem(LS_SYNC, JSON.stringify({...meta, firstSeen: since}));
  document.getElementById('profileSince').textContent = `Membro desde ${new Date(since).toLocaleDateString('pt-BR')}`;
}

function handleAvatar(ev) {
  const file = ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { profileData.avatarUrl = e.target.result; saveProfileData(); renderProfileCard(); showToast('✓ Foto atualizada'); };
  reader.readAsDataURL(file);
}

function saveProfile() {
  profileData.name = document.getElementById('profileName').value.trim();
  saveProfileData();
  showToast('✓ Perfil salvo');
}

// ── Stats Grid ──
function renderStats() {
  const w = Object.values(userData).filter(u => u.status === 'watched').length;
  const v = Object.values(userData).filter(u => u.status === 'watching').length;
  const q = Object.values(userData).filter(u => u.status === 'want').length;
  const rated = Object.values(userData).filter(u => u.rating > 0);
  const avg = rated.length ? (rated.reduce((s, u) => s + u.rating, 0) / rated.length).toFixed(1) : '—';
  const byM = { Filme: 0, Serie: 0, Anime: 0 };
  
  Object.keys(userData).forEach(id => {
    if (userData[id].status !== 'watched') return;
    const item = MEDIA_DATA.find(m => m.id === parseInt(id));
    if (item) {
      const k = item.media === 'Anime' || item.tipo.includes('AN') ? 'Anime' : item.media === 'Serie' ? 'Serie' : 'Filme';
      byM[k]++;
    }
  });
  
  const stats = [
    { n: MEDIA_DATA.length, l: 'Total na lista', c: 'var(--text)' },
    { n: w, l: '✓ Assistidos', c: 'var(--accent4)' },
    { n: v, l: '▶ Assistindo', c: 'var(--accent2)' },
    { n: q, l: '★ Quero Ver', c: 'var(--accent3)' },
    { n: avg, l: 'Nota Média ★', c: 'var(--accent2)' },
    { n: byM.Filme, l: '🎬 Filmes', c: 'var(--film)' },
    { n: byM.Serie, l: '📺 Séries', c: 'var(--serie)' },
    { n: byM.Anime, l: '🎌 Animes', c: 'var(--anime)' },
  ];
  
  document.getElementById('statsGrid').innerHTML = stats.map(s => 
    `<div class="stat-card"><div class="stat-num" style="color:${s.c}">${s.n}</div><div class="stat-label">${s.l}</div></div>`
  ).join('');
}

// ── Rating Chart (10 buckets: 0.5 to 5.0) ──
function renderChart() {
  const chartContainer = document.getElementById('ratingChart');
  if (!chartContainer) return;
  
  const buckets = [
    { val: 0.5, label: '½', color: '#ff4444' }, { val: 1.0, label: '★', color: '#ff6644' },
    { val: 1.5, label: '★½', color: '#ff8844' }, { val: 2.0, label: '★★', color: '#f0a500' },
    { val: 2.5, label: '★★½', color: '#f0c040' }, { val: 3.0, label: '★★★', color: '#2ecc8a' },
    { val: 3.5, label: '★★★½', color: '#27ae60' }, { val: 4.0, label: '★★★★', color: '#3498db' },
    { val: 4.5, label: '★★★★½', color: '#7c6cfc' }, { val: 5.0, label: '★★★★★', color: '#e8473f' }
  ];
  
  let totalRated = 0;
  Object.values(userData).forEach(u => {
    if (u.rating && u.rating > 0) {
      totalRated++;
      const rounded = Math.round(u.rating * 2) / 2;
      const bucket = buckets.find(b => b.val === rounded);
      if (bucket) bucket.count = (bucket.count || 0) + 1;
    }
  });
  
  if (totalRated === 0) {
    chartContainer.innerHTML = `<div style="width:100%;text-align:center;color:var(--text3);font-family:'Space Mono',monospace;font-size:11px;padding:30px 0;"><div style="font-size:24px;margin-bottom:8px;">📊</div>Nenhuma avaliação ainda.<br><span style="font-size:9px;opacity:0.7;">Avalie filmes para ver seu gráfico!</span></div>`;
    return;
  }
  
  const maxCount = Math.max(...buckets.map(b => b.count || 0), 1);
  
  chartContainer.innerHTML = buckets.map(bucket => {
    const count = bucket.count || 0;
    const heightPercent = (count / maxCount) * 100;
    const percentOfTotal = Math.round((count / totalRated) * 100);
    
    return `
      <div class="chart-col" data-rating="${bucket.val}" title="${count} avaliação(ões) (${percentOfTotal}%)">
        <div class="chart-count" style="color:${count ? bucket.color : 'var(--text3)'};opacity:${count ? 1 : 0.3}">${count}</div>
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${Math.max(heightPercent, 0.5)}%;background:${bucket.color};opacity:${count ? 1 : 0.15};box-shadow:0 0 8px ${bucket.color}40"></div>
        </div>
        <div class="chart-star" style="color:${count ? bucket.color : 'var(--text3)'};opacity:${count ? 1 : 0.4}">${bucket.label}</div>
        ${count ? `<div style="font-size:8px;color:var(--text3);font-family:'Space Mono',monospace;margin-top:2px">${percentOfTotal}%</div>` : '<div style="height:14px"></div>'}
      </div>
    `;
  }).join('');
}

// ── Library Compact (Minha Coleção) ──
function renderLibrary() {
  const container = document.getElementById('librarySingleView');
  if (!container) return;
  renderLibraryTab(currentLibraryTab, container);
}

function renderLibraryTab(type, container) {
  const types = {
    filme: { label: 'Filme', check: item => item.media === 'Filme' && !item.tipo.includes('AN') && !item.tipo.includes('SE') },
    serie: { label: 'Serie', check: item => item.media === 'Serie' || (item.tipo.includes('SE') && !item.tipo.includes('AN')) },
    anime: { label: 'Anime', check: item => item.media === 'Anime' || item.tipo.includes('AN') }
  };
  
  const typeConfig = types[type];
  if (!typeConfig) return;
  
  const statuses = [
    { key: 'watched', label: '✓ Assistidos', color: 'var(--accent4)' },
    { key: 'watching', label: '▶ Assistindo', color: 'var(--accent2)' },
    { key: 'want', label: '★ Quero Ver', color: 'var(--accent3)' }
  ];
  
  let html = '';
  statuses.forEach(status => {
    const items = Object.entries(userData)
      .filter(([id, data]) => {
        if (data.status !== status.key) return false;
        const item = MEDIA_DATA.find(m => m.id === parseInt(id));
        return item && typeConfig.check(item);
      })
      .map(([id]) => {
        const item = MEDIA_DATA.find(m => m.id === parseInt(id));
        return { ...item, userData: userData[id] };
      });
    
    const count = items.length;
    html += `
      <div class="lib-status-compact">
        <div class="lib-status-header-compact" style="border-color:${status.color}40">
          <span style="color:${status.color}">${status.label}</span>
          <span class="count">${count} item(s)</span>
        </div>
    `;
    
    if (count === 0) {
      html += `<div class="lib-empty-compact">Nenhum item nesta categoria</div>`;
    } else {
      html += `<div class="lib-scroll-compact">`;
      html += items.map(item => {
        const url = resolveUrl(item.id);
        const icon = type === 'anime' ? '🎌' : type === 'serie' ? '📺' : '🎬';
        const rating = item.userData.rating ? ratingStr(item.userData.rating) : '';
        const hasEp = (type === 'serie' || type === 'anime') && item.userData.episode;
        
        return `
          <div class="lib-card-compact" onclick="openLibraryModal(${item.id})" title="${item.title}">
            ${url ? 
              `<img src="${url}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="placeholder" style="display:none">${icon}</div>` : 
              `<div class="placeholder">${icon}</div>`
            }
            ${rating ? `<div class="rating-badge">${rating}</div>` : ''}
            ${hasEp ? `<div class="ep-badge">${item.userData.episode}</div>` : ''}
          </div>
        `;
      }).join('');
      html += `</div>`;
    }
    html += `</div>`;
  });
  
  container.innerHTML = html;
}

function switchLibraryTab(type, btnElement) {
  currentLibraryTab = type;
  document.querySelectorAll('.lib-tab-simple').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  
  const container = document.getElementById('librarySingleView');
  if (container) {
    container.style.opacity = '0';
    setTimeout(() => { renderLibraryTab(type, container); container.style.opacity = '1'; }, 150);
  }
}

// ── Library Modal ──
function openLibraryModal(id) {
  const item = MEDIA_DATA.find(m => m.id === id);
  if (!item) return;
  
  const ud = userData[id] || {};
  const url = resolveUrl(id);
  const icon = item.media === 'Anime' ? '🎌' : item.tipo.includes('SE') ? '📺' : '🎬';
  
  let dateHtml = '';
  if (ud.date) {
    const dateObj = new Date(ud.date);
    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    dateHtml = `<div class="lib-modal-info-item"><div class="lib-modal-info-label">${ud.status === 'watched' ? 'Concluído em' : 'Iniciado em'}</div><div class="lib-modal-info-value">${dateStr}</div></div>`;
  }
  
  let progressHtml = '';
  if (ud.episode && (item.media === 'Serie' || item.media === 'Anime' || item.tipo.includes('SE'))) {
    progressHtml = `<div class="lib-modal-info-item" style="grid-column:1/-1"><div class="lib-modal-info-label">Progresso</div><div class="lib-modal-info-value" style="color:var(--accent3)">${ud.status === 'watching' ? '▶ ' : '✓ '}${ud.episode}</div></div>`;
  }
  
  const stars = ud.rating ? ratingStr(ud.rating) : '—';
  const ratingText = ud.rating ? `${ud.rating}/5` : 'Sem nota';
  
  const overlay = document.createElement('div');
  overlay.className = 'lib-modal-overlay open';
  overlay.id = 'libModalOverlay';
  overlay.onclick = e => { if (e.target === overlay) closeLibraryModal(); };
  
  overlay.innerHTML = `
    <div class="lib-modal">
      <button class="lib-modal-close" onclick="closeLibraryModal()">✕</button>
      ${url ? `<img class="lib-modal-poster" src="${url}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="lib-modal-poster-placeholder" style="display:none">${icon}</div>` : `<div class="lib-modal-poster-placeholder">${icon}</div>`}
      <div class="lib-modal-content">
        <div class="lib-modal-title">${item.title}</div>
        <div class="lib-modal-meta">${item.year} · ${item.media}${isAdult(item) ? ' · +18' : ''}</div>
        <div class="lib-modal-rating"><span class="lib-modal-stars">${stars}</span><span class="lib-modal-rating-text">${ratingText}</span></div>
        <div class="lib-modal-info-grid">
          <div class="lib-modal-info-item">
            <div class="lib-modal-info-label">Status</div>
            <div class="lib-modal-info-value" style="color:${ud.status === 'watched' ? 'var(--accent4)' : ud.status === 'watching' ? 'var(--accent2)' : 'var(--accent3)'}">${ud.status === 'watched' ? '✓ Assistido' : ud.status === 'watching' ? '▶ Assistindo' : '★ Quero Ver'}</div>
          </div>
          ${dateHtml}${progressHtml}
        </div>
        ${ud.review ? `<div class="lib-modal-review"><div class="lib-modal-review-label">Minha Review</div><div class="lib-modal-review-text">${ud.review.replace(/\n/g, '<br>')}</div></div>` : ''}
        <button class="inline-save-btn" style="margin-top:16px" onclick="closeLibraryModal();setTimeout(()=>openInlineModal(${id}),100)">✏ Editar entrada</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

function closeLibraryModal() {
  const modal = document.getElementById('libModalOverlay');
  if (modal) { modal.remove(); document.body.style.overflow = ''; }
}

// ── Random Picker ──
function setPickerMedia(m) {
  pickerMediaChoice = m;
  ['pbFilme', 'pbSerie', 'pbAnime', 'pbAll'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.classList.remove('active');
  });
  const map = { Filme: 'pbFilme', Serie: 'pbSerie', Anime: 'pbAnime', all: 'pbAll' };
  if (map[m]) document.getElementById(map[m]).classList.add('active');
}

function togglePicker18() {
  picker18On = !picker18On;
  document.getElementById('picker18btn').classList.toggle('on', picker18On);
}

function spinPicker() {
  let pool = MEDIA_DATA;
  if (pickerMediaChoice !== 'all') {
    if (pickerMediaChoice === 'Anime') pool = pool.filter(i => i.media === 'Anime' || i.tipo.includes('AN'));
    else if (pickerMediaChoice === 'Serie') pool = pool.filter(i => i.media === 'Serie');
    else pool = pool.filter(i => i.media === 'Filme' && !i.tipo.includes('AN'));
  }
  
  const unwatched = pool.filter(i => !userData[i.id] || ['none', 'want'].includes(userData[i.id].status));
  if (unwatched.length > 5) pool = unwatched;
  if (!picker18On) pool = pool.filter(i => !isAdult(i));
  if (!pool.length) { showToast('Nenhuma mídia encontrada com esses filtros'); return; }
  
  const item = pool[Math.floor(Math.random() * pool.length)];
  document.getElementById('pickerResult').style.display = 'none';
  openInlineModal(item.id);
}

// ── Inline Modal & Half-Star Rating ──
let inlineCurrentId = null;
let inlineRating = 0;
let inlineStatus = 'none';

function hstarHtml() {
  return Array.from({ length: 5 }, (_, i) => `
    <div class="hstar-wrap${inlineRating >= i + 1 ? ' full' : inlineRating >= i + 0.5 ? ' half' : ''}" data-idx="${i}"
         onmousemove="hstarHover(event,${i})" onmouseleave="hstarDraw(inlineRating)" onclick="hstarClick(event,${i})">
      <div class="hstar-fill"></div><div class="hstar-left"></div><div class="hstar-right"></div>
    </div>
  `).join('') + `<span class="hstar-val">${inlineRating > 0 ? inlineRating + '★' : ''}</span>`;
}

function hstarHover(ev, idx) {
  const rect = ev.currentTarget.getBoundingClientRect();
  const half = (ev.clientX - rect.left) < rect.width / 2;
  const val = half ? idx + 0.5 : idx + 1;
  hstarDraw(val);
}

function hstarClick(ev, idx) {
  const rect = ev.currentTarget.getBoundingClientRect();
  const half = (ev.clientX - rect.left) < rect.width / 2;
  const val = half ? idx + 0.5 : idx + 1;
  inlineRating = inlineRating === val ? 0 : val;
  hstarDraw(inlineRating);
  document.querySelector('.hstar-val').textContent = inlineRating > 0 ? inlineRating + '★' : '';
}

function hstarDraw(val) {
  document.querySelectorAll('.hstar-wrap').forEach((el, i) => {
    el.className = 'hstar-wrap' + (val >= i + 1 ? ' full' : val >= i + 0.5 ? ' half' : '');
  });
}

async function fetchDescForProfile(item) {
  const k = String(item.id);
  if (descUser[k]) return descUser[k];
  if (descAuto[k]) return descAuto[k];
  try {
    const isAnime = item.media === 'Anime' || item.tipo.includes('AN');
    let text = null;
    if (isAnime) {
      const clean = item.title.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*:.*/, '').trim();
      const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(clean)}&limit=8`);
      if (r.ok) {
        const d = await r.json();
        const hit = (d.data || []).find(x => { const y = x.aired?.prop?.from?.year; return y && Math.abs(y - item.year) <= 1; }) || (d.data || [])[0];
        if (hit?.synopsis) text = hit.synopsis.replace(/\[Written by MAL Rewrite\]/gi, '').replace(/\(Source:.*?\)/gi, '').trim().slice(0, 400);
      }
    } else {
      const type = item.media === 'Serie' || (item.tipo.includes('SE') && !item.tipo.includes('AN')) ? 'tv' : 'movie';
      const clean = item.title.replace(/\s*\(\d{4}\)\s*/g, '').trim();
      const yp = item.year > 1900 ? `&${type === 'tv' ? 'first_air_date_year' : 'year'}=${item.year}` : '';
      for (const lang of ['pt-BR', 'en-US']) {
        const r = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=8265bd1679663a7ea12ac168da84d2e8&query=${encodeURIComponent(clean)}${yp}&language=${lang}`);
        if (!r.ok) continue;
        const d = await r.json();
        const hit = (d.results || []).find(x => { const y = parseInt((x.release_date || x.first_air_date || '').slice(0, 4)); return Math.abs(y - item.year) <= 1 && x.overview; }) || (d.results || []).find(x => x.overview);
        if (hit?.overview) { text = hit.overview.trim().slice(0, 400); break; }
      }
      if (!text) {
        const r2 = await fetch(`https://www.omdbapi.com/?apikey=trilogy&t=${encodeURIComponent(item.title.replace(/\s*\(.*?\)\s*/g, '').trim())}${item.year > 1900 ? `&y=${item.year}` : ''}`);
        if (r2.ok) { const d2 = await r2.json(); if (d2.Plot && d2.Plot !== 'N/A') text = d2.Plot.trim().slice(0, 400); }
      }
    }
    if (text) { descAuto[k] = text; localStorage.setItem(LS_DAUTO, JSON.stringify(descAuto)); }
    return text;
  } catch (e) { return null; }
}

function openInlineModal(id) {
  const item = MEDIA_DATA.find(m => m.id === id);
  if (!item) return;
  inlineCurrentId = id;
  const ud = userData[id] || {};
  inlineRating = ud.rating || 0;
  inlineStatus = ud.status || 'none';
  
  const box = document.getElementById('inlineModalBox');
  const url = resolveUrl(id);
  const icon = item.media === 'Anime' ? '🎌' : item.tipo.includes('SE') ? '📺' : '🎬';
  const TL = { L: 'Lésbico', G: 'Gay', T: 'Trans', B: 'Bi/Pan', H: 'Hétero', X: 'Tabu', SF: 'Sci-Fi', PH: 'Psicológico', BH: 'Body Horror', HR: 'Horror', TH: 'Thriller', CR: 'Crime', RO: 'Romance', DR: 'Drama', EC: 'Ecchi', HN: 'Hentai', AN: 'Anime', SE: 'Série', BR: 'Brasil', JP: 'Japão', KR: 'Coreia', Z: 'Vampiro', C: 'Comédia', MU: 'Musical', DO: 'Documentário', V: 'Voyeurismo', R: 'Religião', MY: 'Mistério', WS: 'Western', Q: 'Queer' };
  const tagColors = { L: '#ff88b8', G: '#88b8ff', T: '#88ffb8', B: '#bb88ff', H: '#ffcc77', X: '#ff4444', SF: '#5599ff', PH: '#ffaa44', BH: '#ff66ff', HR: '#ff6655', TH: '#9988ff', CR: '#44ff99', RO: '#ff99cc', DR: '#9999ff', EC: '#ff9933', HN: '#ff4488', AN: '#ff7070', SE: '#44cc88', BR: '#ccff44', JP: '#ff88aa', KR: '#44ccff', Z: '#44ffee', C: '#55ff88', MU: '#ffbb44', DO: '#44bbff', V: '#8899ff', R: '#ffaa77', Q: '#ff88ee' };
  const tagsHtml = item.tipo.filter(t => !['H', 'OV'].includes(t)).slice(0, 8).map(t => 
    `<span class="itag" style="background:${tagColors[t] || '#555'}22;color:${tagColors[t] || '#999'};border:1px solid ${tagColors[t] || '#555'}44">${TL[t] || t}</span>`
  ).join('');
  
  const isEp = item.media === 'Anime' || item.media === 'Serie' || item.tipo.includes('SE');
  const hasStatus = inlineStatus && inlineStatus !== 'none';
  const descText = descUser[String(id)] || descAuto[String(id)] || '';
  
  box.innerHTML = `
    <button class="inline-close" onclick="closeInlineModal()">✕</button>
    <div class="inline-modal-top">
      ${url ? `<img class="inline-poster" src="${url}">` : `<div class="inline-poster-ph">${icon}</div>`}
      <div class="inline-meta">
        <div class="inline-title">${item.title}</div>
        <div class="inline-sub">${item.year} · ${item.media} · N${item.nivel + 1}${isAdult(item) ? ' · +18' : ''}</div>
        <div class="inline-tags">${tagsHtml}</div>
      </div>
    </div>
    ${descText ? `<div style="padding:0 16px 8px;font-size:13px;color:var(--text2);line-height:1.65">${descText.replace(/</g, '&lt;')}</div>` : `<div style="padding:0 16px 8px;font-size:12px;color:var(--text3);font-style:italic" id="inlineDescPlaceholder">Buscando descrição...</div>`}
    ${item.notes ? `<div style="padding:0 16px 10px;font-size:11px;color:var(--text3);font-family:'Space Mono',monospace">${item.notes}</div>` : ''}
    <div class="inline-form">
      <div class="inline-form-title">Status & Review</div>
      <div class="inline-status-row">
        <button class="inline-status-btn${inlineStatus === 'watched' ? ' s-watched' : ''}" onclick="setInlineStatus('watched')">✓ Assistido</button>
        <button class="inline-status-btn${inlineStatus === 'watching' ? ' s-watching' : ''}" onclick="setInlineStatus('watching')">▶ Assistindo</button>
        <button class="inline-status-btn${inlineStatus === 'want' ? ' s-want' : ''}" onclick="setInlineStatus('want')">★ Quero Ver</button>
        <button class="inline-status-btn" onclick="setInlineStatus('none')">— Nenhum</button>
      </div>
      <div class="inline-extra${hasStatus ? ' visible' : ''}" id="inlineExtra">
        <div class="form-label" style="margin-bottom:6px">Nota</div>
        <div class="hstar-row" id="hstarRow">${hstarHtml()}</div>
        <div class="form-grid" style="margin-top:10px">
          <div class="form-group"><div class="form-label">Data de Conclusão</div><input type="date" class="form-input" id="inlineDate" value="${ud.date || ''}"></div>
          ${isEp ? `<div class="form-group"><div class="form-label">Episódio Atual</div><input type="text" class="form-input" id="inlineEpisode" placeholder="S01E05" value="${ud.episode || ''}"></div>` : ''}
          <div class="form-group full"><div class="form-label">Review</div><textarea class="form-input" id="inlineReview" placeholder="Escreva sua review...">${ud.review || ''}</textarea></div>
        </div>
      </div>
      <button class="inline-save-btn" onclick="saveProfileEntry()">SALVAR</button>
    </div>
  `;
  
  box.classList.add('open');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  if (!descText) {
    fetchDescForProfile(item).then(text => {
      const ph = document.getElementById('inlineDescPlaceholder');
      if (ph) ph.textContent = text || 'Sem descrição disponível.';
    });
  }
}

function closeInlineModal() {
  document.getElementById('inlineModalBox').classList.remove('open');
  inlineCurrentId = null;
}

function setInlineStatus(st) {
  inlineStatus = st;
  document.querySelectorAll('.inline-status-btn').forEach((b, i) => {
    b.className = 'inline-status-btn' + (st === 'watched' && i === 0 ? ' s-watched' : st === 'watching' && i === 1 ? ' s-watching' : st === 'want' && i === 2 ? ' s-want' : '');
  });
  const extra = document.getElementById('inlineExtra');
  if (extra) extra.className = 'inline-extra' + (st && st !== 'none' ? ' visible' : '');
}

function saveProfileEntry() {
  if (!inlineCurrentId) return;
  if (!userData[inlineCurrentId]) userData[inlineCurrentId] = {};
  const ud = userData[inlineCurrentId];
  ud.status = inlineStatus;
  ud.rating = inlineRating;
  ud.date = document.getElementById('inlineDate')?.value || '';
  ud.review = document.getElementById('inlineReview')?.value || '';
  ud.episode = document.getElementById('inlineEpisode')?.value || '';
  saveUserData();
  renderStats(); renderChart(); renderLibrary();
  showToast('✓ Salvo!');
}

// ── Tabs (Favoritos/Ranking) ──
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
  renderTab();
}

function renderTab() {
  const el = document.getElementById('tabContent');
  if (activeTab === 'rank') el.innerHTML = renderRankPage();
  else el.innerHTML = renderFavsStacked();
  attachListeners();
}

// ── Favoritos ──
function favKey(m) { return m === 'Filme' ? 'favFilmes' : m === 'Serie' ? 'favSeries' : 'favAnimes'; }
function fav18Key(m) { return m === 'Filme' ? 'fav18Filmes' : m === 'Serie' ? 'fav18Series' : 'fav18Animes'; }

function getFavListIds(media) {
  const key = profileData.show18Fav ? fav18Key(media) : favKey(media);
  return Array.isArray(profileData[key]) ? profileData[key] : [];
}

function renderFavList(items, media) {
  if (!items.length) {
    return `<div class="empty-tab"><div style="font-size:28px">${profileData.show18Fav ? '🔞' : '⭐'}</div><p>${profileData.show18Fav ? 'Nenhum favorito +18 ainda' : 'Nenhum favorito ainda'}</p></div>`;
  }
  return `<div class="fav-list">${items.slice(0, 5).map((item, i) => {
    const url = resolveUrl(item.id);
    const icon = item.media === 'Anime' ? '🎌' : item.tipo.includes('SE') ? '📺' : '🎬';
    const nc = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const ud = userData[item.id] || {};
    
    const metaParts = [item.year];
    if (ud.rating > 0) metaParts.push(`<span style="color:var(--accent2)">${ratingStr(ud.rating)}</span>`);
    if (ud.date && ud.status === 'watched') metaParts.push(`<span style="color:var(--text3)">✓ ${new Date(ud.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>`);
    const isSeriesOrAnime = item.media === 'Anime' || item.media === 'Serie' || item.tipo.includes('SE');
    if (isSeriesOrAnime && ud.episode) metaParts.push(`<span style="color:var(--accent3)">▶ ${ud.episode}</span>`);
    
    return `<div class="fav-item" data-id="${item.id}" onclick="openInlineModal(${item.id})">
      <span class="fav-num ${nc}">${i + 1}</span>
      ${url ? `<img class="fav-poster-sm" src="${url}" onerror="this.style.display='none'">` : `<div class="fav-poster-ph-sm">${icon}</div>`}
      <div class="fav-info">
        <div class="fav-title">${item.title}</div>
        <div class="fav-year" style="font-size:10px;color:var(--text2);margin-top:2px">${metaParts.join(' <span style="color:var(--border2)">·</span> ')}</div>
      </div>
      <button class="fav-remove" onclick="event.stopPropagation();removeFav(${item.id},'${media}')" title="Remover">×</button>
    </div>`;
  }).join('')}${items.length > 5 ? `<div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3);padding:6px 0">+${items.length - 5} mais</div>` : ''}</div>`;
}

function renderFavSection(media) {
  const label = media === 'Filme' ? 'Filmes' : media === 'Serie' ? 'Séries' : 'Animes';
  const color = media === 'Anime' ? 'var(--anime)' : media === 'Serie' ? 'var(--serie)' : 'var(--film)';
  const ids = getFavListIds(media);
  const items = ids.map(id => MEDIA_DATA.find(x => x.id === id)).filter(Boolean);
  
  return `
    <div style="margin-bottom:26px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:${color}">${label}</div>
        <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3)">${ids.length} item(ns)</div>
      </div>
      <div class="search-add">
        <input type="text" id="favSearch-${media}" placeholder="+ Adicionar ${label.toLowerCase()} ${profileData.show18Fav ? '+18 ' : ''}..." oninput="searchFav(this,'${media}')" onfocus="document.getElementById('favDrop-${media}').classList.add('open')" onblur="setTimeout(()=>document.getElementById('favDrop-${media}').classList.remove('open'),200)">
        <div class="search-drop" id="favDrop-${media}"></div>
      </div>
      ${renderFavList(items, media)}
    </div>`;
}

function renderFavsStacked() {
  return `
    <div class="toggle-row">
      <span class="toggle-label">Favoritos: ranking separado +18</span>
      <label class="toggle">
        <input type="checkbox" id="t18fav" ${profileData.show18Fav ? 'checked' : ''} onchange="toggle18Fav()">
        <div class="toggle-track"></div><div class="toggle-thumb"></div>
      </label>
      ${profileData.show18Fav ? '<span class="hidden-count">modo +18</span>' : ''}
    </div>
    ${renderFavSection('Filme')}${renderFavSection('Serie')}${renderFavSection('Anime')}`;
}

function searchFav(input, media) {
  const q = input.value.toLowerCase().trim();
  const drop = document.getElementById(`favDrop-${media}`);
  if (!q) { drop.innerHTML = ''; drop.classList.remove('open'); return; }
  const fk = profileData.show18Fav ? fav18Key(media) : favKey(media);
  const results = MEDIA_DATA.filter(m => {
    const ok = media === 'Anime' ? (m.media === 'Anime' || m.tipo.includes('AN')) : media === 'Serie' ? (m.media === 'Serie') : (m.media === 'Filme' && !m.tipo.includes('AN'));
    return ok && m.title.toLowerCase().includes(q) && !profileData[fk].includes(m.id);
  }).slice(0, 7);
  
  drop.innerHTML = results.length ? results.map(m => {
    const url = resolveUrl(m.id);
    const icon = m.media === 'Anime' ? '🎌' : m.tipo.includes('SE') ? '📺' : '🎬';
    return `<div class="drop-item" onclick="addFav(${m.id},'${media}')">
      ${url ? `<img class="drop-poster" src="${url}">` : `<div class="drop-poster" style="display:flex;align-items:center;justify-content:center;font-size:16px">${icon}</div>`}
      <div class="drop-info"><div class="drop-title">${m.title}</div><div class="drop-meta">${m.year} · ${m.media}${isAdult(m) ? ' · +18' : ''}</div></div>
    </div>`;
  }).join('') : '<div class="drop-empty">Sem resultados</div>';
  drop.classList.add('open');
}

function addFav(id, media) {
  const fk = profileData.show18Fav ? fav18Key(media) : favKey(media);
  if (!Array.isArray(profileData[fk])) profileData[fk] = [];
  if (!profileData[fk].includes(id)) { profileData[fk].push(id); saveProfileData(); renderTab(); }
}

function removeFav(id, media) {
  const fk = profileData.show18Fav ? fav18Key(media) : favKey(media);
  profileData[fk] = profileData[fk].filter(i => i !== id);
  saveProfileData();
  renderTab();
}

function toggle18Fav() { profileData.show18Fav = !profileData.show18Fav; saveProfileData(); renderTab(); }

// ── Ranking ──
function rankKey(m) { return m === 'Filme' ? 'rankFilmes' : m === 'Serie' ? 'rankSeries' : 'rankAnimes'; }

function getRankItems(m) {
  const s18 = profileData.show18Rank;
  return profileData[rankKey(m)].map(id => MEDIA_DATA.find(x => x.id === id)).filter(Boolean).filter(i => s18 || !isAdult(i));
}

function renderRankPage() {
  return `
    <div class="toggle-row">
      <span class="toggle-label">Mostrar +18</span>
      <label class="toggle"><input type="checkbox" id="t18rank" ${profileData.show18Rank ? 'checked' : ''} onchange="toggle18Rank()"><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
    </div>
    ${['Filme', 'Serie', 'Anime'].map(m => {
      const label = m === 'Filme' ? 'Filmes' : m === 'Serie' ? 'Séries' : 'Animes';
      const color = m === 'Anime' ? 'var(--anime)' : m === 'Serie' ? 'var(--serie)' : 'var(--film)';
      const items = getRankItems(m);
      const rk = rankKey(m);
      const hidden = profileData[rk].length - items.length;
      return `<div style="margin-bottom:28px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:${color};margin-bottom:10px">${label} ${hidden > 0 ? `<span style="font-size:10px;font-family:'Space Mono',monospace;color:var(--accent)">(${hidden} +18 ocultos)</span>` : ''}</div>
        <div class="search-add">
          <input type="text" id="rankSearch-${m}" placeholder="+ Adicionar ${label.toLowerCase()} ao ranking..." oninput="searchRank(this,'${m}')" onfocus="document.getElementById('rankDrop-${m}').classList.add('open')" onblur="setTimeout(()=>document.getElementById('rankDrop-${m}').classList.remove('open'),200)">
          <div class="search-drop" id="rankDrop-${m}"></div>
        </div>
        ${items.length === 0 ? '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:var(--text3);padding:10px 0">Nenhum item ainda.</div>' : 
        `<div class="rank-list" id="rankList-${m}" data-media="${m}">
          ${items.map((item, i) => {
            const nc = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const url = resolveUrl(item.id);
            const icon = item.media === 'Anime' ? '🎌' : item.tipo.includes('SE') ? '📺' : '🎬';
            const ud = userData[item.id] || {};
            const stars = ud.rating ? ratingStr(ud.rating) : '';
            return `<div class="rank-item" draggable="true" data-id="${item.id}" data-media="${m}">
              <span class="rank-drag">⠿</span>
              <span class="rank-num ${nc}">${i + 1}</span>
              ${url ? `<img class="rank-poster" src="${url}" onerror="this.style.display='none'">` : `<div class="rank-poster" style="display:flex;align-items:center;justify-content:center;font-size:18px">${icon}</div>`}
              <div class="rank-info"><div class="rank-title">${item.title}</div>
              <div class="rank-meta">${item.year} · ${item.media}${isAdult(item) ? ' · +18' : ''}${stars ? ` <span class="rank-stars">${stars}</span>` : ''}</div></div>
              <button class="rank-rm" onclick="removeRank(${item.id},'${m}')">×</button>
            </div>`;
          }).join('')}
        </div>`}
      </div>`;
    }).join('')}`;
}

function searchRank(input, m) {
  const q = input.value.toLowerCase().trim();
  const drop = document.getElementById(`rankDrop-${m}`);
  if (!q) { drop.innerHTML = ''; drop.classList.remove('open'); return; }
  const rk = rankKey(m);
  const results = MEDIA_DATA.filter(x => {
    const ok = m === 'Anime' ? (x.media === 'Anime' || x.tipo.includes('AN')) : m === 'Serie' ? (x.media === 'Serie') : (x.media === 'Filme' && !x.tipo.includes('AN'));
    return ok && x.title.toLowerCase().includes(q) && !profileData[rk].includes(x.id);
  }).slice(0, 7);
  
  drop.innerHTML = results.length ? results.map(x => {
    const url = resolveUrl(x.id);
    const icon = x.media === 'Anime' ? '🎌' : x.tipo.includes('SE') ? '📺' : '🎬';
    return `<div class="drop-item" onclick="addRank(${x.id},'${m}')">
      ${url ? `<img class="drop-poster" src="${url}">` : `<div class="drop-poster" style="display:flex;align-items:center;justify-content:center;font-size:16px">${icon}</div>`}
      <div class="drop-info"><div class="drop-title">${x.title}</div><div class="drop-meta">${x.year}${isAdult(x) ? ' · +18' : ''}</div></div>
    </div>`;
  }).join('') : '<div class="drop-empty">Sem resultados</div>';
  drop.classList.add('open');
}

function addRank(id, m) {
  const rk = rankKey(m);
  if (!profileData[rk].includes(id)) { profileData[rk].push(id); saveProfileData(); renderTab(); }
}

function removeRank(id, m) {
  const rk = rankKey(m);
  profileData[rk] = profileData[rk].filter(i => i !== id);
  saveProfileData();
  renderTab();
}

function toggle18Rank() { profileData.show18Rank = !profileData.show18Rank; saveProfileData(); renderTab(); }

// Drag & Drop
let dragId = null, dragMedia = null;
function attachListeners() {
  document.querySelectorAll('.rank-item[draggable]').forEach(el => {
    el.addEventListener('dragstart', () => { dragId = parseInt(el.dataset.id); dragMedia = el.dataset.media; el.classList.add('dragging'); });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault(); el.classList.remove('drag-over');
      const tid = parseInt(el.dataset.id), tm = el.dataset.media;
      if (dragId === tid || dragMedia !== tm) return;
      const rk = rankKey(tm), arr = [...profileData[rk]];
      const fi = arr.indexOf(dragId), ti = arr.indexOf(tid);
      if (fi === -1 || ti === -1) return;
      arr.splice(fi, 1); arr.splice(ti, 0, dragId);
      profileData[rk] = arr; saveProfileData(); renderTab();
    });
  });
}

// ── Sync & Export ──
function buildMediaDataJson() {
  const merged = { ...POSTERS_JSON };
  Object.entries(posterAuto).forEach(([k, v]) => { if (v) merged[k] = v; });
  Object.entries(posterEdits).forEach(([k, v]) => { if (v === null) delete merged[k]; else if (v) merged[k] = v; });
  const postersSorted = {};
  Object.keys(merged).sort((a, b) => parseInt(a) - parseInt(b)).forEach(k => postersSorted[k] = merged[k]);
  const descSorted = {};
  Object.keys(descUser).sort((a, b) => parseInt(a) - parseInt(b)).forEach(k => descSorted[k] = descUser[k]);
  return { _version: 1, _updatedAt: new Date().toISOString(), posters: postersSorted, descriptions: descSorted };
}

function exportMediaDataJson() {
  const blob = new Blob([JSON.stringify(buildMediaDataJson(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'media-data.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('✓ media-data.json exportado');
}

function exportData() {
  const payload = {
    _version: 3, _exportedAt: new Date().toISOString(), _device: navigator.userAgent.slice(0, 80),
    userData, profile, descriptions_user: { ...descUser }, posters_new: { ...posterEdits },
    _stats: {
      watched: Object.values(userData).filter(u => u.status === 'watched').length,
      watching: Object.values(userData).filter(u => u.status === 'watching').length,
      want: Object.values(userData).filter(u => u.status === 'want').length,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `megalist-userdata-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  const m = JSON.parse(localStorage.getItem(LS_SYNC) || '{}');
  localStorage.setItem(LS_SYNC, JSON.stringify({ ...m, lastExport: new Date().toISOString() }));
  showToast('✓ userdata.json exportado');
}

function importData(ev) {
  const file = ev.target.files[0]; if (!file) return; ev.target.value = '';
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const p = JSON.parse(e.target.result);
      if (!p.userData) { showToast('❌ Arquivo inválido'); return; }
      const posNew = p.posters_new || p.posters || {};
      const watched = (p._stats?.watched) ?? Object.values(p.userData || {}).filter(u => u.status === 'watched').length;
      const pc = Object.keys(posNew).filter(k => posNew[k]).length;
      const date = p._exportedAt ? new Date(p._exportedAt).toLocaleString('pt-BR') : 'desconhecida';
      if (!confirm(`Importar backup de ${date}?\n• ${watched} visto(s)\n• ${pc} capa(s)\nDados locais serão substituídos.`)) return;
      
      if (p.userData) { userData = p.userData; saveUserData(); }
      if (p.profile) { profileData = { ...profileData, ...p.profile }; saveProfileData(); }
      if (p.descriptions_user) { Object.assign(descUser, p.descriptions_user); localStorage.setItem(LS_DESC, JSON.stringify(descUser)); }
      Object.entries(posNew).forEach(([k, v]) => {
        if (!v) { posterEdits[k] = null; delete posterAuto[k]; delete POSTERS_JSON[k]; }
        else { POSTERS_JSON[k] = v; posterEdits[k] = v; }
      });
      localStorage.setItem(LS_EDITS, JSON.stringify(posterEdits));
      localStorage.setItem(LS_AUTO, JSON.stringify(posterAuto));
      renderProfileCard(); renderStats(); renderChart(); renderTab(); renderLibrary();
      showToast(`✓ Importado! ${watched} itens, ${pc} capas`);
    } catch (err) { showToast(`❌ Erro: ${err.message}`); }
  };
  reader.readAsText(file);
}

function confirmClear() {
  if (!confirm('Apagar TODOS os dados locais?\nFaça export antes!')) return;
  [LS_USER, LS_EDITS, LS_AUTO, LS_SYNC, LS_DESC, LS_PROF].forEach(k => localStorage.removeItem(k));
  userData = {}; posterEdits = {}; posterAuto = {}; descUser = {};
  profileData = { name: '', avatarUrl: '', favFilmes: [], favSeries: [], favAnimes: [], fav18Filmes: [], fav18Series: [], fav18Animes: [], rankFilmes: [], rankSeries: [], rankAnimes: [], show18Fav: false, show18Rank: false, pickerMedia: 'Filme', picker18: false };
  renderProfileCard(); renderStats(); renderChart(); renderTab(); renderLibrary();
  showToast('Dados apagados');
}

// ── Clean Data Functions ──
function openCleanModal() { document.getElementById('cleanOverlay').classList.add('open'); }
function closeCleanModal() { document.getElementById('cleanOverlay').classList.remove('open'); }

function clearFavorites(type) {
  const map = {
    filme: ['favFilmes', 'fav18Filmes'], serie: ['favSeries', 'fav18Series'],
    anime: ['favAnimes', 'fav18Animes'], all: ['favFilmes', 'fav18Filmes', 'favSeries', 'fav18Series', 'favAnimes', 'fav18Animes']
  };
  const keys = map[type] || [];
  const total = keys.reduce((sum, k) => sum + (profileData[k]?.length || 0), 0);
  if (total === 0) { showToast('Nenhum favorito para remover'); return; }
  if (!confirm(`Remover ${total} favorito(s) de ${type === 'all' ? 'todas as categorias' : type}?`)) return;
  keys.forEach(k => profileData[k] = []);
  saveProfileData();
  renderTab();
  showToast(`✓ ${total} favorito(s) removido(s)`);
}

function clearStatus(status) {
  if (Object.keys(userData).length === 0) { showToast('Nenhum dado de visualização'); return; }
  let toRemove = [];
  if (status === 'all') {
    if (!confirm('ATENÇÃO: Isso apagará TODOS os status, notas e reviews. Continuar?')) return;
    toRemove = Object.keys(userData);
  } else {
    toRemove = Object.entries(userData).filter(([id, d]) => d.status === status).map(([id]) => id);
    if (toRemove.length === 0) { showToast(`Nenhum item "${status}" encontrado`); return; }
    const labels = { watched: 'assistidos', watching: 'assistindo', want: 'quero ver' };
    if (!confirm(`Remover ${toRemove.length} item(ns) marcados como "${labels[status]}"?`)) return;
  }
  toRemove.forEach(id => delete userData[id]);
  saveUserData();
  renderStats(); renderChart(); renderLibrary(); renderTab();
  showToast(`✓ ${toRemove.length} item(ns) removido(s)`);
}

function clearRankings(type) {
  const map = { filme: ['rankFilmes'], serie: ['rankSeries'], anime: ['rankAnimes'], all: ['rankFilmes', 'rankSeries', 'rankAnimes'] };
  const keys = map[type] || [];
  const total = keys.reduce((sum, k) => sum + (profileData[k]?.length || 0), 0);
  if (total === 0) { showToast('Nenhum ranking para remover'); return; }
  if (!confirm(`Remover ${total} item(ns) dos rankings de ${type === 'all' ? 'todas as categorias' : type}?`)) return;
  keys.forEach(k => profileData[k] = []);
  saveProfileData();
  renderTab();
  showToast(`✓ ${total} item(ns) removido(s) do ranking`);
}

function clearAllProfileData() {
  if (!confirm('🚨 ATENÇÃO TOTAL 🚨\n\nIsso irá apagar:\n• Todos os favoritos\n• Todos os rankings\n• Todas as notas e reviews\n• Todo o histórico de visualização\n\nEsta ação não pode ser desfeita!\n\nDeseja continuar?')) return;
  if (!confirm('Última chance! Tem certeza absoluta que quer zerar TODO o seu perfil?')) return;
  
  ['favFilmes', 'favSeries', 'favAnimes', 'fav18Filmes', 'fav18Series', 'fav18Animes', 'rankFilmes', 'rankSeries', 'rankAnimes'].forEach(k => profileData[k] = []);
  userData = {};
  saveProfileData(); saveUserData();
  renderStats(); renderChart(); renderLibrary(); renderTab();
  showToast('🗑️ Perfil completamente resetado');
  closeCleanModal();
}

// ── Init ──
async function init() {
  loadAll();
  try {
    const [mdR, mdataR] = await Promise.all([fetch('movie-list.md').catch(() => null), fetch('media-data.json').catch(() => null)]);
    if (mdR?.ok) MEDIA_DATA = parseMarkdown(await mdR.text());
    if (mdataR?.ok) {
      const md = await mdataR.json();
      if (md.posters) POSTERS_JSON = { ...md.posters, ...POSTERS_JSON };
      if (md.descriptions) Object.assign(descUser, md.descriptions);
    }
  } catch (e) { console.warn('Could not load data:', e); }
  
  // Setup tabs listeners
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  
  renderProfileCard(); renderStats(); renderChart(); renderTab(); renderLibrary();
}

init();