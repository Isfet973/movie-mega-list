'use strict';
const LS_USER  = 'megalist_v1';
const LS_PROF  = 'megalist_profile_v1';
const LS_EDITS = 'megalist_poster_edits_v1';
const LS_AUTO  = 'megalist_poster_auto_v1';
const LS_SYNC  = 'megalist_sync_meta_v1';
const LS_DESC  = 'megalist_desc_user_v1';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

let MEDIA_DATA = [];
let POSTERS_JSON={}, userData={}, posterEdits={}, posterAuto={}, descUser={};
let profileData = {
  name:'', avatarUrl:'',
  favFilmes:[], favSeries:[], favAnimes:[],
  fav18Filmes:[], fav18Series:[], fav18Animes:[],
  rankFilmes:[], rankSeries:[], rankAnimes:[],
  show18Fav:false, show18Rank:false,
  pickerMedia:'Filme', picker18:false,
};

function loadAll(){
  try{ userData    = JSON.parse(localStorage.getItem(LS_USER)  ||'{}'); }catch(e){}
  try{ profileData = {...profileData,...JSON.parse(localStorage.getItem(LS_PROF)||'{}')}; }catch(e){}
  try{ posterEdits = JSON.parse(localStorage.getItem(LS_EDITS) ||'{}'); }catch(e){}
  try{ posterAuto  = JSON.parse(localStorage.getItem(LS_AUTO)  ||'{}'); }catch(e){}
  try{ descUser    = JSON.parse(localStorage.getItem(LS_DESC)  ||'{}'); }catch(e){}
}
function saveProfileData(){ localStorage.setItem(LS_PROF, JSON.stringify(profileData)); }
const dlJSON=(obj,name)=>{ const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
function showToast(m){ const t=document.getElementById('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

function resolveUrl(id){
  const k=String(id), toF=v=>!v?null:v.startsWith('/')?TMDB_IMG+v:v;
  if(k in posterEdits) return toF(posterEdits[k]);
  if(k in POSTERS_JSON) return toF(POSTERS_JSON[k]);
  if(k in posterAuto)  return toF(posterAuto[k]);
  return null;
}

// ── Markdown parser (minimal) ──
function cell(s){ return (s||'').trim().replace(/^—$/,''); }
function parseMarkdown(text){
  const lines=text.split('\n'),items=[],seen=new Set();
  let nivel=0,section='',inTable=false,hp=false,isMedia=false;
  for(const raw of lines){
    const line=raw.trim();
    if(/^##\s+N[IÍ]VEL\s+\d/i.test(line)){ const m=line.match(/N[IÍ]VEL\s+(\d)/i); if(m){ nivel=parseInt(m[1])-1; section=line.replace(/^##\s+/,'').trim(); } inTable=false;hp=false;isMedia=false;continue; }
    if(/^##\s+/.test(line)){ section=line.replace(/^##\s+/,'').trim(); inTable=false;hp=false;isMedia=false;continue; }
    if(line.startsWith('|')){
      const cols=line.split('|').slice(1,-1);
      if(cols.every(c=>/^[-: ]+$/.test(c.trim()))){ if(inTable) hp=true; continue; }
      if(!hp){ isMedia=cell(cols[0])==='#'&&cols.some(c=>/titulo/i.test(c.trim())); inTable=true; continue; }
      if(inTable&&hp&&isMedia){
        const id=parseInt(cell(cols[0])); if(!id||seen.has(id)) continue;
        const title=cell(cols[1]); if(!title||/já listado/i.test(title)) continue;
        seen.add(id);
        items.push({ id,title,year:parseInt(cell(cols[2]))||0,media:cell(cols[3])||'Filme',tipo:cell(cols[4]).split(',').map(t=>t.trim()).filter(Boolean),nivel,section,
          erot:parseInt(cell(cols[5]))||0,expl:parseInt(cell(cols[6]))||0,prof:parseInt(cell(cols[7]))||0,pert:parseInt(cell(cols[8]))||0,
          tabu:parseInt(cell(cols[9]))||0,rari:parseInt(cell(cols[10]))||0,cult:parseInt(cell(cols[11]))||0,
          rec:cell(cols[12]).split(',').map(r=>r.trim()).filter(Boolean), notes:cell(cols[13])||'',
        });
      }
    } else { if(inTable){ inTable=false;hp=false;isMedia=false; } }
  }
  return items;
}

// ── Adult check ──
function isAdult(item){ return item.nivel>=2 || item.tipo.some(t=>['X','HN','EC'].includes(t)); }

// ── Profile card ──
function renderProfileCard(){
  const av=document.getElementById('avatarDisplay');
  if(profileData.avatarUrl){
    av.innerHTML=`<img class="avatar" src="${profileData.avatarUrl}" onclick="document.getElementById('avatarInput').click()">`;
  } else {
    av.innerHTML=`<div class="avatar-ph" onclick="document.getElementById('avatarInput').click()">👤</div>`;
  }
  document.getElementById('profileName').value = profileData.name||'';
  const meta=JSON.parse(localStorage.getItem(LS_SYNC)||'{}');
  const since=meta.firstSeen||new Date().toISOString();
  if(!meta.firstSeen){ const m2={...meta,firstSeen:since}; localStorage.setItem(LS_SYNC,JSON.stringify(m2)); }
  document.getElementById('profileSince').textContent=`Membro desde ${new Date(since).toLocaleDateString('pt-BR')}`;
}
function handleAvatar(ev){
  const file=ev.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{ profileData.avatarUrl=e.target.result; saveProfileData(); renderProfileCard(); };
  reader.readAsDataURL(file);
}
function saveProfile(){
  profileData.name=document.getElementById('profileName').value.trim();
  saveProfileData(); showToast('✓ Perfil salvo');
}

// ── Stats ──
function renderStats(){
  const w=Object.values(userData).filter(u=>u.status==='watched').length;
  const v=Object.values(userData).filter(u=>u.status==='watching').length;
  const q=Object.values(userData).filter(u=>u.status==='want').length;
  const rated=Object.values(userData).filter(u=>u.rating>0);
  const avg=rated.length?(rated.reduce((s,u)=>s+u.rating,0)/rated.length).toFixed(1):'—';
  const byM={Filme:0,Serie:0,Anime:0};
  Object.keys(userData).forEach(id=>{
    if(userData[id].status!=='watched') return;
    const item=MEDIA_DATA.find(m=>m.id===parseInt(id));
    if(item){ const k=item.media==='Anime'||item.tipo.includes('AN')?'Anime':item.media==='Serie'?'Serie':'Filme'; byM[k]++; }
  });
  const stats=[
    {n:MEDIA_DATA.length,l:'Total na lista',c:'var(--text)'},
    {n:w,l:'✓ Assistidos',c:'var(--accent4)'},
    {n:v,l:'▶ Assistindo',c:'var(--accent2)'},
    {n:q,l:'★ Quero Ver',c:'var(--accent3)'},
    {n:avg,l:'Nota Média ★',c:'var(--accent2)'},
    {n:byM.Filme,l:'🎬 Filmes',c:'var(--film)'},
    {n:byM.Serie,l:'📺 Séries',c:'var(--serie)'},
    {n:byM.Anime,l:'🎌 Animes',c:'var(--anime)'},
  ];
  document.getElementById('statsGrid').innerHTML=stats.map(s=>`<div class="stat-card"><div class="stat-num" style="color:${s.c}">${s.n}</div><div class="stat-label">${s.l}</div></div>`).join('');
}

// ── Rating Chart ──
function renderChart(){
  const counts=[0,0,0,0,0]; // 1-5 stars
  Object.values(userData).forEach(u=>{ if(u.rating>=1&&u.rating<=5) counts[u.rating-1]++; });
  const max=Math.max(...counts,1);
  document.getElementById('ratingChart').innerHTML=counts.map((c,i)=>`
    <div class="chart-col">
      <div class="chart-count">${c}</div>
      <div class="chart-bar-wrap"><div class="chart-bar" style="height:${(c/max)*100}%"></div></div>
      <div class="chart-star">${'★'.repeat(i+1)}</div>
    </div>`).join('');
}

// ── Random Picker ──
let pickerMediaChoice = 'Filme';
let picker18On = false;
function setPickerMedia(m){
  pickerMediaChoice=m;
  ['pbFilme','pbSerie','pbAnime','pbAll'].forEach(id=>{ const b=document.getElementById(id); if(b) b.classList.remove('active'); });
  const map={Filme:'pbFilme',Serie:'pbSerie',Anime:'pbAnime',all:'pbAll'};
  if(map[m]) document.getElementById(map[m]).classList.add('active');
}
function togglePicker18(){
  picker18On=!picker18On;
  document.getElementById('picker18btn').classList.toggle('on',picker18On);
}
function spinPicker(){
  let pool=MEDIA_DATA;
  if(pickerMediaChoice!=='all'){
    if(pickerMediaChoice==='Anime') pool=pool.filter(i=>i.media==='Anime'||i.tipo.includes('AN'));
    else if(pickerMediaChoice==='Serie') pool=pool.filter(i=>i.media==='Serie');
    else pool=pool.filter(i=>i.media==='Filme'&&!i.tipo.includes('AN'));
  }
  // Prefer unwatched
  const unwatched=pool.filter(i=>!userData[i.id]||userData[i.id].status==='none'||userData[i.id].status==='want');
  if(unwatched.length>5) pool=unwatched;
  if(!picker18On) pool=pool.filter(i=>!isAdult(i));
  if(!pool.length){ showToast('Nenhuma mídia encontrada com esses filtros'); return; }
  const item=pool[Math.floor(Math.random()*pool.length)];
  const url=resolveUrl(item.id);
  const icon=item.media==='Anime'?'🎌':item.tipo.includes('SE')?'📺':'🎬';
  const res=document.getElementById('pickerResult');
  res.style.display='flex';
  res.innerHTML=`
    ${url?`<img class="picker-poster" src="${url}" onerror="this.style.display='none'">`
         :`<div class="picker-poster-ph">${icon}</div>`}
    <div class="picker-info">
      <div class="picker-info-title">${item.title}</div>
      <div class="picker-info-meta">${item.year} · ${item.media} · Nível ${item.nivel+1}${isAdult(item)?' · +18':''}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="picker-open-btn" onclick="openInlineModal(${item.id})">Ver detalhes ↓</button>
        <button class="picker-open-btn" onclick="openInProfileList(${item.id})">Ver na lista</button>
      </div>
    </div>`;

  // If details modal is open, refresh it immediately for the new pick
  const box=document.getElementById('inlineModalBox');
  if(box && box.classList.contains('open')) openInlineModal(item.id);
}

function openInProfileList(id){
  const item=MEDIA_DATA.find(m=>m.id===id);
  if(!item){ showToast('Item não encontrado'); return; }
  // always go to Favorites tab, stacked view
  activeTab='favs';
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active', x.dataset.tab===activeTab));
  renderTab();
  // Try to find it in the visible lists
  setTimeout(()=>{
    const el=document.querySelector(`.fav-item[data-id="${id}"]`) || document.querySelector(`.rank-item[data-id="${id}"]`);
    if(el){
      el.scrollIntoView({behavior:'smooth',block:'center'});
      el.style.boxShadow='0 0 0 2px var(--accent3), 0 0 0 6px rgba(124,108,252,.15)';
      setTimeout(()=>{ el.style.boxShadow=''; }, 1400);
      openInlineModal(id);
    } else {
      openInlineModal(id);
      showToast('Mostrando detalhes (não está nos favoritos/ranking)');
    }
  },60);
}

// ── Tabs ──
let activeTab='favs';
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); activeTab=t.dataset.tab; renderTab();
  });
});
function renderTab(){
  const el=document.getElementById('tabContent');
  if(activeTab==='rank') el.innerHTML=renderRankPage();
  else el.innerHTML=renderFavsStacked();
  attachListeners();
}

