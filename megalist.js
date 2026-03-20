'use strict';
/* ============================================================
   MEGALIST — JS UNIFICADO
   Ordem: constants → parser → api → posterEditor → posterNav
          → render → recommendations → modal → roulette → sync → events
   ============================================================ */


/* ── CONSTANTS & STATE (constants.js) ── */
const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';
const LS_USER  = 'megalist_v1';
const LS_EDITS = 'megalist_poster_edits_v1';
const LS_AUTO  = 'megalist_poster_auto_v1';
const LS_DAUTO = 'megalist_desc_auto_v1';
const LS_DESC  = 'megalist_desc_user_v1';
const LS_PROF  = 'megalist_profile_v1';
const LS_SYNC  = 'megalist_sync_meta_v1';

let MEDIA_DATA = [];
let POSTERS_JSON = {};
let DESCS_JSON   = {};
let userData     = {};
let posterEdits  = {};
let posterAuto   = {};
let descAuto     = {};
let descUser     = {};

// filters
let activeSection = 'all';
let activeMedia   = 'all';
let activeTipo    = 'all';
let searchQ       = '';
let sortMode      = 'default';
let statusFilt    = 'all';
let currentId     = null;
let currentRating = 0;
let rouFilter     = 'all';

// LOCAL STORAGE
function loadLS() {
  try { userData    = JSON.parse(localStorage.getItem(LS_USER)  || '{}'); } catch(e){}
  try { posterEdits = JSON.parse(localStorage.getItem(LS_EDITS) || '{}'); } catch(e){}
  try { posterAuto  = JSON.parse(localStorage.getItem(LS_AUTO)  || '{}'); } catch(e){}
  try { descAuto    = JSON.parse(localStorage.getItem(LS_DAUTO) || '{}'); } catch(e){}
  try { descUser    = JSON.parse(localStorage.getItem(LS_DESC)  || '{}'); } catch(e){}
}
const save = (key, obj) => { try { localStorage.setItem(key, JSON.stringify(obj)); } catch(e){} };
function saveUserData()   { save(LS_USER,  userData); }
function savePosterEdits(){ save(LS_EDITS, posterEdits); }
function savePosterAuto() { save(LS_AUTO,  posterAuto); }
function saveDescUser()   { save(LS_DESC,  descUser); }
function saveDescAuto()   { save(LS_DAUTO, descAuto); }


