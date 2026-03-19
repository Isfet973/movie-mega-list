
// ═══════════════════════════════════════════
// RECOMMENDATION ENGINE (enhanced)
// ═══════════════════════════════════════════
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
  // Also boost from ratings
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
  // notes keyword overlap
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
