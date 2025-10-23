import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { geocodeAddress } from './geocode.js';
import { fetchOSMContext } from './overpass.js';
import { selectBuildingAndRoad, inferOrientation } from './orientation.js';
import 'dotenv/config';

const IN = process.env.INPUT_CSV || 'input.csv';  // address,suburb,state,postcode,soldDate
const OUT = process.env.OUTPUT_CSV || 'output_with_orientation.csv';

const rows = parse(fs.readFileSync(IN, 'utf8'), { columns: true, skip_empty_lines: true });

const out = [];
for (const r of rows) {
  try {
    const geo = await geocodeAddress(r);
    if (!geo) { out.push({...r, status:'NO_GEOCODE'}); continue; }

    const els = await fetchOSMContext(geo.lat, geo.lon, 150);
    const { building, road } = selectBuildingAndRoad(els, geo.lat, geo.lon);

    if (!building || !road) {
      out.push({...r, lat: geo.lat, lon: geo.lon, status:'NO_BUILDING_OR_ROAD'});
      continue;
    }

    const o = inferOrientation(building, road);

    out.push({
      ...r,
      lat: geo.lat, lon: geo.lon,
      orientation_deg: o.orientation_deg,
      orientation_cardinal: o.orientation_cardinal,
      solar_score: o.solar_score,
      confidence: o.confidence,
      status:'OK'
    });

    // polite rate limiting
    await new Promise(res=>setTimeout(res, 350));
  } catch (e) {
    out.push({...r, error: String(e).slice(0,180), status:'ERROR'});
  }
}

const csv = stringify(out, { header: true });
fs.writeFileSync(OUT, csv);
console.log(`Wrote ${out.length} rows to ${OUT}`);