// ── Inline modal for picker ──
function openInlineModal(id){
  const item=MEDIA_DATA.find(m=>m.id===id); if(!item) return;
  const box=document.getElementById('inlineModalBox');
  const url=resolveUrl(id);
  const icon=item.media==='Anime'?'🎌':item.tipo.includes('SE')?'📺':'🎬';
  const TL={L:'Lésbico',G:'Gay',T:'Trans',B:'Bi/Pan',H:'Hétero',X:'Tabu',SF:'Sci-Fi',PH:'Psicológico',BH:'Body Horror',HR:'Horror',TH:'Thriller',CR:'Crime',RO:'Romance',DR:'Drama',EC:'Ecchi',HN:'Hentai',AN:'Anime',SE:'Série',BR:'Brasil',JP:'Japão',KR:'Coreia',Z:'Vampiro'};
  const tagColors={L:'#ff88b8',G:'#88b8ff',T:'#88ffb8',B:'#bb88ff',H:'#ffcc77',X:'#ff4444',SF:'#5599ff',PH:'#ffaa44',BH:'#ff66ff',HR:'#ff6655',TH:'#9988ff',CR:'#44ff99',RO:'#ff99cc',DR:'#9999ff',EC:'#ff9933',HN:'#ff4488',AN:'#ff7070',SE:'#44cc88',BR:'#ccff44',JP:'#ff88aa',KR:'#44ccff',Z:'#44ffee'};
  const tagsHtml=item.tipo.filter(t=>!['H','OV'].includes(t)).slice(0,6).map(t=>`<span class="itag" style="background:${tagColors[t]||'#555'}22;color:${tagColors[t]||'#999'};border:1px solid ${tagColors[t]||'#555'}44">${TL[t]||t}</span>`).join('');
  const ud=userData[item.id]||{};
  const stars=ud.rating?'★'.repeat(ud.rating)+'☆'.repeat(5-ud.rating):'';
  const desc=(descUser && descUser[String(item.id)]) ? String(descUser[String(item.id)]).trim() : '';
  box.innerHTML=`<div class="inline-modal-top">
    <button class="inline-close" onclick="document.getElementById('inlineModalBox').classList.remove('open')">✕</button>
    ${url?`<img class="inline-poster" src="${url}">`:`<div class="inline-poster-ph">${icon}</div>`}
    <div class="inline-meta">
      <div class="inline-title">${item.title}</div>
      <div class="inline-sub">${item.year} · ${item.media} · N${item.nivel+1}${isAdult(item)?' · +18':''}</div>
      <div class="inline-tags">${tagsHtml}</div>
      ${stars?`<div style="color:var(--accent2);font-size:16px">${stars}</div>`:''}
      ${ud.review?`<div style="font-size:12px;color:var(--text2);margin-top:6px;font-style:italic">${ud.review}</div>`:''}
    </div>
  </div>
  ${desc?`<div style="padding:0 16px 8px;font-size:13px;color:var(--text2);line-height:1.6;">${desc.replace(/</g,'&lt;')}</div>`:''}
  <div style="padding:0 16px 12px;font-size:12px;color:var(--text3);font-family:'Space Mono',monospace;">${item.notes||''}</div>`;
  box.classList.add('open');
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}

