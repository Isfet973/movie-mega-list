
// ═══════════════════════════════════════════
// POSTER ENGINE — resolve URL with priority chain
// posterEdits > POSTERS_JSON > posterAuto > undefined
// ═══════════════════════════════════════════
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



// ═══════════════════════════════════════════
// DESCRIPTIONS
// ═══════════════════════════════════════════
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
      // fallback: OMDB plot (helps when TMDB overview is empty/missing)
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
