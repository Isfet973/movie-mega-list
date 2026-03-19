
// ═══════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════
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

  // title + sub
  document.getElementById('mTitle').textContent=item.title;
  const sub=document.getElementById('mSub');
  sub.innerHTML=[
    `<span>${item.year}</span>`,
    `<span class="modal-sub-sep">·</span>`,
    `<span style="color:${item.media==='Anime'?'var(--anime)':item.media==='Serie'?'var(--serie)':'var(--film)'}">${item.media==='Serie'?'Série':item.media}</span>`,
  ].join('');

  // tags (all types)
  document.getElementById('mTags').innerHTML=item.tipo.map(t=>`<span class="tag t${t}">${TL[t]||t}</span>`).join('');

  // scores with bars
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

  // poster
  updateModalPoster(id);
  if(resolveUrl(id)===undefined){
    autoFetch(item).then(()=>{ if(currentId===id) updateModalPoster(id); });
  }

  // description
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

  // keywords from notes
  const kws=document.getElementById('mKeywords');
  if(item.notes){
    const words=item.notes.split(/[.·,+]/).map(w=>w.trim()).filter(w=>w.length>1&&w.length<40);
    kws.innerHTML=words.map(w=>`<span class="kw">${w}</span>`).join('');
  } else kws.innerHTML='';

  // rec codes
  const recEl=document.getElementById('mRec');
  recEl.innerHTML=item.rec.map(r=>`<span class="rec-tag">${r} — ${REC_LABELS[r]||r}</span>`).join('');

  // similar
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

  // status + form
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
  // Use the current posterSources if already loaded for this id
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
  // Reset source label
  const label = document.getElementById('posterSrcLabel');
  if (label) label.textContent = '';
  const useBtn = document.getElementById('posterUseBtn');
  if (useBtn) useBtn.style.display = 'none';
  // Hide arrows until sources are loaded
  const prev = document.getElementById('posterPrev');
  const next = document.getElementById('posterNext');
  if (prev) prev.style.display = 'none';
  if (next) next.style.display = 'none';
  // Load all sources async
  posterSources = []; posterSourceIdx = 0;
  buildPosterSources(item).then(srcs => {
    if (currentId !== id) return; // modal was closed
    posterSources = srcs;
    // Find current poster in sources and set index
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