// ── Favs ──
function favKey(m){ return m==='Filme'?'favFilmes':m==='Serie'?'favSeries':'favAnimes'; }
function fav18Key(m){ return m==='Filme'?'fav18Filmes':m==='Serie'?'fav18Series':'fav18Animes'; }

function getFavListIds(media){
  const key = profileData.show18Fav ? fav18Key(media) : favKey(media);
  return Array.isArray(profileData[key]) ? profileData[key] : [];
}
function getFavItemsByMedia(media){
  return getFavListIds(media).map(id=>MEDIA_DATA.find(x=>x.id===id)).filter(Boolean);
}

function renderFavList(items, media){
  const label18 = profileData.show18Fav;
  if(!items.length){
    return `<div class="empty-tab"><div style="font-size:28px">${label18?'🔞':'⭐'}</div><p>${label18?'Nenhum favorito +18 ainda. Use a busca acima.':'Nenhum favorito ainda. Use a busca acima.'}</p></div>`;
  }
  return `<div class="fav-list">${items.slice(0,5).map((item,i)=>{
    const url=resolveUrl(item.id); const icon=item.media==='Anime'?'🎌':item.tipo.includes('SE')?'📺':'🎬';
    const nc=i===0?'gold':i===1?'silver':i===2?'bronze':'';
    const ud=userData[item.id]||{}; const stars=ud.rating?'★'.repeat(ud.rating):'';
    return `<div class="fav-item" data-id="${item.id}">
      <span class="fav-num ${nc}">${i+1}</span>
      ${url?`<img class="fav-poster-sm" src="${url}" onerror="this.style.display='none'">`:`<div class="fav-poster-ph-sm">${icon}</div>`}
      <div class="fav-info">
        <div class="fav-title">${item.title}</div>
        <div class="fav-year">${item.year}${stars?` · <span style="color:var(--accent2)">${stars}</span>`:''}</div>
      </div>
      <button class="fav-remove" onclick="removeFav(${item.id},'${media}')">×</button>
    </div>`;
  }).join('')}${items.length>5?`<div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3);padding:6px 0">+${items.length-5} mais</div>`:''}</div>`;
}