/* ── MARKDOWN PARSER (parser.js) ── */
function cell(s){ return (s||'').trim().replace(/^—$/,''); }
function parseMarkdown(text){
  const lines = text.split('\n'), items = [], seen = new Set();
  let nivel = 0, section = '', inTable = false, headerPassed = false, isMedia = false;
  for(const raw of lines){
    const line = raw.trim();
    if(/^##\s+N[IÍ]VEL\s+\d/i.test(line)){
      const m = line.match(/N[IÍ]VEL\s+(\d)/i);
      if(m){ nivel = parseInt(m[1])-1; section = line.replace(/^##\s+/,'').trim(); }
      inTable=false; headerPassed=false; isMedia=false; continue;
    }
    if(/^##\s+/.test(line)){
      section = line.replace(/^##\s+/,'').trim();
      inTable=false; headerPassed=false; isMedia=false; continue;
    }
    if(line.startsWith('|')){
      const cols = line.split('|').slice(1,-1);
      if(cols.every(c=>/^[-: ]+$/.test(c.trim()))){ if(inTable) headerPassed=true; continue; }
      if(!headerPassed){
        isMedia = cell(cols[0])==='#' && cols.some(c=>/titulo/i.test(c.trim()));
        inTable=true; continue;
      }
      if(inTable && headerPassed && isMedia){
        const id = parseInt(cell(cols[0]));
        if(!id || seen.has(id)) continue;
        const title = cell(cols[1]);
        if(!title || /já listado/i.test(title)) continue;
        seen.add(id);
        items.push({
          id, title,
          year:  parseInt(cell(cols[2]))||0,
          media: cell(cols[3])||'Filme',
          tipo:  cell(cols[4]).split(',').map(t=>t.trim()).filter(Boolean),
          erot:  parseInt(cell(cols[5]))||0,
          expl:  parseInt(cell(cols[6]))||0,
          prof:  parseInt(cell(cols[7]))||0,
          pert:  parseInt(cell(cols[8]))||0,
          tabu:  parseInt(cell(cols[9]))||0,
          rari:  parseInt(cell(cols[10]))||0,
          cult:  parseInt(cell(cols[11]))||0,
          rec:   cell(cols[12]).split(',').map(r=>r.trim()).filter(Boolean),
          notes: cell(cols[13])||'',
          nivel, section,
        });
      }
    } else { if(inTable){ inTable=false; headerPassed=false; isMedia=false; } }
  }
  return items;
}


/* ── POSTER ENGINE & API (api.js) ── */
function resolveUrl(id){
  const k = String(id);
  const toFull = v => !v ? null : v.startsWith('/') ? TMDB_IMG+v : v;
  if(k in posterEdits) return toFull(posterEdits[k]);
  if(k in POSTERS_JSON) return toFull(POSTERS_JSON[k]);
  if(k in posterAuto)  return toFull(posterAuto[k]);
  return undefined;
}

function applyPoster(id, url){
  const img = document.querySelector(`img[data-pid="${id}"]`);
  const shim = document.querySelector(`[data-shim="${id}"]`);
  const ph   = document.querySelector(`[data-ph="${id}"]`);
  const dot  = document.querySelector(`.no-poster-dot[data-pid="${id}"]`);
  if(!url){
    if(shim) shim.style.display='none';
    if(ph)   ph.style.display='flex';
    return;
  }
  if(!img) return;
  img.onload  = () => { if(shim) shim.style.display='none'; img.style.display='block'; if(dot) dot.style.display='none'; };
  img.onerror = () => { if(shim) shim.style.display='none'; if(ph) ph.style.display='flex'; posterAuto[String(id)]=null; savePosterAuto(); };
  img.src = url;
}

// Auto-fetch queue
const _Q = []; let _busy = false;
function enqueue(item){
  const k = String(item.id);
  if(k in posterEdits || k in POSTERS_JSON || k in posterAuto) return;
  if(_Q.find(i=>i.id===item.id)) return;
  _Q.push(item); processQ();
}
async function processQ(){
  if(_busy || !_Q.length) return;
  _busy=true; const item=_Q.shift();
  try { await autoFetch(item); }
  catch(e){ posterAuto[String(item.id)]=null; savePosterAuto(); }
  _busy=false; setTimeout(processQ, 100);
}

async function autoFetch(item){
  const isAnime = item.media==='Anime' || item.tipo.includes('AN');
  let url;
  if(isAnime){
    url = await tryJikan(item) || await tryTMDB(item,'tv') || await tryTMDB(item,'movie');
  } else {
    const isS = item.media==='Serie' || (item.tipo.includes('SE') && !item.tipo.includes('AN'));
    url = await tryTMDB(item, isS?'tv':'movie') || (!isS && await tryTMDB(item,'tv')) || await tryOMDB(item);
  }
  posterAuto[String(item.id)] = url || null;
  savePosterAuto();
  if(url) applyPoster(item.id, url);
  else applyPoster(item.id, null);
}

async function tryTMDB(item, type){
  try {
    const clean = item.title.replace(/\s*\(\d{4}\)\s*/g,'').replace(/\s*\(.*?\)\s*/g,'').replace(/\s+—.*/,'').trim();
    const q = encodeURIComponent(clean);
    const yp = item.year > 1900 ? `&${type==='tv'?'first_air_date_year':'year'}=${item.year}` : '';
    for(const lang of ['pt-BR','en-US']){
      const r = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${q}${yp}&language=${lang}`);
      if(!r.ok) continue;
      const d = await r.json();
      const results = (d.results||[]).filter(x=>x.poster_path);
      const hit = results.find(x=>{ const y=parseInt((x.release_date||x.first_air_date||'').slice(0,4)); return Math.abs(y-item.year)<=1; }) || results[0];
      if(hit?.poster_path) return TMDB_IMG+hit.poster_path;
    }
    return null;
  } catch(e){ return null; }
}
async function tryJikan(item){
  try {
    const clean = item.title.replace(/\s*\(.*?\)\s*/g,'').replace(/\s*:.*/,'').trim();
    const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(clean)}&limit=8`);
    if(!r.ok) return null;
    const d = await r.json();
    const results = (d.data||[]).filter(x=>x.images?.jpg?.large_image_url);
    const hit = results.find(x=>{ const y=x.aired?.prop?.from?.year; return y && Math.abs(y-item.year)<=1; }) || results[0];
    return hit?.images?.jpg?.large_image_url || null;
  } catch(e){ return null; }
}
async function tryOMDB(item){
  try {
    const clean = item.title.replace(/\s*\(.*?\)\s*/g,'').trim();
    const yp = item.year > 1900 ? `&y=${item.year}` : '';
    const r = await fetch(`https://www.omdbapi.com/?apikey=trilogy&t=${encodeURIComponent(clean)}${yp}`);
    if(!r.ok) return null;
    const d = await r.json();
    return (d.Poster && d.Poster!=='N/A') ? d.Poster : null;
  } catch(e){ return null; }
}

function loadPosters(data){ data.forEach(item=>{ const u=resolveUrl(item.id); if(u!==undefined) applyPoster(item.id,u); else enqueue(item); }); }

// DESCRIPTIONS
function getDesc(item){
  const k = String(item.id);
  if(descUser[k]) return {text:descUser[k], src:'sua descrição'};
  if(DESCS_JSON[k]) return {text:DESCS_JSON[k], src:'TMDB/MAL'};
  if(descAuto[k])  return {text:descAuto[k],  src:'TMDB/MAL'};
  return null;
}
async function fetchDesc(item){
  const k = String(item.id);
  if(descUser[k]||DESCS_JSON[k]||descAuto[k]) return;
  try {
    const isAnime = item.media==='Anime'||item.tipo.includes('AN');
    let text=null;
    if(isAnime){
      const clean = item.title.replace(/\s*\(.*?\)\s*/g,'').replace(/\s*:.*/,'').trim();
      const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(clean)}&limit=8`);
      if(r.ok){
        const d = await r.json();
        const hit = (d.data||[]).find(x=>{ const y=x.aired?.prop?.from?.year; return y&&Math.abs(y-item.year)<=1; })||(d.data||[])[0];
        if(hit?.synopsis) text=hit.synopsis.replace(/\[Written by MAL Rewrite\]/gi,'').replace(/\(Source:.*?\)/gi,'').trim().slice(0,400);
      }
    } else {
      const isS = item.media==='Serie'||(item.tipo.includes('SE')&&!item.tipo.includes('AN'));
      const type = isS?'tv':'movie';
      const clean = item.title.replace(/\s*\(\d{4}\)\s*/g,'').trim();
      const yp = item.year>1900?`&${type==='tv'?'first_air_date_year':'year'}=${item.year}`:'';
      for(const lang of ['pt-BR','en-US']){
        const r = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(clean)}${yp}&language=${lang}`);
        if(!r.ok) continue;
        const d = await r.json();
        const hit = (d.results||[]).find(x=>{ const y=parseInt((x.release_date||x.first_air_date||'').slice(0,4)); return Math.abs(y-item.year)<=1&&x.overview; })||(d.results||[]).find(x=>x.overview);
        if(hit?.overview){ text=hit.overview.trim().slice(0,400); break; }
      }
      if(!text){
        try{
          const tclean = item.title.replace(/\s*\(.*?\)\s*/g,'').trim();
          const yp2 = item.year>1900 ? `&y=${item.year}` : '';
          const r2 = await fetch(`https://www.omdbapi.com/?apikey=trilogy&t=${encodeURIComponent(tclean)}${yp2}`);
          if(r2.ok){
            const d2 = await r2.json();
            if(d2?.Plot && d2.Plot!=='N/A') text = String(d2.Plot).trim().slice(0,400);
          }
        }catch(e){}
      }
    }
    if(text){ descAuto[k]=text; saveDescAuto(); }
  } catch(e){}
}
function openDescEditor(){
  const item = MEDIA_DATA.find(m=>m.id===currentId);
  if(!item) return;
  const k = String(item.id);
  document.getElementById('deTitle').textContent = `#${item.id} — ${item.title}`;
  document.getElementById('deText').value = descUser[k]||'';
  const auto = descAuto[k]||DESCS_JSON[k];
  const box = document.getElementById('deAutoBox');
  if(auto){ document.getElementById('deAutoText').textContent=auto; box.style.display='block'; }
  else {
    box.style.display='none';
    fetchDesc(item).then(()=>{ const a=descAuto[k]; if(a){ document.getElementById('deAutoText').textContent=a; box.style.display='block'; } });
  }
  document.getElementById('deOverlay').classList.add('open');
}
function closeDE(){ document.getElementById('deOverlay').classList.remove('open'); }
function useAutoDesc(){
  const item = MEDIA_DATA.find(m=>m.id===currentId);
  if(!item) return;
  const auto = descAuto[String(item.id)]||DESCS_JSON[String(item.id)];
  if(auto) document.getElementById('deText').value=auto;
}
function saveDE(){
  const item = MEDIA_DATA.find(m=>m.id===currentId);
  if(!item) return;
  const k=String(item.id), txt=document.getElementById('deText').value.trim();
  if(txt){ descUser[k]=txt; DESCS_JSON[k]=txt; }
  else   { delete descUser[k]; delete DESCS_JSON[k]; }
  saveDescUser();
  closeDE();
  refreshModalDesc(item);
  showToast(txt?'✓ Descrição salva':'Descrição removida');
}
function deleteDE(){
  const item = MEDIA_DATA.find(m=>m.id===currentId);
  if(!item) return;
  delete descUser[String(item.id)]; delete DESCS_JSON[String(item.id)];
  saveDescUser(); closeDE(); refreshModalDesc(item);
  showToast('Descrição removida');
}
function refreshModalDesc(item){
  const el = document.getElementById('mDesc');
  if(!el) return;
  const d = getDesc(item);
  if(d) el.innerHTML=`${d.text} <span style="font-size:10px;color:var(--text3);">(${d.src})</span>`;
  else el.innerHTML='<span style="color:var(--text3)">Sem descrição.</span>';
}


/* ── POSTER EDITOR (posterEditor.js) ── */
function openPosterEditor(id){
  const item = MEDIA_DATA.find(m=>m.id===id);
  if(!item) return;
  currentId = id;
  document.getElementById('peId').value = id;
  document.getElementById('peTitle').textContent = `#${id} — ${item.title}`;
  const url = resolveUrl(id) || '';
  const img = document.getElementById('peImg');
  img.src = url; img.style.display = url ? 'block' : 'none';
  document.getElementById('peUrl').value = url;
  document.getElementById('peOverlay').classList.add('open');
}
function closePE(){ document.getElementById('peOverlay').classList.remove('open'); }
function pePreview(){
  const v = document.getElementById('peUrl').value.trim();
  const img = document.getElementById('peImg');
  if(!v){ img.style.display='none'; return; }
  img.src = v.startsWith('/') ? TMDB_IMG+v : v;
  img.style.display='block';
}
function savePE(){
  const id  = parseInt(document.getElementById('peId').value);
  const url = document.getElementById('peUrl').value.trim();
  const key = String(id);
  if(!url){
    delete posterEdits[key]; delete posterAuto[key]; delete POSTERS_JSON[key];
  } else {
    posterEdits[key] = url;
    POSTERS_JSON[key] = url;
  }
  savePosterEdits(); savePosterAuto();
  applyPoster(id, resolveUrl(id));
  updateModalPoster(id);
  redrawCard(id);
  closePE(); showToast('✓ Capa salva');
}
function deletePE(){
  const id = parseInt(document.getElementById('peId').value);
  const key = String(id);
  posterEdits[key]=null; delete posterAuto[key]; delete POSTERS_JSON[key];
  savePosterEdits(); savePosterAuto();
  applyPoster(id, null); redrawCard(id); closePE();
  showToast('Capa removida');
}
function redrawCard(id){
  const el = document.querySelector(`.card[data-id="${id}"]`);
  if(!el) return;
  const item = MEDIA_DATA.find(m=>m.id===id);
  if(item){ el.outerHTML = renderCard(item); loadPosters([item]); }
}


