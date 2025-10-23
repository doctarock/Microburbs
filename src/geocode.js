// src/geocode.js
import 'dotenv/config';

const TOKEN = process.env.MAPBOX_TOKEN || '';
const DEBUG = process.env.GEOCODE_DEBUG === '1';
const log = (...a) => DEBUG && console.error('[GEOCODE]', ...a);

const STATE_NAME = {
  VIC:'Victoria', NSW:'New South Wales', QLD:'Queensland', SA:'South Australia',
  WA:'Western Australia', TAS:'Tasmania', ACT:'Australian Capital Territory', NT:'Northern Territory'
};
const norm = (s) => (s ?? '').toString().trim();

function scoreFeature(feat, target){
  let s = 0;
  if (feat.relevance) s += feat.relevance * 10;
  const ctx = Object.fromEntries((feat.context||[]).map(c=>[c.id.split('.')[0], (c.text||'').toUpperCase()]));
  if (feat.address && feat.address === target.number) s += 5;
  if (feat.text && feat.text.toUpperCase().includes((target.street||'').toUpperCase())) s += 3;
  if (ctx.postcode && ctx.postcode === (target.postcode||'').toUpperCase()) s += 6;
  if (ctx.locality && ctx.locality === (target.suburb||'').toUpperCase()) s += 4;
  if (ctx.region && ctx.region.includes((target.stateFull||target.state||''))) s += 2;
  return s;
}

export async function geocodeAddress(row) {
  const address  = norm(row.address);
  const suburb   = norm(row.suburb);
  const state    = norm(row.state);
  const postcode = norm(row.postcode);

  if (!TOKEN) { log('NO MAPBOX_TOKEN in process.env'); return null; }
  if (!address || !suburb || !state) { log('MISSING FIELDS', { address, suburb, state, postcode }); return null; }

  const stateFull = STATE_NAME[state] || state;
  const q = [address, suburb, stateFull, postcode, 'Australia'].filter(Boolean).join(', ');
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?` +
              new URLSearchParams({ access_token:TOKEN, limit:'5', country:'AU', types:'address', autocomplete:'false' });

  log('URL', url.replace(TOKEN, 'pk.***'));
  let json;
  try {
    const res = await fetch(url);
    if (!res.ok) { log('HTTP', res.status, await res.text().catch(()=>'')); return null; }
    json = await res.json();
  } catch (e) { log('FETCH/JSON error', e); return null; }

  const feats = Array.isArray(json.features) ? json.features : [];
  if (!feats.length) { log('NO_FEATURES for', q); return null; }

  const number = (address.match(/^\s*(\d+[A-Za-z]?)/) || [,''])[1];
  const street = address.replace(/^\s*\d+[A-Za-z]?\s*/, '');
  const target = { number, street, suburb: suburb.toUpperCase(), state: state.toUpperCase(), stateFull, postcode };

  const ranked = feats.map(f => ({ f, s: scoreFeature(f, target) })).sort((a,b)=> b.s - a.s);
  const best = (ranked[0]?.f) || feats[0];
  const [lon, lat] = best.center || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) { log('BAD CENTER', best); return null; }

  log('OK', best.place_name, lat, lon);
  return { lat, lon, place_name: best.place_name, source: 'mapbox' };
}
