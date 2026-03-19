
// ═══════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════
document.getElementById('searchInput').addEventListener('input',e=>{ searchQ=e.target.value; renderGrid(); });
document.getElementById('sortSel').addEventListener('change',e=>{ sortMode=e.target.value; document.getElementById('sortSelMob').value=e.target.value; renderGrid(); });
document.getElementById('statusSel').addEventListener('change',e=>{ statusFilt=e.target.value; document.getElementById('statusSelMob').value=e.target.value; renderGrid(); });
document.getElementById('sortSelMob').addEventListener('change',e=>{ sortMode=e.target.value; document.getElementById('sortSel').value=e.target.value; renderGrid(); });
document.getElementById('statusSelMob').addEventListener('change',e=>{ statusFilt=e.target.value; document.getElementById('statusSel').value=e.target.value; renderGrid(); });

// ── MEDIA PILLS ──
document.querySelector('.media-pills').addEventListener('click',e=>{
  const btn=e.target.closest('.mpill');
  if(!btn) return;
  document.querySelectorAll('.mpill').forEach(b=>b.className='mpill');
  const m=btn.dataset.m;
  btn.className='mpill '+(m==='all'?'active-all':m==='Filme'?'active-film':m==='Serie'?'active-serie':'active-anime');
  activeMedia=m; renderGrid();
});

// ── CHIPS BAR ──
document.getElementById('chipsBar').addEventListener('click',e=>{
  const chip=e.target.closest('.chip[data-tipo]');
  if(!chip) return;
  document.querySelectorAll('.chip[data-tipo]').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active');
  activeTipo=chip.dataset.tipo; renderGrid();
  // sync ham chips
  document.querySelectorAll('.ham-chips .chip[data-tipo]').forEach(c=>{
    c.classList.toggle('active', c.dataset.tipo===chip.dataset.tipo);
  });
});

// ── HAMBURGER ──
function openHam(){
  // Build ham chips from main chips
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
  // sync both chip bars
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

// star rating
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

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
async function init(){
  loadLS();
  // avatar in top-right (desktop)
  try{
    const prof=JSON.parse(localStorage.getItem(LS_PROF)||'{}');
    const img=document.getElementById('navAvatar');
    if(img){
      img.src = prof?.avatarUrl || 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#1a1a28"/><text x="50%" y="54%" font-size="34" text-anchor="middle" fill="#505070" font-family="Arial">👤</text></svg>`);
    }
  }catch(e){}
  // keep sticky offsets correct (nav can be 1–2 lines)
  const setNavH=()=>{
    const nav=document.querySelector('nav');
    if(nav) document.documentElement.style.setProperty('--navH', `${nav.offsetHeight}px`);
  };
  setNavH();
  window.addEventListener('resize',()=>setTimeout(setNavH,60));
  document.getElementById('mainContent').innerHTML=`<div class="empty"><div class="empty-icon">⏳</div><div class="empty-msg">Carregando...</div></div>`;
  try{
    const [mdR,mdataR]=await Promise.all([
      fetch('movie-list.md'),
      fetch('media-data.json').catch(()=>null),
    ]);
    if(!mdR.ok) throw new Error(`HTTP ${mdR.status}`);
    const md=await mdR.text();
    if(mdataR&&mdataR.ok){
      try{
        const mdata=await mdataR.json();
        if(mdata.posters) POSTERS_JSON={...mdata.posters,...POSTERS_JSON};
        if(mdata.descriptions) DESCS_JSON={...mdata.descriptions,...DESCS_JSON};
      }catch(e){}
    }
    // Merge user desc edits on top
    Object.assign(DESCS_JSON, descUser);
    MEDIA_DATA=parseMarkdown(md);
    if(!MEDIA_DATA.length) throw new Error('Nenhum título encontrado');
    buildNavTabs(); updateMediaCounts(); renderGrid(); setNavH();
  }catch(err){
    document.getElementById('mainContent').innerHTML=`<div class="empty">
      <div class="empty-icon">⚠️</div>
      <div class="empty-msg">Erro: ${err.message}<br><br>
      Abra via servidor local:<br>
      <code style="color:var(--accent2)">python3 -m http.server</code><br>
      ou use o Live Server do VS Code.</div></div>`;
  }
}
init();