/* ── POSTER NAVIGATION (posterNav.js) ── */
let posterSources = [];
let posterSourceIdx = 0;

async function buildPosterSources(item) {
  const sources = [];
  const k = String(item.id);

  if (posterEdits[k] && posterEdits[k] !== null) {
    const v = posterEdits[k];
    sources.push({ url: v.startsWith('/') ? TMDB_IMG+v : v, label: 'Edit Manual' });
  }
  if (POSTERS_JSON[k]) {
    const v = POSTERS_JSON[k];
    const url = v.startsWith('/') ? TMDB_IMG+v : v;
    if (!sources.find(s=>s.url===url)) sources.push({ url, label: 'posters.json' });
  }
  if (posterAuto[k]) {
    const v = posterAuto[k];
    const url = v.startsWith('/') ? TMDB_IMG+v : v;
    if (!sources.find(s=>s.url===url)) sources.push({ url, label: 'Cache Auto' });
  }

  const isAnime = item.media==='Anime' || item.tipo.includes('AN');
  const isS = item.media==='Serie' || (item.tipo.includes('SE')&&!item.tipo.includes('AN'));
  const tmdbTypes = isAnime ? ['tv','movie'] : (isS ? ['tv','movie'] : ['movie','tv']);
  for (const type of tmdbTypes) {
    try {
      const clean = item.title.replace(/\s*\(\d{4}\)\s*/g,'').replace(/\s*\(.*?\)\s*/g,'').trim();
      const yp = item.year>1900 ? `&${type==='tv'?'first_air_date_year':'year'}=${item.year}` : '';
      for (const lang of ['pt-BR','en-US']) {
        const r = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(clean)}${yp}&language=${lang}`);
        if (!r.ok) continue;
        const d = await r.json();
        const results = (d.results||[]).filter(x=>x.poster_path);
        results.slice(0,3).forEach(x => {
          const url = TMDB_IMG+x.poster_path;
          if (!sources.find(s=>s.url===url)) {
            const y = parseInt((x.release_date||x.first_air_date||'').slice(0,4));
            sources.push({ url, label: `TMDB ${type.toUpperCase()} ${lang} (${y||'?'})` });
          }
        });
        if (sources.length >= 8) break;
      }
      if (sources.length >= 8) break;
    } catch(e) {}
  }

  if (isAnime) {
    try {
      const clean = item.title.replace(/\s*\(.*?\)\s*/g,'').replace(/\s*:.*/,'').trim();
      const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(clean)}&limit=5`);
      if (r.ok) {
        const d = await r.json();
        (d.data||[]).filter(x=>x.images?.jpg?.large_image_url).slice(0,3).forEach(x => {
          const url = x.images.jpg.large_image_url;
          if (!sources.find(s=>s.url===url)) {
            sources.push({ url, label: `MAL: ${(x.title_english||x.title||'').slice(0,20)}` });
          }
        });
      }
    } catch(e) {}
  }

  try {
    const clean = item.title.replace(/\s*\(.*?\)\s*/g,'').trim();
    const yp = item.year>1900?`&y=${item.year}`:'';
    const r = await fetch(`https://www.omdbapi.com/?apikey=trilogy&t=${encodeURIComponent(clean)}${yp}`);
    if (r.ok) {
      const d = await r.json();
      if (d.Poster && d.Poster!=='N/A' && !sources.find(s=>s.url===d.Poster)) {
        sources.push({ url: d.Poster, label: 'OMDB' });
      }
    }
  } catch(e) {}

  return sources.length > 0 ? sources : [{ url: null, label: 'Sem capa' }];
}

function navPoster(dir) {
  if (!posterSources.length) return;
  posterSourceIdx = (posterSourceIdx + dir + posterSources.length) % posterSources.length;
  showPosterSource(posterSourceIdx);
}

function showPosterSource(idx) {
  const src = posterSources[idx];
  const el = document.getElementById('mPoster');
  const label = document.getElementById('posterSrcLabel');
  const useBtn = document.getElementById('posterUseBtn');
  const item = MEDIA_DATA.find(m=>m.id===currentId);
  const icon = item?.media==='Anime'?'🎌':item?.tipo?.includes('SE')?'📺':'🎬';
  if (src?.url) {
    el.innerHTML = `<img src="${src.url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`;
  } else {
    el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;">${icon}</div>`;
  }
  if (label) label.textContent = `${idx+1}/${posterSources.length} · ${src?.label||''}`;
  if (useBtn) useBtn.style.display = src?.url ? 'block' : 'none';

  const prev = document.getElementById('posterPrev');
  const next = document.getElementById('posterNext');
  if (prev) prev.style.display = posterSources.length>1 ? 'flex' : 'none';
  if (next) next.style.display = posterSources.length>1 ? 'flex' : 'none';
}

function useCurrentPoster(){
  if(!currentId || !posterSources.length) return;
  const src = posterSources[posterSourceIdx];
  if(!src?.url) return;
  const k = String(currentId);
  posterEdits[k] = src.url;
  POSTERS_JSON[k] = src.url;
  savePosterEdits();
  applyPoster(currentId, resolveUrl(currentId));
  redrawCard(currentId);
  updateModalPoster(currentId);
  showToast('✓ Capa aplicada');
}


/* ── TAG LABELS & RENDER (render.js) ── */
const TL = window.TL = {
  L:'Lésbico',G:'Gay',T:'Trans',B:'Bi/Pan',H:'Hétero',Q:'Queer',
  X:'Tabu',V:'Voyeurismo',R:'Religião',Z:'Vampiro',C:'Comédia',
  SF:'Sci-Fi',PH:'Psicológico',BH:'Body Horror',TH:'Thriller',HR:'Horror',
  RO:'Romance',DR:'Drama',CR:'Crime',MY:'Mistério',MU:'Musical',DO:'Documentário',WS:'Western',
  EC:'Ecchi',HN:'Hentai',AN:'Anime',SE:'Série',OV:'OVA',
  BR:'Brasil',JP:'Japão',KR:'Coreia',HK:'HK',TW:'Taiwan',FR:'França',IT:'Itália',MX:'México',AR:'Argentina',
};
const LEVEL_COLORS = ['#6fcf6f','#f0c040','#f09040','#f06060','#c080ff'];
const LEVEL_NAMES  = ['Nível 1 — Sutil','Nível 2 — Erótico','Nível 3 — Muito Erótico','Nível 4 — Altamente Explícito','Nível 5 — Fronteira Pornô'];

