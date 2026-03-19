
// ═══════════════════════════════════════════
// TAG LABELS
// ═══════════════════════════════════════════
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

// ═══════════════════════════════════════════
// RENDER CARD
// ═══════════════════════════════════════════
function mediaClass(m){ return m==='Anime'?'ms-anime':m==='Serie'?'ms-serie':'ms-film'; }
function renderCard(item){
  const ud = userData[item.id]||{};
  const st = ud.status||'none';
  const sClass = st==='watched'?'watched':st==='watching'?'watching':st==='want'?'want':'';
  const ribbon = st==='watched'?'<div class="card-ribbon ribbon-watched">✓ VISTO</div>':
                 st==='watching'?'<div class="card-ribbon ribbon-watching">▶ VENDO</div>':
                 st==='want'?'<div class="card-ribbon ribbon-want">★ QUERO</div>':'';

  // identity + genre tags for card (skip format/origin)
  const skipInCard = new Set(['AN','SE','OV','BR','JP','KR','HK','TW','FR','IT','MX','AR','H']);
  const cardTags = item.tipo.filter(t=>!skipInCard.has(t)).slice(0,3);
  const tagsHtml = cardTags.map(t=>`<span class="tag t${t}" title="${TL[t]||t}">${TL[t]||t}</span>`).join('');

  // media strip badges
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

// ═══════════════════════════════════════════
// FILTERING & SORTING
// ═══════════════════════════════════════════
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

// ═══════════════════════════════════════════
// RENDER GRID
// ═══════════════════════════════════════════
function renderGrid(){
  const data = getFiltered();
  const mc = document.getElementById('mainContent');

  // update stats bar
  const allW = Object.values(userData).filter(u=>u.status==='watched').length;
  const allV = Object.values(userData).filter(u=>u.status==='watching').length;
  const allWt= Object.values(userData).filter(u=>u.status==='want').length;
  document.getElementById('stTotal').textContent   = data.length;
  document.getElementById('stWatched').textContent = allW;
  document.getElementById('stWatching').textContent= allV;
  document.getElementById('stWant').textContent    = allWt;

  // media counts
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

  // Recs strip on neutral all-view
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
    // Group by section
    const secOrder = [...new Set(MEDIA_DATA.map(i=>i.section))];
    const byS = {};
    data.forEach(i=>{ if(!byS[i.section]) byS[i.section]=[]; byS[i.section].push(i); });
    secOrder.forEach(sec=>{
      if(!byS[sec]) return;
      const items=byS[sec];
      const color=LEVEL_COLORS[items[0].nivel]||'var(--text2)';
      // media pills
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
    // grouped by section within media type
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

// ═══════════════════════════════════════════
// NAVIGATION TABS (sections)
// ═══════════════════════════════════════════
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