function renderFavSection(media){
  const label=media==='Filme'?'Filmes':media==='Serie'?'Séries':'Animes';
  const color=media==='Anime'?'var(--anime)':media==='Serie'?'var(--serie)':'var(--film)';
  const ids = getFavListIds(media);
  const items = getFavItemsByMedia(media);
  return `
    <div style="margin-bottom:26px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:${color};">${label}</div>
        <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);">${ids.length} item(ns)</div>
      </div>
      <div class="search-add">
        <input type="text" id="favSearch-${media}" placeholder="+ Adicionar ${label.toLowerCase()} ${profileData.show18Fav?'+18 ':''}..." oninput="searchFav(this,'${media}')" onfocus="document.getElementById('favDrop-${media}').classList.add('open')" onblur="setTimeout(()=>document.getElementById('favDrop-${media}').classList.remove('open'),200)">
        <div class="search-drop" id="favDrop-${media}"></div>
      </div>
      ${renderFavList(items, media)}
    </div>`;
}

function renderFavsStacked(){
  return `
    <div class="toggle-row">
      <span class="toggle-label">Favoritos: ranking separado +18</span>
      <label class="toggle">
        <input type="checkbox" id="t18fav" ${profileData.show18Fav?'checked':''} onchange="toggle18Fav()">
        <div class="toggle-track"></div><div class="toggle-thumb"></div>
      </label>
      ${profileData.show18Fav?`<span class="hidden-count">modo +18</span>`:''}
    </div>
    ${renderFavSection('Filme')}
    ${renderFavSection('Serie')}
    ${renderFavSection('Anime')}`;
}