function mediaClass(m){ return m==='Anime'?'ms-anime':m==='Serie'?'ms-serie':'ms-film'; }
function renderCard(item){
  const ud = userData[item.id]||{};
  const st = ud.status||'none';
  const sClass = st==='watched'?'watched':st==='watching'?'watching':st==='want'?'want':'';
  const ribbon = st==='watched'?'<div class="card-ribbon ribbon-watched">✓ VISTO</div>':
                 st==='watching'?'<div class="card-ribbon ribbon-watching">▶ VENDO</div>':
                 st==='want'?'<div class="card-ribbon ribbon-want">★ QUERO</div>':'';

  const skipInCard = new Set(['AN','SE','OV','BR','JP','KR','HK','TW','FR','IT','MX','AR','H']);
  const cardTags = item.tipo.filter(t=>!skipInCard.has(t)).slice(0,3);
  const tagsHtml = cardTags.map(t=>`<span class="tag t${t}" title="${TL[t]||t}">${TL[t]||t}</span>`).join('');

  const mediaBadge = `<span class="ms-badge ${mediaClass(item.media)}">${item.media==='Serie'?'SÉRIE':item.media.toUpperCase()}</span>`;
  let strip = mediaBadge;
  if(item.tipo.includes('AN')&&item.media!=='Anime') strip+=`<span class="ms-badge ms-anime">ANIME</span>`;
  if(item.tipo.includes('SE')&&item.media!=='Serie') strip+=`<span class="ms-badge ms-serie">SÉRIE</span>`;

  const hasPoster = (resolveUrl(item.id)!==null && resolveUrl(item.id)!==undefined);
  const noDot = hasPoster?'':`<div class="no-poster-dot" data-pid="${item.id}" title="Sem capa"></div>`;
  const safe = item.title.replace(/"/g,'&quot;');

  return `<div class="card ${sClass}" onclick="openModal(${item.id})" data-id="${item.id}">
    ${ribbon}
    <div class="card-poster">
      <div class="shimmer" data-shim="${item.id}"></div>
      <img src="" data-pid="${item.id}" alt="${safe}">
      <div class="poster-ph" data-ph="${item.id}" style="display:none">
        <div class="poster-ph-icon">${item.media==='Anime'?'🎌':item.tipo.includes('SE')?'📺':'🎬'}</div>
        <div class="poster-ph-title">${item.title}</div>
      </div>
      <div class="level-badge lv${item.nivel+1}">N${item.nivel+1}</div>
      <div class="media-strip">${strip}</div>
      ${noDot}
    </div>
    <div class="card-info">
      <span class="card-id">#${item.id}</span>
      <div class="card-title" title="${safe}">${item.title}</div>
      <div class="card-year">${item.year} · ${item.media}</div>
      <div class="card-tags">${tagsHtml}</div>
    </div>
  </div>`;
}

function getFiltered(){
  let data = [...MEDIA_DATA];
  if(activeSection!=='all') data=data.filter(i=>i.section===activeSection);
  if(activeMedia!=='all'){
    if(activeMedia==='Anime') data=data.filter(i=>i.media==='Anime'||i.tipo.includes('AN'));
    else if(activeMedia==='Serie') data=data.filter(i=>i.media==='Serie'||(i.tipo.includes('SE')&&!i.tipo.includes('AN')));
    else data=data.filter(i=>i.media==='Filme'&&!i.tipo.includes('AN')&&!i.tipo.includes('SE'));
  }
  if(activeTipo!=='all') data=data.filter(i=>i.tipo.includes(activeTipo));
  if(statusFilt!=='all'){
    data=data.filter(i=>{
      const ud=userData[i.id]; const s=ud?ud.status:'none';
      return s===(statusFilt==='none'?'none':statusFilt);
    });
  }
  if(searchQ){
    const q=searchQ.toLowerCase();
    data=data.filter(i=>i.title.toLowerCase().includes(q)||i.notes.toLowerCase().includes(q)||i.tipo.some(t=>(TL[t]||'').toLowerCase().includes(q)));
  }
  switch(sortMode){
    case 'az':  data.sort((a,b)=>a.title.localeCompare(b.title,'pt')); break;
    case 'za':  data.sort((a,b)=>b.title.localeCompare(a.title,'pt')); break;
    case 'new': data.sort((a,b)=>b.year-a.year); break;
    case 'old': data.sort((a,b)=>a.year-b.year); break;
    case 'prof':data.sort((a,b)=>b.prof-a.prof); break;
    case 'cult':data.sort((a,b)=>b.cult-a.cult); break;
    case 'erot':data.sort((a,b)=>b.erot-a.erot); break;
    case 'pert':data.sort((a,b)=>b.pert-a.pert); break;
    case 'rari':data.sort((a,b)=>b.rari-a.rari); break;
    case 'rec': {
      const p=buildProfile();
      if(p) data.sort((a,b)=>scoreItem(b,p)-scoreItem(a,p));
      break;
    }
  }
  return data;
}

function renderGrid(){
  const data = getFiltered();
  const mc = document.getElementById('mainContent');

  const allW = Object.values(userData).filter(u=>u.status==='watched').length;
  const allV = Object.values(userData).filter(u=>u.status==='watching').length;
  const allWt= Object.values(userData).filter(u=>u.status==='want').length;
  document.getElementById('stTotal').textContent   = data.length;
  document.getElementById('stWatched').textContent = allW;
  document.getElementById('stWatching').textContent= allV;
  document.getElementById('stWant').textContent    = allWt;

  const byM = {Filme:0,Serie:0,Anime:0};
  data.forEach(i=>{
    if(i.media==='Anime'||i.tipo.includes('AN')) byM.Anime++;
    else if(i.media==='Serie'||(i.tipo.includes('SE')&&!i.tipo.includes('AN'))) byM.Serie++;
    else byM.Filme++;
  });
  document.getElementById('stFilme').textContent = byM.Filme;
  document.getElementById('stSerie').textContent = byM.Serie;
  document.getElementById('stAnime').textContent = byM.Anime;

  if(!data.length){
    mc.innerHTML=`<div class="empty"><div class="empty-icon">🎬</div><div class="empty-msg">Nenhuma mídia encontrada.</div></div>`;
    return;
  }

  let html='';

  if(activeSection==='all'&&activeMedia==='all'&&activeTipo==='all'&&!searchQ&&statusFilt==='all'&&sortMode==='default'){
    const recs = getRecommendations(16);
    if(recs.length){
      html+=`<div class="recs-strip">
        <div class="recs-title">✦ Recomendados para você</div>
        <div class="recs-scroll" id="recsScroll">${recs.map(i=>{
          const u=resolveUrl(i.id)||'';
          return `<div class="rec-card" onclick="openModal(${i.id})">
            ${u?`<img class="rec-poster" src="${u}" onerror="this.style.background='var(--surface2)'">`
              :`<div class="rec-poster" style="display:flex;align-items:center;justify-content:center;font-size:28px;">${i.media==='Anime'?'🎌':i.tipo.includes('SE')?'📺':'🎬'}</div>`}
            <div class="rec-title">${i.title}</div>
          </div>`;
        }).join('')}</div></div>`;
    }
  }

  if(activeSection==='all'&&sortMode==='default'&&activeMedia==='all'){
    const secOrder = [...new Set(MEDIA_DATA.map(i=>i.section))];
    const byS = {};
    data.forEach(i=>{ if(!byS[i.section]) byS[i.section]=[]; byS[i.section].push(i); });
    secOrder.forEach(sec=>{
      if(!byS[sec]) return;
      const items=byS[sec];
      const color=LEVEL_COLORS[items[0].nivel]||'var(--text2)';
      const mCounts={Filme:0,Serie:0,Anime:0};
      items.forEach(i=>{
        if(i.media==='Anime'||i.tipo.includes('AN')) mCounts.Anime++;
        else if(i.media==='Serie') mCounts.Serie++;
        else mCounts.Filme++;
      });
      const pills=[
        mCounts.Filme?`<span class="sec-media-pill" style="background:#1a2040;color:var(--film)">🎬 ${mCounts.Filme}</span>`:'',
        mCounts.Serie?`<span class="sec-media-pill" style="background:#102a1a;color:var(--serie)">📺 ${mCounts.Serie}</span>`:'',
        mCounts.Anime?`<span class="sec-media-pill" style="background:#2a1010;color:var(--anime)">🎌 ${mCounts.Anime}</span>`:'',
      ].filter(Boolean).join('');
      html+=`<div class="section-head">
        <div class="sec-title" style="color:${color}">${sec}</div>
        <div class="sec-count">${items.length}</div>
        <div class="sec-line"></div>
        <div class="sec-media">${pills}</div>
      </div>
      <div class="grid">${items.map(renderCard).join('')}</div>`;
    });
  } else if(activeMedia!=='all'){
    const secOrder=[...new Set(MEDIA_DATA.map(i=>i.section))];
    const byS={};
    data.forEach(i=>{ if(!byS[i.section]) byS[i.section]=[]; byS[i.section].push(i); });
    secOrder.forEach(sec=>{
      if(!byS[sec]) return;
      const items=byS[sec];
      const color=LEVEL_COLORS[items[0].nivel]||'var(--text2)';
      html+=`<div class="section-head"><div class="sec-title" style="color:${color}">${sec}</div><div class="sec-count">${items.length}</div><div class="sec-line"></div></div><div class="grid">${items.map(renderCard).join('')}</div>`;
    });
  } else {
    html+=`<div class="grid">${data.map(renderCard).join('')}</div>`;
  }

  mc.innerHTML=html;
  loadPosters(data);
}

function buildNavTabs(){
  const sections=[...new Set(MEDIA_DATA.map(i=>i.section))];
  const nt=document.getElementById('navTabs');
  nt.innerHTML=`<div class="nav-tab active" data-s="all">Tudo <span class="tab-count">${MEDIA_DATA.length}</span></div>`+
    sections.map(s=>{
      const cnt=MEDIA_DATA.filter(i=>i.section===s).length;
      const label=s.length>22?s.slice(0,20)+'…':s;
      return `<div class="nav-tab" data-s="${s.replace(/"/g,'&quot;')}" title="${s}">${label} <span class="tab-count">${cnt}</span></div>`;
    }).join('');
  nt.addEventListener('click',e=>{
    const t=e.target.closest('.nav-tab');
    if(!t) return;
    document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    activeSection=t.dataset.s;
    renderGrid();
  });
}

function updateMediaCounts(){
  const m={Filme:0,Serie:0,Anime:0};
  MEDIA_DATA.forEach(i=>{
    if(i.media==='Anime'||i.tipo.includes('AN')) m.Anime++;
    else if(i.media==='Serie') m.Serie++;
    else m.Filme++;
  });
  const total = MEDIA_DATA.length;
  document.getElementById('cnt-all').textContent   = total;
  document.getElementById('cnt-filme').textContent  = m.Filme;
  document.getElementById('cnt-serie').textContent  = m.Serie;
  document.getElementById('cnt-anime').textContent  = m.Anime;
}


/* ── RECOMMENDATIONS (recommendations.js) ── */
const REC_LABELS={BTS:'Beyond Two Souls',LIS:'Life is Strange',RH:'Rocky Horror',LB:'Look Back',VD:'Videodrome',CE:'Celeste',BR:'Blade Runner',DD:'Donnie Darko'};

function buildProfile(){
  const wIds=Object.entries(userData).filter(([,v])=>v.status==='watched'||v.status==='watching').map(([id])=>parseInt(id));
  if(!wIds.length) return null;
  const watched=MEDIA_DATA.filter(m=>wIds.includes(m.id));
  const recent=watched.slice(-15);
  const tipoS={}, recS={}, nivelD={}, mediaS={Filme:0,Serie:0,Anime:0};
  const add=(items,w)=>items.forEach(i=>{
    i.tipo.forEach(t=>{ tipoS[t]=(tipoS[t]||0)+w; });
    i.rec.forEach(r=>{ recS[r]=(recS[r]||0)+w; });
    nivelD[i.nivel]=(nivelD[i.nivel]||0)+w;
    const mk=i.media==='Anime'||i.tipo.includes('AN')?'Anime':i.media==='Serie'?'Serie':'Filme';
    mediaS[mk]=(mediaS[mk]||0)+w;
  });
  add(watched,1); add(recent,2);
  Object.entries(userData).forEach(([id,ud])=>{
    if(!ud.rating) return;
    const item=MEDIA_DATA.find(m=>m.id===parseInt(id));
    if(!item) return;
    const w=ud.rating/5*2;
    add([item],w);
  });
  return {tipoS,recS,nivelD,mediaS,watchedIds:wIds};
}
function scoreItem(item,p){
  if(p.watchedIds.includes(item.id)) return -1;
  let s=0;
  item.tipo.forEach(t=>{ s+=(p.tipoS[t]||0)*3; });
  item.rec.forEach(r=>{ s+=(p.recS[r]||0)*5; });
  const topN=Object.entries(p.nivelD).sort((a,b)=>b[1]-a[1])[0];
  if(topN){ const diff=Math.abs(item.nivel-parseInt(topN[0])); s+=Math.max(0,3-diff)*2; }
  const watchedNotes=MEDIA_DATA.filter(m=>p.watchedIds.includes(m.id)).map(m=>m.notes.toLowerCase()).join(' ');
  item.notes.toLowerCase().split(/\s+/).filter(w=>w.length>4).forEach(w=>{ if(watchedNotes.includes(w)) s+=1; });
  return s;
}
function getRecommendations(limit=12){
  const p=buildProfile();
  if(!p) return [];
  return MEDIA_DATA
    .map(i=>({i,s:scoreItem(i,p)}))
    .filter(x=>x.s>0)
    .sort((a,b)=>b.s-a.s)
    .slice(0,limit)
    .map(x=>x.i);
}
function getSimilar(item,limit=8){
  return MEDIA_DATA
    .filter(m=>m.id!==item.id)
    .map(m=>{
      let s=0;
      const shT=m.tipo.filter(t=>item.tipo.includes(t)).length; s+=shT*4;
      const shR=m.rec.filter(r=>item.rec.includes(r)).length; s+=shR*6;
      if(m.media===item.media) s+=2;
      if(m.section===item.section) s+=3;
      if(Math.abs(m.nivel-item.nivel)<=1) s+=2;
      return {m,s};
    })
    .filter(x=>x.s>=6)
    .sort((a,b)=>b.s-a.s)
    .slice(0,limit)
    .map(x=>x.m);
}


/* ── MODAL (modal.js) ── */
const SCORE_META={
  erot:{n:'Erotismo',c:'#e8473f'},expl:{n:'Explicitude',c:'#ff6644'},
  prof:{n:'Profundidade',c:'#7c6cfc'},pert:{n:'Perturbação',c:'#ff9933'},
  tabu:{n:'Tabu',c:'#ff4444'},rari:{n:'Raridade',c:'#44aaff'},cult:{n:'Cult/Arte',c:'#f0a500'},
};

function openModal(id){
  const item=MEDIA_DATA.find(m=>m.id===id);
  if(!item) return;
  currentId=id;
  const ud=userData[id]||{};

  document.getElementById('mTitle').textContent=item.title;
  const sub=document.getElementById('mSub');
  sub.innerHTML=[
    `<span>${item.year}</span>`,
    `<span class="modal-sub-sep">·</span>`,
    `<span style="color:${item.media==='Anime'?'var(--anime)':item.media==='Serie'?'var(--serie)':'var(--film)'}">${item.media==='Serie'?'Série':item.media}</span>`,
  ].join('');

  document.getElementById('mTags').innerHTML=item.tipo.map(t=>`<span class="tag t${t}">${TL[t]||t}</span>`).join('');

  document.getElementById('mScores').innerHTML=Object.entries(SCORE_META).map(([k,m])=>{
    const v=item[k]||0;
    return `<div class="score-row">
      <div class="score-name">${m.n}</div>
      <div class="score-bar-wrap">
        <div class="score-bar"><div class="score-fill" style="width:${v/5*100}%;background:${m.c}"></div></div>
        <div class="score-val" style="color:${m.c}">${v}</div>
      </div>
    </div>`;
  }).join('');

  updateModalPoster(id);
  if(resolveUrl(id)===undefined){
    autoFetch(item).then(()=>{ if(currentId===id) updateModalPoster(id); });
  }

  const descEl=document.getElementById('mDesc');
  const d=getDesc(item);
  if(d){ descEl.innerHTML=`${d.text} <span style="font-size:10px;color:var(--text3)">(${d.src})</span>`; }
  else {
    descEl.innerHTML='<span style="color:var(--text3)">Buscando descrição...</span>';
    fetchDesc(item).then(()=>{
      if(currentId!==id) return;
      const d2=getDesc(item);
      if(d2) descEl.innerHTML=`${d2.text} <span style="font-size:10px;color:var(--text3)">(${d2.src})</span>`;
      else descEl.innerHTML='<span style="color:var(--text3)">Sem descrição. Clique em Editar.</span>';
    });
  }

  const kws=document.getElementById('mKeywords');
  if(item.notes){
    const words=item.notes.split(/[.·,+]/).map(w=>w.trim()).filter(w=>w.length>1&&w.length<40);
    kws.innerHTML=words.map(w=>`<span class="kw">${w}</span>`).join('');
  } else kws.innerHTML='';

  const recEl=document.getElementById('mRec');
  recEl.innerHTML=item.rec.map(r=>`<span class="rec-tag">${r} — ${REC_LABELS[r]||r}</span>`).join('');

  const sim=getSimilar(item,8);
  const simSec=document.getElementById('mSimSection');
  const simEl=document.getElementById('mSimilar');
  if(sim.length){
    simSec.style.display='block';
    simEl.innerHTML=sim.map(s=>{
      const u=resolveUrl(s.id)||'';
      const icon=s.media==='Anime'?'🎌':s.tipo.includes('SE')?'📺':'🎬';
      return `<div class="sim-card" onclick="closeModal();setTimeout(()=>openModal(${s.id}),80)" title="${s.title}">
        ${u?`<img class="sim-poster" src="${u}" onerror="this.style.background='var(--surface2)'">`
          :`<div class="sim-poster" style="display:flex;align-items:center;justify-content:center;font-size:22px;">${icon}</div>`}
        <div class="sim-title">${s.title}</div>
      </div>`;
    }).join('');
  } else simSec.style.display='none';

  setStatusUI(ud.status||'none');
  const hasStatus=ud.status&&ud.status!=='none';
  document.getElementById('extraFields').style.display=hasStatus?'block':'none';
  const isEp=item.tipo.includes('SE')||item.media==='Anime'||item.media==='Serie';
  document.getElementById('fEpGroup').style.display=isEp?'flex':'none';
  currentRating=ud.rating||0; renderStars(currentRating);
  document.getElementById('fDate').value=ud.date||'';
  document.getElementById('fReview').value=ud.review||'';
  document.getElementById('fEpisode').value=ud.episode||'';

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}

function updateModalPoster(id) {
  const item = MEDIA_DATA.find(m=>m.id===id);
  if (!item) return;
  const url = resolveUrl(id);
  const icon = item.media==='Anime'?'🎌':item.tipo.includes('SE')?'📺':'🎬';
  const el = document.getElementById('mPoster');
  if (url) {
    el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`;
  } else {
    el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;">${icon}</div>`;
  }
  const label = document.getElementById('posterSrcLabel');
  if (label) label.textContent = '';
  const useBtn = document.getElementById('posterUseBtn');
  if (useBtn) useBtn.style.display = 'none';
  const prev = document.getElementById('posterPrev');
  const next = document.getElementById('posterNext');
  if (prev) prev.style.display = 'none';
  if (next) next.style.display = 'none';
  posterSources = []; posterSourceIdx = 0;
  buildPosterSources(item).then(srcs => {
    if (currentId !== id) return;
    posterSources = srcs;
    const curUrl = url;
    const found = srcs.findIndex(s=>s.url===curUrl);
    posterSourceIdx = found >= 0 ? found : 0;
    showPosterSource(posterSourceIdx);
  });
}

function closeModal(){
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow='';
}

function setStatusUI(st){
  ['sWatched','sWatching','sWant','sNone'].forEach(id=>document.getElementById(id).className='status-btn');
  if(st==='watched')  document.getElementById('sWatched').classList.add('s-watched');
  else if(st==='watching') document.getElementById('sWatching').classList.add('s-watching');
  else if(st==='want') document.getElementById('sWant').classList.add('s-want');
}
function setStatus(st){
  setStatusUI(st);
  if(!userData[currentId]) userData[currentId]={};
  userData[currentId].status=st;
  document.getElementById('extraFields').style.display=(st&&st!=='none')?'block':'none';
}
function renderStars(v){
  document.querySelectorAll('.star').forEach((s,i)=>{ s.className=i<v?'star on':'star'; });
}
function saveEntry(){
  if(!currentId) return;
  if(!userData[currentId]) userData[currentId]={};
  const ud=userData[currentId];
  ud.rating=currentRating;
  ud.date=document.getElementById('fDate').value;
  ud.review=document.getElementById('fReview').value;
  ud.episode=document.getElementById('fEpisode').value;
  saveUserData(); renderGrid(); closeModal(); showToast('✓ Salvo!');
}


/* ── ROULETTE (roulette.js) ── */
function openRoulette(){ setRouFilter('all'); document.getElementById('rouletteOverlay').classList.add('open'); }
function closeRoulette(){ document.getElementById('rouletteOverlay').classList.remove('open'); }
function setRouFilter(f){
  rouFilter=f;
  ['rouAll','rouNoPoster','rouFilme','rouSerie','rouAnime'].forEach(id=>{
    document.getElementById(id).className='btn';
  });
  const activeId={all:'rouAll',noposter:'rouNoPoster',Filme:'rouFilme',Serie:'rouSerie',Anime:'rouAnime'}[f];
  if(activeId) document.getElementById(activeId).className='btn primary';
  renderRoulette();
}
function renderRoulette(){
  let items=[...MEDIA_DATA];
  if(rouFilter==='noposter') items=items.filter(i=>resolveUrl(i.id)===null||resolveUrl(i.id)===undefined);
  else if(rouFilter!=='all'){
    if(rouFilter==='Anime') items=items.filter(i=>i.media==='Anime'||i.tipo.includes('AN'));
    else if(rouFilter==='Serie') items=items.filter(i=>i.media==='Serie');
    else items=items.filter(i=>i.media==='Filme'&&!i.tipo.includes('AN'));
  }
  const grid=document.getElementById('rouletteGrid');
  grid.innerHTML=items.map(item=>{
    const url=resolveUrl(item.id);
    const cls=url?'rou-card has-poster':'rou-card no-poster';
    return `<div class="${cls}" onclick="rouletteClick(${item.id})" title="${item.title}">
      ${url?`<img class="rou-img" src="${url}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:''}
      <div class="rou-ph" style="display:${url?'none':'flex'}">
        <span style="font-size:16px">${item.media==='Anime'?'🎌':item.tipo.includes('SE')?'📺':'🎬'}</span>
        <span>${item.title.slice(0,20)}</span>
      </div>
      <div class="rou-num">#${item.id}</div>
      <div class="rou-title">${item.title}</div>
    </div>`;
  }).join('');
}
function rouletteClick(id){
  closeRoulette();
  setTimeout(()=>openModal(id),100);
}


/* ── SYNC ENGINE (sync.js) ── */
function getSyncMeta(){ try{ return JSON.parse(localStorage.getItem(LS_SYNC)||'{}'); }catch(e){ return {}; } }
function saveSyncMeta(m){ localStorage.setItem(LS_SYNC,JSON.stringify(m)); }

function toggleSync(){
  const m=document.getElementById('syncMenu');
  const open=m.classList.toggle('open');
  if(open) updateSyncStats();
}
document.addEventListener('click',e=>{
  const fab=document.querySelector('.sync-fab');
  const menu=document.getElementById('syncMenu');
  if(fab&&menu&&!fab.contains(e.target)&&!menu.contains(e.target)) menu.classList.remove('open');
});

function updateSyncStats(){
  const watched=Object.values(userData).filter(u=>u.status==='watched').length;
  const watching=Object.values(userData).filter(u=>u.status==='watching').length;
  const want=Object.values(userData).filter(u=>u.status==='want').length;
  const pe=Object.values(posterEdits).filter(Boolean).length;
  const pa=Object.values(posterAuto).filter(Boolean).length;
  const du=Object.keys(descUser).length;
  document.getElementById('syncStats').innerHTML=`
    <div class="sync-stat"><div class="sync-stat-n">${watched}</div><div class="sync-stat-l">Vistos</div></div>
    <div class="sync-stat"><div class="sync-stat-n">${watching}</div><div class="sync-stat-l">Vendo</div></div>
    <div class="sync-stat"><div class="sync-stat-n">${want}</div><div class="sync-stat-l">Quero</div></div>
    <div class="sync-stat"><div class="sync-stat-n">${pe+pa}</div><div class="sync-stat-l">Capas</div></div>
    <div class="sync-stat"><div class="sync-stat-n">${du}</div><div class="sync-stat-l">Descs</div></div>
    <div class="sync-stat"><div class="sync-stat-n">${Object.keys(userData).length}</div><div class="sync-stat-l">Itens</div></div>`;
  const meta=getSyncMeta();
  if(meta.lastExport){
    const d=new Date(meta.lastExport);
    document.getElementById('syncLast').textContent=`Export: ${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
  }
}

function exportData(){
  const postersNew={};
  Object.entries(posterAuto).forEach(([k,v])  =>{ if(v&&!POSTERS_JSON[k]) postersNew[k]=v; });
  Object.entries(posterEdits).forEach(([k,v]) =>{ if(!(k in POSTERS_JSON)||v!==POSTERS_JSON[k]) postersNew[k]=v; });
  let profile={};
  try{ profile=JSON.parse(localStorage.getItem(LS_PROF)||'{}'); }catch(e){}
  const payload={
    _version:3, _exportedAt:new Date().toISOString(), _device:navigator.userAgent.slice(0,80),
    userData, profile, descriptions_user:{...DESCS_JSON,...descUser}, posters_new:postersNew,
    _stats:{
      watched:Object.values(userData).filter(u=>u.status==='watched').length,
      watching:Object.values(userData).filter(u=>u.status==='watching').length,
      want:Object.values(userData).filter(u=>u.status==='want').length,
      posters_new:Object.keys(postersNew).length,
      descriptions:Object.keys({...DESCS_JSON,...descUser}).length,
    },
  };
  dlJSON(payload, `megalist-userdata-${new Date().toISOString().slice(0,10)}.json`);
  saveSyncMeta({...getSyncMeta(), lastExport:new Date().toISOString()});
  updateSyncStats();
  showToast('✓ userdata.json exportado');
}

function importData(ev){
  const file=ev.target.files[0]; if(!file) return; ev.target.value='';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const p=JSON.parse(e.target.result);
      if(!p.userData&&!p.posters_new&&!p.posters){ showToast('❌ Arquivo inválido'); return; }
      const posNew=p.posters_new||p.posters||{};
      const stats=p._stats||{};
      const watched=stats.watched??Object.values(p.userData||{}).filter(u=>u.status==='watched').length;
      const pc=Object.keys(posNew).filter(k=>posNew[k]).length;
      const dc=Object.keys(p.descriptions_user||p.descriptions||{}).length;
      const date=p._exportedAt?new Date(p._exportedAt).toLocaleString('pt-BR'):'desconhecida';
      const ok=window.confirm(`Importar backup de ${date}?\n\n• ${watched} visto(s)\n• ${pc} capa(s)\n• ${dc} descrição(ões)\n\nDados locais serão substituídos.`);
      if(!ok) return;
      if(p.userData){ userData=p.userData; saveUserData(); }
      if(p.profile) localStorage.setItem(LS_PROF,JSON.stringify(p.profile));
      const descs=p.descriptions_user||p.descriptions;
      if(descs){ Object.assign(DESCS_JSON,descs); Object.assign(descUser,descs); saveDescUser(); }
      Object.entries(posNew).forEach(([k,v])=>{
        if(!v){ posterEdits[k]=null; delete posterAuto[k]; delete POSTERS_JSON[k]; }
        else{ POSTERS_JSON[k]=v; posterEdits[k]=v; }
      });
      savePosterEdits(); savePosterAuto();
      saveSyncMeta({...getSyncMeta(), lastImport:new Date().toISOString()});
      renderGrid(); updateSyncStats();
      showToast(`✓ Importado! ${watched} itens, ${pc} capas`);
    }catch(err){ showToast(`❌ Erro: ${err.message}`); }
  };
  reader.readAsText(file);
}

// Constrói o objeto media-data unificado (capas + descrições) do estado atual em memória
function buildMediaDataJson(){
  const postersMerged = {...POSTERS_JSON};
  Object.entries(posterAuto).forEach(([k,v])  => { if(v) postersMerged[k]=v; });
  Object.entries(posterEdits).forEach(([k,v]) => { if(v===null) delete postersMerged[k]; else if(v) postersMerged[k]=v; });
  const postersSorted={};
  Object.keys(postersMerged).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ postersSorted[k]=postersMerged[k]; });

  const allDescs = {...DESCS_JSON, ...descUser};
  const descSorted={};
  Object.keys(allDescs).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ descSorted[k]=allDescs[k]; });

  return { _version:1, _updatedAt:new Date().toISOString(), posters:postersSorted, descriptions:descSorted };
}

