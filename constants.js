'use strict';
// ═══════════════════════════════════════════
// CONSTANTS & STATE
// ═══════════════════════════════════════════
const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';
const LS_USER  = 'megalist_v1';
const LS_EDITS = 'megalist_poster_edits_v1';
const LS_AUTO  = 'megalist_poster_auto_v1';
const LS_DAUTO = 'megalist_desc_auto_v1';
const LS_DESC  = 'megalist_desc_user_v1';
const LS_PROF  = 'megalist_profile_v1';
const LS_SYNC  = 'megalist_sync_meta_v1';

let MEDIA_DATA = [];
let POSTERS_JSON = {};
let DESCS_JSON   = {};
let userData     = {};
let posterEdits  = {};
let posterAuto   = {};
let descAuto     = {};
let descUser     = {};

// filters
let activeSection = 'all';
let activeMedia   = 'all';
let activeTipo    = 'all';
let searchQ       = '';
let sortMode      = 'default';
let statusFilt    = 'all';
let currentId     = null;
let currentRating = 0;
let rouFilter     = 'all';

// ═══════════════════════════════════════════
// LOCAL STORAGE
// ═══════════════════════════════════════════
function loadLS() {
  try { userData    = JSON.parse(localStorage.getItem(LS_USER)  || '{}'); } catch(e){}
  try { posterEdits = JSON.parse(localStorage.getItem(LS_EDITS) || '{}'); } catch(e){}
  try { posterAuto  = JSON.parse(localStorage.getItem(LS_AUTO)  || '{}'); } catch(e){}
  try { descAuto    = JSON.parse(localStorage.getItem(LS_DAUTO) || '{}'); } catch(e){}
  try { descUser    = JSON.parse(localStorage.getItem(LS_DESC)  || '{}'); } catch(e){}
}
const save = (key, obj) => { try { localStorage.setItem(key, JSON.stringify(obj)); } catch(e){} };
function saveUserData()   { save(LS_USER,  userData); }
function savePosterEdits(){ save(LS_EDITS, posterEdits); }
function savePosterAuto() { save(LS_AUTO,  posterAuto); }
function saveDescUser()   { save(LS_DESC,  descUser); }
function saveDescAuto()   { save(LS_DAUTO, descAuto); }