function searchFav(input,media){
  const q=input.value.toLowerCase().trim();
  const drop=document.getElementById(`favDrop-${media}`);
  if(!q){ drop.innerHTML=''; drop.classList.remove('open'); return; }
  const fk = profileData.show18Fav ? fav18Key(media) : favKey(media);
  const results=MEDIA_DATA.filter(m=>{
    const ok=media==='Anime'?(m.media==='Anime'||m.tipo.includes('AN')):media==='Serie'?(m.media==='Serie'):( m.media==='Filme'&&!m.tipo.includes('AN'));
    return ok&&m.title.toLowerCase().includes(q)&&!profileData[fk].includes(m.id);
  }).slice(0,7);
  drop.innerHTML=results.length?results.map(m=>{
    const url=resolveUrl(m.id); const icon=m.media==='Anime'?'🎌':m.tipo.includes('SE')?'📺':'🎬';
    return `<div class="drop-item" onclick="addFav(${m.id},'${media}')">
      ${url?`<img class="drop-poster" src="${url}">`:`<div class="drop-poster" style="display:flex;align-items:center;justify-content:center;font-size:16px">${icon}</div>`}
      <div class="drop-info"><div class="drop-title">${m.title}</div><div class="drop-meta">${m.year} · ${m.media}${isAdult(m)?' · +18':''}</div></div>
    </div>`;
  }).join(''):`<div class="drop-empty">Sem resultados</div>`;
  drop.classList.add('open');
}
function addFav(id,media){
  const fk = profileData.show18Fav ? fav18Key(media) : favKey(media);
  if(!Array.isArray(profileData[fk])) profileData[fk]=[];
  if(!profileData[fk].includes(id)){
    profileData[fk].push(id);
    saveProfileData();
    renderTab();
  }
}
function removeFav(id,media){
  const fk = profileData.show18Fav ? fav18Key(media) : favKey(media);
  if(!Array.isArray(profileData[fk])) profileData[fk]=[];
  profileData[fk]=profileData[fk].filter(i=>i!==id);
  saveProfileData();
  renderTab();
}
function toggle18Fav(){ profileData.show18Fav=!profileData.show18Fav; saveProfileData(); renderTab(); }