// Exporta capas + descrições como media-data.json (único ponto de download desses dados)
function exportMediaDataJson(){
  dlJSON(buildMediaDataJson(), 'media-data.json');
  showToast('✓ media-data.json exportado — substitua na pasta');
}

// Alias legado para manter compatibilidade com botões existentes
function flushLocalToFiles(){ exportMediaDataJson(); }
function confirmClear(){
  const ok=window.confirm('Apagar TODOS os dados locais?\n\nFaça um export antes!');
  if(!ok) return;
  [LS_USER,LS_EDITS,LS_AUTO,LS_DAUTO,LS_DESC,LS_PROF,LS_SYNC].forEach(k=>localStorage.removeItem(k));
  userData={}; posterEdits={}; posterAuto={}; descUser={}; descAuto={};
  renderGrid(); updateSyncStats(); showToast('Dados apagados');
}
function dlJSON(obj,name){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function showToast(m){
  const t=document.getElementById('toast');
  t.textContent=m; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}


/* ── EVENTS & INIT (events.js) ── */
document.getElementById('searchInput').addEventListener('input',e=>{ searchQ=e.target.value; renderGrid(); });
document.getElementById('sortSel').addEventListener('change',e=>{ sortMode=e.target.value; document.getElementById('sortSelMob').value=e.target.value; renderGrid(); });
document.getElementById('statusSel').addEventListener('change',e=>{ statusFilt=e.target.value; document.getElementById('statusSelMob').value=e.target.value; renderGrid(); });
document.getElementById('sortSelMob').addEventListener('change',e=>{ sortMode=e.target.value; document.getElementById('sortSel').value=e.target.value; renderGrid(); });
document.getElementById('statusSelMob').addEventListener('change',e=>{ statusFilt=e.target.value; document.getElementById('statusSel').value=e.target.value; renderGrid(); });

// MEDIA PILLS
document.querySelector('.media-pills').addEventListener('click',e=>{
  const btn=e.target.closest('.mpill');
  if(!btn) return;
  document.querySelectorAll('.mpill').forEach(b=>b.className='mpill');
  const m=btn.dataset.m;
  btn.className='mpill '+(m==='all'?'active-all':m==='Filme'?'active-film':m==='Serie'?'active-serie':'active-anime');
  activeMedia=m; renderGrid();
});

// CHIPS BAR
document.getElementById('chipsBar').addEventListener('click',e=>{
  const chip=e.target.closest('.chip[data-tipo]');
  if(!chip) return;
  document.querySelectorAll('.chip[data-tipo]').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active');
  activeTipo=chip.dataset.tipo; renderGrid();
  document.querySelectorAll('.ham-chips .chip[data-tipo]').forEach(c=>{
    c.classList.toggle('active', c.dataset.tipo===chip.dataset.tipo);
  });
});

// HAMBURGER
function openHam(){
  const groups=[
    {id:'hChipId',tipos:['all','L','G','T','B','H']},
    {id:'hChipGenre',tipos:['SF','PH','BH','HR','TH','CR','MU','DO','RO','DR']},
    {id:'hChipTheme',tipos:['X','V','R','Z','C','EC','HN']},
    {id:'hChipOrigin',tipos:['BR','JP','KR','FR','HK']},
  ];
  const TLref=window.TL||{all:'Todos',L:'Lésbico',G:'Gay',T:'Trans',B:'Bi/Pan',H:'Hétero',SF:'Sci-Fi',PH:'Psicológico',BH:'Body Horror',HR:'Horror',TH:'Thriller',CR:'Crime',MU:'Musical',DO:'Documentário',RO:'Romance',DR:'Drama',X:'Tabu',V:'Voyeurismo',R:'Religião',Z:'Vampiro',C:'Comédia',EC:'Ecchi',HN:'Hentai',BR:'Brasil',JP:'Japão',KR:'Coreia',FR:'França',HK:'Hong Kong'};
  groups.forEach(g=>{
    const el=document.getElementById(g.id);
    if(!el) return;
    el.innerHTML=g.tipos.map(t=>`<span class="chip${activeTipo===t?' active':''}" data-tipo="${t}" onclick="setTipoFilter('${t}')">${TLref[t]||t}</span>`).join('');
  });
  document.getElementById('hamOverlay').classList.add('open');
  document.getElementById('hamDrawer').classList.add('open');
}
function closeHam(){
  document.getElementById('hamOverlay').classList.remove('open');
  document.getElementById('hamDrawer').classList.remove('open');
}
function setTipoFilter(tipo){
  activeTipo=tipo;
  document.querySelectorAll('.chip[data-tipo]').forEach(c=>c.classList.toggle('active',c.dataset.tipo===tipo));
  renderGrid();
}
function clearFilters(){
  activeTipo='all'; sortMode='default'; statusFilt='all'; searchQ=''; activeMedia='all';
  document.getElementById('searchInput').value='';
  document.getElementById('sortSel').value='default';
  document.getElementById('sortSelMob').value='default';
  document.getElementById('statusSel').value='all';
  document.getElementById('statusSelMob').value='all';
  document.querySelectorAll('.mpill').forEach(b=>b.className='mpill');
  document.getElementById('mpAll').className='mpill active-all';
  document.querySelectorAll('.chip[data-tipo]').forEach(c=>c.classList.toggle('active',c.dataset.tipo==='all'));
  renderGrid(); closeHam();
}

// STAR RATING
document.getElementById('starRow').addEventListener('click',e=>{
  const s=e.target.closest('.star'); if(!s) return;
  currentRating=parseInt(s.dataset.v); renderStars(currentRating);
});
document.getElementById('starRow').addEventListener('mouseover',e=>{
  const s=e.target.closest('.star'); if(!s) return;
  const v=parseInt(s.dataset.v);
  document.querySelectorAll('.star').forEach((x,i)=>x.className=i<v?'star on':'star');
});
document.getElementById('starRow').addEventListener('mouseout',()=>renderStars(currentRating));

document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeModal(); closePE(); closeDE(); closeRoulette(); } });
document.getElementById('modalOverlay').addEventListener('click',e=>{ if(e.target===document.getElementById('modalOverlay')) closeModal(); });

