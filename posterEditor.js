
// ═══════════════════════════════════════════
// POSTER EDITOR — saves to localStorage AND
// automatically merges into POSTERS_JSON & downloads
// ═══════════════════════════════════════════
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
    POSTERS_JSON[key] = url; // keep in-memory JSON in sync
  }
  savePosterEdits(); savePosterAuto();
  // Auto-merge and download posters.json immediately
  downloadMergedPosters();
  applyPoster(id, resolveUrl(id));
  updateModalPoster(id);
  redrawCard(id);
  closePE(); showToast('✓ Capa salva — posters.json atualizado');
}
function deletePE(){
  const id = parseInt(document.getElementById('peId').value);
  const key = String(id);
  posterEdits[key]=null; delete posterAuto[key]; delete POSTERS_JSON[key];
  savePosterEdits(); savePosterAuto();
  downloadMergedPosters();
  applyPoster(id, null); redrawCard(id); closePE();
  showToast('Capa removida — posters.json atualizado');
}
function downloadMergedPosters(){
  const merged = {...POSTERS_JSON};
  Object.entries(posterAuto).forEach(([k,v])  => { if(v) merged[k]=v; });
  Object.entries(posterEdits).forEach(([k,v]) => { if(v===null) delete merged[k]; else if(v) merged[k]=v; });
  const sorted={};
  Object.keys(merged).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ sorted[k]=merged[k]; });
  dlJSON(sorted,'posters.json');
}
function redrawCard(id){
  const el = document.querySelector(`.card[data-id="${id}"]`);
  if(!el) return;
  const item = MEDIA_DATA.find(m=>m.id===id);
  if(item){ el.outerHTML = renderCard(item); loadPosters([item]); }
}
