
// ═══════════════════════════════════════════
// SYNC ENGINE
// ═══════════════════════════════════════════
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
      const ok=window.confirm(`Importar backup de ${date}?\n\n• ${watched} visto(s)\n• ${pc} capa(s) nova(s)\n• ${dc} descrição(ões)\n\nDados locais serão substituídos.`);
      if(!ok) return;
      if(p.userData){ userData=p.userData; saveUserData(); }
      if(p.profile) localStorage.setItem(LS_PROF,JSON.stringify(p.profile));
      const descs=p.descriptions_user||p.descriptions;
      if(descs){ Object.assign(DESCS_JSON,descs); Object.assign(descUser,descs); saveDescUser(); }
      let newPc=0;
      Object.entries(posNew).forEach(([k,v])=>{
        if(!v){ posterEdits[k]=null; delete posterAuto[k]; }
        else{ if(v.startsWith('/')) posterAuto[k]=v; else posterEdits[k]=v; newPc++; }
      });
      savePosterEdits(); savePosterAuto();
      saveSyncMeta({...getSyncMeta(), lastImport:new Date().toISOString()});
      renderGrid(); updateSyncStats();
      if(newPc>0){
        const dl=window.confirm(`✓ Importado!\n\n${newPc} capa(s) nova(s) aplicadas.\n\nBaixar posters.json atualizado?`);
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
  const sorted={};
  Object.keys(merged).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ sorted[k]=merged[k]; });
  dlJSON(sorted,'posters.json'); showToast('✓ posters.json exportado');
}
function exportDescJson(){
  const all={...DESCS_JSON,...descUser};
  const sorted={};
  Object.keys(all).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ sorted[k]=all[k]; });
  dlJSON(sorted,'descriptions.json'); showToast('✓ descriptions.json exportado');
}
function exportMediaDataJson(){
  const postersMerged={...POSTERS_JSON};
  Object.entries(posterAuto).forEach(([k,v])  =>{ if(v) postersMerged[k]=v; });
  Object.entries(posterEdits).forEach(([k,v]) =>{ if(v===null) delete postersMerged[k]; else if(v) postersMerged[k]=v; });
  const postersSorted={};
  Object.keys(postersMerged).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ postersSorted[k]=postersMerged[k]; });

  const allDescs={...DESCS_JSON,...descUser};
  const descSorted={};
  Object.keys(allDescs).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{ descSorted[k]=allDescs[k]; });

  const unified={ _version:1, _updatedAt:new Date().toISOString(), posters:postersSorted, descriptions:descSorted };
  dlJSON(unified,'media-data.json');
  showToast('✓ media-data.json exportado');
}
function flushLocalToFiles(){
  const ok=window.confirm('Mover dados do localStorage para os arquivos?\n\nIsso vai baixar APENAS media-data.json (unificado). Substitua na pasta do projeto.');
  if(!ok) return;
  exportMediaDataJson();
  showToast('✓ media-data.json baixado — substitua na pasta');
}
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