// ── Ranking ──
function rankKey(m){ return m==='Filme'?'rankFilmes':m==='Serie'?'rankSeries':'rankAnimes'; }
function getRankItems(m){ const s18=profileData.show18Rank; return profileData[rankKey(m)].map(id=>MEDIA_DATA.find(x=>x.id===id)).filter(Boolean).filter(i=>s18||!isAdult(i)); }
function renderRankPage(){
  return `<div class="toggle-row">
      <span class="toggle-label">Mostrar +18</span>
      <label class="toggle"><input type="checkbox" id="t18rank" ${profileData.show18Rank?'checked':''} onchange="toggle18Rank()"><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
    </div>
    ${['Filme','Serie','Anime'].map(m=>{
      const label=m==='Filme'?'Filmes':m==='Serie'?'Séries':'Animes';
      const color=m==='Anime'?'var(--anime)':m==='Serie'?'var(--serie)':'var(--film)';
      const items=getRankItems(m);
      const rk=rankKey(m);
      const hidden=profileData[rk].length-items.length;
      return `<div style="margin-bottom:28px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:${color};margin-bottom:10px;">${label} ${hidden>0?`<span style="font-size:10px;font-family:'Space Mono',monospace;color:var(--accent)">(${hidden} +18 ocultos)</span>`:''}</div>
        <div class="search-add">
          <input type="text" id="rankSearch-${m}" placeholder="+ Adicionar ${label.toLowerCase()} ao ranking..." oninput="searchRank(this,'${m}')" onfocus="document.getElementById('rankDrop-${m}').classList.add('open')" onblur="setTimeout(()=>document.getElementById('rankDrop-${m}').classList.remove('open'),200)">
          <div class="search-drop" id="rankDrop-${m}"></div>
        </div>
        ${items.length===0?`<div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3);padding:10px 0">Nenhum item ainda.</div>`
          :`<div class="rank-list" id="rankList-${m}" data-media="${m}">
              ${items.map((item,i)=>{
                const nc=i===0?'gold':i===1?'silver':i===2?'bronze':'';
                const url=resolveUrl(item.id); const icon=item.media==='Anime'?'🎌':item.tipo.includes('SE')?'📺':'🎬';
                const ud=userData[item.id]||{}; const stars=ud.rating?'★'.repeat(ud.rating)+'☆'.repeat(5-ud.rating):'';
                return `<div class="rank-item" draggable="true" data-id="${item.id}" data-media="${m}">
                  <span class="rank-drag">⠿</span>
                  <span class="rank-num ${nc}">${i+1}</span>
                  ${url?`<img class="rank-poster" src="${url}" onerror="this.style.display='none'">`:`<div class="rank-poster" style="display:flex;align-items:center;justify-content:center;font-size:18px">${icon}</div>`}
                  <div class="rank-info"><div class="rank-title">${item.title}</div>
                  <div class="rank-meta">${item.year} · ${item.media}${isAdult(item)?' · +18':''}${stars?` <span class="rank-stars">${stars}</span>`:''}</div></div>
                  <button class="rank-rm" onclick="removeRank(${item.id},'${m}')">×</button>
                </div>`;
              }).join('')}
            </div>`}
      </div>`;
    }).join('')}`;
}
function searchRank(input,m){
  const q=input.value.toLowerCase().trim();
  const drop=document.getElementById(`rankDrop-${m}`);
  if(!q){ drop.innerHTML=''; drop.classList.remove('open'); return; }
  const rk=rankKey(m);
  const results=MEDIA_DATA.filter(x=>{
    const ok=m==='Anime'?(x.media==='Anime'||x.tipo.includes('AN')):m==='Serie'?(x.media==='Serie'):(x.media==='Filme'&&!x.tipo.includes('AN'));
    return ok&&x.title.toLowerCase().includes(q)&&!profileData[rk].includes(x.id);
  }).slice(0,7);
  drop.innerHTML=results.length?results.map(x=>{
    const url=resolveUrl(x.id); const icon=x.media==='Anime'?'🎌':x.tipo.includes('SE')?'📺':'🎬';
    return `<div class="drop-item" onclick="addRank(${x.id},'${m}')">
      ${url?`<img class="drop-poster" src="${url}">`:`<div class="drop-poster" style="display:flex;align-items:center;justify-content:center;font-size:16px">${icon}</div>`}
      <div class="drop-info"><div class="drop-title">${x.title}</div><div class="drop-meta">${x.year}${isAdult(x)?' · +18':''}</div></div>
    </div>`;
  }).join(''):`<div class="drop-empty">Sem resultados</div>`;
  drop.classList.add('open');
}
function addRank(id,m){ const rk=rankKey(m); if(!profileData[rk].includes(id)){ profileData[rk].push(id); saveProfileData(); renderTab(); } }
function removeRank(id,m){ const rk=rankKey(m); profileData[rk]=profileData[rk].filter(i=>i!==id); saveProfileData(); renderTab(); }
function toggle18Rank(){ profileData.show18Rank=!profileData.show18Rank; saveProfileData(); renderTab(); }