// INIT
async function init(){
  loadLS();
  try{
    const prof=JSON.parse(localStorage.getItem(LS_PROF)||'{}');
    const img=document.getElementById('navAvatar');
    if(img){
      img.src = prof?.avatarUrl || 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#1a1a28"/><text x="50%" y="54%" font-size="34" text-anchor="middle" fill="#505070" font-family="Arial">👤</text></svg>`);
    }
  }catch(e){}
  const setNavH=()=>{
    const nav=document.querySelector('nav');
    if(nav) document.documentElement.style.setProperty('--navH', `${nav.offsetHeight}px`);
  };
  setNavH();
  window.addEventListener('resize',()=>setTimeout(setNavH,60));
  document.getElementById('mainContent').innerHTML=`<div class="empty"><div class="empty-icon">⏳</div><div class="empty-msg">Carregando dados...</div></div>`;

  try {
    const [mdR, mdataR] = await Promise.all([
      fetch('movie-list.md').catch(err => { throw new Error('Não foi possível acessar movie-list.md na raiz.'); }),
      fetch('media-data.json').catch(() => null)
    ]);

    if (!mdR.ok) {
      if (window.location.protocol === 'file:') {
        throw new Error('O navegador bloqueia o carregamento de arquivos locais (protocolo file://). Por favor, use um servidor local (Live Server no VS Code ou python -m http.server).');
      }
      throw new Error(`Erro HTTP ${mdR.status}: Não foi possível carregar a lista de filmes.`);
    }

    const md = await mdR.text();

    if (mdataR && mdataR.ok) {
      try {
        const mdata = await mdataR.json();
        if (mdata.posters) POSTERS_JSON = { ...mdata.posters, ...POSTERS_JSON };
        if (mdata.descriptions) DESCS_JSON = { ...mdata.descriptions, ...DESCS_JSON };
      } catch (e) {
        console.warn('Erro ao processar media-data.json:', e);
      }
    }

    Object.assign(DESCS_JSON, descUser);
    MEDIA_DATA = parseMarkdown(md);

    if (!MEDIA_DATA.length) throw new Error('O arquivo movie-list.md parece estar vazio ou em formato inválido.');

    buildNavTabs();
    updateMediaCounts();
    renderGrid();
    setNavH();

  } catch (err) {
    console.error('Erro no INIT:', err);
    document.getElementById('mainContent').innerHTML = `<div class="empty">
      <div class="empty-icon">⚠️</div>
      <div class="empty-msg">
        <strong>Erro ao carregar:</strong> ${err.message}<br><br>
        <div style="font-size:11px; color:var(--text3); text-align:left; max-width:400px; margin:0 auto; line-height:1.6;">
          • Verifique se a pasta <code>assets/data/</code> contém os arquivos <code>movie-list.md</code> e <code>media-data.json</code>.<br>
          • Se estiver no GitHub Pages, certifique-se de que os nomes dos arquivos estão exatamente como no código (case-sensitive).<br>
          • No VS Code, use a extensão <strong>Live Server</strong> para rodar o projeto corretamente.
        </div>
      </div>
    </div>`;
  }
}
init();
