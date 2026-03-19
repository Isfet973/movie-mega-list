
// ═══════════════════════════════════════════
// MARKDOWN PARSER
// ═══════════════════════════════════════════
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
