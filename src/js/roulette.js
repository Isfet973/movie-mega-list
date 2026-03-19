
// ═══════════════════════════════════════════
// POSTER ROULETTE
// ═══════════════════════════════════════════
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