// Drag & Drop
let dragId=null, dragMedia=null;
function attachListeners(){
  document.querySelectorAll('.rank-item[draggable]').forEach(el=>{
    el.addEventListener('dragstart',()=>{ dragId=parseInt(el.dataset.id); dragMedia=el.dataset.media; el.classList.add('dragging'); });
    el.addEventListener('dragend',()=>el.classList.remove('dragging'));
    el.addEventListener('dragover',e=>{ e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{
      e.preventDefault(); el.classList.remove('drag-over');
      const tid=parseInt(el.dataset.id), tm=el.dataset.media;
      if(dragId===tid||dragMedia!==tm) return;
      const rk=rankKey(tm), arr=[...profileData[rk]];
      const fi=arr.indexOf(dragId), ti=arr.indexOf(tid);
      if(fi===-1||ti===-1) return;
      arr.splice(fi,1); arr.splice(ti,0,dragId);
      profileData[rk]=arr; saveProfileData(); renderTab();
    });
  });
}

// ── Sync (profile page) ──
function exportData(){
  const postersNew={};
  Object.entries(posterAuto).forEach(([k,v])  =>{ if(v&&!POSTERS_JSON[k]) postersNew[k]=v; });
  Object.entries(posterEdits).forEach(([k,v]) =>{ if(!(k in POSTERS_JSON)||v!==POSTERS_JSON[k]) postersNew[k]=v; });
  const payload={
    _version:3, _exportedAt:new Date().toISOString(), _device:navigator.userAgent.slice(0,80),
    userData, profile:profileData, descriptions_user:descUser, posters_new:postersNew,
    _stats:{
      watched:Object.values(userData).filter(u=>u.status==='watched').length,
      watching:Object.values(userData).filter(u=>u.status==='watching').length,
      want:Object.values(userData).filter(u=>u.status==='want').length,
      posters_new:Object.keys(postersNew).length,
    },
  };
  dlJSON(payload,`megalist-userdata-${new Date().toISOString().slice(0,10)}.json`);
  const m=JSON.parse(localStorage.getItem(LS_SYNC)||'{}');
  localStorage.setItem(LS_SYNC,JSON.stringify({...m,lastExport:new Date().toISOString()}));
  showToast('✓ userdata.json exportado');
}
function importData(ev){
  const file=ev.target.files[0]; if(!file) return; ev.target.value='';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const p=JSON.parse(e.target.result);
      if(!p.userData){ showToast('❌ Arquivo inválido'); return; }
      const posNew=p.posters_new||p.posters||{};
      const watched=(p._stats?.watched)??Object.values(p.userData||{}).filter(u=>u.status==='watched').length;
      const date=p._exportedAt?new Date(p._exportedAt).toLocaleString('pt-BR'):'desconhecida';
      const ok=window.confirm(`Importar backup de ${date}?\n• ${watched} visto(s)\n• ${Object.keys(posNew).filter(k=>posNew[k]).length} capa(s)\n\nDados locais serão substituídos.`);
      if(!ok) return;
      if(p.userData){ localStorage.setItem(LS_USER,JSON.stringify(p.userData)); userData=p.userData; }
      if(p.profile){ profileData={...profileData,...p.profile}; saveProfileData(); }
      if(p.descriptions_user){ Object.assign(descUser,p.descriptions_user); localStorage.setItem(LS_DESC,JSON.stringify(descUser)); }
      let np=0;
      Object.entries(posNew).forEach(([k,v])=>{
        if(!v){ posterEdits[k]=null; delete posterAuto[k]; }
        else{ if(v.startsWith('/')) posterAuto[k]=v; else posterEdits[k]=v; np++; }
      });
      localStorage.setItem(LS_EDITS,JSON.stringify(posterEdits));
      localStorage.setItem(LS_AUTO,JSON.stringify(posterAuto));
      renderProfileCard(); renderStats(); renderChart(); renderTab();
      if(np>0){
        const dl=window.confirm(`✓ Importado!\n${np} capa(s) nova(s).\n\nBaixar posters.json atualizado?`);
        if(dl) exportPostersJson();
      } else { showToast(`✓ Importado! ${watched} itens`); }
    }catch(err){ showToast(`❌ Erro: ${err.message}`); }
  };
  reader.readAsText(file);
}
function exportPostersJson(){
  const merged={...POSTERS_JSON};
  Object.entries(posterAuto).forEach(([k,v])  =>{ if(v) merged[k]=v; });
  Object.entries(posterEdits).forEach(([k,v]) =>{ if(v===null) delete merged[k]; else if(v) merged[k]=v; });
  const s={}; Object.keys(merged).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ s[k]=merged[k]; });
  dlJSON({ _version:1, _updatedAt:new Date().toISOString(), posters:s, descriptions:{} },'media-data.json');
  showToast('✓ media-data.json exportado');
}
function exportDescJson(){
  const s={}; Object.keys(descUser).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ s[k]=descUser[k]; });
  dlJSON({ _version:1, _updatedAt:new Date().toISOString(), posters:{}, descriptions:s },'media-data.json');
  showToast('✓ media-data.json exportado');
}
function flushLocal(){
  const ok=window.confirm('Baixar media-data.json (unificado: posters + descrições)?\n\nSubstitua na pasta do projeto. (Agora o app usa apenas media-data.json)');
  if(!ok) return;

  // Unified file: media-data.json
  const merged={...POSTERS_JSON};
  Object.entries(posterAuto).forEach(([k,v])  =>{ if(v) merged[k]=v; });
  Object.entries(posterEdits).forEach(([k,v]) =>{ if(v===null) delete merged[k]; else if(v) merged[k]=v; });
  const sortedPosters={};
  Object.keys(merged).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ sortedPosters[k]=merged[k]; });

  const allDescs={...descUser};
  const sortedDescs={};
  Object.keys(allDescs).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ sortedDescs[k]=allDescs[k]; });

  const unified={ _version:1, _updatedAt:new Date().toISOString(), posters:sortedPosters, descriptions:sortedDescs };
  dlJSON(unified,'media-data.json');
  showToast('✓ media-data.json baixado');
}
function confirmClear(){
  const ok=window.confirm('Apagar TODOS os dados locais?\nFaça export antes!');
  if(!ok) return;
  [LS_USER,LS_EDITS,LS_AUTO,LS_SYNC,LS_DESC,LS_PROF].forEach(k=>localStorage.removeItem(k));
  userData={}; posterEdits={}; posterAuto={}; descUser={}; profileData={name:'',avatarUrl:'',favFilmes:[],favSeries:[],favAnimes:[],rankFilmes:[],rankSeries:[],rankAnimes:[],show18Fav:false,show18Rank:false,pickerMedia:'Filme',picker18:false};
  renderProfileCard(); renderStats(); renderChart(); renderTab(); showToast('Dados apagados');
}

// ── Init ──
async function init(){
  loadAll();
  try{
    const [mdR,pR,mdataR]=await Promise.all([
      fetch('assets/data/movie-list.md'),
      fetch('assets/data/posters.json').catch(()=>null),
      fetch('assets/data/media-data.json').catch(()=>null),
    ]);
    if(mdR.ok){ const t=await mdR.text(); MEDIA_DATA=parseMarkdown(t); }
    if(mdataR&&mdataR.ok){
      try{
        const md=await mdataR.json();
        if(md.posters) POSTERS_JSON={...md.posters,...POSTERS_JSON};
        // descriptions from media-data.json are automatically used
        if(md.descriptions) Object.assign(descUser,md.descriptions);
      }catch(e){}
    } else if(pR&&pR.ok){
      try{ POSTERS_JSON=await pR.json(); }catch(e){}
    }
  }catch(e){ console.warn('Could not load data:',e); }
  renderProfileCard(); renderStats(); renderChart(); renderTab();
}
init();
