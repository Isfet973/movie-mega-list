
// ═══════════════════════════════════════════
// POSTER NAVIGATION (arrows in modal)
// Cycles through all available poster sources for a given item
// ═══════════════════════════════════════════
let posterSources = [];   // list of {url, label} for current item
let posterSourceIdx = 0;  // current index

async function buildPosterSources(item) {
  const sources = [];
  const k = String(item.id);

  // Source 1: user edit (localStorage)
  if (posterEdits[k] && posterEdits[k] !== null) {
    const v = posterEdits[k];
    sources.push({ url: v.startsWith('/') ? TMDB_IMG+v : v, label: 'Edit Manual' });
  }
  // Source 2: posters.json base
  if (POSTERS_JSON[k]) {
    const v = POSTERS_JSON[k];
    const url = v.startsWith('/') ? TMDB_IMG+v : v;
    if (!sources.find(s=>s.url===url)) sources.push({ url, label: 'posters.json' });
  }
  // Source 3: auto-fetched cache
  if (posterAuto[k]) {
    const v = posterAuto[k];
    const url = v.startsWith('/') ? TMDB_IMG+v : v;
    if (!sources.find(s=>s.url===url)) sources.push({ url, label: 'Cache Auto' });
  }

  // Source 4-6: fetch alternatives from multiple sources in background
  const isAnime = item.media==='Anime' || item.tipo.includes('AN');
  const isS = item.media==='Serie' || (item.tipo.includes('SE')&&!item.tipo.includes('AN'));

  // TMDB movie+tv both
  const tmdbTypes = isAnime ? ['tv','movie'] : (isS ? ['tv','movie'] : ['movie','tv']);
  for (const type of tmdbTypes) {
    try {
      const clean = item.title.replace(/\s*\(\d{4}\)\s*/g,'').replace(/\s*\(.*?\)\s*/g,'').trim();
      const yp = item.year>1900 ? `&${type==='tv'?'first_air_date_year':'year'}=${item.year}` : '';
      for (const lang of ['pt-BR','en-US']) {
        const r = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(clean)}${yp}&language=${lang}`);
        if (!r.ok) continue;
        const d = await r.json();
        const results = (d.results||[]).filter(x=>x.poster_path);
        results.slice(0,3).forEach(x => {
          const url = TMDB_IMG+x.poster_path;
          if (!sources.find(s=>s.url===url)) {
            const y = parseInt((x.release_date||x.first_air_date||'').slice(0,4));
            sources.push({ url, label: `TMDB ${type.toUpperCase()} ${lang} (${y||'?'})` });
          }
        });
        if (sources.length >= 8) break;
      }
      if (sources.length >= 8) break;
    } catch(e) {}
  }

  // Jikan for animes
  if (isAnime) {
    try {
      const clean = item.title.replace(/\s*\(.*?\)\s*/g,'').replace(/\s*:.*/,'').trim();
      const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(clean)}&limit=5`);
      if (r.ok) {
        const d = await r.json();
        (d.data||[]).filter(x=>x.images?.jpg?.large_image_url).slice(0,3).forEach(x => {
          const url = x.images.jpg.large_image_url;
          if (!sources.find(s=>s.url===url)) {
            sources.push({ url, label: `MAL: ${(x.title_english||x.title||'').slice(0,20)}` });
          }
        });
      }
    } catch(e) {}
  }

  // OMDB
  try {
    const clean = item.title.replace(/\s*\(.*?\)\s*/g,'').trim();
    const yp = item.year>1900?`&y=${item.year}`:'';
    const r = await fetch(`https://www.omdbapi.com/?apikey=trilogy&t=${encodeURIComponent(clean)}${yp}`);
    if (r.ok) {
      const d = await r.json();
      if (d.Poster && d.Poster!=='N/A' && !sources.find(s=>s.url===d.Poster)) {
        sources.push({ url: d.Poster, label: 'OMDB' });
      }
    }
  } catch(e) {}

  return sources.length > 0 ? sources : [{ url: null, label: 'Sem capa' }];
}

function navPoster(dir) {
  if (!posterSources.length) return;
  posterSourceIdx = (posterSourceIdx + dir + posterSources.length) % posterSources.length;
  showPosterSource(posterSourceIdx);
}

function showPosterSource(idx) {
  const src = posterSources[idx];
  const el = document.getElementById('mPoster');
  const label = document.getElementById('posterSrcLabel');
  const useBtn = document.getElementById('posterUseBtn');
  const item = MEDIA_DATA.find(m=>m.id===currentId);
  const icon = item?.media==='Anime'?'🎌':item?.tipo?.includes('SE')?'📺':'🎬';
  if (src?.url) {
    el.innerHTML = `<img src="${src.url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`;
  } else {
    el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;">${icon}</div>`;
  }
  if (label) label.textContent = `${idx+1}/${posterSources.length} · ${src?.label||''}`;
  if (useBtn) useBtn.style.display = src?.url ? 'block' : 'none';

  // Show/hide prev/next
  const prev = document.getElementById('posterPrev');
  const next = document.getElementById('posterNext');
  if (prev) prev.style.display = posterSources.length>1 ? 'flex' : 'none';
  if (next) next.style.display = posterSources.length>1 ? 'flex' : 'none';
}

function useCurrentPoster(){
  if(!currentId || !posterSources.length) return;
  const src = posterSources[posterSourceIdx];
  if(!src?.url) return;
  const k = String(currentId);
  posterEdits[k] = src.url;
  POSTERS_JSON[k] = src.url;
  savePosterEdits();
  downloadMergedPosters();
  // refresh card poster + modal
  applyPoster(currentId, resolveUrl(currentId));
  redrawCard(currentId);
  updateModalPoster(currentId);
  showToast('✓ Capa aplicada — posters.json baixado');
}