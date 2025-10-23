import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import { parse } from 'csv-parse/sync';

const app = express();
app.use(express.static('public'));

const file = process.env.OUTPUT_CSV || 'output_with_orientation.csv';
let data = [];

function loadCSVOnce() {
  if (!fs.existsSync(file)) {
    console.warn(`[server] Output file not found: ${file}. Run 'npm run ingest' first.`);
    data = [];
    return;
  }
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const rows = parse(raw, { columns: true, skip_empty_lines: true });
    data = rows
      .filter(r => r.status === 'OK')
      .map(r => ({
        ...r,
        lat: Number(r.lat),
        lon: Number(r.lon),
        orientation_deg: Number(r.orientation_deg),
        solar_score: Number(r.solar_score),
      }))
      .filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lon));
    const notOk = rows.length - data.length;
    console.log(`[server] Loaded ${data.length} OK rows (${notOk} non-OK) from ${file}`);
  } catch (e) {
    console.error('[server] Failed to load CSV:', e);
    data = [];
  }
}

loadCSVOnce();
try {
  fs.watch(file, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
      console.log('[server] Detected change in output CSV, reloading…');
      setTimeout(loadCSVOnce, 200);
    }
  });
} catch {}

app.get('/api/data', (req,res)=> res.json(data));
app.get('/health', (req,res)=> res.json({ ok:true, count:data.length }));

const port = Number(process.env.PORT || 8080);
app.listen(port, ()=>console.log(`Dashboard on http://localhost:${port}`));
